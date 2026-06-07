# TypeScript Narrowing in Async Closures

Date: 2026-04-04

## Context

During Phase 2 completion, a TypeScript error appeared in conflict actions where a nullable path was validated before entering an async callback.

## Symptom

`TS2322` / `TS2345` around `string | null` values being passed to APIs that require `string`, even after a guard like `if (!value) return`.

## Root Cause

Type narrowing does not always carry safely into async closures when reading from mutable object properties (for example, `values.externalConflictPath`).

## What Worked

Capture the value in a local constant before the async boundary and use that constant in the callback.

Example pattern:

```ts
const conflictPath = values.externalConflictPath
if (!conflictPath) return

void (async () => {
  await api.readDocument({ path: conflictPath })
})()
```

## Prevention Rule

When a nullable state field is used inside async callbacks, copy it into a local non-null variable after guard checks.

## Related Files

- src/features/project-editor/use-project-editor-ui-actions.ts
- tests/project-editor-conflict-flow.test.ts
