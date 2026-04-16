import {
  FooterComponent,
  type ExtensionAPI,
  type ExtensionContext,
  type ReadonlyFooterDataProvider,
} from "@mariozechner/pi-coding-agent";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Docs
 * - Canonical maintainer docs: docs/pi/jj-footer-extension.md
 *
 * Doc sync checklist (update docs when changing):
 * - footer label format/content
 * - jj commands/revsets used for data collection
 * - status-code classification (+, ~, -, !)
 * - refresh/watch/error-fallback behaviour
 */
const WATCH_DEBOUNCE_MS = 500;

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

type JjState = {
  jjInfo: JjBookmarkInfo;
  fileCounts: FileCounts;
};

type JjStateController = {
  getState(): JjState;
  refresh(): Promise<void>;
  subscribe(listener: () => void): () => void;
  isActive(): boolean;
  dispose(): void;
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

/**
 * Classify a `jj status` line by its diff-summary code.
 *
 * Real file-status lines always follow the pattern `<CODE> <PATH>`
 * (e.g. `M file.txt`, `A file.txt`, `R {old => new}`).
 * Informational lines like `The working copy has no changes.` or
 * `Untracked paths:` must NOT be classified — they happen to start with
 * status-code characters (`T`, `U`) but are followed by a letter, not a space.
 */
function classifyJjStatusLine(
  line: string,
): "added" | "changed" | "deleted" | "conflicted" | null {
  const trimmed = line.trimStart();
  // File-status lines: single-char code followed by a space, then the path.
  if (trimmed.length < 2 || trimmed[1] !== " ") return null;

  switch (trimmed[0]) {
    case "A":
    case "?":
      return "added";
    case "M":
    case "R":
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

function formatJjBranchLabel(state: JjState): string {
  const countParts: string[] = [];

  if (state.fileCounts.added > 0) {
    countParts.push(`+${formatCount(state.fileCounts.added)}`);
  }

  if (state.fileCounts.changed > 0) {
    countParts.push(`~${formatCount(state.fileCounts.changed)}`);
  }

  if (state.fileCounts.deleted > 0) {
    countParts.push(`-${formatCount(state.fileCounts.deleted)}`);
  }

  if (state.fileCounts.conflicted > 0) {
    countParts.push(`!${formatCount(state.fileCounts.conflicted)}`);
  }

  const ahead =
    state.jjInfo.ahead > 0 ? `↑${formatCount(state.jjInfo.ahead)}` : "";
  const bookmarkWithAhead = `${state.jjInfo.bookmark}${ahead}`;

  if (countParts.length === 0) {
    return bookmarkWithAhead;
  }

  return `${countParts.join(" ")} ${bookmarkWithAhead}`;
}

function createWrappedFooterData(
  footerData: ReadonlyFooterDataProvider,
  controller: JjStateController,
): ReadonlyFooterDataProvider {
  return {
    getGitBranch(): string | null {
      const branch = footerData.getGitBranch();
      if (branch !== "detached") return branch;
      if (!controller.isActive()) return branch;
      return formatJjBranchLabel(controller.getState());
    },
    getExtensionStatuses() {
      return footerData.getExtensionStatuses();
    },
    getAvailableProviderCount() {
      return footerData.getAvailableProviderCount();
    },
    onBranchChange(callback) {
      return footerData.onBranchChange(callback);
    },
  };
}

function createFooterSessionShim(ctx: ExtensionContext, pi: ExtensionAPI) {
  return {
    get state() {
      return {
        model: ctx.model,
        thinkingLevel: pi.getThinkingLevel(),
      };
    },
    sessionManager: ctx.sessionManager,
    modelRegistry: ctx.modelRegistry,
    getContextUsage: () => ctx.getContextUsage(),
  };
}

// `jj` Refresh strategy: dual mechanism for comprehensive updates
// 1. turn_end event: catches working copy changes made by the AI (file edits without jj commands)
// 2. fs.watch on .jj/: catches jj metadata changes (commits, bookmarks) from any source
// Why both? jj is lazy - editing files doesn't touch .jj/, and AI file edits don't trigger fs.watch
function createJjStateController(pi: ExtensionAPI, jjRoot: string): JjStateController {
  let state: JjState = {
    jjInfo: { bookmark: "(loading…)", ahead: 0 },
    fileCounts: { added: 0, changed: 0, deleted: 0, conflicted: 0 },
  };

  let disposed = false;
  let refreshInFlight = false;
  let refreshQueued = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let jjWatcher: FSWatcher | undefined;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const refresh = async () => {
    if (disposed) return;

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
          state = {
            jjInfo: nextJjInfo,
            fileCounts: nextFileCounts,
          };
        }
      } catch (error) {
        pi.logger?.debug?.("jj-footer: refresh failed", error);
        if (!disposed) {
          state = {
            jjInfo: { bookmark: "(unavailable)", ahead: 0 },
            fileCounts: { added: 0, changed: 0, deleted: 0, conflicted: 0 },
          };
        }
      }
    } while (refreshQueued && !disposed);

    refreshInFlight = false;

    if (!disposed) {
      notify();
    }
  };

  const scheduleRefresh = () => {
    if (disposed) return;
    if (debounceTimer) return;

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void refresh();
    }, WATCH_DEBOUNCE_MS);
  };

  try {
    jjWatcher = watch(join(jjRoot, ".jj"), { recursive: true }, () => {
      scheduleRefresh();
    });
  } catch {
    // Silently fail if we can't watch
  }

  return {
    getState() {
      return state;
    },
    async refresh() {
      await refresh();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isActive() {
      return !disposed;
    },
    dispose() {
      disposed = true;
      listeners.clear();

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }

      if (jjWatcher) {
        jjWatcher.close();
        jjWatcher = undefined;
      }
    },
  };
}

export default function (pi: ExtensionAPI) {
  let requestRefresh: (() => void) | undefined;
  let activeController: JjStateController | undefined;

  const clearController = () => {
    activeController?.dispose();
    activeController = undefined;
  };

  pi.on("turn_end", () => {
    requestRefresh?.();
  });

  pi.on("session_shutdown", () => {
    requestRefresh = undefined;
    clearController();
  });

  pi.on("session_start", (_event, ctx) => {
    requestRefresh = undefined;
    clearController();

    const jjRoot = findJjRoot(ctx.cwd);
    if (!jjRoot) {
      ctx.ui.setFooter(undefined);
      return;
    }

    const controller = createJjStateController(pi, jjRoot);
    activeController = controller;

    const refreshNow = () => void controller.refresh();
    requestRefresh = refreshNow;

    ctx.ui.setFooter((tui, _theme, footerData) => {
      const footerComponent = new FooterComponent(
        createFooterSessionShim(ctx, pi) as any,
        createWrappedFooterData(footerData, controller),
      );

      const unsubscribeState = controller.subscribe(() => {
        footerComponent.invalidate();
        tui.requestRender();
      });

      refreshNow();

      return {
        dispose() {
          unsubscribeState();
          footerComponent.dispose();

          if (requestRefresh === refreshNow) {
            requestRefresh = undefined;
          }

          if (activeController === controller) {
            controller.dispose();
            activeController = undefined;
          }
        },
        invalidate() {
          footerComponent.invalidate();
        },
        render(width: number): string[] {
          return footerComponent.render(width);
        },
      };
    });
  });
}
