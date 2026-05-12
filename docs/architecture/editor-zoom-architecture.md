# Editor Zoom Architecture

## Purpose

Document the zoom feature for the rich markdown editor. Zoom is controlled via keyboard shortcuts (Ctrl++ / Ctrl+-) and a toolbar drop-down menu. Zoom persists across sessions.

## Design Goals

1. **Open architecture for access points** — Zoom state lives in `WorkspaceLayoutState` alongside layout mode, ratio, and focus settings. Both the keyboard shortcuts and toolbar drop-down manipulate zoom through the same `setZoomLevel` action interface.

2. **Twin view applies zoom to both panes** — In split mode, both editor panes share the same `zoomLevel` from the layout state. The shared state means both panes automatically render at the same zoom level without per-pane zoom coordination logic. The toolbar drop-down in each pane stays synchronized because both read from the same `zoomLevel` prop derived from `layoutState.workspaceLayout.zoomLevel`.

3. **Keyboard-driven + toolbar UI** — Ctrl++ increases zoom by 0.1, Ctrl+- decreases by 0.1. The toolbar drop-down provides discrete zoom values: 50%, 75%, 100%, 125%, 150%, 175%, 200%. Zoom is clamped to [0.5, 2.0].

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

## Toolbar Drop-down

The zoom drop-down is implemented in `rich-markdown-editor-toolbar.ts` via `useSyncToolbarControls`. It appears as a `<select>` element with class `ql-zoom-level` in Quill's toolbar, positioned to the left of `.rich-toolbar-controls`.

**Zoom options:** 50%, 75%, 100%, 125%, 150%, 175%, 200% (corresponding to 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)

**Props passed to `RichMarkdownEditor`:**
- `zoomLevel?: number` — current zoom level from `layoutState.workspaceLayout.zoomLevel`
- `onZoomChange?: (level: number) => void` — callback that calls `actions.setZoomLevel(level)`

**Synchronization in split mode:** Both `PaneEditor` components receive the same `zoomLevel` prop and `onZoomChange` callback from `WorkspaceEditorPanels`. When a user changes the drop-down in either pane, `setZoomLevel` updates the shared layout state, which triggers a re-render with the new `zoomLevel` in both panes.

## File Structure

The toolbar implementation is split across multiple files to comply with lint constraints:

```
src/features/project-editor/pane/rich-markdown-editor/
├── rich-markdown-editor-toolbar.ts          # Main hook: useSyncToolbarControls
├── rich-markdown-editor-toolbar-helpers.ts   # createZoomSelect, ZOOM_PAIRS, normalizeZoomValue
├── rich-markdown-editor-toolbar-controls.ts # ensureToolbarControls, syncLayoutButtons, syncToolbarSaveControls
└── zoom-select-sync.ts                       # syncZoomSelect (separate file to avoid TS resolution conflict)
```

### `toolbar-helpers.ts` — Zoom Select Creation

```typescript
export const ZOOM_PAIRS: Array<[number, string]> = [
  [0.5, '0.5'],
  [0.75, '0.75'],
  [1.0, '1.0'],
  [1.25, '1.25'],
  [1.5, '1.5'],
  [1.75, '1.75'],
  [2.0, '2.0'],
]

export function normalizeZoomValue(value: number): string {
  const found = ZOOM_PAIRS.find(([num]) => Math.abs(num - value) < 0.001)
  return found ? found[1] : String(value)
}

export function createZoomSelect(): HTMLSelectElement {
  const select = document.createElement('select')
  select.className = 'ql-zoom-level'
  select.title = 'Zoom'
  select.setAttribute('aria-label', 'Zoom')
  // ... options creation
  return select
}
```

`ZOOM_PAIRS` is an array of `[number, string]` tuples that maps numeric zoom levels to their string representation in the drop-down. `normalizeZoomValue` uses this array to handle floating-point comparison issues (e.g., `1.0` vs `0.999999...`).

### `toolbar-controls.ts` — Toolbar Control Sync Helpers

```typescript
export function ensureToolbarControls(container: HTMLElement): HTMLElement {
  // Gets or creates .rich-toolbar-controls div inside Quill toolbar
}

export function syncLayoutButtons(container: HTMLElement): void {
  // Syncs save/revert button visibility
}

export function syncToolbarSaveControls(
  container: HTMLElement,
  syncState: SyncState,
  onSaveNow: () => void,
  onRevertNow: () => void
): void {
  // Syncs save controls based on sync state
}
```

### `zoom-select-sync.ts` — Zoom Drop-down Synchronization

```typescript
export function syncZoomSelect(
  zoomSelect: HTMLSelectElement | undefined,
  zoomLevel: number | undefined,
  onZoomChange: ((level: number) => void) | undefined,
): void {
  if (!zoomSelect) return

  const normalizedZoom = zoomLevel ?? 1.0
  const found = ZOOM_PAIRS.find(([num]) => Math.abs(num - normalizedZoom) < 0.001)
  zoomSelect.value = found ? found[1] : String(normalizedZoom)

  if (onZoomChange) {
    zoomSelect.onchange = () => {
      const newLevel = parseFloat(zoomSelect.value)
      if (!isNaN(newLevel)) {
        onZoomChange(newLevel)
      }
    }
  }
}
```

**Note:** `syncZoomSelect` is in its own file to avoid a TypeScript module resolution conflict with `verbatimModuleSyntax: true`. The function was extracted when tests failed with "Expected 1 arguments, but got 2" due to the module resolution cache treating the function incorrectly.

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
| `src/features/project-editor/pane/workspace-editor-panels.tsx` | Passes `zoomLevel` and `onZoomChange` to both `PaneEditor` / `ActiveEditorPanel` instances |
| `src/features/project-editor/pane/editor-panel.tsx` | Propagates `zoomLevel` and `onZoomChange` to `RichMarkdownEditor` |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx` | Receives `zoomRef`, `zoomLevel`, and `onZoomChange`; passes to `useSyncToolbarControls` |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar.ts` | `useSyncToolbarControls` hook that creates and syncs the zoom drop-down |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-helpers.ts` | `createZoomSelect` function, `ZOOM_PAIRS` array, `normalizeZoomValue` utility |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-toolbar-controls.ts` | Toolbar control helpers: `ensureToolbarControls`, `syncLayoutButtons`, `syncToolbarSaveControls` |
| `src/features/project-editor/pane/rich-markdown-editor/zoom-select-sync.ts` | `syncZoomSelect` function (in separate file to avoid TS resolution conflict) |
| `src/features/project-editor/pane/rich-markdown-editor/use-editor-zoom.ts` | DOM zoom application via CSS `zoom`; reads `zoomRef.current` on each effect run |

## Tests

- `tests/workspace-keyboard-shortcuts.test.ts` — Zoom shortcut recognition and clamping logic
- `tests/workspace-layout-persistence.test.ts` — Zoom persistence and clamping on restore
- `tests/editor-zoom-ref.test.ts` — `EditorZoomRef` existence, initial value, shared instance, and synchronization with `setZoomLevel`
- `tests/rich-markdown-editor-toolbar-zoom.test.ts` — Toolbar zoom drop-down rendering, value updates, and `onZoomChange` callback (8 tests)