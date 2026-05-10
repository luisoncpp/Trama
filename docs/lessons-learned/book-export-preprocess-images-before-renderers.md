# Book export should preprocess local image sources before renderer dispatch

When several export renderers accept markdown image syntax, the most reliable seam is the shared chapter-building step.

If each renderer resolves local image paths independently, small differences accumulate:

- chapter-relative vs project-root-relative paths like `res/*.png`
- Windows-specific EPUB `file://` behavior
- silent per-format failures when image loading returns null bytes

The repeatable strategy is:

1. sanitize chapter markdown
2. convert local markdown image sources to `data:image/...` once in `buildBookChapters()` for non-markdown exports
3. let each renderer consume the same canonical source form

That keeps HTML self-contained, makes DOCX/PDF image loading deterministic, and leaves EPUB with only one extra responsibility: materializing data URLs to temporary files.
