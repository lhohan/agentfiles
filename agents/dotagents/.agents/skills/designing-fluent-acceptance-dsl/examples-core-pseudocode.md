# DSL Examples (Pseudocode Only)

## Formal Pseudocode Format

Use this structure in all DSL examples:

```text
SCENARIO "<behaviour name>"
  GIVEN <setup state>
  AND <additional setup>
  WHEN <action>
  THEN <primary assertion>
  AND <additional assertion>
```

Rules:

- Keep one behaviour per scenario.
- Keep setup in `GIVEN/AND` lines only.
- For eager mode, keep execution in one `WHEN` line.
- For deferred mode, keep the action boundary explicit. If assertions are queued before execution, treat those calls as declarations and keep `.execute()` as the operation that runs them.
- Keep validations in `THEN/AND` lines.

## Example 1: CLI DSL (Pseudocode)

```text
SCENARIO "aggregate entries from input file"
  GIVEN spec = ToolDsl.given()
  AND spec.with_flag("verbose")
  AND spec.with_input_file("entries.txt", "alpha\nbeta")
  AND spec.with_env("TODAY", "2026-02-07")
  WHEN result = spec.when_run()
  THEN result.should_succeed()
  AND result.expect_output_contains("2 entries processed")
  AND result.expect_item("alpha").with_count(1)
  AND result.expect_item("beta").with_count(1)
  AND result.validate()
```

```text
TYPE CommandSpec:
  args: List<String>
  input: Optional<InputSource>
  environment: Map<String, String>

TYPE InputSource:
  File(path, content)
  Directory(files)

TYPE AppResult:
  output
  temp_resources
```

## Example 2: Server DSL (Pseudocode)

```text
SCENARIO "list articles in descending order"
  GIVEN spec = ContentDsl.new()
  AND spec.add_file("articles/new.md", "# New")
  AND spec.add_file("articles/old.md", "# Old")
  AND spec.with_config("site_title: Example")
  WHEN response = spec.get("/articles").execute()
  THEN response.expect_status_code(200)
  AND response.expect_body_contains("New")
  AND response.expect_contains_in_order(["New", "Old"])
```

```text
TYPE ServiceSpec:
  files: List<FileSpec>
  config: Optional<String>

TYPE RequestBuilder:
  service_spec: ServiceSpec
  method: HttpMethod
  path: String
  assertions: List<Assertion>
```

Queued-assertion variant, if the host DSL intentionally supports it:

```text
SCENARIO "list articles in descending order"
  GIVEN spec = ContentDsl.new()
  AND spec.add_file("articles/new.md", "# New")
  AND spec.add_file("articles/old.md", "# Old")
  WHEN request = spec.get("/articles")
  THEN request.expect_status_code(200)
  AND request.expect_contains_in_order(["New", "Old"])
  AND request.execute()
```
