# Document image links need read-time hydration

## What

If markdown is saved with project-local image links like `![img_0](res/book_act1_chapter1_0.png)`, the renderer still needs embedded `data:image/...` content when loading the document into Quill.

## Why it's counter-intuitive

The editor's fast path already strips embedded images into placeholders during typing, so it is easy to assume the file system layer can switch to `res/*.png` links without touching the read path.

That is not enough. Quill and the current image cache logic still expect load-time markdown to be hydrated to embedded data URLs before editor parsing. If the repository returns plain `res/...png` links, the editor loses the stable in-memory image representation used by placeholder hydration and external-value comparison.

## Pattern

- Persist markdown on disk with `res/*.png` links.
- On `readDocument`, resolve those links back to embedded `data:image/png;base64,...` markdown for the renderer.
- Also return the linked `res/*.png` paths as metadata so later saves can preserve filenames and delete flows can offer image cleanup.

## Why this works

This keeps the user-visible project files small and stable while preserving the editor's existing canonical placeholder-based image workflow.
