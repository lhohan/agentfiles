# pi decisions

Pi-specific decisions are listed in reverse chronological order (most recent first).

### pi-023: Use H1 title as telemetry anchor for prompt fallback detection [Accepted]

> **In the context of** the `before_agent_start` fallback needing to detect which prompt template was invoked,
> **facing** prefix-based matching (first 180 chars of normalized body) failing when the prompt body contains template placeholders like `$@` that get substituted before the rendered prompt is compared,
> **we decided** to extract the first Markdown H1 title from each prompt body and use exact title matching as the primary fallback, retaining prefix matching only for prompts without an H1 title,
> **to achieve** reliable prompt attribution even for prompts with placeholder-heavy bodies (e.g. `/implement`), while keeping the rule simple and the matching deterministic,
> **accepting** that:
>   - prompts must include a unique fixed H1 title as the first body line after frontmatter for title-based matching to work
>   - prefix matching remains available for prompts that lack an H1 title
>   - the H1 title is also stored in `prompt_invoked` events as `promptTitle` for display in usage reports
>
> **Rationale:** The H1 title is a stable, fixed string that does not change between the template file and the rendered prompt, unlike the body prefix which can shift when template placeholders are replaced at runtime. Title matching avoids the brittleness of character-offset prefix comparisons while being simple enough to implement with a single regex.

### pi-022: Show usage-stats extension context inline [Accepted]

> **In the context of** making usage-stats reports explain which extension contributed a tool call or slash command,
> **facing** a standalone "Extensions Used" summary that repeated aggregate counts without showing where the extension affected a session,
> **we decided** to remove the standalone extension-usage report section and display extension ownership inline for custom tools and extension slash commands,
> **to achieve** more actionable context near the relevant report rows and recent events,
> **accepting** that:
>   - loaded and inventoried extension events remain available in the raw event log rather than as a dedicated summary section
>   - extension usage is no longer presented as a separate top-level ranking
>   - zero-use custom-tool inventory rows can only show an owner when usage telemetry has recorded one
>
> **Rationale:** A separate extension summary requires extra scrolling and does not show which command or tool made the extension relevant. Inline labels such as `web_search (bx)` keep the extension context next to the user-facing action while preserving raw `extension_loaded` and `extension_inventory` events for audit/debug use.

### pi-021: Build usage-stats artifact rankings from report-time inventory [Accepted]

> **In the context of** making usage-stats show consistent most-used, least-used, and full-list views for prompts, skills, custom tools, and enabled models,
> **facing** the choice between recording inventory snapshots at Pi startup or rediscovering current inventory when reports are generated,
> **we decided** to keep runtime telemetry usage-only and discover available artifacts in the shared reporting library,
> **to achieve** lightweight startup behaviour while keeping CLI and HTML reports aligned through one ranking implementation,
> **accepting** that:
>   - zero-use rows reflect the current installed/configured inventory, not historical inventory at event time
>   - custom-tool zero-use rows appear only for tools rediscovered from local extension source files
>   - enabled-model zero-use rows are skipped when `enabledModels` is absent or empty
>   - least-used top-10 lists may be shorter than ten rows to avoid overlap with the most-used top-10 list
>
> **Rationale:** Usage capture should remain cheap and append-only. Report-time discovery is sufficient for the question these reports answer: which currently available artifacts are used, under-used, or unused. Keeping discovery and ranking in `pi-usage-report-lib.mjs` prevents the CLI and HTML reporters from drifting.

### pi-020: Use `/plan` as the structural reference for `/review` read-only governance [Accepted]

> **In the context of** making `/review` explicitly read-only and structurally consistent with other enhanced prompts,
> **facing** the choice between duplicating read-only governance locally in each prompt or extracting a shared mechanism,
> **we decided** to duplicate the read-only governance shape from `/plan` directly in `/review`,
> **to achieve** explicit, self-contained prompts that are easy to read and reason about without hidden shared machinery,
> **accepting** that:
>   - the read-only prohibitions and governance language will be duplicated between `/plan` and `/review`
>   - future changes to the shared read-only contract must be applied to both prompts
>   - drift risk is small while there are only two enhanced prompts using this pattern

**Rationale:** With only `/plan` and `/review` in the enhanced prompt set, a shared mechanism (include, template, or frontmatter-driven injection) would add complexity disproportionate to the benefit. Keeping the read-only contract explicit in each prompt body follows the precedent of `pi-019` (explicit skill delegation in prompt text) and makes each prompt independently understandable.

**Scope limit:** This decision applies only to read-only governance and structural alignment between `/plan` and `/review`. It does not constrain future prompts from adopting a shared mechanism if the number of read-only prompts grows.

### pi-019: Keep `/review` skill loading explicit in prompt body [Accepted]

> **In the context of** adding a reusable `/review` prompt under `agents/pi/.pi/agent/prompts/enhanced/`,
> **facing** the choice between frontmatter-driven `skill:` injection and explicit workflow delegation in prompt text,
> **we decided** to keep frontmatter limited to model controls (`model`, `thinking`, `restore`) and invoke `code-review` explicitly from the prompt body,
> **to achieve** behaviour that stays aligned with the documented frontmatter scope while keeping skill usage visible in prompt instructions,
> **accepting** that prompt authors must keep explicit skill-call wording up to date when workflow expectations change.

### pi-018: Bounded coupling to `pi-prompt-template-model` for prompt telemetry [Accepted]

> **In the context of** wanting `usage-stats` to record prompt invocations for extension-managed prompts like `/plan`,
> **facing** the fact that `pi-prompt-template-model` registers prompts as extension commands that bypass Pi's native `input` event,
> **we decided** to add a second prompt index in `usage-stats` that scans the same discovery directories as `pi-prompt-template-model` (`~/.pi/agent/prompts` and `<cwd>/.pi/prompts`) and performs prefix matching in `before_agent_start` as a fallback,
> **to achieve** prompt telemetry for `/plan` and other managed prompts with provenance and extension attribution,
> **accepting** that:
>   - this creates deliberate, bounded coupling to `pi-prompt-template-model`'s discovery semantics and frontmatter conventions
>   - prefix-based inference in `before_agent_start` can still misattribute manually pasted text or near-identical prompt bodies
>   - native Pi prompts take precedence over extension-managed prompts when both could match
>   - generalisation to arbitrary third-party prompt-wrapper extensions is explicitly out of scope
>
> **Rationale:** The `before_agent_start` fallback is the only available interception point for extension-managed prompt commands, because Pi does not expose a generic post-dispatch "extension command executed" event. Synthesising `sourceInfo` from the prompt file path keeps reporter logic consistent without special-casing extension-managed prompts everywhere. The coupling is bounded to discovery directory scanning and a simple frontmatter heuristic, not deep integration with `pi-prompt-template-model`'s runtime.

**Amendment (2026-04-26):** `usage-stats` now resolves the command first and only records an extension-managed prompt from `input` when the resolved command metadata confirms the scanned `pi-prompt-template-model` entry. This avoids attributing stale scans or command-name collisions as managed prompts while leaving `before_agent_start` fallback inference unchanged.

**Amendment (2026-04-27):** The fallback prefix matcher now accepts any non-empty managed prompt body instead of enforcing a 32-character minimum. That keeps short prompt templates such as `/implement` observable while still relying on the primary command-resolution path first.

### pi-017: Do not track frontmatter-injected skills in usage-stats [Accepted]

> **In the context of** wanting the `usage-stats` extension to record skill loads triggered by the `skill:` frontmatter field in `pi-prompt-template-model` prompts,
> **facing** the fact that `pi-prompt-template-model` resolves and injects skills internally via `before_agent_start`, bypassing both `/skill:name` commands and the agent `read` tool,
> **we decided** to keep the extension bounded to Pi's native extension API and **not** parse prompt-template frontmatter or peek into `pi-prompt-template-model`'s internal behavior,
> **to achieve** a clean separation where `usage-stats` depends only on Pi's out-of-the-box events (`input`, `tool_call`, `before_agent_start`, etc.) and remains agnostic to third-party extension internals,
> **accepting** that skills loaded via prompt-template frontmatter will not appear in `skill_loaded` telemetry and will only be visible indirectly through `prompt_invoked` events.
>
> **Rationale:** Tracking frontmatter-injected skills would require `usage-stats` to know the `skill:` field schema, the YAML frontmatter format, and the file-resolution logic of another extension. That coupling makes `usage-stats` brittle to upstream changes in `pi-prompt-template-model` and violates the principle that each extension should interact through Pi's public API surface. If `pi-prompt-template-model` later emits its own event for skill injection, `usage-stats` can listen for that event without any structural coupling.

### pi-016: Place Pi usage-report executable under `bin/`, not `extensions/` [Accepted]

> **In the context of** shipping a standalone usage-stats reporting utility alongside the Pi package,
> **facing** confusion from keeping a non-extension executable inside `extensions/`,
> **we decided** to install the reporter as `~/.pi/agent/bin/pi-usage-report` (source: `agents/pi/.pi/agent/bin/pi-usage-report`) and keep `extensions/` for extension assets only,
> **to achieve** clearer package boundaries and direct executable invocation without PATH or wrapper scripts,
> **accepting** that:
>   - existing docs and references to `~/.pi/agent/extensions/usage-stats-viewer.mjs` must be updated
>   - users invoke the reporter by explicit path (`~/.pi/agent/bin/pi-usage-report`) unless they add their own PATH entries
>   - the usage-stats feature documentation remains at `agents/pi/.pi/agent/extensions/usage-stats.md`
>
> **Rationale:** The reporter is a standalone Node executable, not a Pi extension. Placing it in `bin/` matches user expectation and aligns with stowed package structure while preserving the current no-wrapper setup.

### pi-015: Distinguish `model_used` from `model_select` in usage stats [Accepted]

> **In the context of** wanting usage statistics to reflect which models actually handled prompts,
> **facing** the fact that `model_select` records every browsing and cycling action, inflating counts for models merely previewed before a different model was chosen,
> **we decided** to add a new `model_used` event that fires once per `agent_start` on the first `before_provider_request`, using `ctx.model` as the definitive active model,
> **to achieve** accurate per-prompt model usage counts while preserving raw `model_select` telemetry for ad hoc inspection,
> **accepting** that:
>   - historical logs will not contain `model_used` events until new sessions accumulate them
>   - the count answers "which model handled this prompt?" rather than "how many provider round-trips did each model make?"
>   - `ctx.model` must be available and accurate during `before_provider_request`
>
> **Rationale:** The `model_select` event remains useful for understanding browsing behavior, but it is the wrong source for usage summaries. Counting at `before_provider_request` guarantees the recorded model is the one actually sent to the provider. Resetting the flag on `agent_start` ensures exactly one count per user prompt even when tool calls trigger multiple provider requests.

### pi-014: Add usage-stats extension and viewer for Pi usage analytics [Accepted]

> **In the context of** wanting to understand which skills, prompts, extensions, and models are actually used day-to-day,
> **facing** the lack of any built-in usage telemetry beyond anonymous install/update pings,
> **we decided** to build a custom Pi extension (`usage-stats.ts`) that intercepts `input`, `tool_call`, `resources_discover`, `model_select`, and session lifecycle events, writing append-only JSONL to `~/.pi/agent/usage-stats.jsonl`, plus a standalone Node.js viewer script (`usage-stats-viewer.mjs`) that aggregates and displays the data,
> **to achieve** local, private usage statistics without external services, with enough granularity to answer questions like "which skills do I invoke most?" and "which models do I switch to most often?",
> **accepting** that:
>   - implicit skill loads are inferred from `read` tool calls targeting `SKILL.md` files, not from an explicit "skill loaded" event
>   - built-in tools are excluded from tracking to reduce noise
>   - the stats file grows unbounded and may need occasional manual rotation
>   - the viewer is a plain `.mjs` script without a TUI or web interface
>
> **Rationale:** The Pi extension API exposes all necessary events (`input`, `tool_call`, `resources_discover`, `model_select`, etc.) to build this without modifying Pi internals. JSONL was chosen for crash-safe append-only writes and easy line-by-line parsing. The viewer is plain JavaScript to avoid any build step or npm dependencies. Classification of slash commands uses `pi.getCommands()` to distinguish prompts from extension commands, giving accurate source attribution. A 2-second debounced flush balances durability with I/O overhead.
>
> **Scope limit:** The extension does not track built-in tool usage, per-project breakdowns, or time-spent metrics.

### pi-013: Remove pi-btw from the default Pi package list [Accepted]

> **In the context of** a pinned side-conversation extension that proved unreliable in practice,
> **facing** an extension whose focus toggle did not work consistently in the terminal and whose overlay could crash Pi's renderer,
> **we decided** to remove `pi-btw` from the default Pi package list,

### pi-012: Pin pi-btw for parallel side conversations [Accepted]

> **In the context of** repeatedly wanting to ask a few questions while the main Pi thread keeps running,
> **facing** the choice between ad-hoc steering messages and a dedicated side-conversation workflow,
> **we decided** to install `pi-btw` as a pinned npm package at `0.3.7`,
> **to achieve** a repeatable `/btw` side-thread workflow without relying on an unversioned package update,
> **accepting** the extra trust surface of another third-party extension and the fact that side-conversation behaviour now lives in a separate package.

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
> **Scope limit:** Only `agents/pi/.pi/agent/prompts/enhanced/plan.md` uses frontmatter initially. Future prompts may adopt the same pattern without further extension changes.

### pi-005: Add a lightweight read-only `/plan` prompt [Accepted]

> **In the context of** adding prompt templates to the Pi package,
> **facing** the need for a planning mode that stays clearly separate from execution,
> **we decided** to add a lightweight read-only `/plan` prompt at `agents/pi/.pi/agent/prompts/enhanced/plan.md`,
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
