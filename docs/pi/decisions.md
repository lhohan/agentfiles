# pi decisions

Pi-specific decisions are listed in reverse chronological order (most recent first).

### pi-011: Keep built-in discovery tools active by default [Accepted]

> **In the context of** wanting fast read-only discovery without forcing shell commands for every search,
> **we decided** to add a tiny startup extension that merges the built-in `grep`, `find`, and `ls` tools into Pi's active tool list on `session_start`,
> **to achieve** quicker search and file discovery while preserving all currently active tools,
> **accepting** that tool activation is now an explicit part of the Pi package rather than left to Pi's defaults.

### pi-010: Colocate extension docs next to TypeScript files [Accepted]

> **In the context of** extension documentation,
> **facing** docs living in `docs/pi/` while the source files live in `agents/pi/.pi/agent/extensions/` increases the risk of documentation drift when code moves or changes,
> **we decided** to keep each extension's `.md` file next to its `.ts` file in the same directory,
> **to achieve** self-contained extension packages where code and docs move together.
>

### pi-009: Replace pi-web-access with Brave bx plus local fetch tools [Accepted]

> **In the context of** wanting reliable web search and content fetching in Pi,
> **facing** the complexity and external dependencies of `pi-web-access` (Exa API, Gemini API, Gemini Web, browser cookies, Keychain prompts (!) and browser pop-ups),
> **we decided** to replace `pi-web-access` with a custom Pi extension (`brave-search.ts`) backed by the Brave `bx` CLI for search and with Pi-local fetch/extract logic for pages and GitHub repos,
> **to achieve** predictable, API-only search behaviour, zero Keychain prompts, narrower trust surface, and a clearer separation between search (`bx`) and fetch (local extension),
> **accepting** that:
>   - `bx` must be installed and a Brave Search API key configured as a documented prerequisite
>   - `code_search`, YouTube/video support, and PDF extraction are dropped
>   - web-page extraction quality is "good enough" rather than Readability-grade
>   - session-scoped temp storage means responseIds do not survive session changes
>   - the extension is custom code that must be maintained
>
> **Rationale:** `bx context` is purpose-built for AI agents and returns clean pre-extracted text without requiring HTML parsing libraries at search time. Removing `pi-web-access` eliminates the entire provider fallback chain and its associated credential surfaces. Local fetch logic replaces only the page/repo extraction paths we actually use, with zero extra npm dependencies. A vendored `bx` skill at `agents/dotagents/.agents/skills/bx/` preserves cross-agent portability for search workflows.
>
> **Scope limit:** The extension registers exactly three tools (`web_search`, `fetch_content`, `get_fetched_content`).

### pi-008: Use a global questionnaire tool for bounded clarification flows [Accepted]

> **In the context of** wanting Pi to reduce clarification friction across planning and non-planning workflows,
> **facing** the awkwardness of asking multiple bounded questions in prose and forcing the user to scroll chat history to recover the active choices,
> **we decided** to add a global Pi questionnaire extension based on Pi's shipped example and steer its usage from `agents/pi/.pi/agent/APPEND_SYSTEM.md`,
> **to achieve** a reusable tabbed clarification UI for multiple bounded questions while keeping shared cross-tool policy unchanged,
> **accepting** one more Pi-specific interaction mechanism that should be used narrowly for bounded option selection rather than open-ended discussion.

### pi-007: Use APPEND_SYSTEM.md for Pi-only first-message behavior [Accepted]

> **In the context of** sharing one global `AGENTS.md` across Pi, OpenCode, and Codex,
> **facing** the need for Pi to reliably introduce itself in the first message of each new session without imposing that behavior on other tools,
> **we decided** to put the first-message intro instruction in `agents/pi/.pi/agent/APPEND_SYSTEM.md` instead of the shared `AGENTS.md`,
> **to achieve** Pi-specific startup behavior while keeping the shared global policy file tool-neutral,
> **accepting** one Pi-specific behaviour not shared by the other agents.

### pi-006: Adopt pi-prompt-template-model for prompt-owned model selection [Accepted]

> **In the context of** wanting prompts to be executed by the most suited (performance, capability, speed, cost) language model,
> **facing** the need to manage models for `/plan` ,
> **we decided** to adopt the third-party extension `pi-prompt-template-model@0.7.3` as a pinned package,
> **to achieve** prompt-specific model selection via frontmatter,
> **accepting** an increased trust surface (third-party executable code).
>
> **Rationale:** The extension provides exactly the needed capability (frontmatter-declared model, automatic restore) without custom code. We limit the feature surface to `model`, `thinking`, and default `restore` behavior only. The package is pinned at `0.7.3` following the same pattern as `pi-web-access` (pi-003).
>
> **Scope limit:** Only `agents/pi/.pi/agent/prompts/plan.md` uses frontmatter initially. Future prompts may adopt the same pattern without further extension changes.

### pi-005: Add a lightweight read-only `/plan` prompt [Accepted]

> **In the context of** adding prompt templates to the Pi package,
> **facing** the need for a planning mode that stays clearly separate from execution,
> **we decided** to add a lightweight read-only `/plan` prompt at `agents/pi/.pi/agent/prompts/plan.md`,
> **to achieve** repo-first planning that surfaces unresolved decisions before implementation,
> **accepting** an extra clarification round when material decisions remain unresolved and an explicit handoff before any execution begins.

Rationale: The prompt was shaped by reviewing existing planning guidance and OpenCode's plan mode, then adapting those ideas to Pi's read-only planning workflow.

### pi-004: Prevent `jj` footer refresh from mutating working-copy commits [Accepted]

> **In the context of** the custom Pi `jj` footer extension polling repository state,
> **facing** accidental working-copy commit rewrites/snapshots caused by read-only footer refresh commands,
> **we decided** to pass `--ignore-working-copy` to all `jj` commands used by the extension (including `jj status`),
> **to achieve** side-effect-free footer refreshes that do not create confusing JJ history churn,
> **accepting** that working-copy file-count indicators may lag until the working copy is snapshotted by normal `jj` operations.

### pi-003: Pin `pi-web-access` to a reviewed release [Accepted]

> **In the context of** loading the `pi-web-access` package inside Pi,
> **facing** the fact that Pi packages run with full system access and can change behaviour on update,
> **we decided** to pin `pi-web-access` to the reviewed release `0.10.6` in `agents/pi/.pi/agent/settings.json`,
> **to achieve** reproducible installs and reduce the chance of unreviewed behaviour changes,
> **accepting** that updates now require an explicit manual version bump and review.

### pi-002: Use Exa API and Gemini API only — disable browser-based fallbacks [Accepted]

> **In the context of** configuring search providers for the pi-web-access extension,
> **facing** unwanted Keychain pop-ups from Gemini Web cookie extraction and the desire for predictable API-only behavior,
> **we decided** to strictly limit search to Exa API and Gemini API only, using environment variables to force API mode and avoid browser cookie access entirely,
> **to achieve** clean, reproducible search behavior without GUI pop-ups or browser dependencies,
> **accepting** that:
>   - Both `EXA_API_KEY` and `GEMINI_API_KEY` must be set as environment variables
>   - If Exa API fails, we must manually switch to Gemini API (no automatic fallback)
>   - Perplexity and Gemini Web are completely unavailable (no zero-config fallbacks)
>
> **Rationale:** Setting `EXA_API_KEY` forces Exa to use direct API instead of MCP. Setting `GEMINI_API_KEY` forces Gemini API instead of Gemini Web (which requires browser cookies and triggers Keychain pop-ups). With `provider: "exa"` and the API key present, Exa failures throw errors rather than falling back. For Gemini fallback, explicitly pass `provider: "gemini"` in the `web_search` call.

### pi-001: Introduce pi-web-access extension for web search and content extraction [Accepted]

> **In the context of** using Pi as a coding agent for research and troubleshooting tasks,
> **facing** the limitation that Pi cannot search the web or access external documentation without manual URL provision,
> **we decided** to install and configure the `pi-web-access` extension, accepting its dependency on external search APIs,
> **to achieve** native web search, content extraction, GitHub repo cloning, and video analysis within Pi conversations,
> **accepting** that web search requires external providers (no self-hosted option is practical) and may incur usage costs beyond free tiers.
>
> **Rationale:** Direct HTTP fetching (like curl) works for known URLs but cannot search—search requires a web index which is impractical to self-host. The extension provides a clean abstraction with smart fallbacks (Exa → Perplexity → Gemini API → Gemini Web), enabling research workflows like finding library documentation, checking recent API changes, or understanding error messages without leaving the agent context. The trade-off of external dependencies is justified by the significant productivity gain in research-heavy coding tasks.
