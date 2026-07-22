# `model.state` omits `editorMeta` — derive document type from pane states

## Counter-intuitive fact

`ProjectEditorState` is `Omit<ProjectEditorStateValues, 'editorMeta'>`, and `use-project-editor.ts` enforces it **at runtime**: `state: (({ editorMeta, ...stateValue }) => stateValue)(values)`. So `model.state.editorMeta` is `undefined` in every consumer even though `useProjectEditorValues` builds it and `state.editorValue` / `state.selectedPath` are right there next to where it "should" be.

Editor surfaces get meta through pane-targeted props (`EditorPanel`), so the omission is invisible until a **shell-level** component (e.g. a sidebar context built in `project-editor-view.tsx`) needs the active document's frontmatter `type` — then it fails only at runtime, in tests, not at the destructure site you are staring at.

## What to do

Never read `model.state.editorMeta`. Re-derive the active-pane projection from the pane states with the single pure projector:

```ts
const { editorValue, editorMeta, selectedPath } = deriveActivePaneDocument(
  model.state.workspaceLayout,
  model.state.primaryPane,
  model.state.secondaryPane,
)
```

This is the same function that produced `state.editorValue`/`state.selectedPath`, so the values stay consistent and the projection logic is not duplicated (see `projected-state-vs-pane-target-state.md`).

## Symptom → cause

`TypeError: Cannot read properties of undefined (reading 'type')` in a view-level hook that destructured `editorMeta` from `model.state` — caught by `tests/project-editor-view-render-split.test.ts`, not by ESLint (no type-aware rules) and not by esbuild (strips types without checking).
