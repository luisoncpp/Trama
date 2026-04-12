# Wiki Tag Links — Technical Specification

Implementation guide: `docs/wiki-tag-links-implementation-plan.md`

## 1. Goal

Implement a **tag-based lookup system** that lets readers open associated Lore articles by clicking tagged terms while holding `Ctrl` (or `Cmd`). Tags are unique to a single Lore article, but an article may have multiple tags.

## 2. Core Concepts

### 2.1. Tag Definition

Tags live in the **YAML frontmatter** of Lore files under the `tags` key:

```yaml
---
id: char_selene_01
tipo: personaje
nombre: Selene
tags: [magia, norte, selene valeria]
---
```

- Each tag is a **case-insensitive string**.
- Tags **may contain spaces** (e.g., `selene valeria`).
- A tag maps to **exactly one Lore file**.
- A Lore file may declare **many tags**.
- If two tags overlap (e.g., `norte` and `norte salvaje`), the **longest match wins** at runtime.

### 2.2. In-Editor Syntax

Within the editor content, any word or phrase that matches a defined tag becomes a **clickable link** when the user holds `Ctrl`/`Cmd`:

- No special markup is needed in the body text — matching is **implicit** against plain text.
- Visually, matched terms are underlined only while `Ctrl`/`Cmd` is held.
- Clicking opens the associated Lore article in the **secondary pane** (split mode) or the **primary pane** (single mode).

## 3. Matching Rules

### 3.1. Longest-Match-First

When the caret or a mouse click lands on text that could match multiple tags:

1. Gather all tags whose text appears at the cursor position.
2. Pick the one with the **greatest character length**.
3. If lengths are equal, prefer the tag whose file appears **first alphabetically by path**.

Example:
- Tags: `norte`, `norte salvaje`
- Text: `"...las montañas del norte salvaje..."`
- Result: resolves to the file that declares `norte salvaje`.

### 3.2. Word Boundaries

Matches respect word boundaries. The tag `magia` will **not** match inside `magiaoscura`.

### 3.3. Case Insensitivity

`Magia`, `MAGIA`, and `magia` all resolve to the same tag.

## 4. Data Flow

```
┌─────────────────────┐
│  Lore file save     │
│  (frontmatter parse)│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  TagIndexService     │
│  (main process)      │
│  tag → filePath map  │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  IPC: getTagIndex()  │
│  → Renderer cache    │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Editor overlay      │
│  (Ctrl + hover/click)│
└─────────────────────┘
```

### 4.1. TagIndexService (Main Process)

- **Location**: `electron/services/tag-index-service.ts`
- **Responsibilities**:
  - Build a `Map<string, string>` of `lowercaseTag → filePath` on project scan.
  - Update on file save/create/delete events.
  - Expose `getTagIndex()` and `resolveTag(tagText, fromPath)` methods.
- **Lifecycle**: Rebuilt on project open; incrementally updated via watcher events.

### 4.2. IPC Contract

New endpoints added to `src/shared/ipc.ts`:

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `getTagIndex` | Renderer → Main | — | `{ tags: Record<string, string> }` |
| `resolveTag` | Renderer → Main | `{ tag: string }` | `{ found: boolean, path?: string, meta?: DocumentMeta }` |

### 4.3. Renderer Tag Cache

- **Hook**: `src/features/project-editor/use-tag-index.ts`
- Fetches full tag index on project open.
- Stores in a `Map<string, string>` for O(1) lookups.
- Invalidates on watcher file-change events.

## 5. Editor Integration

### 5.1. Detection Strategy

The editor uses a **decorator/overlay approach** (does not mutate document content):

1. On each content change, scan visible text nodes for tag matches.
2. Apply a CSS class (`trama-tag-link`) to matching ranges **only while Ctrl is held**.
3. On click + Ctrl, dispatch `openTagInSecondaryPane(tag)`.

This keeps the raw Markdown clean — tags are **implicit**, not wrapped in `[[...]]`.

### 5.2. Keyboard/Mouse Interaction

| Action | Behavior |
|--------|----------|
| `Ctrl` hold | Underline all tag-matched terms in the editor |
| `Ctrl` + click on tag | Open associated Lore file in secondary pane (or primary if not in split) |
| `Ctrl` + click on non-tag | No-op |
| `Ctrl` + click with no secondary pane | Auto-enable split mode and open in secondary pane |

### 5.3. Visual Styling

```css
[data-theme="dark"] .trama-tag-link {
  color: var(--tag-link-dark);
  text-decoration: underline;
  text-decoration-color: var(--tag-link-dark-underline);
  cursor: pointer;
}

[data-theme="light"] .trama-tag-link {
  color: var(--tag-link-light);
  text-decoration: underline;
  text-decoration-color: var(--tag-link-light-underline);
  cursor: pointer;
}
```

Tags are only visually distinguished when `Ctrl` is held (to avoid cluttering the writing surface).

## 6. Edge Cases

### 6.1. Duplicate Tags Across Files

If two Lore files declare the same tag, the **first one found during scan** (alphabetical by path) takes precedence. A warning is logged to the dev console.

### 6.2. Tag Removed or Renamed

If the user clicks a tag whose target file was deleted or had its tags changed:
- Show a toast: `"Tag "${tag}" no longer points to a valid article."`
- No pane navigation occurs.

### 6.3. Tags Inside Code Blocks / Inline Code

Tags inside `` `code` `` or ` ```code blocks``` ` are **excluded** from matching.

### 6.4. Tags Inside Headers / Bold / Italic

Tags inside any inline formatting (**bold**, *italic*, # headers) **are** matched, since they represent conceptual references.

## 7. Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `electron/services/tag-index-service.ts` | Build and maintain tag → filePath map |
| `src/features/project-editor/use-tag-index.ts` | Renderer hook: fetch, cache, invalidate tag index |
| `src/features/project-editor/components/rich-markdown-editor-tag-overlay.ts` | Tag detection decorator for Quill editor |
| `src/features/project-editor/components/rich-markdown-editor-tag-helpers.ts` | Pure functions: match text against tags, longest-match resolution |
| `tests/tag-index-service.test.ts` | Main process tag index unit tests |
| `tests/tag-matching.test.ts` | Longest-match, case-insensitivity, code-block exclusion tests |
| `tests/tag-click-navigation.test.ts` | Ctrl+click opens file in secondary pane integration tests |

### Modified files

| File | Change |
|------|--------|
| `src/shared/ipc.ts` | Add `getTagIndex` and `resolveTag` channels + Zod schemas |
| `electron/ipc/handlers/project-handlers/document-handlers.ts` | Wire tag index rebuild on save/create/delete |
| `electron/preload.cts` | Expose `getTagIndex()` and `resolveTag()` to `window.tramaApi` |
| `src/types/trama-api.d.ts` | Add new API type signatures |
| `electron/services/frontmatter.ts` | Extract `tags` array during parse |
| `electron/services/watcher-service.ts` | Trigger tag index rebuild on Lore file changes |
| `src/features/project-editor/components/rich-markdown-editor.tsx` | Import tag overlay decorator |
| `src/features/project-editor/components/rich-markdown-editor-core.ts` | Register Ctrl + click listener for tag navigation |
| `docs/file-map.md` | Register new files |
| `docs/new-conversation-handoff.md` | Add wiki tag links to feature summary |
| `REQUIREMENTS.md` | Update section 3.3 to reference this spec |

## 8. Acceptance Criteria

1. User adds `tags: [magia, norte]` to a Lore file's frontmatter.
2. User types `magia` in any editor pane.
3. Holding `Ctrl` underlines `magia` in the text.
4. Clicking `magia` while holding `Ctrl` opens the Lore file in the secondary pane.
5. Tag with `norte salvaje` takes precedence over `norte` when both match.
6. Tags inside code blocks are ignored.
7. Tag index rebuilds automatically when Lore files are saved, created, or deleted.
8. All new files pass `npm run lint`, `npm run test`, and `npm run build`.
