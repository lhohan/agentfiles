# pi decisions

Pi-specific decisions are listed in reverse chronological order (most recent first).

### pi-028: Use a `sessionStartModel` setting separate from Pi's built-in `defaultModel` [Accepted]

**In the context of** wanting each new Pi session to start with a known model regardless of what model was last selected

**Facing** Pi's built-in behaviour where the `/model` selector IMMEDIATELY writes the chosen model to `defaultModel`/`defaultProvider` in `settings.json` — meaning the "last-used" model IS the persisted `defaultModel` and there is no separate "last-session model" vs. "desired default" distinction

> **We decided** to introduce a user-facing `sessionStartModel` key (separate from Pi's own `defaultModel`) and build an extension (`force-session-start-model`) that reads it on `session_start` for `"startup"` and `"new"` reasons only

**To achieve** a user-configurable model that resets every new session without fighting Pi's own model-persistence mechanism

**Accepting**
- the extension uses its own config key (`sessionStartModel`) to avoid colliding with Pi's `defaultModel`
- the extension only fires on `session_start` reasons `"startup"` and `"new"` — NOT on `"resume"`, `"fork"`, `"reload"`, or `"continue"` since those restore model from session state or are not fresh-session starts
- the user must provide a valid `provider/modelId` string that can be split and resolved; if the model is not found or has no API key configured, the extension warns rather than silently failing
- project-local overrides are explicitly out of scope for v1

**Rationale** From source-code analysis, Pi's `ModelSelectorComponent` calls `settingsManager.setDefaultModelAndProvider()` immediately when the user selects a model via `/model` or `Ctrl+P`. The `findInitialModel()` resolution order (settings → provider defaults → first available) means the user's last selection always becomes the next session's starting model. There is no built-in distinction between "user's desired default" and "last-used model." A separate config key avoids competing with Pi's own persistence without patching or intercepting Pi internals.

### pi-027: Use complementary models for plan drafting and plan critique [Accepted]

**In the context of** adding a `/review-plan` prompt to critically evaluate implementation plans

**Facing** the choice of which model should perform plan critique versus plan drafting

> **We decided** to use `openai-codex/gpt-5.4` for `/plan` (drafting) and `opencode-go/deepseek-v4-pro` for `/review-plan` (critique)

**To achieve** a complementary model split where each phase plays to the respective model's strengths: OpenAI for structured planning and DeepSeek for deep reasoning and critical analysis

**Accepting**
- the model split must be maintained manually in prompt frontmatter
- users may override the model via Pi's model selector, breaking the intended pairing
- future prompts that follow the same draft-then-critique pattern should adopt the same model pairing for consistency

**Rationale** The `/plan` prompt already uses `openai-codex/gpt-5.4` for its strong instruction-following and structured output. DeepSeek v4 Pro excels at reasoning, identifying assumptions, and surfacing risks — exactly the posture needed for critical review. Making the split explicit and consistent helps users trust that `/review-plan` will bring a genuinely different analytical lens to the same plan text.

### pi-026: Use task-oriented over role-based system prompt [Accepted]

**In the context of** optimizing Pi for correctness-critical coding work

**Facing** evidence that expert-persona prompts can hurt coding and reasoning accuracy

> **We decided** to remove Pi's built-in "expert coding assistant" wording with a small extension

**To achieve** direct task framing with less persona noise

**Accepting** the change is coupled to Pi's current prompt text and must warn if that text changes

**Rationale** The extension is intentionally narrow: it only rewrites Pi's generated built-in system prompt and leaves user prompts, skills, and custom system prompts alone. Research basis: https://arxiv.org/html/2603.18507v1

### pi-025: Accept pi.setModel() persistence for skill-triggered model switching [Accepted]

**In the context of** adding JSON-configured model switching for `/skill:name` commands

**Facing** Pi not exposing a session-only or turn-local model switch API

> **We decided** to use the public `pi.setModel()` API in an `input` event handler

**To achieve** automatic model selection per skill without custom provider hacks or prompt-template frontmatter workarounds

**Accepting**
- the model switch is sticky and not automatically restored after the skill run ends
- users must manually change models or start a new session to revert
- documentation must clearly state this persistence caveat

**Rationale** `pi.setModel()` is the only public, stable API for changing the active model from an extension. Attempting to snapshot and restore the model around skill execution would require intercepting `agent_end` or similar, creating fragile state management and potential race conditions. The persistence trade-off is acceptable because explicit `/skill:name` invocations are intentional, and users can see the active model in the TUI footer.

**Scope limit** The extension only acts on explicit `/skill:<name>` input. It does not intercept skills loaded via frontmatter, implicit skill reads, or prompt-template expansion.

### pi-024: Remove dedicated prompt telemetry and reporting from usage-stats [Accepted]

**In the context of** simplifying the usage-stats extension and reducing its surface area

**Facing** dedicated prompt tracking that adds significant complexity (prompt indexing, title extraction, prefix matching, H1 fallback, extension-managed prompt coupling) for marginal benefit

> **We decided** to remove all prompt-specific telemetry (`prompt_invoked`) and prompt-specific reporting from `usage-stats`

**To achieve** a smaller, easier-to-maintain extension that still covers skills, tools, models, and extension commands

**Accepting**
- prompt usage is no longer tracked or reported
- managed prompts such as `/plan` and `/review` may appear as normal `extension_command_invoked` or generic `command_invoked` events
- historical `prompt_invoked` entries may still appear in raw/recent views but receive no dedicated formatting or aggregation
- decisions **pi-017**, **pi-018**, and **pi-023** are superseded by this removal

**Rationale** Prompt tracking required coupling to `pi-prompt-template-model` discovery semantics, frontmatter heuristics, and fragile fallback matching in `before_agent_start`. The signal-to-complexity ratio was poor. Removing it brings the extension back to its core purpose: tracking skills, tools, models, and extension commands through Pi's public API events.

**Supersedes** pi-017, pi-018, pi-023.

### pi-023: Use H1 title as telemetry anchor for prompt fallback detection [Superseded by pi-024]

**In the context of** the `before_agent_start` fallback needing to detect which prompt template was invoked

**Facing** prefix-based matching (first 180 chars of normalized body) failing when the prompt body contains template placeholders like `$@` that get substituted before the rendered prompt is compared

> **We decided** to extract the first Markdown H1 title from each prompt body and use exact title matching as the primary fallback, retaining prefix matching only for prompts without an H1 title

**To achieve** reliable prompt attribution even for prompts with placeholder-heavy bodies (e.g. `/implement`), while keeping the rule simple and the matching deterministic

**Accepting**
- prompts must include a unique fixed H1 title as the first body line after frontmatter for title-based matching to work
- prefix matching remains available for prompts that lack an H1 title
- the H1 title is also stored in `prompt_invoked` events as `promptTitle` for display in usage reports

**Rationale** The H1 title is a stable, fixed string that does not change between the template file and the rendered prompt, unlike the body prefix which can shift when template placeholders are replaced at runtime. Title matching avoids the brittleness of character-offset prefix comparisons while being simple enough to implement with a single regex.

### pi-022: Show usage-stats extension context inline [Accepted]

**In the context of** making usage-stats reports explain which extension contributed a tool call or slash command

**Facing** a standalone "Extensions Used" summary that repeated aggregate counts without showing where the extension affected a session

> **We decided** to remove the standalone extension-usage report section and display extension ownership inline for custom tools and extension slash commands

**To achieve** more actionable context near the relevant report rows and recent events

**Accepting**
- loaded and inventoried extension events remain available in the raw event log rather than as a dedicated summary section
- extension usage is no longer presented as a separate top-level ranking
- zero-use custom-tool inventory rows can only show an owner when usage telemetry has recorded one

**Rationale** A separate extension summary requires extra scrolling and does not show which command or tool made the extension relevant. Inline labels such as `web_search (bx)` keep the extension context next to the user-facing action while preserving raw `extension_loaded` and `extension_inventory` events for audit/debug use.

### pi-021: Build usage-stats artifact rankings from report-time inventory [Accepted]

**In the context of** making usage-stats show consistent most-used, least-used, and full-list views for prompts, skills, custom tools, and enabled models

**Facing** the choice between recording inventory snapshots at Pi startup or rediscovering current inventory when reports are generated

> **We decided** to keep runtime telemetry usage-only and discover available artifacts in the shared reporting library

**To achieve** lightweight startup behaviour while keeping CLI and HTML reports aligned through one ranking implementation

**Accepting**
- zero-use rows reflect the current installed/configured inventory, not historical inventory at event time
- custom-tool zero-use rows appear only for tools rediscovered from local extension source files
- enabled-model zero-use rows are skipped when `enabledModels` is absent or empty
- least-used top-10 lists may be shorter than ten rows to avoid overlap with the most-used top-10 list

**Rationale** Usage capture should remain cheap and append-only. Report-time discovery is sufficient for the question these reports answer: which currently available artifacts are used, under-used, or unused. Keeping discovery and ranking in `pi-usage-report-lib.mjs` prevents the CLI and HTML reporters from drifting.

### pi-020: Use `/plan` as the structural reference for `/review` read-only governance [Accepted]

**In the context of** making `/review` explicitly read-only and structurally consistent with other enhanced prompts

**Facing** the choice between duplicating read-only governance locally in each prompt or extracting a shared mechanism

> **We decided** to duplicate the read-only governance shape from `/plan` directly in `/review`

**To achieve** explicit, self-contained prompts that are easy to read and reason about without hidden shared machinery

**Accepting**
- the read-only prohibitions and governance language will be duplicated between `/plan` and `/review`
- future changes to the shared read-only contract must be applied to both prompts
- drift risk is small while there are only two enhanced prompts using this pattern

**Rationale** With only `/plan` and `/review` in the enhanced prompt set, a shared mechanism (include, template, or frontmatter-driven injection) would add complexity disproportionate to the benefit. Keeping the read-only contract explicit in each prompt body follows the precedent of `pi-019` (explicit skill delegation in prompt text) and makes each prompt independently understandable.

**Scope limit** This decision applies only to read-only governance and structural alignment between `/plan` and `/review`. It does not constrain future prompts from adopting a shared mechanism if the number of read-only prompts grows.

### pi-019: Keep `/review` skill loading explicit in prompt body [Accepted]

**In the context of** adding a reusable `/review` prompt under `agents/pi/.pi/agent/prompts/enhanced/`

**Facing** the choice between frontmatter-driven `skill:` injection and explicit workflow delegation in prompt text

> **We decided** to keep frontmatter limited to model controls (`model`, `thinking`, `restore`) and invoke `code-review` explicitly from the prompt body

**To achieve** behaviour that stays aligned with the documented frontmatter scope while keeping skill usage visible in prompt instructions

**Accepting** prompt authors must keep explicit skill-call wording up to date when workflow expectations change

### pi-018: Bounded coupling to `pi-prompt-template-model` for prompt telemetry [Superseded by pi-024]

**In the context of** wanting `usage-stats` to record prompt invocations for extension-managed prompts like `/plan`

**Facing** the fact that `pi-prompt-template-model` registers prompts as extension commands that bypass Pi's native `input` event

> **We decided** to add a second prompt index in `usage-stats` that scans the same discovery directories as `pi-prompt-template-model` (`~/.pi/agent/prompts` and `<cwd>/.pi/prompts`) and performs prefix matching in `before_agent_start` as a fallback

**To achieve** prompt telemetry for `/plan` and other managed prompts with provenance and extension attribution

**Accepting**
- this creates deliberate, bounded coupling to `pi-prompt-template-model`'s discovery semantics and frontmatter conventions
- prefix-based inference in `before_agent_start` can still misattribute manually pasted text or near-identical prompt bodies
- native Pi prompts take precedence over extension-managed prompts when both could match
- generalisation to arbitrary third-party prompt-wrapper extensions is explicitly out of scope

**Rationale** The `before_agent_start` fallback is the only available interception point for extension-managed prompt commands, because Pi does not expose a generic post-dispatch "extension command executed" event. Synthesising `sourceInfo` from the prompt file path keeps reporter logic consistent without special-casing extension-managed prompts everywhere. The coupling is bounded to discovery directory scanning and a simple frontmatter heuristic, not deep integration with `pi-prompt-template-model`'s runtime.

**Amendment (2026-04-26)** `usage-stats` now resolves the command first and only records an extension-managed prompt from `input` when the resolved command metadata confirms the scanned `pi-prompt-template-model` entry. This avoids attributing stale scans or command-name collisions as managed prompts while leaving `before_agent_start` fallback inference unchanged.

**Amendment (2026-04-27)** The fallback prefix matcher now accepts any non-empty managed prompt body instead of enforcing a 32-character minimum. That keeps short prompt templates such as `/implement` observable while still relying on the primary command-resolution path first.

### pi-017: Do not track frontmatter-injected skills in usage-stats [Superseded by pi-024]

**In the context of** wanting the `usage-stats` extension to record skill loads triggered by the `skill:` frontmatter field in `pi-prompt-template-model` prompts

**Facing** the fact that `pi-prompt-template-model` resolves and injects skills internally via `before_agent_start`, bypassing both `/skill:name` commands and the agent `read` tool

> **We decided** to keep the extension bounded to Pi's native extension API and **not** parse prompt-template frontmatter or peek into `pi-prompt-template-model`'s internal behavior

**To achieve** a clean separation where `usage-stats` depends only on Pi's out-of-the-box events (`input`, `tool_call`, `before_agent_start`, etc.) and remains agnostic to third-party extension internals

**Accepting** skills loaded via prompt-template frontmatter will not appear in `skill_loaded` telemetry and will only be visible indirectly through `prompt_invoked` events

**Rationale** Tracking frontmatter-injected skills would require `usage-stats` to know the `skill:` field schema, the YAML frontmatter format, and the file-resolution logic of another extension. That coupling makes `usage-stats` brittle to upstream changes in `pi-prompt-template-model` and violates the principle that each extension should interact through Pi's public API surface. If `pi-prompt-template-model` later emits its own event for skill injection, `usage-stats` can listen for that event without any structural coupling.

### pi-016: Place Pi usage-report executable under `bin/`, not `extensions/` [Accepted]

**In the context of** shipping a standalone usage-stats reporting utility alongside the Pi package

**Facing** confusion from keeping a non-extension executable inside `extensions/`

> **We decided** to install the reporter as `~/.pi/agent/bin/pi-usage-report` (source: `agents/pi/.pi/agent/bin/pi-usage-report`) and keep `extensions/` for extension assets only

**To achieve** clearer package boundaries and direct executable invocation without PATH or wrapper scripts

**Accepting**
- existing docs and references to `~/.pi/agent/extensions/usage-stats-viewer.mjs` must be updated
- users invoke the reporter by explicit path (`~/.pi/agent/bin/pi-usage-report`) unless they add their own PATH entries
- the usage-stats feature documentation remains at `agents/pi/.pi/agent/extensions/usage-stats.md`

**Rationale** The reporter is a standalone Node executable, not a Pi extension. Placing it in `bin/` matches user expectation and aligns with stowed package structure while preserving the current no-wrapper setup.

### pi-015: Distinguish `model_used` from `model_select` in usage stats [Accepted]

**In the context of** wanting usage statistics to reflect which models actually handled prompts

**Facing** the fact that `model_select` records every browsing and cycling action, inflating counts for models merely previewed before a different model was chosen

> **We decided** to add a new `model_used` event that fires once per `agent_start` on the first `before_provider_request`, using `ctx.model` as the definitive active model

**To achieve** accurate per-prompt model usage counts while preserving raw `model_select` telemetry for ad hoc inspection

**Accepting**
- historical logs will not contain `model_used` events until new sessions accumulate them
- the count answers "which model handled this prompt?" rather than "how many provider round-trips did each model make?"
- `ctx.model` must be available and accurate during `before_provider_request`

**Rationale** The `model_select` event remains useful for understanding browsing behavior, but it is the wrong source for usage summaries. Counting at `before_provider_request` guarantees the recorded model is the one actually sent to the provider. Resetting the flag on `agent_start` ensures exactly one count per user prompt even when tool calls trigger multiple provider requests.

### pi-014: Add usage-stats extension and viewer for Pi usage analytics [Accepted]

**In the context of** wanting to understand which skills, prompts, extensions, and models are actually used day-to-day

**Facing** the lack of any built-in usage telemetry beyond anonymous install/update pings

> **We decided** to build a custom Pi extension (`usage-stats.ts`) that intercepts `input`, `tool_call`, `resources_discover`, `model_select`, and session lifecycle events, writing append-only JSONL to `~/.pi/agent/usage-stats.jsonl`, plus a standalone Node.js viewer script (`usage-stats-viewer.mjs`) that aggregates and displays the data

**To achieve** local, private usage statistics without external services, with enough granularity to answer questions like "which skills do I invoke most?" and "which models do I switch to most often?"

**Accepting**
- implicit skill loads are inferred from `read` tool calls targeting `SKILL.md` files, not from an explicit "skill loaded" event
- built-in tools are excluded from tracking to reduce noise
- the stats file grows unbounded and may need occasional manual rotation
- the viewer is a plain `.mjs` script without a TUI or web interface

**Rationale** The Pi extension API exposes all necessary events (`input`, `tool_call`, `resources_discover`, `model_select`, etc.) to build this without modifying Pi internals. JSONL was chosen for crash-safe append-only writes and easy line-by-line parsing. The viewer is plain JavaScript to avoid any build step or npm dependencies. Classification of slash commands uses `pi.getCommands()` to distinguish prompts from extension commands, giving accurate source attribution. A 2-second debounced flush balances durability with I/O overhead.

**Scope limit** The extension does not track built-in tool usage, per-project breakdowns, or time-spent metrics.

### pi-013: Remove pi-btw from the default Pi package list [Accepted]

**In the context of** a pinned side-conversation extension that proved unreliable in practice

**Facing** an extension whose focus toggle did not work consistently in the terminal and whose overlay could crash Pi's renderer

> **We decided** to remove `pi-btw` from the default Pi package list

**To achieve** a more reliable default Pi setup that does not ship an extension known to misbehave in normal terminal use

**Accepting** users who still want the `/btw` workflow must add or pin `pi-btw` deliberately rather than receiving it by default

### pi-012: Pin pi-btw for parallel side conversations [Accepted]

**In the context of** repeatedly wanting to ask a few questions while the main Pi thread keeps running

**Facing** the choice between ad-hoc steering messages and a dedicated side-conversation workflow

> **We decided** to install `pi-btw` as a pinned npm package at `0.3.7`

**To achieve** a repeatable `/btw` side-thread workflow without relying on an unversioned package update

**Accepting** the extra trust surface of another third-party extension and the fact that side-conversation behaviour now lives in a separate package

### pi-011: Keep built-in discovery tools active by default [Accepted]

**In the context of** wanting fast read-only discovery without forcing shell commands for every search

**Facing** Pi sessions where the built-in `grep`, `find`, and `ls` tools were not reliably active by default

> **We decided** to add a tiny startup extension that merges the built-in `grep`, `find`, and `ls` tools into Pi's active tool list on `session_start`

**To achieve** quicker search and file discovery while preserving all currently active tools

**Accepting** tool activation is now an explicit part of the Pi package rather than left to Pi's defaults

### pi-010: Colocate extension docs next to TypeScript files [Accepted]

**In the context of** extension documentation

**Facing** docs living in `docs/pi/` while the source files live in `agents/pi/.pi/agent/extensions/` increases the risk of documentation drift when code moves or changes

> **We decided** to keep each extension's `.md` file next to its `.ts` file in the same directory

**To achieve** self-contained extension packages where code and docs move together

**Accepting** extension documentation is distributed across the extension source tree rather than collected in one central `docs/pi/` area

### pi-009: Replace pi-web-access with Brave bx plus local fetch tools [Accepted]

**In the context of** wanting reliable web search and content fetching in Pi

**Facing** the complexity and external dependencies of `pi-web-access` (Exa API, Gemini API, Gemini Web, browser cookies, Keychain prompts (!) and browser pop-ups)

> **We decided** to replace `pi-web-access` with a custom Pi extension (`brave-search.ts`) backed by the Brave `bx` CLI for search and with Pi-local fetch/extract logic for pages and GitHub repos

**To achieve** predictable, API-only search behaviour, zero Keychain prompts, narrower trust surface, and a clearer separation between search (`bx`) and fetch (local extension)

**Accepting**
- `bx` must be installed and a Brave Search API key configured as a documented prerequisite
- `code_search`, YouTube/video support, and PDF extraction are dropped
- web-page extraction quality is "good enough" rather than Readability-grade
- session-scoped temp storage means responseIds do not survive session changes
- the extension is custom code that must be maintained

**Rationale** `bx context` is purpose-built for AI agents and returns clean pre-extracted text without requiring HTML parsing libraries at search time. Removing `pi-web-access` eliminates the entire provider fallback chain and its associated credential surfaces. Local fetch logic replaces only the page/repo extraction paths we actually use, with zero extra npm dependencies. A vendored `bx` skill at `agents/dotagents/.agents/skills/bx/` preserves cross-agent portability for search workflows.

**Scope limit** The extension registers exactly three tools (`web_search`, `fetch_content`, `get_fetched_content`).

### pi-008: Use a global questionnaire tool for bounded clarification flows [Accepted]

**In the context of** wanting Pi to reduce clarification friction across planning and non-planning workflows

**Facing** the awkwardness of asking multiple bounded questions in prose and forcing the user to scroll chat history to recover the active choices

> **We decided** to add a global Pi questionnaire extension based on Pi's shipped example and steer its usage from `agents/pi/.pi/agent/APPEND_SYSTEM.md`

**To achieve** a reusable tabbed clarification UI for multiple bounded questions while keeping shared cross-tool policy unchanged

**Accepting** one more Pi-specific interaction mechanism that should be used narrowly for bounded option selection rather than open-ended discussion

### pi-007: Use APPEND_SYSTEM.md for Pi-only first-message behavior [Accepted]

**In the context of** sharing one global `AGENTS.md` across Pi, OpenCode, and Codex

**Facing** the need for Pi to reliably introduce itself in the first message of each new session without imposing that behavior on other tools

> **We decided** to put the first-message intro instruction in `agents/pi/.pi/agent/APPEND_SYSTEM.md` instead of the shared `AGENTS.md`

**To achieve** Pi-specific startup behavior while keeping the shared global policy file tool-neutral

**Accepting** one Pi-specific behaviour not shared by the other agents

### pi-006: Adopt pi-prompt-template-model for prompt-owned model selection [Accepted]

**In the context of** wanting prompts to be executed by the most suited (performance, capability, speed, cost) language model

**Facing** the need to manage models for `/plan`

> **We decided** to adopt the third-party extension `pi-prompt-template-model@0.7.3` as a pinned package

**To achieve** prompt-specific model selection via frontmatter

**Accepting** an increased trust surface (third-party executable code)

**Rationale** The extension provides exactly the needed capability (frontmatter-declared model, automatic restore) without custom code. We limit the feature surface to `model`, `thinking`, and default `restore` behavior only. The package is pinned at `0.7.3` following the same pattern as `pi-web-access` (pi-003).

**Scope limit** Only `agents/pi/.pi/agent/prompts/enhanced/plan.md` uses frontmatter initially. Future prompts may adopt the same pattern without further extension changes.

### pi-005: Add a lightweight read-only `/plan` prompt [Accepted]

**In the context of** adding prompt templates to the Pi package

**Facing** the need for a planning mode that stays clearly separate from execution

> **We decided** to add a lightweight read-only `/plan` prompt at `agents/pi/.pi/agent/prompts/enhanced/plan.md`

**To achieve** repo-first planning that surfaces unresolved decisions before implementation

**Accepting** an extra clarification round when material decisions remain unresolved and an explicit handoff before any execution begins

Rationale: The prompt was shaped by reviewing existing planning guidance and OpenCode's plan mode, then adapting those ideas to Pi's read-only planning workflow.

### pi-004: Prevent `jj` footer refresh from mutating working-copy commits [Accepted]

**In the context of** the custom Pi `jj` footer extension polling repository state

**Facing** accidental working-copy commit rewrites/snapshots caused by read-only footer refresh commands

> **We decided** to pass `--ignore-working-copy` to all `jj` commands used by the extension (including `jj status`)

**To achieve** side-effect-free footer refreshes that do not create confusing JJ history churn

**Accepting** working-copy file-count indicators may lag until the working copy is snapshotted by normal `jj` operations

### pi-003: Pin `pi-web-access` to a reviewed release [Accepted]

**In the context of** loading the `pi-web-access` package inside Pi

**Facing** the fact that Pi packages run with full system access and can change behaviour on update

> **We decided** to pin `pi-web-access` to the reviewed release `0.10.6` in `agents/pi/.pi/agent/settings.json`

**To achieve** reproducible installs and reduce the chance of unreviewed behaviour changes

**Accepting** updates now require an explicit manual version bump and review

### pi-002: Use Exa API and Gemini API only — disable browser-based fallbacks [Accepted]

**In the context of** configuring search providers for the pi-web-access extension

**Facing** unwanted Keychain pop-ups from Gemini Web cookie extraction and the desire for predictable API-only behavior

> **We decided** to strictly limit search to Exa API and Gemini API only, using environment variables to force API mode and avoid browser cookie access entirely

**To achieve** clean, reproducible search behavior without GUI pop-ups or browser dependencies

**Accepting**
- Both `EXA_API_KEY` and `GEMINI_API_KEY` must be set as environment variables
- If Exa API fails, we must manually switch to Gemini API (no automatic fallback)
- Perplexity and Gemini Web are completely unavailable (no zero-config fallbacks)

**Rationale** Setting `EXA_API_KEY` forces Exa to use direct API instead of MCP. Setting `GEMINI_API_KEY` forces Gemini API instead of Gemini Web (which requires browser cookies and triggers Keychain pop-ups). With `provider: "exa"` and the API key present, Exa failures throw errors rather than falling back. For Gemini fallback, explicitly pass `provider: "gemini"` in the `web_search` call.

### pi-001: Introduce pi-web-access extension for web search and content extraction [Accepted]

**In the context of** using Pi as a coding agent for research and troubleshooting tasks

**Facing** the limitation that Pi cannot search the web or access external documentation without manual URL provision

> **We decided** to install and configure the `pi-web-access` extension

**To achieve** native web search, content extraction, GitHub repo cloning, and video analysis within Pi conversations

**Accepting**
- web search depends on external providers rather than a practical self-hosted index
- the setup may incur usage costs beyond free tiers

**Rationale** Direct HTTP fetching (like curl) works for known URLs but cannot search—search requires a web index which is impractical to self-host. The extension provides a clean abstraction with smart fallbacks (Exa → Perplexity → Gemini API → Gemini Web), enabling research workflows like finding library documentation, checking recent API changes, or understanding error messages without leaving the agent context. The trade-off of external dependencies is justified by the significant productivity gain in research-heavy coding tasks.
