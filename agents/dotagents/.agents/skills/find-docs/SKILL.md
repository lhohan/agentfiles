---
name: find-docs
description: Retrieves up-to-date documentation, API references, and code examples from Context7. Use when the user says "use context7" or "use Context7" or asks for current docs for a library, framework, SDK, CLI tool, or cloud service.
---

# Documentation Lookup

Retrieve current documentation and code examples from Context7.

## Activation

Use this skill when the user says or means any of the following:

- "use Context7"
- "use context7"
- "look up Context7"
- "find docs for <library>"
- asks for documentation, API references, SDK usage, CLI help, or code examples for a library, framework, SDK, CLI tool, or cloud service

## Prerequisites

- Node.js/npm access for `npx`
- network access
- Context7 CLI availability through `npx ctx7@latest`

Make sure the CLI is up to date before running commands:

```bash
npx ctx7@latest <command>
```

## Workflow

Use a two-step process: resolve the library name to an ID, then query docs with that ID.

```bash
# Step 1: Resolve library ID
npx ctx7@latest library <name> <query>

# Step 2: Query documentation
npx ctx7@latest docs <libraryId> <query>
```

If the user already provides a library ID in the format `/org/project` or `/org/project/version`, skip Step 1.

If the query is ambiguous, ask for clarification before guessing.

If multiple good matches exist, mention the ambiguity briefly and proceed with the most relevant one.

## Step 1: Resolve a Library

Resolve a package or product name to a Context7-compatible library ID and return matching libraries.

```bash
npx ctx7@latest library react "How to clean up useEffect with async operations"
npx ctx7@latest library nextjs "How to set up app router with middleware"
npx ctx7@latest library prisma "How to define one-to-many relations with cascade delete"
```

Always pass a `query` argument. It is required and directly affects result ranking. Use the user's intent to form the query so the search can disambiguate libraries with similar names.

### Result fields

Each result includes:

- **Library ID** — Context7-compatible identifier in the format `/org/project`
- **Name** — Library or package name
- **Description** — Short summary
- **Code Snippets** — Number of available code examples
- **Source Reputation** — Authority indicator (`High`, `Medium`, `Low`, or `Unknown`)
- **Benchmark Score** — Quality indicator (`100` is the highest score)
- **Versions** — Available versions. Use a version-specific ID if the user requests a version

### Selection process

1. Analyse the query to understand what library or package the user wants.
2. Select the most relevant match based on:
   - Name similarity to the query (exact matches first)
   - Description relevance to the query's intent
   - Documentation coverage (prefer higher code snippet counts)
   - Source reputation (prefer `High` or `Medium`)
   - Benchmark score (higher is better)
3. If the user asks for a specific version, use the closest matching version-specific ID.
4. If no good matches exist, say so and suggest a better query.

Do not include sensitive or confidential information such as API keys, passwords, credentials, personal data, or proprietary code in the query.

## Step 2: Query Documentation

Query the resolved library ID for current documentation and examples.

```bash
npx ctx7@latest docs /facebook/react "How to clean up useEffect with async operations"
npx ctx7@latest docs /vercel/next.js "How to add authentication middleware to app router"
npx ctx7@latest docs /prisma/prisma "How to define one-to-many relations with cascade delete"
```

### Writing good queries

Use the user's full question as the query when possible. Prefer a specific query over a single keyword.

| Quality | Example |
|---------|---------|
| Good | `"How to set up authentication with JWT in Express.js"` |
| Good | `"React useEffect cleanup function with async operations"` |
| Bad | `"auth"` |
| Bad | `"hooks"` |

The output contains two types of content: **code snippets** (titled, with language-tagged blocks) and **info snippets** (prose explanations with breadcrumb context).

## Optional Authentication

Context7 works without authentication. Use authentication only for higher rate limits:

```bash
# Option A: environment variable
export CONTEXT7_API_KEY=your_key

# Option B: OAuth login
npx ctx7@latest login
```

## Error Handling

If a command fails with a quota error (`Monthly quota reached` or `quota exceeded`):

1. Inform the user that their Context7 quota is exhausted.
2. Suggest `npx ctx7@latest login` for higher limits.
3. If they cannot or choose not to authenticate, answer from training knowledge and note that it may be outdated.

If the `ctx7` command is missing or stale, run the command through `npx ctx7@latest`.

If no library matches, refine the query with a product name, vendor, framework, or version.

Never silently fall back to training data without explaining why Context7 was not used.

## Common Mistakes

- Library IDs require a `/` prefix — `/facebook/react` not `facebook/react`
- Use descriptive queries, not single words — `"React useEffect cleanup function"` not `"hooks"`
- Use the closest available version if the exact version is not indexed
- Keep queries free of secrets and other sensitive data
