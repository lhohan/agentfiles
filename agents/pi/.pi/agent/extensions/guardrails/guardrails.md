# Guardrails Extension

Configurable tool-call guardrails for Pi's built-in `bash`, `read`, `write`, `edit`, `grep`, `find`, and `ls` tools.

## Config Locations

Guardrail config is opt-in. No default config file is shipped.

- Global: `~/.pi/agent/guardrails.yaml` or `~/.pi/agent/guardrails.yml`
- Project-local: `<project-root>/.pi/guardrails.yaml` or `<project-root>/.pi/guardrails.yml`

Project-local rules override global rules by `name`.

## Post-Stow Setup

No extra setup is required.

## Config Format

Use a simple YAML file with a top-level `rules:` array.

```yaml
rules:
  - name: block-jj-abandon
    tools: [bash]
    pattern: '\bjj abandon\b'
    mode: block
    reason: Protect working-copy history

  - name: warn-secret-searches
    tools: [grep]
    pattern: '(secret|token|apikey|password)'
    mode: warn

  - name: block-env-reads
    tools: [read]
    pattern: '(^|/)\.env(\.|$|/)'
    mode: block

  - name: block-svelte-effects
    tools: [write, edit]
    pattern: '\$effect'
    pathPattern: '\.svelte$'
    mode: block

  - name: allow-doc-env-example
    tools: [read]
    pattern: '(^|/)\.env(\.|$|/)'
    allow: 'docs/examples/'
    mode: warn
```

Regex strings are passed to JavaScript `new RegExp(...)`. Write the regex pattern itself, not `/.../` delimiters.

Current parser scope:

- top-level `rules:`
- one inline rule per list item
- inline tools arrays such as `tools: [bash, read]`
- scalar string values for the other fields

Do not use advanced YAML features such as anchors, multiline strings, nested mappings, or block lists.

## Rule Schema

Required fields:

- `name`: unique within a config scope
- `tools`: array using only `bash`, `read`, `write`, `edit`, `grep`, `find`, `ls`
- `pattern`: regex string matched against the tool's primary input
- `mode`: `off`, `warn`, or `block`

Optional fields:

- `pathPattern`: regex string matched against `event.input.path` when that field exists
- `reason`: user-facing explanation included in warnings and blocks
- `allow`: regex exemption

## Matching Semantics

`pattern` always matches the tool's primary input:

- `bash`: `command`
- `read`: `path`
- `write`: `content`
- `edit`: combined edit payload built from each `oldText` and `newText`
- `grep`: `pattern`
- `find`: `pattern`
- `ls`: `path`

`pathPattern` matches `event.input.path` when the tool input includes a path:

- `read`, `write`, `edit`
- `grep`, `find`, `ls` only when the caller provided `path`

`allow` uses a different subject:

- `bash`: matches the command
- `read`, `write`, `edit`, `grep`, `find`, `ls`: matches the path

If a tool call has no path, `pathPattern` does not match and path-based `allow` does not match.

For a rule to match:

1. the tool name must be included in `tools`
2. `allow` must not match
3. `pattern` must match
4. `pathPattern`, when present, must also match

## Rule Evaluation

- `off` rules are loaded but ignored during enforcement
- all matching `warn` rules emit warnings
- the first matching `block` rule blocks the tool call
- a block also emits a notification

## Override Behavior

- Rule names must be unique within one scope
- Project-local rules replace global rules with the same `name`
- Using the same rule `name` with `mode: off` is the way to disable a global rule in one project

## Error Handling

Missing config files are silent and fail open.

Each scope is validated independently:

- If both `.yaml` and `.yml` exist in one scope, that scope is ignored and Pi shows a warning
- If the chosen config file cannot be parsed or validated, that scope is ignored and Pi shows a warning
- Errors in one scope do not disable the other scope

Validation currently rejects:

- duplicate rule names within one scope
- unsupported tool names
- invalid regexes
- missing required fields or wrong field types

## `/guardrails` Command

List the currently loaded rules:

```text
/guardrails
```

Test a mock input value against loaded rules:

```text
/guardrails test bash jj abandon
/guardrails test read .env
/guardrails test grep secret
```

`test <tool> <value>` parses `<tool>` as the first token and treats the remaining text verbatim as the test value.

Path-dependent rules are only partially testable through `/guardrails test`:

- `bash`, `read`, and `ls` can test both primary matching and allow/path matching
- `write`, `edit`, `grep`, and `find` test only the primary match unless a real tool call also supplies `path`
