# Quill contextmenu selection collapses on center embeds

**Date:** 2026-08-26

## What to know

When a Quill selection range includes layout-directive `BlockEmbed`s (`center:start` / `center:end`, which are `contenteditable="false"` DIVs), a native right-click can collapse the browser selection. Quill then re-reads that native range on `mouseup` → `Selection.update()` and drops the visual highlight — even though Trama never clears the selection for the context menu.

Centering the **first** paragraph is the sharpest repro because `center:start` sits at document index 0, so Ctrl+A / select-to-start always includes the embed.

## Effective rule

On `contextmenu` against the Quill root, stash any non-collapsed `editor.getSelection()` and restore it with `setSelection(..., 'silent')` after Quill’s post-mouseup sync (deferred past that tick). Wire this in `EditorSessionImpl` lifecycle/dispose via `registerContextMenuSelectionPreserve`.

Do not “fix” this by making center boundaries editable or by replacing Electron’s native context menu.

## Related

- Same restore class as `focus-mode-quill-selection-desync.md` (preserve → mutate → silent restore)
- `copy-as-markdown` reads `editor.getSelection()`; a lost Quill range would fall back to whole-document HTML

## Files

- `editor-session-contextmenu-selection.ts`
- `editor-session-lifecycle.ts`
- `tests/rich-markdown-editor-contextmenu-selection.test.ts`
