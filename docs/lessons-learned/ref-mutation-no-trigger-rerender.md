# Tag overlay: ref mutation does not trigger re-render

Date: 2026-05-01

## Context

The dirty flag model (`tagOverlayRecalcRef.current`) uses refs to avoid per-keystroke re-renders. When the user types, `text-change` sets the flag and the subsequent Ctrl press triggers a re-render via `setCtrlPressed(true)`, causing `useTagOverlay` to recompute.

However, when switching documents via tag click (Ctrl+click → `openFileInPane` → `loadDocument` → `useSyncExternalValue`), the flag is set to `true` inside an effect (`resetTagOverlayOnDocChange`), and **no state/prop change triggers a subsequent re-render**. The dirty flag remains unread until the user releases and re-presses Ctrl.

## Symptom

Tags are not updated when a new document is opened via Ctrl+click on an underlined tag, until Ctrl is released and pressed again.

## Rule

A `ref.current` mutation inside a `useEffect` does **not** trigger a re-render. If the ref consumer only runs during the render phase (such as `useTagOverlay`), an explicit state update is needed to force a re-render after the mutation.

In Trama, the pattern used is: define a `useState` counter (`triggerTagOverlayRender`) that is incremented in the same effect that mutates the dirty flag, forcing a re-render where `useTagOverlay` picks up the updated flag.

## Files involved

- `src/features/project-editor/components/rich-markdown-editor.tsx` — `triggerTagOverlayRender` via `useState` counter
- `src/features/project-editor/components/rich-markdown-editor-core.ts` — passes the callback to `useSyncExternalValue`
- `src/features/project-editor/components/rich-markdown-editor-external-sync.ts` — invokes the callback after applying content
