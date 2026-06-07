# sidebar path brands deepen the seam

**Date:** 2026-05-08

## What I learned

If section-relative and project-relative sidebar paths both travel as plain `string`, the seam is too shallow: every caller must remember which flavor it has, and small inline helpers like ``${root}${path}`` leak the invariant all over the renderer.

## The counter-intuitive part

Moving all conversions into one named module is not enough if the module still accepts and returns unbranded strings everywhere. The implementation looks centralized, but the interface still lets any caller mix the two path spaces accidentally.

The leverage appears only after the seam owns distinct branded types such as `SectionRelativePath`, `ProjectRelativePath`, and `SidebarSectionRoot`, and the upward/downward conversions are the only exported way to move between them.

## Practical rule

When a module represents two semantically different string spaces:

1. Brand both spaces.
2. Brand the shared root object too if it carries normalization rules.
3. Keep raw `string` at the outermost adapter only, where UI or IPC enters the seam.
4. Convert immediately at that adapter, then stay branded inside the subsystem.

## Why it matters here

- `sidebar-panel-body.tsx` can no longer hide new inline concatenations behind innocent string callbacks.
- `use-project-editor-create-actions.ts` reuses the same create-path builder as rename/select/reorder flows instead of rebuilding prefixes ad hoc.
- TypeScript can reject accidental mixes in compile-only tests before they become sidebar regressions.

## Focused verification

```bash
npm run test -- tests/sidebar-panel-body.test.ts tests/sidebar-tree.test.ts tests/corkboard-order-integration.test.ts tests/sidebar-path-scoping-types.test.ts
npm run test -- tests/typescript-compile.test.ts
```
