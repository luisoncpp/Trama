## Quill centered image blocks need block-level image centering

When Trama applies `trama:center` in the rich editor, adding `text-align: center` to the surrounding block is not enough to center images reliably.

Why this is counter-intuitive:

- centered paragraphs and inline text work with `text-align: center`
- markdown images often render as block-level `<img>` elements inside Quill content
- block-level images ignore inline text alignment for their own box positioning

Durable pattern:

1. Keep the centered-block marker on the containing block (`.trama-centered-content`).
2. During `syncCenteredLayoutArtifacts()`, also mark descendant images inside centered blocks.
3. Apply block-level centering to those images (`display: block; margin-inline: auto`).

This keeps normal text centering behavior while making image layout explicit and stable for centered directive blocks.
