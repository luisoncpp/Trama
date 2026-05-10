# Editor Zoom Architecture

## Purpose

Document the zoom feature for the rich markdown editor. Zoom is controlled via keyboard shortcuts (Ctrl++ / Ctrl+-) and persists across sessions.

## Design Goals

1. **Open architecture for future access points** — Zoom state lives in `WorkspaceLayoutState` alongside layout mode, ratio, and focus settings. This enables future UI controls (toolbar, settings panel) to manipulate zoom through the same action interface.

2. **Twin view applies zoom to both panes** — In split mode, both editor panes share the same `zoomLevel` from the layout state. The shared state means both panes automatically render at the same zoom level without per-pane zoom coordination logic.

3. **Keyboard-driven initial implementation** — Ctrl++ increases zoom by 0.1, Ctrl+- decreases by 0.1. Zoom is clamped to [0.5, 2.0].

4. **Document-only zoom (not UI)** — Zoom applies `zoom` CSS to the Quill editor container only. The sidebar, toolbar, and other UI elements are unaffected.

## State Model

### WorkspaceLayoutState (relevant fields)

```typescript
interface WorkspaceLayoutState {
  mode: 'single' | 'split'
  ratio: number
  primaryPath: string | null
  secondaryPath: string | null
  activePane: 'primary' | 'secondary'
  focusModeEnabled: boolean
  focusScope: 'line' | 'sentence' | 'paragraph'
  zoomLevel: number  // default: 1.0, range: [0.5, 2.0]
}
```

### EditorZoomRef — Shared Zoom Reference

Zoom uses a shared reference object (`EditorZoomRef`) so all editor panels read from the same source. This eliminates per-panel zoom copies and ensures both panes in split mode always render at the same zoom level without explicit synchronization.

```typescript
interface EditorZoomRef {
  current: number
}
```

`ProjectEditorModel` exposes a single `zoomRef` instance. All `RichMarkdownEditor` instances receive the same ref via prop drilling through `EditorPanel` → `PaneEditor` / `ActiveEditorPanel` → `workspace-editor-panels.tsx`.

### Zoom Utility Module (`editor-zoom.ts`)

```typescript
export const MIN_ZOOM_LEVEL = 0.5
export const MAX_ZOOM_LEVEL = 2.0
export const ZOOM_STEP = 0.1

export function clampZoomLevel(value: number): number {
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, value))
}
```

## Zoom Application

The zoom is applied via `useEditorZoom` hook in the `RichMarkdownEditor` component:

```typescript
export function useEditorZoom({ editorRef, hostRef, zoomRef, triggerTagOverlayRender }: UseEditorZoomParams): void {
  useEffect(() => {
    const zoomLevel = zoomRef.current
    const root = editor.root as HTMLElement
    root.style.zoom = `${zoomLevel * 100}%`
    triggerTagOverlayRender()
  }, [editorRef, hostRef, zoomRef, triggerTagOverlayRender])
}
```

**Why a shared ref instead of a primitive:** Each `useEditorZoom` instance reads directly from `zoomRef.current`. When `setZoomLevel` updates `layoutState.workspaceLayout.zoomLevel`, an effect in `use-project-editor.ts` synchronizes `zoomRef.current` to the new value. All editors observing the same ref object see the change without needing re-renders or explicit coordination.

## Keyboard Handling

Shortcuts are registered in `use-project-editor-shortcuts-effect.ts` via `window.addEventListener('keydown')`:

```typescript
// Ctrl/Cmd++: Zoom in
if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
    && (event.code === 'Equal' || event.key === '+')) {
  event.preventDefault()
  onZoomIn()
  return
}

// Ctrl/Cmd+-: Zoom out
if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
    && event.code === 'Minus') {
  event.preventDefault()
  onZoomOut()
  return
}
```

**Key detection uses both `event.code` AND `event.key`:**
- `event.code === 'Equal'` — captures English keyboards where `=` and `+` share a physical key (Ctrl+=)
- `event.key === '+'` — captures Spanish keyboards where `+` is its own dedicated key
- `event.code === 'Minus'` — captures Ctrl+- on all keyboard layouts

This dual-detection approach ensures compatibility with both English and Spanish keyboard layouts without conflicts.

## Action Wiring

The zoom callbacks are wired through `buildShortcutsEffectParams` in `use-project-editor.ts`:

```typescript
onZoomIn: () => {
  const current = workspaceLayout.zoomLevel ?? 1.0
  actions.setZoomLevel(current + 0.1)
},
onZoomOut: () => {
  const current = workspaceLayout.zoomLevel ?? 1.0
  actions.setZoomLevel(current - 0.1)
},
```

The `setZoomLevel` action calls `clampZoomLevel` on every invocation to normalize the value within [0.5, 2.0].

## Persistence

Zoom persists via `trama.workspace.layout.v1` in localStorage, handled by `useWorkspaceLayoutState`. On startup, `normalizeWorkspaceLayoutState` clamps the persisted zoom value to [MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL].

## Key Files

| File | Responsibility |
|------|----------------|
| `src/features/project-editor/project-editor-types.ts` | `zoomLevel` field in `WorkspaceLayoutState`; `EditorZoomRef` interface; `zoomRef` in `ProjectEditorModel` |
| `src/features/project-editor/project-editor-logic.ts` | `clampZoomLevel` for normalization in state persistence |
| `src/features/project-editor/editor-zoom.ts` | Zoom constants and `clampZoomLevel` utility |
| `src/features/project-editor/use-project-editor.ts` | Creates and exports `zoomRef`; synchronizes `zoomRef.current` when `layoutState.workspaceLayout.zoomLevel` changes |
| `src/features/project-editor/use-project-editor-shortcuts-effect.ts` | Ctrl++ / Ctrl+- key detection and callback invocation |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | `setZoomLevel` action implementation |
| `src/features/project-editor/pane/workspace-editor-panels.tsx` | Reads `model.zoomRef` and passes it to both `PaneEditor` instances in split mode |
| `src/features/project-editor/pane/editor-panel.tsx` | Propagates `zoomRef` to `RichMarkdownEditor` |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx` | Receives `zoomRef` and passes it to `useEditorZoom` |
| `src/features/project-editor/pane/rich-markdown-editor/use-editor-zoom.ts` | DOM zoom application via CSS `zoom`; reads `zoomRef.current` on each effect run |

## Tests

- `tests/workspace-keyboard-shortcuts.test.ts` — Zoom shortcut recognition and clamping logic
- `tests/workspace-layout-persistence.test.ts` — Zoom persistence and clamping on restore
- `tests/editor-zoom-ref.test.ts` — `EditorZoomRef` existence, initial value, shared instance, and synchronization with `setZoomLevel`
