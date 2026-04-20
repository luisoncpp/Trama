# Focus Mode Architecture

## Purpose

Focus mode dims surrounding text around the caret to reduce visual noise during writing. It supports three scopes: `line`, `sentence`, and `paragraph`. State persists in `trama.workspace.layout.v1`.

---

## Overview

```
User presses Ctrl+Shift+M
        │
        ▼
useToggleFocusModeAction()
  • Collapses sidebar if enabling
  • Toggles workspaceLayout.focusModeEnabled
        │
        ▼
useFocusModeScopeEffect()
  • Monitors focusModeEnabled + focusScope
  • Initializes or clears focus rendering
        │
        ├─── focusModeEnabled = false ───► clearFocusScope()
        │
        └─── focusModeEnabled = true ───► initializeFocusMode()
                                              │
                                              ▼
                                    applyFocusScope(quill, editorRoot, scope)
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                    scope='line'       scope='sentence'    scope='paragraph'
                          │                   │                   │
                          ▼                   ▼                   ▼
            applyInlineFocusScope()  applyInlineFocusScope()  applyBlockFocusScope()
                          │                   │                   │
                          ▼                   ▼                   ▼
            CSS Highlights API      CSS Highlights API      .is-focus-emphasis
            + fallback overlay      + fallback overlay     (class on line node)
```

---

## Rendering Strategy

Focus mode uses a **hybrid rendering** approach:

### Primary: CSS Highlights API

```typescript
// rich-markdown-editor-focus-scope-helpers.ts:9-24
const FOCUS_TEXT_HIGHLIGHT_NAME = 'trama-focus-scope'

function getHighlightRegistry(): HighlightRegistry | null {
  const cssObject = (globalThis as unknown as { CSS?: { highlights?: unknown } }).CSS
  const highlights = cssObject?.highlights as Partial<HighlightRegistry> | undefined
  if (!highlights || typeof highlights.set !== 'function') return null
  return highlights as HighlightRegistry
}
```

When available, text ranges are registered via `CSS.highlights.set()` with a `Highlight` object. This produces true text-level dimming without DOM manipulation.

### Fallback: Geometric Overlay

When Highlights API is unavailable (browser support), `applyInlineFocusScope` falls back to:

```typescript
// rich-markdown-editor-focus-scope-helpers.ts:105-106
// If native Highlights API is unavailable, fallback to line-level emphasis without DOM overlays.
lineNode.classList.add('is-focus-emphasis')
```

The `is-focus-emphasis` class applies CSS opacity to non-focused content.

---

## Scope Logic

### Line and Sentence (Inline Scopes)

Both `line` and `sentence` use `applyInlineFocusScope`:

1. Get current caret position from Quill selection
2. For `line`: `findVisualLineBoundaries()` uses `quill.getBounds()` to detect wrapped lines
3. For `sentence`: `findSentenceBoundaries()` splits on `/.!?。！？/`
4. Apply highlight via `applyFocusTextHighlight()` → CSS Highlights API or fallback

### Paragraph (Block Scope)

Paragraph scope works differently:

```typescript
// rich-markdown-editor-focus-scope-helpers.ts:109-123
export function applyFocusScope(quill: Quill, editorRoot: HTMLElement, scope: FocusScope): void {
  clearBlockFocusScope(editorRoot)
  if (scope !== 'paragraph') {
    applyInlineFocusScope(quill, editorRoot, scope)
    return
  }
  // paragraph: add is-focus-emphasis to the current line node
  const selection = quill.getSelection()
  const [line] = quill.getLine(selection?.index ?? 0)
  const targetNode = line?.domNode
  if (targetNode instanceof HTMLElement) {
    targetNode.classList.add('is-focus-emphasis')
  }
}
```

---

## Key Files

| File | Responsibility |
|------|-----------------|
| `rich-markdown-editor-focus-scope.ts` | Main effect hook, initializes/tears down focus mode |
| `rich-markdown-editor-focus-scope-helpers.ts` | Core logic: `applyFocusScope`, `applyInlineFocusScope`, `clearFocusScope`, `applyFocusTextHighlight` |
| `rich-markdown-editor-focus-scope-geometry.ts` | Text offset resolution, sentence/line boundary detection |
| `rich-markdown-editor-focus-scope-scroll.ts` | Centered scroll positioning to keep caret visible |
| `use-project-editor-focus-actions.ts` | `useToggleFocusModeAction`, `useSetFocusScopeAction` |
| `project-editor-logic.ts` | `focusModeEnabled: false` on startup (line 72) |

---

## State Flow

### Toggle Focus Mode

```typescript
// use-project-editor-focus-actions.ts:24-38
export function useToggleFocusModeAction(values, setters): ProjectEditorActions['toggleFocusMode'] {
  return useCallback(() => {
    if (!values.workspaceLayout.focusModeEnabled) {
      setters.setSidebarPanelCollapsed(true)  // Sidebar auto-collapses
    }
    setters.setWorkspaceLayout((previous) => ({
      ...previous,
      focusModeEnabled: !previous.focusModeEnabled,
    }))
  }, [setters, values.workspaceLayout.focusModeEnabled])
}
```

### Startup Policy

```typescript
// project-editor-logic.ts:72
// Startup policy: focus mode should always begin disabled.
focusModeEnabled: false,
```

Even if persisted layout has `focusModeEnabled: true`, it is force-reset to `false` on app startup.

---

## CSS Classes

| Class | Applied To | Purpose |
|-------|-----------|---------|
| `is-focus-mode` | `.ql-editor` | Global focus mode indicator |
| `is-focus-scope-line` | `.ql-editor` | Line scope active |
| `is-focus-scope-sentence` | `.ql-editor` | Sentence scope active |
| `is-focus-scope-paragraph` | `.ql-editor` | Paragraph scope active |
| `is-focus-emphasis` | Line/paragraph node | Dimming applied via CSS |
| `is-focus-text-highlight` | `.ql-editor` | Using CSS Highlights API |

---

## Sidebar Behavior

When focus mode is enabled, the sidebar rail becomes disabled and shows a tooltip:

```typescript
// sidebar-rail.tsx:54-56
disabled={focusModeEnabled}
title={focusModeEnabled ? 'Sidebar is locked while focus mode is active' : ...}
```

The sidebar cannot be reopened while focus mode is active (`use-project-editor-sidebar-actions.ts:21-27`).

---

## Keyboard Shortcut

`Ctrl+Shift+M` (or `Cmd+Shift+M` on macOS) toggles focus mode (`use-project-editor-shortcuts-effect.ts:43`, `electron/main-process/context-menu.ts:30`).

---

## Debugging Notes

### Focus mode not rendering
- Check that `focusModeEnabled` is `true` in state
- Verify browser supports CSS Highlights API: `window.CSS?.highlights` should exist
- Check `.ql-editor` has `is-focus-mode` class
- `is-focus-text-highlight` marker indicates CSS Highlights API path; absence means fallback is active

### Sentence/line boundaries wrong
- `findVisualLineBoundaries()` uses `quill.getBounds()` with 1px tolerance for wrapped lines
- `findSentenceBoundaries()` splits on `[.!?。！？]` with whitespace skip

### Scroll not centered (see `focus-mode-centered-scroll-spacers.md`)
- Use `Range.getBoundingClientRect()` from real DOM geometry, NOT `quill.getBounds()` alone — it returns editor-relative geometry that causes visible drift
- Keep edge spacing on `.ql-editor` (content side), not on `.ql-container` (scroll container), whose `clientHeight` distorts centering math
- Use `--focus-extra-top` / `--focus-extra-bottom` CSS variables driven by `::before` / `::after` pseudo-elements for reliable EOF spacing
- Recompute scroll target after spacing applies via a second `requestAnimationFrame`

### Focus rendering regressed silently
- Any visual change must be non-mutating relative to Quill content
- Preserve render order: try Highlights API first, then fallback overlay
- Keep `is-focus-text-highlight` as test-observable state for the highlight path
- Never inject wrapper/overlay nodes into `.ql-editor` — it breaks Quill ownership and Delta integrity

---

## Key Invariants

1. **Focus mode state is preserved through startup**: `normalizeWorkspaceLayoutState` uses `layout.focusModeEnabled ?? false` — a persisted `true` is kept, not reset. Test: `focus-mode-scope.test.ts` "preserves focusModeEnabled true through normalization".
2. **Sidebar locks during focus**: Sidebar rail is disabled while focus mode is active.
3. **Paragraph scope uses block emphasis only**: No CSS Highlights API for paragraph — only `is-focus-emphasis` class on the line node.
4. **Highlight marker required**: `is-focus-text-highlight` must remain even without direct CSS consumer — it is the test-observable signal that highlight path is active.
5. **Two RAF passes for scroll**: Typewriter centering requires recomputing after CSS spacing is applied.

---

## References

- Rich markdown editor architecture: `docs/architecture/rich-markdown-editor-core-architecture.md`
- Split pane coordination: `docs/architecture/split-pane-coordination.md`
- Lessons learned: `docs/lessons-learned/focus-mode-centered-scroll-spacers.md`, `docs/lessons-learned/focus-mode-rich-editor-highlight-vs-overlay.md`
- Tests: `tests/focus-mode-scope.test.ts`, `tests/rich-markdown-editor-focus-rendering.test.ts`
