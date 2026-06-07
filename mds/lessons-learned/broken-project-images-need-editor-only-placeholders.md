# Broken project images need editor-only placeholders

## What

When markdown links to a project-local image like `![cover](res/missing.png)` and the file is missing, the document should not fail to load. The read path should degrade that image to an editor-only placeholder representation instead of throwing.

## Why it's counter-intuitive

The normal image path already rewrites `res/*.png` links back to embedded `data:image/...` content before the renderer sees them. That makes it easy to assume a missing file should still be treated as an image-loading problem inside Quill.

That is too late. If repository hydration throws on `readFile`, the whole document read fails, which can block project open and any index/meta flow that depends on `readDocument`.

## The durable pattern

- Catch missing `res/*.png` reads in the repository hydration seam.
- Replace the missing markdown image with an editor-only placeholder comment that preserves the original `alt` and `source`.
- Render that placeholder in Quill as a dedicated embed that shows `🖼️`.
- Convert the placeholder back to the original markdown image syntax before save so unchanged broken images round-trip exactly.

## Why this works

The repository remains tolerant to missing assets, the editor gets a visible non-crashing representation, and save paths preserve the user's original markdown instead of silently deleting or rewriting broken image links.
