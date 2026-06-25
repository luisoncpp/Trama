---
id: project-editor-hook
label: Project Editor Hook
color: "#5b21b6"
icon: hook
facades:
  - use-project-editor.ts
files:
  - use-project-editor.ts
match:
  - "project-editor-private/**"
descriptionShort: useProjectEditor hook & private assembly
---

Public feature hook and its private state/action assembly. External seam is use-project-editor.ts; project-editor-private/ modules must not be imported elsewhere.
