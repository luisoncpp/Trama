---
id: document-contents
label: Document Contents
color: "#0891b2"
icon: list
facades:
  - index.ts
descriptionShort: Heading index extraction and reveal for the Contents panel
---

Deep module for the Contents navigation feature (spec: `mds/spec/document-contents-navigation-spec.md`). The pure markdown heading parser (H1-H3, frontmatter/fence aware, ordinal identity) feeds the sidebar Contents panel; the Quill reveal helpers (heading scan, ordinal clamp, centered scroll) are consumed by the editor session. Both consumers import only this facade.
