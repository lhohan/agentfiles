---
name: landing-the-plane
description: Use when user says they are done, want to finish, close a task, end a session, or asks to "land the plane." ALSO use before completing ANY task to run the quality gate workflow (issue sweep, VCS review, verification, commit, close).
version: 0.1.0
---

# Landing the Plane

A reusable, tool-agnostic closure workflow. This skill guides the agent through logical "quality gates" before finalizing work. It relies on project-level instructions (e.g., AGENTS.md) or domain-specific skills (e.g., use-jujutsu, verification-before-completion) for actual execution.

## The Quality Gate Ladder

Follow these steps in order. Do not skip gates unless explicitly instructed by the user or project rules.

Always delegate task operations to the project's configured task-management skill (e.g., `using-beads-for-task-management`) to manage active work, see available work, claim tasks, complete tasks, or create issues.

### Step 1: Issue Sweep
Check for any discovered follow-up work or remaining blockers.
- Check for ready or available work.
- Create new issues for any technical debt or follow-up tasks discovered during this work.

### Step 2: VCS Scope Review
Verify that the current changes are atomic and intentional.
- Delegate to the relevant VCS (Jujutsu, Git, ...) skill to review open changes.
- Ensure no sensitive files (secrets, local config) are staged.

### Step 3: Verification Gate
Confirm that all quality gates (tests, lints, builds) are passing.
- **Rule:** Do not guess commands. Refer to the project's AGENTS.md, README.md.
- Confirm that all identified gates have passed. **Never close a task with failing gates.**

### Step 4: Final Commit
Ensure all changes are persisted with clear context.
- Commit changes using the project's VCS.
- **Rule:** Include the task ID in the commit message body for traceability.

### Step 5: Remote Sync (Optional)
If remote sync is explicitly requested by the user or required by project policy:
- Perform the repository/task-tracker sync operations appropriate for this project.

### Step 6: Task Closure
Mark the work as finished in the task tracker.
- **Pre-close checkpoint:** Do not close tasks if requirements are still changing, unresolved uncertainty remains, or the user is still deciding direction.
- Require an explicit closure-ready signal from the conversation before closing tasks or issues.
- Close the task(s) completed in this session's scope.

### Step 7: Session Handoff
Provide a clear summary for the next session.
- Document exactly what was completed.
- State which verification gates passed.
- List any newly created follow-up tasks.

## Critical Rules

- **No failing gates:** Never close a task if tests, lints, or builds are failing.
- **Atomic Commits:** Keep changes focused on the task at hand.
- **Evidence First:** Report the exact gate commands that were run and their results during handoff.
- **No premature closure:** Keep tasks in progress while scope/intent is still being negotiated.
