# Decisions

## 2026-04-18 — Improve `find-docs` activation and CLI consistency

- Expanded the `find-docs` frontmatter description to include the exact phrase "use Context7" plus related variants so the skill activates more reliably from user requests.
- Standardised command examples on `npx ctx7@latest` to remove ambiguity about whether the latest CLI or a locally installed binary should be used.
- Added explicit prerequisites, troubleshooting, and error-handling notes so the skill fails more clearly when Context7 is unavailable, stale, or rate-limited.
