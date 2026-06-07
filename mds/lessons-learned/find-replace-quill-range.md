# Find & Replace: Quill index conversion for replace

## What is counter-intuitive

When replacing text matches in a Quill editor, you cannot use plain text offsets directly. Plain text offsets (from `editor.getText()`) don't map 1:1 to Quill's internal index when embeds (like pagebreaks, spacers, tag overlays) exist in the document.

## Correct pattern

1. Convert plain text indices to Quill indices using `mapPlainTextIndexToQuillIndex(editor, plainIndex)` before calling `editor.deleteText()` and `editor.insertText()`.

2. For `replaceAll`, process matches **from end to start** (reverse order). This avoids index drift: replacing an earlier match shifts the plain text positions of later matches, but processing in reverse ensures already-processed positions are never needed again.

3. After each replace (single or all), recalculate all matches from the updated document text. The text content changes, so old match arrays are invalid.
