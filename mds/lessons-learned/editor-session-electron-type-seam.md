# Editor Session Electron Type Seam

## Problem

`EditorSession` lives in the rich editor module, which imports `Quill`, `Preact` types, and DOM types. The pane layer (`pane-workspace.ts`) and the project-editor model (`use-project-editor.ts`) need to hold a reference to the session so they can call `flush()` during save/switch/revert flows.

If the full `EditorSession` interface is declared in the rich-editor module and then imported by `project-editor-types.ts`, the Electron build transitively pulls in renderer/DOM types and fails to compile.

## Solution

Split the interface:

- `project-editor-types.ts` declares the **minimal** `EditorSession` that the pane/model layer actually needs:

  ```ts
  export interface EditorSession {
    flush(): string | null
  }
  ```

- `editor-session/editor-session-types.ts` extends it with the full rich-editor surface:

  ```ts
  import type { EditorSession as EditorSessionCore } from '../../../../project-editor-types.js'

  export interface EditorSession extends EditorSessionCore {
    getEditor(): Quill | null
    getCanonicalValue(): string
    subscribeContentMutated(cb: () => void): () => void
    dispose(): void
  }
  ```

The Electron build only includes `project-editor-types.ts` and stays free of Quill/Preact/DOM types. The renderer build includes both.

## When to apply

Any time a renderer-only deep module needs a typed seam with code that is also compiled for the Electron main/preload process. Declare the smallest contract the non-renderer side needs in the shared types file, then extend it in the renderer module.

## Files

- `src/features/project-editor/project-editor-types.ts` — minimal `EditorSession`
- `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-types.ts` — full interface
- `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session.ts` — re-exports full interface and public hook
