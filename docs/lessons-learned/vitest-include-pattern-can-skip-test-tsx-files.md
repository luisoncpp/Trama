# Vitest Include Pattern Can Skip `.test.tsx` Files

## What to know

This repo's Vitest config currently uses:

```ts
include: ['tests/**/*.test.ts']
```

That means a file named `tests/foo.test.tsx` is not part of the test suite, even if `npm run test -- tests/foo.test.tsx` appears to target it.

## Why it matters

During the project-editor shell-subscription work, a new regression file was initially created as `.test.tsx`. Vitest reported "No test files found" because the include glob excluded it entirely.

This is easy to miss because the file name looks conventional for JSX-bearing tests.

## Effective rule

In this repo, prefer `.test.ts` for tests unless the Vitest `include` pattern is updated at the same time.

## Where to check

- `vite.config.ts`
- `docs/dev-workflow.md`
- any new test file under `tests/`
