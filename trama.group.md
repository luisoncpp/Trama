---
id: trama
label: Trama
color: "#64748b"
icon: app-window
match:
  - "/$^/"
groups:
  - electron
  - renderer
ignore:
  - tests/**
  - scripts/**
  - mds/**
  - help/**
  - example-fantasy/**
  - .claude/**
  - .codechart-ref/**
  - .commandcode/**
  - .opencode/**
  - .qwen/**
  - dist/**
  - dist-electron/**
  - coverage/**
  - vite.config.ts
descriptionShort: Desktop writing application
---

File-first Electron writing tool with Preact renderer and typed IPC to the filesystem. Root config ignores tests and tooling trees; electron and renderer groups own all parsed source modules.
