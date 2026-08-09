import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Doc sync checklist (update docs when changing):
 * - footer status-line key and clear-on-shutdown contract (guarded `?.` chain)
 * - label format/content
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
  changeId: string;
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

export type JjLabelRole = "accent" | "success" | "warning" | "error" | "muted";

export type JjLabelPart = {
  text: string;
  role: JjLabelRole;
};

// Spans within a group are joined with a space; groups with " · ".
export type JjLabelGroup = JjLabelPart[];

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

export function formatCount(value: number): string {
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

export function parseJjBookmarkAnchor(stdout: string): JjBookmarkAnchor | null {
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
export function classifyJjStatusLine(
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

export function parseJjStatusCounts(stdout: string): FileCounts {
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

  const [aheadResult, changeIdResult] = await Promise.all([
    anchor
      ? pi.exec(
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
        )
      : Promise.resolve({ stdout: "" }),
    pi.exec(
      "jj",
      [
        "log",
        "-r",
        "@",
        "--ignore-working-copy",
        "--no-graph",
        "--no-pager",
        "--color=never",
        "-T",
        'change_id.short() ++ "\\n"',
      ],
      { cwd, timeout: 2500 },
    ),
  ]);

  const ahead = anchor
    ? (aheadResult.stdout ?? "")
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0).length
    : 0;
  const changeId =
    (changeIdResult.stdout ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";

  return { bookmark: anchor?.bookmark ?? "(no bookmark)", ahead, changeId };
}

async function readFileCounts(
  pi: ExtensionAPI,
  cwd: string,
): Promise<FileCounts> {
  const result = await pi.exec(
    "jj",
    [
      "status",
      "--ignore-working-copy",
      "--quiet",
      "--no-pager",
      "--color=never",
    ],
    {
      cwd,
      timeout: 2500,
    },
  );

  return parseJjStatusCounts(result.stdout ?? "");
}

/**
 * Compose the jj status label as plain semantic segments.
 *
 * Groups are joined with " · " (muted) at render time; spans within a group
 * are joined with a space. Roles map to existing theme colours only at the
 * publishing boundary via `ctx.ui.theme.fg(role, text)`.
 */
export function buildJjLabelGroups(state: JjState): JjLabelGroup[] {
  const bookmark = state.jjInfo.bookmark;

  // Loading/unavailable are provisional states: do not fabricate a change id
  // or a clean/dirty verdict next to them.
  if (bookmark === "(loading…)" || bookmark === "(unavailable)") {
    return [
      [{ text: "jj", role: "accent" }],
      [{ text: bookmark, role: bookmark === "(unavailable)" ? "error" : "muted" }],
    ];
  }

  const bookmarkRole: JjLabelRole =
    bookmark === "(no bookmark)" ? "muted" : "accent";
  const aheadParts: JjLabelPart[] =
    state.jjInfo.ahead > 0
      ? [{ text: `↑${formatCount(state.jjInfo.ahead)}`, role: "muted" }]
      : [];

  const countParts: JjLabelPart[] = [];
  if (state.fileCounts.added > 0) {
    countParts.push({ text: `+${formatCount(state.fileCounts.added)}`, role: "success" });
  }
  if (state.fileCounts.changed > 0) {
    countParts.push({ text: `~${formatCount(state.fileCounts.changed)}`, role: "warning" });
  }
  if (state.fileCounts.deleted > 0) {
    countParts.push({ text: `-${formatCount(state.fileCounts.deleted)}`, role: "error" });
  }
  if (state.fileCounts.conflicted > 0) {
    countParts.push({ text: `!${formatCount(state.fileCounts.conflicted)}`, role: "error" });
  }

  const groups: JjLabelGroup[] = [
    [{ text: "jj", role: "accent" }],
    [{ text: bookmark, role: bookmarkRole }, ...aheadParts],
  ];

  if (state.jjInfo.changeId) {
    groups.push([{ text: `@${state.jjInfo.changeId}`, role: "muted" }]);
  }

  groups.push(
    countParts.length > 0
      ? countParts
      : [{ text: "clean", role: "success" }],
  );

  return groups;
}

export function renderJjLabel(
  groups: JjLabelGroup[],
  fg: (role: JjLabelRole, text: string) => string,
): string {
  return groups
    .map((group) => group.map((part) => fg(part.role, part.text)).join(" "))
    .join(fg("muted", " · "));
}

// `jj` refresh strategy: dual mechanism for timely updates
// 1. turn_end event: refreshes after agent actions so footer state stays current
// 2. fs.watch on .jj/: catches jj metadata changes (commits, bookmarks) from any source
// Why both? filesystem edits don't reliably emit .jj/ watcher events, while jj ops do.
function createJjStateController(
  pi: ExtensionAPI,
  jjRoot: string,
): JjStateController {
  let state: JjState = {
    jjInfo: { bookmark: "(loading…)", ahead: 0, changeId: "" },
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
            jjInfo: { bookmark: "(unavailable)", ahead: 0, changeId: "" },
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
  let activeController: JjStateController | undefined;

  const clearController = () => {
    activeController?.dispose();
    activeController = undefined;
  };

  pi.on("turn_end", () => {
    void activeController?.refresh();
  });

  pi.on("session_shutdown", (_event, ctx) => {
    clearController();
    ctx?.ui?.setStatus?.("jj-footer", undefined);
  });

  pi.on("session_start", (_event, ctx) => {
    // Session switch/fork/reload can fire session_start without a prior
    // session_shutdown; clear any leftover controller and stale status first.
    clearController();
    ctx.ui.setStatus("jj-footer", undefined);

    const jjRoot = findJjRoot(ctx.cwd);
    if (!jjRoot) return;

    const controller = createJjStateController(pi, jjRoot);
    activeController = controller;

    // Closure-scoped: never module scope, where a value left over from a
    // previous session could suppress the new session's first publish.
    let lastPublished: string | undefined;

    const publish = () => {
      const label = renderJjLabel(
        buildJjLabelGroups(controller.getState()),
        (role, text) => ctx.ui.theme.fg(role, text),
      );
      if (label === lastPublished) return;
      lastPublished = label;
      ctx.ui.setStatus("jj-footer", label);
    };

    controller.subscribe(publish);
    publish();
    void controller.refresh();
  });
}
