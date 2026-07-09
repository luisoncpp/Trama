---
id: text-search
label: Text Search
color: "#0891b2"
icon: search
facades:
  - index.ts
descriptionShort: Case/whole-word match scanning
---

Pure text matching shared by the in-editor find bar (renderer) and the whole-project markdown search (main process). Whole-word boundaries are Unicode-aware so accented words match correctly. External callers import through index.ts.
