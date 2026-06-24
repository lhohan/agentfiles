# Command Guardrails Extension

Command guardrails are opt-in warn/block rules for Pi `bash` tool calls.

They are useful for risky shell commands such as destructive Jujutsu operations. They are not file secrecy, content filtering, sandboxing, or a reliable way to stop the model from reading or editing files through other tools. Put file access control in containment such as Safehouse.

## Config Locations

Guardrail config is opt-in. No default config file is shipped.

- Global: `~/.pi/agent/guardrails.conf`
- Project-local: `<project-root>/.pi/guardrails.conf`

Project-local rules override global rules by section name.

## Post-Stow Setup

No extra setup is required.

## Config Format

Use an INI-style config file. Each section is one rule, and the section name is the rule name.

```ini
[block-jj-abandon]
mode = block
match = \bjj abandon\b
reason = Protect working-copy history

[warn-rm-rf]
mode = warn
match = \brm\s+-rf\b

[disable-global-rule]
mode = off
match = .*
```

Supported keys:

- `match`: required JavaScript regex string matched against the full bash command
- `mode`: required `off`, `warn`, or `block`
- `reason`: optional user-facing explanation included in warnings and blocks

Regex strings are passed to JavaScript `new RegExp(...)`. Write the regex pattern itself, not `/.../` delimiters.

Comments are whole-line only. Lines whose trimmed content starts with `#` or `;` are ignored. Inline comments are not parsed, so `#` and `;` can be used predictably inside regexes.

## Matching Semantics

Only `bash` `tool_call` events are evaluated. All other tool calls are ignored.

For a rule to match:

1. `mode` must be `warn` or `block`
2. `match` must match the full bash command string

`off` rules are loaded and listed, but not enforced. Use a project-local rule with the same section name and `mode = off` to disable a global rule for one project.

## Rule Evaluation

Rules are evaluated in merged order:

1. global rules whose names are not overridden by project rules
2. project rules

Evaluation collects matching warnings before the first matching block. When a block matches, evaluation stops and the bash tool call is blocked.

## Override Behavior

- Rule section names must be unique within one config scope.
- Project-local rules replace global rules with the same section name.
- A parse or validation error disables only that config scope.

## Error Handling

Missing config files are silent and fail open.

Each scope is validated independently:

- If `guardrails.conf` cannot be parsed or validated, that scope is ignored and Pi shows a warning.
- Errors in one scope do not disable the other scope.
- Duplicate sections in one scope disable that scope.

Validation rejects:

- duplicate section names within one scope
- keys other than `match`, `mode`, and `reason`
- invalid regexes
- missing required fields
- invalid modes

## Blocked Command Behavior

When a bash command is blocked, the extension does more than reject that one command.

1. The blocked command is rejected with a rule-specific reason (as before).
2. A steering message is injected instructing the model to stop trying equivalent or nearby shell commands and ask the user how to proceed.
3. The current turn is aborted so Pi cannot keep acting in the same turn after the block fires.

Only the first blocked bash command in a turn triggers a steering message. Later blocks in the same turn still reject the command but do not emit duplicate steering messages. The steering flag resets at the end of each turn so a fresh message can be sent on the next turn.

This is stronger than steer-only behavior, but still not absolute containment. In parallel tool mode, sibling tool calls from the same assistant response may already be in flight before the abort lands. The abort stops the rest of the current turn; it does not un-run work that already started.

Warn-only rule matches never produce steering messages.

## `/guardrails` Command

List the currently loaded command guardrails:

```text
/guardrails
```

Test a bash command string against loaded rules:

```text
/guardrails test jj abandon
```

The command after `test` is treated verbatim. There is no legacy tool argument, so this tests the command string `bash jj abandon`:

```text
/guardrails test bash jj abandon
```

## Scope Boundary

Command guardrails only make selected shell commands harder to run accidentally. They do not constrain the model's access to Pi tools, filesystem content, or process capabilities.

For file-read restrictions, write restrictions, secret protection, or stronger execution boundaries, use containment such as Safehouse.
