# Trial notes: `pi-answer@0.1.4`

Date: 2026-05-11  
Task: agf-7zl.3

## Status

Blocked in this sandboxed environment for live Pi install/trial execution.

## Attempted execution in this environment

Command:

```bash
pi install npm:pi-answer@0.1.4
```

Result:

- Failed with `EPERM` while creating global npm install directory.
- Error path observed: `/Users/hans/.local/share/npm-global/lib/node_modules/pi-answer`

A second attempt with overridden `HOME`/`XDG_DATA_HOME` also failed with `EPERM`, then targeting a read-only Nix store path.

## Manual trial steps to run on a writable local Pi environment

1. Install pinned package:

   ```bash
   pi install npm:pi-answer@0.1.4
   ```

2. Run representative `/answer` workflows:
   - extraction from a long assistant response with 3+ implied questions
   - options-heavy question set
   - multi-line custom answer path
   - template cycling (`Ctrl+T`)

3. Validate draft behaviour:
   - enter partial answers
   - cancel/exit
   - re-run `/answer`
   - confirm restore prompt and correct draft recovery

4. Validate rollback:

   ```bash
   pi uninstall pi-answer
   ```

   Then confirm `/answer` is no longer registered.

5. Capture findings:
   - extraction quality
   - options UX quality
   - template usefulness
   - draft restore reliability
   - practical friction reduction vs added complexity

## Recommendation status

Pending completion of live manual trial evidence.
