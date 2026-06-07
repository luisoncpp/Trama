# Help Menu and Help Window Implementation Plan

Implements the decisions in [ADR 0005](../adr/0005-help-window-bundled-html.md) and the glossary terms in `CONTEXT.md` (**Help menu**, **Help window**, **Getting Started**, **Getting Started dismissal**, **Advanced help page**).

## Implementation status (2026-06-05)

**The user-facing Help menu feature is not started.** The app still uses Electron's default `{ role: 'help' }` in `electron/main-process/application-menu.ts`. No Help window, help HTML pages, or help IPC exist yet.

**Slice 3b (screenshot capture) is complete ahead of the feature.** That tooling captures the **main workspace window** — not a Help window — because the Help window does not exist. PNGs in `help/en/assets/` are content assets to embed in help HTML during Slices 4–5.

| Area | Status |
|------|--------|
| ADR 0005, this plan, `CONTEXT.md` glossary | Done |
| Slice 3b — `npm run help:screenshots`, harness, 6 PNGs | Done |
| Slices 1–2 — Help window, menu, IPC, auto-open, dismissal | **Not started** |
| Slices 3, 4, 5 — chrome, tier-1/tier-2 HTML content | Not started |
| Slice 6 — architecture doc, file-map, current-status | Not started |

## Recommended execution order

Do **not** start with Slice 3b — it is already done. Implement in this order:

```
Slice 1  →  Slice 2  →  Slice 3  →  Slice 4  →  Slice 5  →  Slice 6
(window)    (auto-open)  (chrome)    (content)   (advanced)  (mds)
```

1. **Slice 1** — Minimum shippable Help: singleton `BrowserWindow`, `loadFile`, Help menu items, placeholder HTML, asset copy, IPC `trama:help:open`. Verify **Help → Getting Started** and **Help → About** open the child window.
2. **Slice 2** — Auto-open on first **Project** open, dismissal checkbox + `trama:help:dismiss-getting-started` bridge. Verify opt-out persists in main renderer `localStorage`.
3. **Slice 3** — Shared nav/CSS, theme sync, version on About, singleton navigate between pages.
4. **Slice 4** — Full `getting-started.html`; embed existing PNGs from `help/en/assets/` (see table in Slice 3b).
5. **Slice 5** — Five advanced HTML pages + Learn more links.
6. **Slice 6** — `help-window-architecture.md`, `file-map.md`, `current-status.md`, lessons-learned if needed.

Re-run `npm run help:screenshots` after workspace chrome changes (not after Help window changes).

## Goal

Replace Electron's default `{ role: 'help' }` with a native **Help menu** that opens a singleton child **Help window** showing bundled English HTML. Auto-open **Getting Started** once after the user's first successful **Project** open, with opt-out persistence in the main renderer.

## Architecture shape

```
Help menu click / renderer auto-open
  → IPC openHelp({ page, resolvedTheme })
  → HelpWindowManager (main process)
      → focus existing BrowserWindow or create one
      → loadFile(help/en/{page}.html)
      → inject data-theme on help document
  → User checks "Don't show again" on Getting Started
      → help preload → IPC dismissGettingStarted
      → main executeJavaScript on main window → localStorage['trama.help.getting-started.dismissed.v1']
```

Advanced topic pages are reached only through in-page navigation from **Getting Started** — not separate menu items.

## Help content site

### Layout (i18n-ready)

```
help/
├── en/
│   ├── getting-started.html    # Tier 1: project basics + workspace power
│   ├── about.html
│   ├── maps.html               # Tier 2 advanced pages (one feature each)
│   ├── wiki-tags.html
│   ├── ai-import-export.html
│   ├── book-export.html
│   └── git-snapshots.html
└── shared/
    ├── help.css                # tokens aligned with app theme via data-theme
    ├── help-nav.js             # shared chrome, no bundler required
    └── help-theme.js           # reads data-theme set by main on load
```

Copy `help/` → `dist-electron/help/` in `scripts/copy-electron-assets.mjs` (same pattern as `book-export-pdf-print.css`).

### Page identifiers

| `page` IPC value | HTML file |
|------------------|-----------|
| `getting-started` | `en/getting-started.html` |
| `about` | `en/about.html` |
| `maps` | `en/maps.html` |
| `wiki-tags` | `en/wiki-tags.html` |
| `ai-import-export` | `en/ai-import-export.html` |
| `book-export` | `en/book-export.html` |
| `git-snapshots` | `en/git-snapshots.html` |

### Tier 1 — `getting-started.html` sections

1. **Project structure** — `book/`, `outline/`, `lore/`, `.trama.index.json`
2. **Sidebar** — sections, filter, create article/category, rename/delete
3. **Editing & saving** — rich editor, save, external change conflicts (brief)
4. **Where controls live** — right-click context menu, Alt for menu bar
5. **Workspace power** — split panes (`Ctrl/Cmd+.`), pane history (`Alt+←/→`), fullscreen (`Ctrl/Cmd+Shift+F`), focus mode (`Ctrl/Cmd+Shift+M`), find/replace (`Ctrl/Cmd+F/H`), reload project (`Ctrl/Cmd+R`)
6. **Keyboard shortcuts** — table summarizing `mds/architecture/keyboard-shortcuts-architecture.md`
7. **Learn more** — links to the five **Advanced help page** files
8. **Don't show again** — checkbox (only meaningful on auto-open; harmless when opened manually)

Author content from `mds/START-HERE.md` 90-second summary and linked architecture docs. Do not duplicate developer setup from root `README.md`.

### Tier 2 — advanced pages (v1 scope)

Each page: short intro, how to access the feature in UI, one workflow example, link back to Getting Started.

| Page | Source docs to distill |
|------|------------------------|
| `maps.html` | `mds/architecture/map-document-architecture.md`, `mds/spec/map-document-markers-spec.md` |
| `wiki-tags.html` | `mds/architecture/wiki-tag-links-architecture.md` |
| `ai-import-export.html` | `mds/architecture/ai-import-export-architecture.md` |
| `book-export.html` | `mds/architecture/book-export-architecture.md` |
| `git-snapshots.html` | `mds/architecture/project-history-git-architecture.md`, `CONTEXT.md` Snapshot terms |

### `about.html`

- App name, description, `app.getVersion()` (injected by main process as query param or `window.__TRAMA_VERSION__` via `executeJavaScript` after load)
- License: GPL-3.0-or-later (from `package.json`)
- Optional: repository link (no network required to render; link opens in system browser on click via `shell.openExternal` if used)

## Main process

### `electron/main-process/help-window.ts`

Responsibilities:

- Resolve help HTML root: `path.join(__dirname, '../help')` under `dist-electron`
- Singleton `BrowserWindow` (~900×640, resizable, `autoHideMenuBar: true`, standard title **Trama Help**)
- `openHelpPage(win, { page, resolvedTheme })`:
  - validate `page` against allowlist
  - create or focus window
  - `loadFile` target page
  - on `did-finish-load`, set `document.documentElement.dataset.theme` and `colorScheme`
- Close Help window when main window closes (wire in `electron/main.ts` `closed` handler)
- `webPreferences`: `contextIsolation: true`, `sandbox: true`, dedicated `help-preload.cjs`, no `nodeIntegration`

### `electron/help-preload.cts`

Expose only:

```typescript
dismissGettingStarted(): Promise<void>
```

Compiled/copied to `dist-electron/electron/help-preload.cjs` (follow existing preload build path).

### `electron/main-process/application-menu.ts`

Replace `{ role: 'help' }` with:

```typescript
{
  label: 'Help',
  submenu: [
    { label: 'Getting Started', click: () => openHelpFromMenu(win, 'getting-started') },
    { label: 'About Trama', click: () => openHelpFromMenu(win, 'about') },
  ],
}
```

`openHelpFromMenu` reads resolved theme from main window (`executeJavaScript` reading `document.documentElement.dataset.theme` or storage key) then calls `openHelpPage`.

### IPC

Add to `src/shared/ipc.ts`:

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `trama:help:open` | Renderer → Main | `{ page: HelpPageId }` | envelope `ok` |
| `trama:help:dismiss-getting-started` | Help preload → Main | none | envelope `ok` |

`HelpPageId` — union of the seven page identifiers above.

Handler file: `electron/ipc/handlers/help-handlers.ts`, registered in `electron/ipc.ts`.

`dismiss-getting-started` handler:

1. `getMainWindow()?.webContents.executeJavaScript(`localStorage.setItem('trama.help.getting-started.dismissed.v1', 'true')`)`
2. Return `{ ok: true }`

Expose `openHelp` on `window.tramaApi` in preload + `src/types/trama-api.d.ts`.

## Renderer

### Preference key

`src/features/project-editor/help-preferences.ts` (or `src/help/help-preferences.ts` if kept outside project-editor):

```typescript
export const GETTING_STARTED_DISMISSED_STORAGE_KEY = 'trama.help.getting-started.dismissed.v1'
export function isGettingStartedDismissed(): boolean
export function readGettingStartedDismissed(raw: string | null): boolean
```

### Auto-open effect

New hook `useAutoOpenGettingStartedEffect` wired from `use-project-editor.ts`:

Trigger: after first successful `openProject` in the session **or** on first-ever project open (use a session ref + storage check).

Logic:

1. If `isGettingStartedDismissed()` → return
2. If not first successful open for this install/session per chosen rule → return  
   **Recommended v1 rule:** auto-open when storage key is absent and `openProject` just succeeded; set a session ref so it does not re-fire on project reload in the same session unless user has not dismissed and this is literally the first open ever (storage absent).
3. Call `window.tramaApi.openHelp({ page: 'getting-started' })`

Clarification for implementer: auto-open fires **once per install** when the dismissal key is absent, immediately after the first successful project open completes (including startup restore of last project).

### Theme handoff

`openHelp` IPC handler resolves theme in main process from main window:

```javascript
document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
```

Fallback: `'dark'` (matches `readThemePreference` default).

## Implementation slices

### Slice 1 — Infrastructure (no HTML content yet)

- [x] ADR already accepted
- [ ] Create `mds/architecture/help-window-architecture.md` (canonical post-implementation reference)
- [ ] `help-window.ts`, help IPC, preload, asset copy script
- [ ] Placeholder `help/en/getting-started.html` + `about.html` + minimal `help/shared/help.css`
- [ ] Menu wiring
- [ ] Unit test: page id validation, path resolution helper
- [ ] Smoke: menu opens window (manual or `tests/electron-smoke.test.ts` extension if feasible)

### Slice 2 — Preferences and auto-open

- [ ] `help-preferences.ts` + dismissal IPC end-to-end
- [ ] Checkbox on placeholder Getting Started page calls `window.tramaHelpApi.dismissGettingStarted()`
- [ ] `useAutoOpenGettingStartedEffect`
- [ ] Test: dismissal key written on main renderer after IPC (jsdom or harness mock)

### Slice 3 — Shared chrome and theme

- [ ] `help-nav.js` — nav between all seven pages + About
- [ ] `help.css` — `data-theme` light/dark tokens mirroring `01-theme-tokens.css` semantics (subset sufficient for readable docs)
- [ ] Version injection on `about.html`
- [ ] Singleton navigate: second menu click loads different page in same window

### Slice 3b — Help screenshot capture (maintainer tooling)

Automated PNG generation for help HTML. Not a runtime user feature.

- [x] `npm run help:screenshots` (`scripts/capture-help-screenshots.mjs`)
- [x] Capture mode in `electron/main.ts` (`TRAMA_CAPTURE_HELP_SCREENSHOTS=1`)
- [x] `electron/main-process/help-screenshot-capture.ts` — singleton window, `capturePage`, scenario loop
- [x] Renderer harness under `src/help/` — drives `example-fantasy/` into fixed UI states
- [x] Output directory `help/en/assets/` (commit generated PNGs)
- [x] `tests/help-screenshot-scenarios.test.ts` — scenario registry contract
- [ ] Embed `<img src="../assets/...">` references while authoring help HTML (Slices 4–5)

**Scenarios captured**

| PNG | UI state |
|-----|----------|
| `workspace-overview-dark.png` | `book/chapter-01.md`, dark theme |
| `workspace-overview-light.png` | same document, light theme |
| `split-panes-dark.png` | split layout, two book chapters |
| `focus-mode-dark.png` | focus mode enabled |
| `map-document-dark.png` | `lore/map.md` map editor |
| `git-snapshots-dark.png` | revision rail open (initializes Git in demo project if needed; **optional** — skipped on failure) |

`map-document-dark` and `git-snapshots-dark` are marked **optional** in the capture runner: failures log `HELP_SCREENSHOT_SKIP` but do not fail the command. Core workspace shots must still pass.

**How to run**

```bash
npm run help:screenshots
```

Requires a full `npm run build` first (script runs build automatically). Re-run when workspace chrome changes.

**Invariants**

- Capture uses the real Electron renderer + `example-fantasy/` — not jsdom.
- Auto project-picker is disabled in capture mode; harness calls `openProject` directly.
- Git fixture: capture may run `git init` + empty commit in `example-fantasy/` when the git scenario needs a repository.

### Slice 4 — Tier 1 content

- [ ] Author full `getting-started.html` (sections 1–8)
- [ ] Embed screenshot assets already in `help/en/assets/` (paths relative from `help/en/*.html`, e.g. `../assets/workspace-overview-dark.png`)
- [ ] Review against `keyboard-shortcuts-architecture.md` for accuracy

**Screenshot → section mapping (suggested)**

| PNG | Use in section |
|-----|----------------|
| `workspace-overview-dark.png` / `workspace-overview-light.png` | Project structure, sidebar, editing (theme pair) |
| `split-panes-dark.png` | Workspace power — split panes |
| `focus-mode-dark.png` | Workspace power — focus mode |
| `map-document-dark.png` | Learn more → maps (also usable inline in tier 1 if desired) |
| `git-snapshots-dark.png` | Learn more → git-snapshots |

### Slice 5 — Tier 2 advanced pages

- [ ] Author five advanced HTML pages
- [ ] Cross-links from Getting Started **Learn more** section

### Slice 6 — Documentation and status

- [ ] Update `mds/architecture/application-menu-architecture.md` (Help submenu, remove `{ role: 'help' }`)
- [ ] Update `mds/live/file-map.md`
- [ ] Update `mds/live/current-status.md` when feature ships
- [ ] Add `mds/START-HERE.md` routing row
- [ ] Add `mds/lessons-learned/` entry if cross-window `localStorage` bridge surprises future work

## Files to add or change

| File | Action |
|------|--------|
| `mds/adr/0005-help-window-bundled-html.md` | Done |
| `mds/plan/help-menu-implementation-plan.md` | This file |
| `mds/architecture/help-window-architecture.md` | Create in Slice 1 |
| `electron/main-process/help-window.ts` | New |
| `electron/help-preload.cts` | New |
| `electron/ipc/handlers/help-handlers.ts` | New |
| `electron/main-process/application-menu.ts` | Help submenu |
| `electron/main.ts` | Wire help window cleanup on main close |
| `electron/ipc.ts` | Register handlers |
| `electron/preload.cts` | `openHelp` |
| `src/shared/ipc.ts` | Schemas + channels |
| `src/types/trama-api.d.ts` | Types |
| `scripts/copy-electron-assets.mjs` | Copy `help/` tree |
| `help/en/*.html`, `help/shared/*` | New assets |
| `src/features/project-editor/help-preferences.ts` | New |
| `src/features/project-editor/use-auto-open-getting-started-effect.ts` | New |
| `src/features/project-editor/use-project-editor.ts` | Wire effect |
| `tests/help-window.test.ts` | Path allowlist / preference helpers |
| `tests/help-preferences.test.ts` | Storage parsing |
| `electron/main-process/help-screenshot-capture.ts` | Done — capture orchestration |
| `scripts/capture-help-screenshots.mjs` | Done — maintainer entry script |
| `src/help/help-screenshot-*.ts` | Done — renderer harness + scenario registry |
| `help/en/assets/*.png` | Generated by `npm run help:screenshots` |
| `tests/help-screenshot-scenarios.test.ts` | Done — scenario/file contract |

## Invariants

- Help HTML is read-only documentation; no access to project filesystem or `tramaApi` except dismissal bridge.
- Only one Help window per app session; menu commands focus and navigate.
- Dismissal flag lives only in main renderer `localStorage`, key `trama.help.getting-started.dismissed.v1`.
- Manual **Help → Getting Started** works even when dismissal is `true`.
- Advanced pages are not top-level menu items in v1.
- English only under `help/en/`; do not hardcode locale paths without the `en/` segment.

## Tests

```bash
npm run test -- tests/help-preferences.test.ts tests/help-window.test.ts tests/help-screenshot-scenarios.test.ts
npm run lint
npm run build
npm run help:screenshots
```

Manual checklist:

1. Fresh profile (clear `trama.help.getting-started.dismissed.v1`) → open project → Getting Started auto-opens
2. Check **Don't show again** → restart app → open project → no auto-open
3. **Help → Getting Started** still opens
4. Open Getting Started → **Help → About** → same window, new page
5. Light and dark workspace themes → Help window matches
6. Nav links reach all seven content pages + About
7. Packaged build (`npm run pack:win`) → help pages load from `dist-electron/help/`

## Debug playbook

1. Help window blank → verify `dist-electron/help/en/...` exists after `npm run build:electron`
2. Wrong theme → inspect `dataset.theme` on help `documentElement` after load; trace main-window theme read
3. Dismissal not sticking → confirm IPC runs against **main** window webContents, not help window
4. Auto-open every launch → check dismissal key and session ref in `useAutoOpenGettingStartedEffect`
5. Menu does nothing on Windows → confirm `setupApplicationMenu` still calls `win.setMenu(menu)` on win32

## Handoff notes (next session)

Start at **Slice 1**. Entry points to open first:

1. `electron/main-process/application-menu.ts` — replace `{ role: 'help' }`
2. `electron/main-process/help-window.ts` — new singleton manager (mirror patterns from `help-screenshot-capture.ts` for window lifecycle only; Help window uses `loadFile`, not `capturePage`)
3. `src/shared/ipc.ts` → `electron/ipc/handlers/help-handlers.ts` → `electron/preload.cts` → `src/types/trama-api.d.ts`
4. `scripts/copy-electron-assets.mjs` — add `help/` tree copy (HTML/CSS/JS/assets; PNGs already committed)

**Do not confuse** `electron/main-process/help-screenshot-capture.ts` (maintainer tooling, main window) with `help-window.ts` (user-facing Help child window). The harness in `src/help/` is only active when `TRAMA_CAPTURE_HELP_SCREENSHOTS=1`; Help window uses a separate `help-preload.cts` with only `dismissGettingStarted`.

Capture-mode wiring already in place (do not remove):

- `electron/preload.cts` — `window.tramaCaptureMode.helpScreenshots`
- `src/features/project-editor/use-project-editor.ts` — `useHelpScreenshotHarness`, skips auto project-picker in capture mode
- `package.json` — `"help:screenshots"`

## Related documents

- [ADR 0005](../adr/0005-help-window-bundled-html.md)
- `CONTEXT.md` — domain glossary
- `mds/architecture/application-menu-architecture.md` — menu bar (update in Slice 6)
- `mds/architecture/keyboard-shortcuts-architecture.md` — shortcut table source
- `mds/architecture/theme-architecture.md` — theme resolution for handoff
- `help/en/assets/README.md` — screenshot regeneration
