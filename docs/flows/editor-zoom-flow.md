# Editor Zoom Flow

## Trigger

The user presses Ctrl++ (zoom in) or Ctrl+- (zoom out) while the editor is focused.

## Entry point

`onWindowKeyDown` handler in `src/features/project-editor/use-project-editor-shortcuts-effect.ts`.

## Sequence

1. User presses `Ctrl` + `+` (or `Ctrl` + `=`) or `Ctrl` + `-`.
2. `window.addEventListener('keydown', onWindowKeyDown)` fires.
3. Handler checks `isFormFieldTarget(event.target)` — returns early if focus is inside input/textarea/select.
4. Handler checks modifier keys:
   - `(event.ctrlKey || event.metaKey)` → modifier is pressed
   - `!event.altKey && !event.shiftKey` → no other modifiers
5. **For zoom in**: `event.code === 'Equal'` (English keyboard) OR `event.key === '+'` (Spanish keyboard) → match.
6. **For zoom out**: `event.code === 'Minus'` → match.
7. `event.preventDefault()` is called to prevent browser default behavior.
8. The matched callback is invoked:
   - **Zoom in**: `onZoomIn()` 
   - **Zoom out**: `onZoomOut()`

## Action Chain

### Step 1: Callback Invocation

The callback was wired in `buildShortcutsEffectParams` inside `use-project-editor.ts`:

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

### Step 2: setZoomLevel Action

The `setZoomLevel` action is defined in `useWorkspaceLayoutActions` within `use-project-editor-ui-actions-helpers.ts`:

```typescript
setZoomLevel: (level: number) => {
  setters.setWorkspaceLayout((previous: WorkspaceLayoutState) => ({
    ...previous,
    zoomLevel: clampZoomLevel(level),
  }))
},
```

### Step 3: Clamping

`clampZoomLevel` from `editor-zoom.ts` normalizes the value:

```typescript
export function clampZoomLevel(value: number): number {
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, value))
  // MIN_ZOOM_LEVEL = 0.5, MAX_ZOOM_LEVEL = 2.0
}
```

### Step 4: State Update

`setWorkspaceLayout` updates React state via the Preact setter. The new `WorkspaceLayoutState` includes the clamped `zoomLevel`.

### Step 5: Re-render Propagation

- `useWorkspaceLayoutState` detects the state change and persists to localStorage
- React re-renders components that consume `workspaceLayout.zoomLevel`
- In split mode, both `WorkspaceSplitEditorPanels` receive the same `zoomLevel`

### Step 6: DOM Application

`useEditorZoom` hook in `RichMarkdownEditor` detects the `zoomLevel` change:

```typescript
export function useEditorZoom({ editorRef, hostRef, zoomLevel }: UseEditorZoomParams): void {
  useEffect(() => {
    const clampedZoom = clampZoomLevel(zoomLevel)
    const root = editor.root as HTMLElement
    root.style.transform = `scale(${clampedZoom})`
    root.style.transformOrigin = 'top left'
    root.style.width = `${100 / clampedZoom}%`
    root.style.height = 'auto'
    root.style.overflow = 'hidden'
  }, [editorRef, hostRef, zoomLevel])
}
```

### Step 7: Persistence

`useWorkspaceLayoutState` persists the updated layout (including `zoomLevel`) to `window.localStorage` under key `trama.workspace.layout.v1`.

On next app startup, `restoreWorkspaceLayoutState` reads the persisted value and `normalizeWorkspaceLayoutState` clamps it before applying.

## Reads

| Kind | Source | Why |
|------|--------|-----|
| Keyboard event | `KeyboardEvent` from `window.keydown` | Detects Ctrl++ / Ctrl+- |
| Current zoom level | `state.workspaceLayout.zoomLevel` | Base value for increment/decrement |
| Editor DOM | `editor.root` (HTMLElement) | Target for CSS transform |
| localStorage | `trama.workspace.layout.v1` | Persist across sessions |

## Writes

| Target | File | What changes |
|--------|------|--------------|
| `workspaceLayout.zoomLevel` | `use-project-editor-ui-actions-helpers.ts` | Updated to clamped value (+/- 0.1) |
| `editor.root.style.transform` | `use-editor-zoom.ts` | Set to `scale(newZoom)` |
| `editor.root.style.width` | `use-editor-zoom.ts` | Set to `100/newZoom%` for proper overflow |
| localStorage | `use-workspace-layout-state.ts` | Persisted via `JSON.stringify(normalizeWorkspaceLayoutState(...))` |

## Side Effects

| Side effect | File |
|-------------|------|
| Zoom style memoization | `use-editor-zoom.ts` — skips re-application if scale hasn't changed |
| Layout persistence effect | `use-workspace-layout-state.ts` — persists entire layout including zoom |

## Files to Inspect

| File | Why |
|------|-----|
| `src/features/project-editor/use-project-editor-shortcuts-effect.ts` | Key detection entry point |
| `src/features/project-editor/use-project-editor.ts` | `buildShortcutsEffectParams` callback wiring |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | `setZoomLevel` action |
| `src/features/project-editor/editor-zoom.ts` | `clampZoomLevel` and constants |
| `src/features/project-editor/pane/rich-markdown-editor/use-editor-zoom.ts` | CSS transform application |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor.tsx` | `useEditorZoom` hook invocation |
| `src/features/project-editor/pane/workspace-editor-panels.tsx` | Shared zoomLevel for split mode |
| `src/features/project-editor/use-workspace-layout-state.ts` | Persistence via localStorage |
| `src/features/project-editor/project-editor-logic.ts` | `normalizeWorkspaceLayoutState` clamping on restore |

## Split Mode Behavior

In split mode, `WorkspaceEditorPanels` reads `model.state.workspaceLayout.zoomLevel` and passes the same value to both `PaneEditor` components:

```typescript
const zoomLevel = model.state.workspaceLayout.zoomLevel ?? 1.0
// Passed to both:
<PaneEditor ... zoomLevel={zoomLevel} />
<PaneEditor ... zoomLevel={zoomLevel} />
```

Each `PaneEditor` passes it to `EditorPanel`, which passes it to `RichMarkdownEditor`, which hooks `useEditorZoom`. Both editors receive identical zoom levels and scale identically.

## Common Failure Modes

| Symptom | Usual cause | First file to inspect |
|---------|-------------|-----------------------|
| Zoom doesn't work on Spanish keyboard | Key detection only checks `event.code` | `use-project-editor-shortcuts-effect.ts` (needs `event.key === '+'`) |
| Zoom doesn't work on English keyboard | Key detection only checks `event.key` | `use-project-editor-shortcuts-effect.ts` (needs `event.code === 'Equal'`) |
| Zoom affects UI too | Electron native zoom not prevented | `electron/main.ts` `before-input-event` |
| Zoom not persisted after restart | `normalizeWorkspaceLayoutState` missing `zoomLevel` | `project-editor-logic.ts` |
| Zoom level not clamped | `clampZoomLevel` not called on every set | `use-project-editor-ui-actions-helpers.ts` |
| Twin panes at different zoom | Per-pane zoom state instead of shared | `workspace-editor-panels.tsx` |
