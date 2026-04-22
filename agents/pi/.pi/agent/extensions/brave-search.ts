import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * Brave Search Extension
 *
 * Replaces pi-web-access with a narrower, explicit architecture:
 * - web_search backed by Brave bx (context mode by default)
 * - fetch_content for web pages and GitHub repos
 * - get_fetched_content for session-scoped retrieval
 *
 * Doc sync checklist (update docs when changing):
 * - tool names and parameter schemas
 * - storage lifecycle (session-scoped, in-memory)
 * - bx prerequisite
 */

// ---------------------------------------------------------------------------
// Session-scoped temp storage
// ---------------------------------------------------------------------------

type SearchQueryResult = {
  query: string;
  results: Array<{ url: string; title: string; snippet: string }>;
  answer?: string;
  error?: string;
};

type FetchUrlResult = {
  url: string;
  title: string;
  content: string;
  error?: string;
};

type StoredResult =
  | { type: "search"; queries: SearchQueryResult[] }
  | { type: "fetch"; urls: FetchUrlResult[] };

// Active session store. Cleared on session_start / session_shutdown.
let store = new Map<string, StoredResult>();

function generateResponseId(): string {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// HTML extraction (lightweight, zero-dependency)
// ---------------------------------------------------------------------------

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^]*?)<\/title>/i);
  return m ? decodeHtmlEntities(stripTags(m[1])).trim() : "";
}

function htmlToMarkdownish(html: string): string {
  // Remove undesirable tags and their contents
  let text = html
    .replace(/<(script|style|nav|header|footer|aside|noscript|iframe|svg|canvas)[^>]*>[^]*?<\/\1>/gi, "")
    .replace(/<!--[^]*?-->/g, "");

  // Try to isolate main content
  const mainMatch = text.match(/<(main|article)[^>]*>([^]*?)<\/\1>/i);
  const bodyMatch = text.match(/<body[^>]*>([^]*)<\/body>/i);
  text = mainMatch?.[2] ?? bodyMatch?.[1] ?? text;

  // Convert common block elements to markdown-ish
  text = text
    .replace(/<h1[^>]*>([^]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([^]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([^]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>([^]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5[^>]*>([^]*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6[^>]*>([^]*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<p[^>]*>([^]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([^]*?)<\/li>/gi, "- $1\n")
    .replace(/<\/ul>|<\/ol>/gi, "\n")
    .replace(/<pre[^>]*>([^]*?)<\/pre>/gi, "\n```\n$1\n```\n")
    .replace(/<code[^>]*>([^]*?)<\/code>/gi, "`$1`")
    .replace(/<blockquote[^>]*>([^]*?)<\/blockquote>/gi, "\n> $1\n")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([^]*?)<\/a>/gi, "[$2]($1)");

  // Strip remaining tags
  text = stripTags(text);

  // Decode entities and normalize whitespace
  text = decodeHtmlEntities(text);
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  return text;
}

async function fetchWebPage(url: string, signal?: AbortSignal): Promise<FetchUrlResult> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: signal ?? AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { url, title: "", content: "", error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const html = await response.text();
    const title = extractTitle(html);
    const content = htmlToMarkdownish(html);

    if (content.length < 100) {
      return { url, title, content, error: "Extracted content is too short; the page may require JavaScript or block bots." };
    }

    return { url, title, content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, title: "", content: "", error: message };
  }
}

// ---------------------------------------------------------------------------
// GitHub repo extraction
// ---------------------------------------------------------------------------

function isGitHubRepoUrl(url: string): { owner: string; repo: string; cloneUrl: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    const [owner, repo] = parts;
    const cleanRepo = repo.replace(/\.git$/, "");
    return { owner, repo: cleanRepo, cloneUrl: `https://github.com/${owner}/${cleanRepo}.git` };
  } catch {
    return null;
  }
}

function resolveGitHubFileUrl(url: string): string {
  // Convert github.com blob URLs to raw.githubusercontent.com for source code
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" && u.hostname !== "www.github.com") return url;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts[2] !== "blob") return url;
    const [owner, repo, , ref, ...pathParts] = parts;
    if (!owner || !repo || !ref || pathParts.length === 0) return url;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${pathParts.join("/")}`;
  } catch {
    return url;
  }
}

function readRepoKeyFiles(repoDir: string): Array<{ path: string; content: string }> {
  const keyFiles = [
    "README.md",
    "README",
    "readme.md",
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "setup.py",
    "go.mod",
    "build.gradle",
    "pom.xml",
    "requirements.txt",
    "composer.json",
    "mix.exs",
    "Gemfile",
  ];

  const results: Array<{ path: string; content: string }> = [];

  // Top-level only
  for (const name of keyFiles) {
    const p = join(repoDir, name);
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, "utf-8");
        results.push({ path: name, content: content.slice(0, 8000) }); // cap per file
      } catch {
        // ignore unreadable
      }
    }
  }

  return results;
}

async function fetchGitHubRepo(
  url: string,
  pi: ExtensionAPI,
  signal?: AbortSignal,
): Promise<FetchUrlResult> {
  const repoInfo = isGitHubRepoUrl(url);
  if (!repoInfo) {
    return { url, title: "", content: "", error: "Invalid GitHub repository URL." };
  }

  const tempDir = mkdtempSync(join(tmpdir(), "pi-brave-search-"));
  try {
    const result = await pi.exec("git", ["clone", "--depth", "1", repoInfo.cloneUrl, tempDir], {
      timeout: 30000,
      signal,
    });

    if (result.code !== 0) {
      return { url, title: "", content: "", error: `Clone failed: ${result.stderr || result.stdout || "unknown error"}` };
    }

    const files = readRepoKeyFiles(tempDir);
    const topLevel = readdirSync(tempDir).filter((f) => !f.startsWith(".")).sort();

    let output = `# ${repoInfo.owner}/${repoInfo.repo}\n\n`;
    output += `**Clone URL:** ${repoInfo.cloneUrl}\n`;
    output += `**Top-level files:** ${topLevel.join(", ")}\n\n`;

    if (files.length === 0) {
      output += "No recognized manifest or README files found at the top level.\n";
    } else {
      for (const f of files) {
        output += `## ${f.path}\n\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
      }
    }

    return { url, title: `${repoInfo.owner}/${repoInfo.repo}`, content: output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, title: "", content: "", error: message };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

// ---------------------------------------------------------------------------
// bx search helpers
// ---------------------------------------------------------------------------

function freshnessFromRecency(filter: "day" | "week" | "month" | "year"): string {
  switch (filter) {
    case "day":
      return "pd";
    case "week":
      return "pw";
    case "month":
      return "pm";
    case "year":
      return "py";
  }
}

async function runBxContext(
  pi: ExtensionAPI,
  query: string,
  options: {
    numResults?: number;
    domainFilter?: string[];
    signal?: AbortSignal;
  },
): Promise<SearchQueryResult> {
  const args = ["context", query];

  if (options.numResults) {
    args.push("--count", String(Math.min(Math.max(1, Math.floor(options.numResults)), 20)));
  }

  if (options.domainFilter) {
    for (const d of options.domainFilter) {
      if (d.startsWith("-")) {
        args.push("--exclude-site", d.slice(1));
      } else {
        args.push("--include-site", d);
      }
    }
  }

  const result = await pi.exec("bx", args, { timeout: 30000, signal: options.signal });

  if (result.code !== 0) {
    const err = result.stderr?.trim() || `bx exited with code ${result.code}`;
    return { query, results: [], answer: undefined, error: err };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout ?? "{}");
  } catch {
    return { query, results: [], answer: undefined, error: "Failed to parse bx output" };
  }

  const results: Array<{ url: string; title: string; snippet: string }> = [];
  const generic = (parsed as Record<string, unknown>)?.grounding?.generic;
  if (Array.isArray(generic)) {
    for (const item of generic) {
      if (typeof item !== "object" || item == null) continue;
      const url = (item as Record<string, unknown>).url;
      const title = (item as Record<string, unknown>).title;
      const snippets = (item as Record<string, unknown>).snippets;
      if (typeof url === "string" && typeof title === "string") {
        const snippetText = Array.isArray(snippets) ? snippets.join("\n") : "";
        results.push({ url, title, snippet: snippetText });
      }
    }
  }

  return { query, results };
}

async function runBxWeb(
  pi: ExtensionAPI,
  query: string,
  options: {
    numResults?: number;
    recencyFilter?: "day" | "week" | "month" | "year";
    domainFilter?: string[];
    signal?: AbortSignal;
  },
): Promise<SearchQueryResult> {
  const args = ["web", query];

  if (options.numResults) {
    args.push("--count", String(Math.min(Math.max(1, Math.floor(options.numResults)), 20)));
  }

  if (options.recencyFilter) {
    args.push("--freshness", freshnessFromRecency(options.recencyFilter));
  }

  if (options.domainFilter) {
    for (const d of options.domainFilter) {
      if (d.startsWith("-")) {
        args.push("--exclude-site", d.slice(1));
      } else {
        args.push("--include-site", d);
      }
    }
  }

  const result = await pi.exec("bx", args, { timeout: 30000, signal: options.signal });

  if (result.code !== 0) {
    const err = result.stderr?.trim() || `bx exited with code ${result.code}`;
    return { query, results: [], answer: undefined, error: err };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout ?? "{}");
  } catch {
    return { query, results: [], answer: undefined, error: "Failed to parse bx output" };
  }

  const results: Array<{ url: string; title: string; snippet: string }> = [];
  const web = (parsed as Record<string, unknown>)?.web;
  if (typeof web === "object" && web != null) {
    const webResults = (web as Record<string, unknown>).results;
    if (Array.isArray(webResults)) {
      for (const item of webResults) {
        if (typeof item !== "object" || item == null) continue;
        const url = (item as Record<string, unknown>).url;
        const title = (item as Record<string, unknown>).title;
        const description = (item as Record<string, unknown>).description;
        const snippetText = typeof description === "string" ? description : "";
        if (typeof url === "string" && typeof title === "string") {
          results.push({ url, title, snippet: snippetText });
        }
      }
    }
  }

  return { query, results };
}

// ---------------------------------------------------------------------------
// Tool parameter schemas
// ---------------------------------------------------------------------------

const WebSearchParams = Type.Object({
  query: Type.Optional(Type.String({ description: "Single search query. For research tasks, prefer 'queries' with multiple varied angles instead." })),
  queries: Type.Optional(Type.Array(Type.String(), { description: "Multiple queries searched in sequence. Prefer this for research — vary phrasing, scope, and angle across 2-4 queries." })),
  numResults: Type.Optional(Type.Number({ description: "Results per query (default: 5, max: 20)" })),
  recencyFilter: Type.Optional(Type.Union([Type.Literal("day"), Type.Literal("week"), Type.Literal("month"), Type.Literal("year")], { description: "Filter by recency" })),
  domainFilter: Type.Optional(Type.Array(Type.String(), { description: "Limit to domains (prefix with - to exclude)" })),
});

const FetchContentParams = Type.Object({
  url: Type.Optional(Type.String({ description: "Single URL to fetch" })),
  urls: Type.Optional(Type.Array(Type.String(), { description: "Multiple URLs (parallel)" })),
});

const GetFetchedContentParams = Type.Object({
  responseId: Type.String({ description: "The responseId from web_search or fetch_content" }),
  query: Type.Optional(Type.String({ description: "Get content for this query (web_search)" })),
  queryIndex: Type.Optional(Type.Number({ description: "Get content for query at index" })),
  url: Type.Optional(Type.String({ description: "Get content for this URL" })),
  urlIndex: Type.Optional(Type.Number({ description: "Get content for URL at index" })),
});

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    store.clear();
  });

  pi.on("session_shutdown", () => {
    store.clear();
  });

  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web using Brave bx. Returns relevance-scored, pre-extracted web content with source citations. For comprehensive research, prefer queries (plural) with 2-4 varied angles over a single query — each query gets its own results, so varying phrasing and scope gives much broader coverage.",
    promptSnippet: "Use for web research questions. Prefer {queries:[...]} with 2-4 varied angles over a single query for broader coverage.",
    parameters: WebSearchParams,

    async execute(_toolCallId, params, signal) {
      const rawQueryList: unknown[] = Array.isArray(params.queries)
        ? params.queries
        : params.query !== undefined
          ? [params.query]
          : [];

      const queryList: string[] = [];
      for (const q of rawQueryList) {
        if (typeof q === "string") {
          const trimmed = q.trim();
          if (trimmed.length > 0) queryList.push(trimmed);
        }
      }

      if (queryList.length === 0) {
        return {
          content: [{ type: "text", text: "Error: No query provided. Use 'query' or 'queries' parameter." }],
          details: { error: "No query provided" },
        };
      }

      const useWeb = params.recencyFilter != null;
      const queryResults: SearchQueryResult[] = [];

      for (const query of queryList) {
        if (signal?.aborted) {
          return {
            content: [{ type: "text", text: "Search aborted." }],
            details: { error: "Aborted" },
          };
        }

        const result = useWeb
          ? await runBxWeb(pi, query, {
              numResults: params.numResults,
              recencyFilter: params.recencyFilter,
              domainFilter: params.domainFilter,
              signal,
            })
          : await runBxContext(pi, query, {
              numResults: params.numResults,
              domainFilter: params.domainFilter,
              signal,
            });

        queryResults.push(result);
      }

      const responseId = generateResponseId();
      store.set(responseId, { type: "search", queries: queryResults });

      // Build inline summary
      const lines: string[] = [];
      for (const qr of queryResults) {
        lines.push(`## Query: "${qr.query}"\n`);
        if (qr.error) {
          lines.push(`Error: ${qr.error}\n`);
        } else if (qr.results.length === 0) {
          lines.push("No results found.\n");
        } else {
          for (let i = 0; i < qr.results.length; i++) {
            const r = qr.results[i];
            lines.push(`${i + 1}. **${r.title}**\n   ${r.url}`);
            if (r.snippet) {
              const snippetPreview = r.snippet.length > 400 ? r.snippet.slice(0, 400) + "..." : r.snippet;
              lines.push(`   ${snippetPreview.replace(/\n/g, " ")}`);
            }
          }
        }
        lines.push("");
      }

      const inlineText = lines.join("\n");

      return {
        content: [{ type: "text", text: inlineText }],
        details: { responseId, queryCount: queryList.length, totalResults: queryResults.reduce((sum, q) => sum + q.results.length, 0) },
      };
    },

    renderCall(args, theme) {
      const qs = ((args as Record<string, unknown>).queries as string[] | undefined) ?? ((args as Record<string, unknown>).query ? [(args as Record<string, unknown>).query as string] : []);
      const display = qs.length > 0 ? (qs[0].length > 60 ? qs[0].slice(0, 57) + "..." : qs[0]) : "(no query)";
      return new Text(theme.fg("toolTitle", theme.bold("web_search ")) + theme.fg("accent", display), 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as { responseId?: string; queryCount?: number; totalResults?: number; error?: string } | undefined;
      if (details?.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }
      return new Text(
        theme.fg("success", `${details?.totalResults ?? 0} results`) +
          theme.fg("muted", ` • ${details?.queryCount ?? 0} queries`) +
          theme.fg("dim", ` [${details?.responseId ?? ""}]`),
        0, 0,
      );
    },
  });

  pi.registerTool({
    name: "fetch_content",
    label: "Fetch Content",
    description:
      "Fetch URL(s) and extract readable content as markdown. Supports ordinary web pages and GitHub repository URLs. Content is stored under a responseId and can be retrieved with get_fetched_content.",
    promptSnippet: "Use to extract readable content from URL(s) or GitHub repos.",
    parameters: FetchContentParams,

    async execute(_toolCallId, params, signal) {
      const urlList = params.urls ?? (params.url ? [params.url] : []);
      if (urlList.length === 0) {
        return {
          content: [{ type: "text", text: "Error: No URL provided." }],
          details: { error: "No URL provided" },
        };
      }

      const results: FetchUrlResult[] = [];
      for (const url of urlList) {
        if (signal?.aborted) {
          return {
            content: [{ type: "text", text: "Fetch aborted." }],
            details: { error: "Aborted" },
          };
        }

        const resolvedUrl = resolveGitHubFileUrl(url);
        const repoInfo = isGitHubRepoUrl(resolvedUrl);
        const result = repoInfo
          ? await fetchGitHubRepo(resolvedUrl, pi, signal)
          : await fetchWebPage(resolvedUrl, signal);

        // Preserve the original URL the user provided, not the resolved raw URL
        result.url = url;
        results.push(result);
      }

      const responseId = generateResponseId();
      store.set(responseId, { type: "fetch", urls: results });

      const successful = results.filter((r) => !r.error).length;

      // Single URL: return content directly with responseId
      if (urlList.length === 1) {
        const result = results[0];
        if (result.error) {
          return {
            content: [{ type: "text", text: `Error: ${result.error}` }],
            details: { url: urlList[0], error: result.error, responseId },
          };
        }
        return {
          content: [{ type: "text", text: result.content }],
          details: { url: urlList[0], title: result.title, responseId, contentLength: result.content.length },
        };
      }

      // Multi-URL: return summary
      const lines: string[] = [];
      lines.push(`Fetched ${successful}/${results.length} URLs. Stored under responseId: ${responseId}\n`);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        lines.push(`${i}. ${r.url}${r.error ? " — error" : ""}`);
      }
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { urls: urlList, urlCount: urlList.length, successful, responseId },
      };
    },

    renderCall(args, theme) {
      const urls = ((args as Record<string, unknown>).urls as string[] | undefined) ?? ((args as Record<string, unknown>).url ? [(args as Record<string, unknown>).url as string] : []);
      const display = urls.length === 1 ? truncateToWidth(urls[0].replace(/^https?:\/\//, ""), 50) : `${urls.length} URLs`;
      return new Text(theme.fg("toolTitle", theme.bold("fetch_content ")) + theme.fg("accent", display), 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as { url?: string; title?: string; responseId?: string; error?: string; urlCount?: number; successful?: number } | undefined;
      if (details?.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }
      if (details?.urlCount && details.urlCount > 1) {
        return new Text(theme.fg("success", `${details.successful}/${details.urlCount} fetched`) + theme.fg("dim", ` [${details.responseId ?? ""}]`), 0, 0);
      }
      return new Text(theme.fg("success", details?.title ?? "Fetched") + theme.fg("dim", ` [${details?.responseId ?? ""}]`), 0, 0);
    },
  });

  pi.registerTool({
    name: "get_fetched_content",
    label: "Get Fetched Content",
    description: "Retrieve full content from a previous web_search or fetch_content call.",
    promptSnippet: "Use after web_search/fetch_content when full stored content is needed via responseId plus query/url selectors.",
    parameters: GetFetchedContentParams,

    async execute(_toolCallId, params) {
      const data = store.get(params.responseId);
      if (!data) {
        return {
          content: [{ type: "text", text: `Error: No stored results for "${params.responseId}"` }],
          details: { error: "Not found", responseId: params.responseId },
        };
      }

      if (data.type === "search" && data.queries) {
        let queryData: SearchQueryResult | undefined;

        if (params.query !== undefined) {
          queryData = data.queries.find((q) => q.query === params.query);
          if (!queryData) {
            const available = data.queries.map((q) => `"${q.query}"`).join(", ");
            return {
              content: [{ type: "text", text: `Query "${params.query}" not found. Available: ${available}` }],
              details: { error: "Query not found" },
            };
          }
        } else if (params.queryIndex !== undefined) {
          queryData = data.queries[params.queryIndex];
          if (!queryData) {
            return {
              content: [{ type: "text", text: `Index ${params.queryIndex} out of range (0-${data.queries.length - 1})` }],
              details: { error: "Index out of range" },
            };
          }
        } else {
          const available = data.queries.map((q, i) => `${i}: "${q.query}"`).join(", ");
          return {
            content: [{ type: "text", text: `Specify query or queryIndex. Available: ${available}` }],
            details: { error: "No query specified" },
          };
        }

        const lines: string[] = [];
        lines.push(`## Results for: "${queryData.query}"\n`);
        for (const r of queryData.results) {
          lines.push(`### ${r.title}\n${r.url}\n`);
          if (r.snippet) lines.push(r.snippet + "\n");
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: { query: queryData.query, resultCount: queryData.results.length },
        };
      }

      if (data.type === "fetch" && data.urls) {
        let urlData: FetchUrlResult | undefined;

        if (params.url !== undefined) {
          urlData = data.urls.find((u) => u.url === params.url);
          if (!urlData) {
            const available = data.urls.map((u) => u.url).join("\n  ");
            return {
              content: [{ type: "text", text: `URL not found. Available:\n  ${available}` }],
              details: { error: "URL not found" },
            };
          }
        } else if (params.urlIndex !== undefined) {
          urlData = data.urls[params.urlIndex];
          if (!urlData) {
            return {
              content: [{ type: "text", text: `Index ${params.urlIndex} out of range (0-${data.urls.length - 1})` }],
              details: { error: "Index out of range" },
            };
          }
        } else {
          const available = data.urls.map((u, i) => `${i}: ${u.url}`).join("\n  ");
          return {
            content: [{ type: "text", text: `Specify url or urlIndex. Available:\n  ${available}` }],
            details: { error: "No URL specified" },
          };
        }

        if (urlData.error) {
          return {
            content: [{ type: "text", text: `Error for ${urlData.url}: ${urlData.error}` }],
            details: { error: urlData.error, url: urlData.url },
          };
        }

        return {
          content: [{ type: "text", text: `# ${urlData.title}\n\n${urlData.content}` }],
          details: { url: urlData.url, title: urlData.title, contentLength: urlData.content.length },
        };
      }

      return {
        content: [{ type: "text", text: "Invalid stored data format" }],
        details: { error: "Invalid data" },
      };
    },

    renderCall(args, theme) {
      const { responseId } = args as { responseId: string };
      return new Text(theme.fg("toolTitle", theme.bold("get_fetched_content ")) + theme.fg("dim", truncateToWidth(responseId, 40)), 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as { error?: string; query?: string; url?: string; resultCount?: number; contentLength?: number } | undefined;
      if (details?.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }
      if (details?.query) {
        return new Text(theme.fg("success", `${details.resultCount ?? 0} results`) + theme.fg("muted", ` for "${details.query}"`), 0, 0);
      }
      if (details?.url) {
        return new Text(theme.fg("success", `${details.contentLength ?? 0} chars`) + theme.fg("muted", ` — ${truncateToWidth(details.url, 40)}`), 0, 0);
      }
      return new Text("", 0, 0);
    },
  });
}
