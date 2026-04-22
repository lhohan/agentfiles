# Brave Search Extension

Pi extension that registers `web_search`, `fetch_content`, and `get_fetched_content` tools backed by the Brave `bx` CLI.

Registered tools:
- `web_search`
- `fetch_content`
- `get_fetched_content`

## Prerequisites

- `bx` installed and on `PATH`
- Brave Search API key configured (`bx config set-key <KEY>` or `BRAVE_SEARCH_API_KEY` env var)

## `web_search`

Searches the web via Brave `bx`. Default mode is `bx context`, which returns pre-extracted, token-budgeted content. When `recencyFilter` is provided, it switches to `bx web`.

## `fetch_content`

Fetches URLs and extracts readable markdown. Supports two kinds of URLs:

1. **Ordinary web pages** — fetched with a browser User-Agent, then parsed into markdown-ish text.
2. **GitHub repository URLs** — detected by hostname and path shape, then shallow-cloned into a temp directory.

## `get_fetched_content`

Retrieves previously stored results by `responseId`.

## Storage lifecycle

Results are stored in an in-memory Map tied to the active Pi session.
The store is cleared on `session_start` and `session_shutdown`.
There is no durable cache; responseIds do not survive session changes.
