import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const WATCH_DEBOUNCE_MS = 500;
const ANSI_ESCAPE_REGEX = /\u001b\[[0-9;]*m/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_ESCAPE_REGEX, "");
}

function visibleWidth(value: string): number {
  return Array.from(stripAnsi(value)).length;
}

function truncateToWidth(value: string, width: number, ellipsis = ""): string {
  if (width <= 0) return "";

  const cleanValue = stripAnsi(value);
  if (visibleWidth(cleanValue) <= width) return value;

  const ellipsisWidth = visibleWidth(ellipsis);
  if (ellipsisWidth >= width) {
    return Array.from(ellipsis).slice(0, width).join("");
  }

  const maxChars = width - ellipsisWidth;
  return Array.from(cleanValue).slice(0, maxChars).join("") + ellipsis;
}

type JjBookmarkAnchor = {
  commitId: string;
  bookmark: string;
};

type JjBookmarkInfo = {
  bookmark: string;
  ahead: number;
};

type FileCounts = {
  added: number;
  changed: number;
  deleted: number;
  conflicted: number;
};

function findJjRoot(startDir: string): string | null {
  let dir = startDir;

  for (;;) {
    if (existsSync(join(dir, ".jj"))) return dir;

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "∞";

  const units = ["", "k", "m", "b", "t"];
  let scaled = Math.abs(value);
  let unitIndex = 0;

  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex++;
  }

  const formatted =
    unitIndex === 0 ? `${scaled}` : `${scaled.toFixed(1)}${units[unitIndex]}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function formatHomePath(pathname: string): string {
  const home = homedir();
  if (pathname === home) return "~";
  if (pathname.startsWith(`${home}/`))
    return `~/${pathname.slice(home.length + 1)}`;
  return pathname;
}

function alignLeftRight(
  left: string,
  right: string,
  width: number,
  ellipsis = "",
): string {
  const leftWidth = visibleWidth(left);
  const rightWidth = visibleWidth(right);

  if (leftWidth + rightWidth + 1 <= width) {
    return left + " ".repeat(width - leftWidth - rightWidth) + right;
  }

  const availableForRight = width - leftWidth - 1;
  if (availableForRight > 0) {
    return left + " " + truncateToWidth(right, availableForRight, ellipsis);
  }

  return truncateToWidth(left, width, ellipsis);
}

function parseJjBookmarkAnchor(stdout: string): JjBookmarkAnchor | null {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  return {
    commitId: lines[0],
    bookmark: lines.slice(1).join(",") || "(no bookmark)",
  };
}

function classifyJjStatusLine(
  line: string,
): "added" | "changed" | "deleted" | "conflicted" | null {
  const first = line.trimStart()[0];
  if (!first) return null;

  switch (first) {
    case "A":
    case "?":
      return "added";
    case "M":
    case "R":
    case "U":
    case "T":
      return "changed";
    case "D":
      return "deleted";
    case "C":
      return "conflicted";
    default:
      return null;
  }
}

function parseJjStatusCounts(stdout: string): FileCounts {
  const counts: FileCounts = {
    added: 0,
    changed: 0,
    deleted: 0,
    conflicted: 0,
  };

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    const kind = classifyJjStatusLine(line);
    if (kind) counts[kind]++;
  }

  return counts;
}

async function readJjBookmarkInfo(
  pi: ExtensionAPI,
  cwd: string,
): Promise<JjBookmarkInfo> {
  const template =
    'commit_id ++ "\\n" ++ bookmarks.map(|b| b.name()).join("\\n")';
  const result = await pi.exec(
    "jj",
    [
      "log",
      "-r",
      "latest(heads(::@ & bookmarks()))",
      "--ignore-working-copy",
      "--no-graph",
      "--no-pager",
      "--color=never",
      "-T",
      template,
    ],
    { cwd, timeout: 2500 },
  );

  const anchor = parseJjBookmarkAnchor(result.stdout ?? "");
  if (!anchor) {
    return { bookmark: "(no bookmark)", ahead: 0 };
  }

  const aheadResult = await pi.exec(
    "jj",
    [
      "log",
      "-r",
      `${anchor.commitId}..@`,
      "--ignore-working-copy",
      "--no-graph",
      "--no-pager",
      "--color=never",
      "-T",
      'commit_id ++ "\\n"',
    ],
    { cwd, timeout: 2500 },
  );
  const ahead = (aheadResult.stdout ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0).length;

  return { bookmark: anchor.bookmark, ahead };
}

async function readFileCounts(
  pi: ExtensionAPI,
  cwd: string,
): Promise<FileCounts> {
  const result = await pi.exec(
    "jj",
    ["status", "--quiet", "--no-pager", "--color=never"],
    {
      cwd,
      timeout: 2500,
    },
  );

  return parseJjStatusCounts(result.stdout ?? "");
}

// `jj` Refresh strategy: dual mechanism for comprehensive updates
// 1. turn_end event: Catches working copy changes made by the AI (file edits without jj commands)
// 2. fs.watch on .jj/: Catches jj metadata changes (commits, bookmarks) from any source
// Why both? jj is lazy - editing files doesn't touch .jj/, and AI file edits don't trigger fs.watch

export default function (pi: ExtensionAPI) {
  let requestRefresh: (() => void) | undefined;

  pi.on("turn_end", () => {
    requestRefresh?.();
  });

  pi.on("session_shutdown", () => {
    requestRefresh = undefined;
  });

  pi.on("session_start", (_event, ctx) => {
    const jjRoot = findJjRoot(ctx.cwd);

    if (!jjRoot) {
      requestRefresh = undefined;
      ctx.ui.setFooter(undefined);
      return;
    }

    let jjInfo: JjBookmarkInfo = { bookmark: "(loading…)", ahead: 0 };
    let fileCounts: FileCounts = {
      added: 0,
      changed: 0,
      deleted: 0,
      conflicted: 0,
    };
    let disposed = false;
    let refreshInFlight = false;
    let refreshQueued = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let jjWatcher: FSWatcher | undefined;

    const refresh = async (tui: { requestRender(): void }) => {
      if (refreshInFlight) {
        refreshQueued = true;
        return;
      }

      refreshInFlight = true;

      do {
        refreshQueued = false;

        try {
          const [nextJjInfo, nextFileCounts] = await Promise.all([
            readJjBookmarkInfo(pi, jjRoot),
            readFileCounts(pi, jjRoot),
          ]);

          if (!disposed) {
            jjInfo = nextJjInfo;
            fileCounts = nextFileCounts;
          }
        } catch (error) {
          pi.logger?.debug?.("jj-footer: refresh failed", error);
          if (!disposed) {
            jjInfo = { bookmark: "(unavailable)", ahead: 0 };
            fileCounts = { added: 0, changed: 0, deleted: 0, conflicted: 0 };
          }
        }
      } while (refreshQueued && !disposed);

      refreshInFlight = false;

      if (!disposed) {
        tui.requestRender();
      }
    };

    const scheduleRefresh = (tui: { requestRender(): void }) => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        void refresh(tui);
      }, WATCH_DEBOUNCE_MS);
    };

    ctx.ui.setFooter((tui, theme, footerData) => {
      const myRequestRefresh = () => void refresh(tui);
      requestRefresh = myRequestRefresh;
      requestRefresh();

      // Watch .jj/ directory for jj metadata changes (commits, bookmarks, etc.)
      // This catches external jj operations and AI jj commands. It does NOT
      // catch file edits - jj only touches .jj/ when you run jj commands.
      if (!jjWatcher) {
        try {
          jjWatcher = watch(join(jjRoot, ".jj"), { recursive: true }, () => {
            scheduleRefresh(tui);
          });
        } catch {
          // Silently fail if we can't watch
        }
      }

      return {
        dispose() {
          disposed = true;
          if (requestRefresh === myRequestRefresh) {
            requestRefresh = undefined;
          }
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = undefined;
          }
          if (jjWatcher) {
            jjWatcher.close();
            jjWatcher = undefined;
          }
        },
        invalidate() {},
        render(width: number): string[] {
          let input = 0;
          let output = 0;
          let cacheRead = 0;
          let cacheWrite = 0;
          let cost = 0;

          for (const entry of ctx.sessionManager.getEntries()) {
            if (
              entry.type === "message" &&
              entry.message.role === "assistant"
            ) {
              const message = entry.message as AssistantMessage;
              input += message.usage.input;
              output += message.usage.output;
              cacheRead += message.usage.cacheRead;
              cacheWrite += message.usage.cacheWrite;
              cost += message.usage.cost.total;
            }
          }

          const contextUsage = ctx.getContextUsage();
          const contextPercentValue = contextUsage?.percent ?? 0;
          const contextPercent =
            contextUsage?.percent !== null
              ? Math.round(contextPercentValue).toString()
              : "?";
          const contextPercentDisplay =
            contextPercent === "?" ? `ctx ?` : `ctx ${contextPercent}%`;
          const contextColored =
            contextPercentValue > 90
              ? theme.fg("error", contextPercentDisplay)
              : contextPercentValue > 70
                ? theme.fg("warning", contextPercentDisplay)
                : contextPercentDisplay;

          const usingSubscription = ctx.model
            ? ctx.modelRegistry.isUsingOAuth(ctx.model)
            : false;
          const billingSuffix = usingSubscription ? " (sub)" : " (payg)";
          const statsParts: string[] = [];
          if (input) statsParts.push(theme.fg("dim", `↑${formatCount(input)}`));
          if (output)
            statsParts.push(theme.fg("dim", `↓${formatCount(output)}`));
          if (cacheRead)
            statsParts.push(theme.fg("dim", `-${formatCount(cacheRead)}`));
          statsParts.push(
            theme.fg("dim", `$${cost.toFixed(2)}${billingSuffix}`),
          );
          statsParts.push(contextColored);
          const statsLeft = statsParts.join(" ");

          const modelName = ctx.model
            ? `${theme.fg("dim", `${ctx.model.provider} •`)} ${ctx.model.id}`
            : "no-model";
          const thinkingLevel = pi.getThinkingLevel();
          const rightSide = ctx.model?.reasoning
            ? `${modelName} • ${thinkingLevel === "off" ? "thinking off" : thinkingLevel}`
            : modelName;

          const location = theme.fg(
            "dim",
            truncateToWidth(formatHomePath(ctx.cwd), width, "…"),
          );
          const fileCountsText =
            theme.fg("success", `${fileCounts.added}`) +
            theme.fg("dim", "·") +
            theme.fg("warning", `${fileCounts.changed}`) +
            theme.fg("dim", "·") +
            theme.fg("muted", `${fileCounts.deleted}`) +
            theme.fg("dim", "·") +
            theme.fg("error", `${fileCounts.conflicted}`);
          const bookmarkColor = jjInfo.bookmark.startsWith("(")
            ? "muted"
            : "accent";
          const bookmarkText =
            jjInfo.ahead > 0
              ? `${theme.fg(bookmarkColor, jjInfo.bookmark)}${theme.fg("muted", `+${formatCount(jjInfo.ahead)}`)}`
              : theme.fg(bookmarkColor, jjInfo.bookmark);
          const line1 = alignLeftRight(
            location,
            `${fileCountsText} ${bookmarkText}`,
            width,
          );
          const line2 = alignLeftRight(statsLeft, rightSide, width);

          const lines = [line1, line2];

          const extensionStatuses = [
            ...footerData.getExtensionStatuses().values(),
          ].filter(Boolean);
          if (extensionStatuses.length > 0) {
            lines.push(
              truncateToWidth(
                extensionStatuses.join(" "),
                width,
                theme.fg("dim", "..."),
              ),
            );
          }

          return lines;
        },
      };
    });
  });
}
