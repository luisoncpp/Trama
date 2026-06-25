---
id: electron
label: Electron Main
color: "#0ea5e9"
icon: gear
facades:
  - main.ts
descriptionShort: Main process shell & IPC wiring
---

Electron main-process entry, preload bridges, and IPC orchestration. Lifecycle and window creation live at the facade (main.ts); handlers and services stay in nested groups.
