# Keyboard Shortcuts Architecture

## Where Shortcuts Are Defined

All workspace keyboard shortcuts live in a single file:

```
src/features/project-editor/use-project-editor-shortcuts-effect.ts
```

Shortcuts are registered via `window.addEventListener('keydown')` and fire before Electron processes them natively (for shortcuts that Electron does NOT consume). See below for the distinction.

## The Callback Pattern

Shortcuts follow a consistent callback pattern:

1. `use-project-editor-shortcuts-effect.ts` **detects** key combinations and invokes callbacks
2. `buildShortcutsEffectParams` in `use-project-editor.ts` **wires** callbacks to actions
3. `useProjectEditor` **passes** the wired params to the effect hook
4. Each callback is a named function: `onToggleSplitLayout`, `onSaveNow`, `onZoomIn`, `onZoomOut`, etc.

```
use-project-editor.ts
  └─ buildShortcutsEffectParams(actions, isFullscreen, workspaceLayout) → { onXxx callbacks }
       └─ useProjectEditorShortcutsEffect(callbacks)
            └─ window.addEventListener('keydown', onWindowKeyDown)
```

## Shortcut List

| Shortcut | Callback | Action |
|----------|----------|--------|
| `Ctrl/Cmd + .` | `onToggleSplitLayout` | Toggle workspace split mode |
| `Ctrl/Cmd + S` | `onSaveNow` | Save current document |
| `Ctrl/Cmd + Shift + F` | `onToggleFullscreen` | Toggle fullscreen mode |
| `Ctrl/Cmd + Shift + M` | `onToggleFocusMode` | Toggle focus mode |
| `Ctrl/Cmd + Shift + Tab` | `onSwitchActivePane` | Switch active pane in split mode |
| `Alt + Left` | `onOpenPreviousHistory` | Open previous document in the current pane history |
| `Alt + Right` | `onOpenNextHistory` | Open next document in the current pane history |
| `Escape` | `onEscapePressed` | Exit fullscreen and/or focus mode |
| `Ctrl/Cmd + +` / `Ctrl + =` | `onZoomIn` | Zoom in on editor content (+0.1) |
| `Ctrl/Cmd + -` | `onZoomOut` | Zoom out on editor content (-0.1) |

### Additional Shortcuts (other files)

| Shortcut | Where | What it does |
|----------|-------|-------------|
| `Ctrl/Cmd + R` | Electron `main.ts` `before-input-event` | Reload project (intercepted from Electron native reload) |
| `Ctrl/Cmd + F` | `rich-markdown-editor-find.tsx` | Open in-document find bar |
| `Ctrl/Cmd + H` | `rich-markdown-editor-find-state.ts` | Open in-document find + replace |

## Renderer vs Electron-Native Shortcuts

### Renderer Shortcuts (handled in use-project-editor-shortcuts-effect.ts)

These shortcuts use `window.addEventListener('keydown')` and are processed entirely in the renderer. Electron does NOT consume these natively, so they pass through without interference:

- `Ctrl + .` (Period)
- `Ctrl + S`
- `Ctrl + Shift + F`
- `Ctrl + Shift + M`
- `Ctrl + Shift + Tab`
- `Alt + Left`
- `Alt + Right`
- `Escape`
- `Ctrl + +` / `Ctrl + -` (zoom)

### Electron-Native Shortcuts (handled in electron/main.ts)

These shortcuts ARE consumed by Electron/Chromium by default. They are intercepted in `before-input-event` to prevent the native behavior and redirected to the renderer:

- `Ctrl + R` (Electron reload) → intercepted → sends `IPC_CHANNELS.reloadProjectRequested` → renderer reloads project

**Note:** Ctrl++ / Ctrl+- were originally Electron-native zoom shortcuts. In the current implementation they are handled purely in the renderer via `window.addEventListener('keydown')` — no `before-input-event` interception is needed because Electron's `before-input-event` handler in `main.ts` calls `event.preventDefault()` for zoom shortcuts, allowing the renderer to capture them normally.

## Key Detection Strategy

Shortcuts use `event.code` for physical key detection with `event.key` fallback:

```typescript
// Platform-agnostic modifier detection
const isModifierPressed = isMac ? event.metaKey : event.ctrlKey

// Physical key code (reliable across layouts)
event.code === 'Equal'    // =/+ key
event.code === 'Minus'    // - key
event.code === 'Period'   // . key
event.code === 'KeyS'     // S key

// Character-based fallback (for layout-specific keys)
event.key === '+'         // Spanish keyboard dedicated + key
```

This dual approach ensures compatibility with both US English (where `+` requires Shift+Equal) and Spanish keyboards (where `+` is a dedicated key).

## Guard Conditions

All shortcuts respect these guard conditions:

1. **Form field exclusion** — `isFormFieldTarget()` blocks shortcuts when focus is inside `<input>`, `<textarea>`, or `<select>`
2. **Modal exclusion** — `hasOpenModal()` blocks Escape when a dialog with `aria-modal="true"` is open
3. **Modifier exclusion** — zoom and save shortcuts require `!event.altKey`; history navigation intentionally uses bare `Alt + Left/Right`

## Key Files

| File | Role |
|------|------|
| `src/features/project-editor/use-project-editor-shortcuts-effect.ts` | Shortcut detection and callback invocation |
| `src/features/project-editor/use-project-editor.ts` | `buildShortcutsEffectParams` wires callbacks to actions |
| `src/features/project-editor/use-project-editor-focus-actions.ts` | Focus mode toggle/set actions |
| `src/features/project-editor/use-project-editor-layout-actions.ts` | Split pane toggle/set actions |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts` | `saveNow`, `updateEditorValue`, `setZoomLevel` actions |
| `electron/main.ts` | `before-input-event` for Electron-native shortcut interception |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-find.tsx` | Ctrl+F find bar |
| `src/features/project-editor/pane/rich-markdown-editor/rich-markdown-editor-find-state.ts` | Ctrl+H find+replace |
