---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, producing domain documentation as the conversation progresses.
disable-model-invocation: true
---

Run a grilling session by invoking the `grill-me` skill. While the session progresses, actively apply the `domain-modeling` skill to challenge terms, sharpen language, and update `CONTEXT.md` inline.

When a decision meets the three ADR criteria (hard to reverse, surprising without context, result of a real trade-off), do not create the ADR yourself. Instead, invoke the `document-architectural-decisions` skill so it is recorded using the repository's existing ADR format and conventions.
