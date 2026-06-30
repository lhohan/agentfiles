# Acceptance Scenario Pack (Order Processing Domain)

This file provides a compact, illustrative suite for a CLI acceptance-test DSL in a familiar domain.

Domain used: an `OrderReport` CLI that summarizes orders from an input file.

## Scenario 1: Happy Path

```text
SCENARIO "summarize completed orders for a day"
  GIVEN spec = OrderReport.given()
  AND spec.with_input_file("orders.csv", VALID_ORDERS)
  AND spec.status_filter("completed")
  WHEN result = spec.when_run()
  THEN result.should_succeed()
  AND result.expect_output("Completed orders: 3")
  AND result.expect_output("Total revenue: $245.00")
```

## Scenario 2: No Matching Data (Non-error Alternative)

```text
SCENARIO "return empty state when filter matches no orders"
  GIVEN spec = OrderReport.given()
  AND spec.with_input_file("orders.csv", VALID_ORDERS)
  AND spec.status_filter("refunded")
  WHEN result = spec.when_run()
  THEN result.should_succeed()
  AND result.expect_no_data_found()
```

## Scenario 3: Recoverable Input Issue (Warning Alternative)

```text
SCENARIO "skip malformed row but still produce report"
  GIVEN spec = OrderReport.given()
  AND spec.with_input_file("orders.csv", ORDERS_WITH_ONE_BAD_ROW)
  WHEN result = spec.when_run()
  THEN result.should_succeed()
  AND result.expect_warning_at_line(4, "invalid amount format")
  AND result.expect_output("Completed orders: 2")
```

## Scenario 4: Invalid Date Range (Error Alternative)

```text
SCENARIO "fail when date range syntax is invalid"
  GIVEN spec = OrderReport.given()
  AND spec.with_input_file("orders.csv", VALID_ORDERS)
  AND spec.date_range("2026-13-01..2026-01-31")
  WHEN result = spec.when_run()
  THEN result.should_fail()
  AND result.expect_error("invalid date range")
```

## Scenario 5: Invalid Flag Combination (Error Alternative)

```text
SCENARIO "fail when details mode is used without grouping"
  GIVEN spec = OrderReport.given()
  AND spec.with_input_file("orders.csv", VALID_ORDERS)
  AND spec.details_flag()
  WHEN result = spec.when_run()
  THEN result.should_fail()
  AND result.expect_error("--details requires --group-by")
```

## Why This Suite Works

- Keeps one clear happy path.
- Includes four realistic alternatives:
  - empty result
  - warning + partial success
  - validation error
  - option dependency error
- Transfers cleanly to most business domains.
