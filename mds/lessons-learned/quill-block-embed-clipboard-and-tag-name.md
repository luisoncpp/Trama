# Quill Block Embed Clipboard Matchers and Uppercase Tag Name

> **Topic:** Quill 2 Parchment blot matching, uppercase tag name requirement, and clipboard Delta matchers.
> **Date:** 2026-07-22

## What we learned

When creating custom Quill 2 `BlockEmbed` blots (such as `LayoutDirectiveBlot` for page breaks or spacers) and registering clipboard matchers for HTML paste/load:

1. **Parchment tag names MUST be uppercase (`static tagName = 'DIV'`):**
   In browser DOM and jsdom, `node.tagName` is always uppercase (e.g. `'DIV'`). Parchment 2 compares `node.tagName === BlotClass.tagName`. If `BlotClass.tagName` is set to `'div'` (lowercase), Parchment evaluates `'DIV' === 'div'` (false) and skips matching the blot during HTML parsing, silently dropping embed embeds from `dangerouslyPasteHTML` or `convert()`.

2. **Re-registering Blots across module resets:**
   `Quill.register(LayoutDirectiveBlot as any, true)` must be called unconditionally on Quill initialization without returning early on static module flags, so that Quill instances in test runners or dynamic re-initialization always register the embed blot formats in `editor.scroll`.

3. **BlockEmbed clipboard matcher Delta format:**
   When custom clipboard matchers return a Delta for custom block embeds (`<div data-trama-directive="...">`), match the element via classes or `[data-trama-directive]` and return `new Delta().insert({ [blotName]: value }).insert('\n')`. The trailing `\n` is required by Quill for block embeds.
