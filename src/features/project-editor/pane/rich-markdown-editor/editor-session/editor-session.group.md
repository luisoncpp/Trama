---
id: editor-session
label: Editor Session
color: "#1d4ed8"
icon: hook
facades:
  - editor-session.ts
  - editor-session-internals.ts
exclude:
  - editor-session-private/editor-session-toolbar.ts
  - editor-session-private/editor-session-toolbar-private/**
descriptionShort: useEditorSession lifecycle orchestration
---

EditorSession hook assembling Quill lifecycle, content loop, find/focus/tags/zoom, and layout directives. Toolbar internals are a nested sibling group.
