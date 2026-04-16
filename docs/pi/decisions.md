# pi decisions

Pi-specific decisions are listed in reverse chronological order (most recent first).

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
