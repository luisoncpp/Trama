# TS Module Resolution: Explicit `.tsx` Extension Required

**Date:** 2026-04-04

## Problem

When importing a Preact component from another `.tsx` file, the TypeScript language server reports:

```
TS2307: Cannot find module './sidebar-tree' or its corresponding type declarations.
```

The file `sidebar-tree.tsx` exists at exactly that path. The import resolves fine for the Vite bundler at runtime, but the language server refuses to find it.

## Root Cause

The project's `moduleResolution` is set to `bundler` (in `tsconfig.app.json`). With this setting the language server does not automatically try the `.tsx` extension when resolving bare relative paths. The bundler itself (Vite) does, but the language server doesn't.

## Fix

Always include the explicit `.tsx` extension in component imports:

```ts
// bad — language server error
import { SidebarTree } from './sidebar-tree';

// good — resolves correctly
import { SidebarTree } from './sidebar-tree.tsx';
```

## Affected files (examples)

- `project-editor-view.tsx` → `./components/file-list-panel.tsx`
- `sidebar-explorer-content.tsx` → `./sidebar-tree.tsx`

## Notes

- This only affects `.tsx` files (JSX). Plain `.ts` imports typically resolve without explicit extension.
- Apply this rule to every new component import in this project from the start to avoid the error appearing later.
