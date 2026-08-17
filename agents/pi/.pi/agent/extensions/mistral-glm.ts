/**
 * Mistral GLM Stream Extension
 *
 * Registers a custom provider "mistral-glm" with a streamSimple handler that
 * combines structured content parsing (thinking blocks) with index-based
 * tool-call keying — fixing both problems that prevent zai-glm-5-2 from working
 * as a reasoning coding-agent model via Mistral's OpenAI-compatible endpoint.
 *
 * Problems solved:
 *   1. mistral-conversations parser mangles tool calls (keys on callId which
 *      changes when toolCall.id is absent in subsequent deltas).
 *   2. openai-completions parser cannot handle structured content arrays
 *      (coerces [{type:"thinking",...}] to "[object Object]").
 *
 * Usage: select provider "mistral-glm", model "zai-glm-5-2".
 * Requires MISTRAL_API_KEY environment variable.
 */

import {
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Context,
  type Message,
  type Model,
  type SimpleStreamOptions,
  type ToolCall,
  calculateCost,
  createAssistantMessageEventStream,
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ─── Helpers ────────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text.replace(/[\ud800-\udbff](?![\udc00-\udfff])/g, "");
}

function parseStreamingJson(partial: string): Record<string, unknown> {
  try { return JSON.parse(partial); } catch {}
  try { return JSON.parse(partial + "}"); } catch {}
  try { return JSON.parse(partial + '"}'); } catch {}
  return {};
}

function mapStopReason(reason: string | null): string {
  if (!reason) return "stop";
  switch (reason) {
    case "stop": return "stop";
    case "length": case "model_length": return "length";
    case "tool_calls": return "toolUse";
    case "error": return "error";
    default: return "stop";
  }
}

// ─── Message conversion (pi-ai → OpenAI chat format) ────────────────────

function convertMessages(messages: Message[], systemPrompt?: string): unknown[] {
  const result: unknown[] = [];
  if (systemPrompt) {
    result.push({ role: "system", content: sanitize(systemPrompt) });
  }
  for (const msg of messages) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        result.push({ role: "user", content: sanitize(msg.content) });
      } else {
        const content = msg.content
          .filter((b) => b.type === "text")
          .map((b) => ({ type: "text", text: sanitize((b as any).text || "") }));
        if (content.length > 0) result.push({ role: "user", content });
      }
    } else if (msg.role === "assistant") {
      const blocks = Array.isArray(msg.content) ? msg.content : [];
      const textParts = blocks
        .filter((b) => b.type === "text" && ((b as any).text || "").trim().length > 0)
        .map((b) => sanitize((b as any).text || ""));
      const toolCalls = blocks
        .filter((b) => b.type === "toolCall")
        .map((b) => ({
          id: (b as ToolCall).id || "",
          type: "function" as const,
          function: { name: (b as ToolCall).name || "", arguments: JSON.stringify((b as ToolCall).arguments || {}) },
        }));
      const assistant: Record<string, unknown> = { role: "assistant" };
      assistant.content = textParts.length > 0 ? textParts.join("") : null;
      if (toolCalls.length > 0) assistant.tool_calls = toolCalls;
      result.push(assistant);
    } else if (msg.role === "toolResult") {
      const blocks = Array.isArray(msg.content) ? msg.content : [{ type: "text", text: String(msg.content) }];
      const text = blocks
        .filter((b) => b.type === "text")
        .map((b) => sanitize((b as any).text || ""))
        .join("\n");
      result.push({
        role: "tool",
        tool_call_id: (msg as any).toolCallId || "",
        content: text || "(no tool output)",
      });
    }
  }
  return result;
}

function convertTools(tools: any[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters, strict: false },
  }));
}

// ─── Stream function ────────────────────────────────────────────────────

function streamMistralGLM(
  model: Model<any>,
  context: Context,
  options?: SimpleStreamOptions,
): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream();

  (async () => {
    const baseUrl = (model as any).baseUrl || "https://api.mistral.ai/v1";
    const apiKey = options?.apiKey || process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("No MISTRAL_API_KEY set for mistral-glm provider");
    }

    const output: AssistantMessage = {
      role: "assistant",
      content: [],
      api: "mistral-glm-stream" as any,
      provider: model.provider,
      model: model.id,
      usage: {
        input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
      },
      stopReason: "pending" as any,
      timestamp: Date.now(),
    } as any;

    const contentBlocks = output.content as any[];

    try {
      // Build payload
      const payload: Record<string, unknown> = {
        model: model.id,
        stream: true,
        stream_options: { include_usage: true },
        messages: convertMessages(context.messages, context.systemPrompt),
      };

      if (options?.maxTokens) payload.max_completion_tokens = options.maxTokens;
      if (options?.temperature !== undefined) payload.temperature = options.temperature;
      if (context.tools && context.tools.length > 0) payload.tools = convertTools(context.tools as any[]);

      // Reasoning effort (from thinkingLevelMap)
      if (model.reasoning && (options as any)?.reasoningEffort) {
        const mapped = model.thinkingLevelMap?.[(options as any).reasoningEffort];
        if (mapped !== null && mapped !== undefined) {
          payload.reasoning_effort = mapped ?? (options as any).reasoningEffort;
        }
      }

      stream.push({ type: "start", partial: output });

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Mistral API error (${response.status}): ${errBody || "(no body)"}`);
      }
      if (!response.body) throw new Error("No response body from Mistral API");

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentTextBlock: any = null;
      let currentThinkingBlock: any = null;
      const toolCallBlocksByIndex = new Map<number, any>();

      const finishText = () => {
        if (currentTextBlock) {
          stream.push({ type: "text_end", contentIndex: contentBlocks.length - 1, content: currentTextBlock.text, partial: output });
          currentTextBlock = null;
        }
      };
      const finishThinking = () => {
        if (currentThinkingBlock) {
          stream.push({ type: "thinking_end", contentIndex: contentBlocks.length - 1, content: currentThinkingBlock.thinking, partial: output });
          currentThinkingBlock = null;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          let chunk: any;
          try { chunk = JSON.parse(data); } catch { continue; }

          output.responseId ||= chunk.id;

          if (chunk.usage) {
            output.usage.input = chunk.usage.prompt_tokens || 0;
            output.usage.output = chunk.usage.completion_tokens || 0;
            output.usage.cacheRead = chunk.usage.prompt_tokens_details?.cached_tokens || 0;
            output.usage.totalTokens = chunk.usage.total_tokens || output.usage.input + output.usage.output;
          }

          const choice = chunk.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) output.stopReason = mapStopReason(choice.finish_reason) as any;
          const delta = choice.delta;
          if (!delta) continue;

          // ── Content: string → text ──
          if (typeof delta.content === "string" && delta.content.length > 0) {
            if (!currentTextBlock) {
              finishThinking();
              currentTextBlock = { type: "text", text: "" };
              contentBlocks.push(currentTextBlock);
              stream.push({ type: "text_start", contentIndex: contentBlocks.length - 1, partial: output });
            }
            const d = sanitize(delta.content);
            currentTextBlock.text += d;
            stream.push({ type: "text_delta", contentIndex: contentBlocks.length - 1, delta: d, partial: output });
          }

          // ── Content: array → structured (thinking + text) ──
          if (Array.isArray(delta.content)) {
            for (const item of delta.content) {
              if (item.type === "thinking") {
                const thinkingText = (item.thinking || [])
                  .map((p: any) => (p.type === "text" ? p.text : ""))
                  .filter((t: string) => t.length > 0)
                  .join("");
                if (!thinkingText) continue;
                if (!currentThinkingBlock) {
                  finishText();
                  currentThinkingBlock = { type: "thinking", thinking: "" };
                  contentBlocks.push(currentThinkingBlock);
                  stream.push({ type: "thinking_start", contentIndex: contentBlocks.length - 1, partial: output });
                }
                const d = sanitize(thinkingText);
                currentThinkingBlock.thinking += d;
                stream.push({ type: "thinking_delta", contentIndex: contentBlocks.length - 1, delta: d, partial: output });
              } else if (item.type === "text") {
                const d = sanitize(item.text || "");
                if (!d) continue;
                if (!currentTextBlock) {
                  finishThinking();
                  currentTextBlock = { type: "text", text: "" };
                  contentBlocks.push(currentTextBlock);
                  stream.push({ type: "text_start", contentIndex: contentBlocks.length - 1, partial: output });
                }
                currentTextBlock.text += d;
                stream.push({ type: "text_delta", contentIndex: contentBlocks.length - 1, delta: d, partial: output });
              }
            }
          }

          // ── Tool calls: index-based keying with name backfill ──
          const toolCalls = delta.tool_calls || [];
          for (const tc of toolCalls) {
            finishText();
            finishThinking();
            const idx = typeof tc.index === "number" ? tc.index : 0;
            let block = toolCallBlocksByIndex.get(idx);
            if (!block) {
              block = { type: "toolCall", id: tc.id || "", name: tc.function?.name || "", arguments: {}, partialArgs: "" };
              contentBlocks.push(block);
              toolCallBlocksByIndex.set(idx, block);
              stream.push({ type: "toolcall_start", contentIndex: contentBlocks.length - 1, partial: output });
            }
            // Backfill id and name (they may arrive in later deltas)
            if (!block.id && tc.id) block.id = tc.id;
            if (!block.name && tc.function?.name) block.name = tc.function.name;
            const argsDelta = typeof tc.function?.arguments === "string"
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments || {});
            block.partialArgs = (block.partialArgs || "") + argsDelta;
            block.arguments = parseStreamingJson(block.partialArgs);
            stream.push({ type: "toolcall_delta", contentIndex: contentBlocks.indexOf(block), delta: argsDelta, partial: output });
          }
        }
      }

      // Finalize
      finishText();
      finishThinking();
      for (const block of toolCallBlocksByIndex.values()) {
        block.arguments = parseStreamingJson(block.partialArgs || "");
        delete block.partialArgs;
        stream.push({ type: "toolcall_end", contentIndex: contentBlocks.indexOf(block), toolCall: block, partial: output });
      }

      if (output.stopReason === ("pending" as any)) output.stopReason = "stop" as any;
      calculateCost(model, output.usage as any);

      if (output.stopReason === "error" || output.stopReason === "aborted") {
        throw new Error((output as any).errorMessage || "Stream ended with error/aborted");
      }

      stream.push({ type: "done", reason: output.stopReason, message: output });
      stream.end();
    } catch (error) {
      for (const b of contentBlocks) delete (b as any).partialArgs;
      output.stopReason = (options?.signal?.aborted ? "aborted" : "error") as any;
      (output as any).errorMessage = error instanceof Error ? error.message : String(error);
      stream.push({ type: "error", reason: output.stopReason, error: output });
      stream.end();
    }
  })();

  return stream;
}

// ─── Extension registration ─────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  pi.registerProvider("mistral-glm", {
    name: "Mistral (GLM custom stream)",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: "$MISTRAL_API_KEY",
    api: "mistral-glm-stream",
    streamSimple: streamMistralGLM as any,
    models: [
      {
        id: "zai-glm-5-2",
        name: "Z.ai GLM 5.2 (reasoning)",
        reasoning: true,
        thinkingLevelMap: {
          off: "none",
          minimal: null,
          low: null,
          medium: null,
          high: "high",
          xhigh: null,
          max: null,
        },
        input: ["text"],
        contextWindow: 1048576,
        maxTokens: 131072,
        cost: { input: 1.54, output: 4.84, cacheRead: 0.154, cacheWrite: 0 },
      },
    ],
  });
}
