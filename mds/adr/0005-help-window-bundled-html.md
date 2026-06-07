# Help content in a bundled-HTML child window

Status: accepted (2026-06-05)

Trama will ship user-facing **Getting Started** and **About** help as bundled static HTML loaded in a child `BrowserWindow` via `loadFile()`, not as in-app coach marks, a renderer modal, an embedded `<webview>`, or a remote documentation URL. The native **Help menu** exposes **Getting Started** and **About**; advanced topics are separate HTML pages linked from the primary guide. On first successful **Project** open, **Getting Started** auto-opens once unless the user checks **Don't show again**, which persists in the main workspace renderer's `localStorage` through a minimal Help-window preload and IPC (the Help window cannot write to the main app's storage directly).

## Considered options

- **In-app panel or modal in the main renderer**: rejected — couples help layout to workspace CSS, increases main-bundle surface, and fights Trama's minimal chrome model.
- **Embedded `<webview>` in the editor shell**: rejected — extra security configuration, harder window chrome, and no benefit over a dedicated child window.
- **Remote documentation URL**: rejected — offline-first projects should not depend on network; installed help must match the installed app version.
- **Coach marks / spotlight tour**: rejected — many controls live in context menu and Alt-revealed menu bar; highlighting workspace regions is brittle and was explicitly out of scope.
- **Main-process preference file for dismissal**: rejected — help preferences should follow existing renderer `localStorage` patterns (`trama.theme.preference`, `trama.last-project.v1`).

## Consequences

- New assets under `help/en/` (i18n-ready layout for future `help/es/`), copied to `dist-electron/help/` at build time.
- New main-process module for a singleton Help window (focus + navigate when already open; theme applied on open).
- Minimal Help preload for dismissal IPC only; no general Node exposure in help pages.
- `application-menu-architecture.md` must be updated when `{ role: 'help' }` is replaced with explicit menu items.
- Scope C content ships as two tiers: one primary **Getting Started** page plus five **Advanced help page** files (maps, wiki tags, AI import/export, book export, Git snapshots).

Help HTML screenshots are generated offline via `npm run help:screenshots` (Electron `capturePage` against `example-fantasy/`); see Slice 3b in `mds/plan/help-menu-implementation-plan.md`.

See `mds/plan/help-menu-implementation-plan.md` and (once implemented) `mds/architecture/help-window-architecture.md`.
