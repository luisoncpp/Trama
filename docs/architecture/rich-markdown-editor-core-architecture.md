# Rich Markdown Editor Core Architecture

## Purpose

This document describes how **Trama** uses **Quill** to implement its rich text editor. It does not document Quill itself (see [Quill API docs](https://quilljs.com/docs/)), but the integration decisions, custom extensions, and data flow within this project.

---

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RichMarkdownEditor.tsx                   │
│                      (React Component)                      │
├─────────────────────────────────────────────────────────────┤
│  useRichEditorRefs() ───► refs: hostRef, editorRef, etc.  │
│  useRichEditorLifecycle() ──► Quill initialization          │
│  useSyncToolbarControls() ──► toolbar + layout buttons + save │
│  useFocusModeScopeEffect() ──► focus mode (CSS Highlights)  │
│  useRichEditorFind() ─────► Ctrl+F find bar               │
│  useTagOverlay() ─────────► wiki tag overlays              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               rich-markdown-editor-core.ts                  │
│                   (Lifecycle Hooks)                        │
├─────────────────────────────────────────────────────────────┤
│  useInitializeEditor()    → createQuillEditor()             │
│  useSyncExternalValue()   → applyMarkdownToEditor()         │
│  useToggleDisabled()      → editor.enable()               │
│  useSyncSpellcheckEnabled() → spellcheck attr               │
│  registerTypographyHandler() → ──► ──► ──► ──►            │
│  registerWorkspaceCommandListener() → CustomEvent bridge    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                rich-markdown-editor-quill.ts                │
│                 (Quill init + parse/serialize)              │
├─────────────────────────────────────────────────────────────┤
│  createQuillEditor()                                        │
│    • Registers custom blots (layout directives)              │
│    • new Quill({ theme: 'snow', modules: {...} })          │
│    • Registers clipboard matchers + keyboard bindings       │
│                                                             │
│  applyMarkdownToEditor()  (markdown → Quill HTML)            │
│    1. renderDirectiveArtifactsToMarkdown()                   │
│    2. editor.setContents([])        // Clear editor first    │
│    3. marked.parse()                                        │
│    4. editor.clipboard.dangerouslyPasteHTML()               │
│    5. syncCenteredLayoutArtifacts()                         │
│                                                             │
│  serializeEditorMarkdown()  (Quill HTML → markdown)            │
│    1. editor.root.innerHTML → turndownService.turndown()       │
│    2. normalizeMarkdown()               // \r\n → \n, trim end │
│    3. normalizeBlankLinesToSpacerDirectives()                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Responsibility |
|------|-----------------|
| `rich-markdown-editor.tsx` | Main React component, hook orchestration |
| `rich-markdown-editor-core.ts` | Editor lifecycle (init, sync, disable, spellcheck) |
| `rich-markdown-editor-quill.ts` | Quill creation, markdown parse/serialize |
| `rich-markdown-editor-toolbar.ts` | Toolbar controls: save button, sync state, layout buttons (center/pagebreak) |
| `rich-markdown-editor-commands.ts` | Command bridge via CustomEvent (`paste-markdown`, `copy-as-markdown`) |
| `rich-markdown-editor-typography.ts` | Typography replacements (`--` → `—`) |
| `rich-markdown-editor-ctrl-key.ts` | Ctrl/Meta key state for tag overlay activation |
| `rich-markdown-editor-layout-blots.ts` | Custom blots for layout directives |
| `rich-markdown-editor-layout-clipboard.ts` | Clipboard matchers for layout directives |
| `rich-markdown-editor-layout-keyboard.ts` | Keyboard bindings for navigating pagebreaks |
| `rich-markdown-editor-layout-actions.ts` | Insert center/spacer/pagebreak |
| `rich-markdown-editor-layout-centering.ts` | Centered content CSS sync |
| `rich-markdown-editor-tag-overlay.ts` | Wiki tag click detection |
| `rich-markdown-editor-tag-helpers.ts` | Tag match search and filtering utilities |
| `rich-markdown-editor-tag-highlights.tsx` | Tag overlay visual highlights (CSS Highlights API) |
| `rich-markdown-editor-find.tsx` | Find/replace bar with Ctrl+F |
| `rich-markdown-editor-find-overlay.tsx` | Floating find input UI |
| `rich-markdown-editor-find-visual.ts` | Active match overlay effect |
| `rich-markdown-editor-focus-scope.ts` | Focus mode effect (CSS Highlights API + overlay fallback) |
| `rich-markdown-editor-focus-scope-helpers.ts` | Focus mode class management and selection rect helpers |
| `rich-markdown-editor-focus-scope-scroll.ts` | Focus mode centered scroll positioning |
| `rich-markdown-editor-focus-scope-geometry.ts` | Focus mode viewport geometry calculations |

---

## Quill Initialization

```typescript
// rich-markdown-editor-quill.ts:17-42
export function createQuillEditor(host: HTMLDivElement): Quill {
  registerLayoutDirectiveBlots()        // 1. Custom blots first
  host.innerHTML = ''                    // 2. Clear host
  const toolbar = document.createElement('div')
  const editorHost = document.createElement('div')
  host.append(toolbar, editorHost)       // 3. Create DOM structure
  
  const editor = new Quill(editorHost, {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      history: { userOnly: true },       // 4. Only user changes in undo stack
    },
  })
  
  registerLayoutDirectiveClipboardMatchers(editor)  // 5. Post-init
  registerLayoutDirectiveKeyboardBindings(editor)
  return editor
}
```

### Key decisions:
- **Manual toolbar creation**: Quill expects a toolbar container, but Trama injects it into an empty `host` and then extends with custom buttons (`ql-center-layout`, `ql-pagebreak-layout`, save button).
- **History `userOnly: true`**: Prevents programmatic changes (`'api'`, `'silent'`) from entering the undo stack.

---

## Data Flow

### Markdown → Quill (Document Load)

```
normalizeMarkdown(value)
    │
    ▼
renderDirectiveArtifactsToMarkdown()  // Converts markdown directives to placeholders
    │
    ▼
marked.parse()                        // Markdown → HTML
    │
    ▼
editor.setContents([], source)        // Clear editor before inserting
    │
    ▼
editor.clipboard.dangerouslyPasteHTML()  // Insert into Quill (source='silent')
    │
    ▼
syncCenteredLayoutArtifacts()          // Sync centered content CSS artifacts
```

> **Note:** `syncCenteredLayoutArtifacts()` is also called on every `text-change` event (not just on load) to keep centered content CSS classes in sync during editing.

### Quill → Markdown (Save)

```
editor.root.innerHTML
    │
    ▼
turndownService.turndown()             // HTML → Markdown (with custom rule)
    │
    ▼
normalizeMarkdown()                    // Normalize line endings (\r\n → \n) + trim end
    │
    ▼
normalizeBlankLinesToSpacerDirectives() // Blank lines → spacer directives
    │
    ▼
onChange(markdown)                     // Trigger IPC save
```

### Serialization (`serializeEditorMarkdown`)

`serializeEditorMarkdown` lives in `rich-markdown-editor-quill.ts` as the canonical implementation. A `serializeEditorMarkdownFromRef` variant accepts `{ current: TurndownService }` (the ref pattern used across hooks). Both are used by `rich-markdown-editor-core.ts` and `rich-markdown-editor-commands.ts`.

### Turndown Custom Rule (`rich-markdown-editor.tsx:34-40`)

```typescript
service.addRule('trama-layout-directives', {
  filter: (node) => Boolean((node as Element).getAttribute?.('data-trama-directive')),
  replacement: (_content, node) => {
    const directiveComment = serializeDirectiveArtifactNode(node as Element)
    return directiveComment ? `\n${directiveComment}\n` : ''
  },
})
```

Converts nodes with `data-trama-directive` back to markdown directives (`<!-- trama-directive: spacer lines:3 -->`).

---

## Custom Blots (Layout Directives)

### Structure (`rich-markdown-editor-layout-blots.ts`)

```typescript
class LayoutDirectiveBlot extends QuillBlockEmbed {
  static blotName = 'trama-directive'
  static tagName = 'div'
  static className = 'trama-layout-directive'
  
  static create(value?: unknown): HTMLElement {
    // Creates node with:
    //   data-trama-directive="center|spacer|pagebreak|unknown"
    //   data-trama-role="start|end"      (for center)
    //   data-trama-lines="N"             (for spacer)
    //   data-trama-raw="..."             (for unknown)
    //   contenteditable="false"
    //   textContent="\u2060" (workaround for turndown)
  }
}
```

### Directive Types

| Directive | Attributes | Purpose |
|-----------|-----------|---------|
| `center` | `role: 'start' \| 'end'` | Delimits centered content |
| `spacer` | `lines: 1-12` | Vertical spacing |
| `pagebreak` | — | Page break marker |
| `unknown` | `raw: string` | Fallback for unknown directives |

### Registration

```typescript
Quill.register(`formats/${LAYOUT_DIRECTIVE_BLOT_NAME}`, LayoutDirectiveBlot, true)
// Flag `true` = allow overriding existing formats
```

---

## Smart Typography (`--` → `—`)

Handler on `text-change` (`rich-markdown-editor-typography.ts`):

```typescript
// RULES: -- → —, << → «, >> → »
editor.on('text-change', (delta, _old, source) => {
  if (source !== 'user' || replacing) return
  
  const index = getInsertIndex(delta)
  if (index === null || index < 1) return
  
  const two = editor.getText(index - 1, 2)
  const rule = RULES.find(r => r.pattern === two)
  if (!rule) return
  
  replacing = true
  try {
    editor.history.cutoff()           // Exclude from undo
    editor.updateContents(new Delta().retain(index - 1).delete(2).insert(rule.replacement), 'user')
    editor.history.cutoff()
  } finally {
    replacing = false
  }
})
```

**Reversible with Ctrl+Z** thanks to `history.cutoff()` cutting the undo stack before and after the replacement.

---

## Event Bridge Pattern (Commands)

Context menu commands travel via CustomEvent (`WORKSPACE_CONTEXT_MENU_EVENT`), not via direct props. This decouples the trigger from the handler.

### Definition (`workspace-context-menu.ts`)

```typescript
export const WORKSPACE_CONTEXT_MENU_EVENT = 'trama:workspace-command'
export type WorkspaceContextCommand =
  | { type: 'toggle-split' }
  | { type: 'toggle-fullscreen' }
  | { type: 'toggle-focus' }
  | { type: 'set-focus-scope'; scope: 'line' | 'sentence' | 'paragraph' }
  | { type: 'set-split-ratio'; ratio: number }
  | { type: 'paste-markdown' }
  | { type: 'copy-as-markdown' }
```

### Handler (`rich-markdown-editor-commands.ts`)

```typescript
window.addEventListener(WORKSPACE_CONTEXT_MENU_EVENT, handler)
```

The editor handler listens for this global event and executes:
- **`paste-markdown`**: Read clipboard → markdown → insert via `dangerouslyPasteHTML`
- **`copy-as-markdown`**: Serialize selection → clipboard as markdown

### Trigger (from sidebar/workspace)

```typescript
window.dispatchEvent(new CustomEvent(WORKSPACE_CONTEXT_MENU_EVENT, { detail: command }))
```

---

## Wiki Tag Overlays

System for detecting `[[wiki-tags]]` and showing clickable overlays:

```
buildTagOverlayMatches(editor, tagIndex)
    │
    ▼
findTagMatchesInText()          // Search in plain text
    │
    ▼
filterMatchesOutsideCode()      // Exclude inline code
    │
    ▼
mapPlainTextIndexToQuillIndex()  // Convert indices (Quill counts embeds)
    │
    ▼
editor.getBounds()              // Get pixel position
```

Click handler (`rich-markdown-editor.tsx:56-80`):
- Verifies `ctrlKey` or `metaKey`
- Searches for match at mouse position
- If hit: `preventDefault()` + calls `onTagClick(filePath)`

---

## Editor State Management

### Main Refs (`useRichEditorRefs`)

```typescript
const shellRef       // Outer container
const hostRef        // Where Quill mounts
const editorRef      // Quill instance
const onChangeRef    // onChange callback (refs for closures)
const lastEditorValueRef    // Last serialized value (avoids loops)
const isApplyingExternalValueRef  // Flag: ignore external text-change
const turndownRef    // Persistent TurndownService
```

### Preventing Sync Loops

```
value prop changes
    │
    ▼
useSyncExternalValue() detects diff with lastEditorValueRef
    │
    ▼
isApplyingExternalValueRef = true   // Blocks text-change handler
    │
    ▼
applyMarkdownToEditor()
    │
    ▼
text-change handler ignores (isApplyingExternalValueRef=true)
    │
    ▼
setTimeout(0) → isApplyingExternalValueRef = false
```

---

## IPC Integration for Save

```
User clicks save button
    │
    ▼
onSaveNow callback
    │
    ▼
useProjectEditorUiActions.saveDocumentNow()
    │
    ▼
IPC: 'trama:document:save' channel
    │
    ▼
document-handlers.ts → DocumentRepository.save()
    │
    ▼
Updates .trama.index.json
```

The editor doesn't know about IPC directly; it only exposes `syncState` (clean/dirty/saving) and callbacks.

---

## Quill Extensions Used

| Extension | Purpose |
|-----------|--------|
| `blots/block/embed` | Base for `LayoutDirectiveBlot` |
| `modules/history` | Undo/redo (configured `userOnly: true`) |
| `modules/toolbar` | Base toolbar (snow theme) |
| `clipboard` (matchers) | Convert pasted HTML → custom blots |
| `keyboard` (bindings) | Arrow keys over embeds |

---

## Debugging Notes

### Cursor jumping
Check re-init dependencies in `useInitializeEditor`. If the editor re-creates unexpectedly, review `hostRef` stability.

### Split-pane dirty badge wrong
Verify that `updateEditorValue(value, pane)` targets the correct pane. `syncState` flows from `useProjectEditorUiActions`.

### Tag overlay offsets wrong
`mapPlainTextIndexToQuillIndex()` handles the offset between `getText()` (doesn't include embeds) and Quill ops (includes embeds as 1 document unit).

---

## References

- Quill docs: https://quilljs.com/docs/
- Layout directives spec: `docs/spec/markdown-layout-directives-spec.md`
- Wiki tags system guide: `docs/plan/done/wiki-tag-links-system-guide.md`
