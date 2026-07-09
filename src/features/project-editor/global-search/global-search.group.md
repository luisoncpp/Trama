---
id: global-search
label: Global Search
color: "#0891b2"
icon: search
facades:
  - index.ts
descriptionShort: Project-wide markdown search seam
---

Renderer seam for the global markdown search feature: the sidebar panel controller (query/options state that survives section switches, IPC search run, result opening) and the single-slot find-request mailbox that hands the searched term to the in-editor find bar after a result opens a document. The sidebar search section body renders through this facade; the editor session find hook consumes requests through it.
