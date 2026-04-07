# Development Workflow

## Main commands

- `npm run dev`
  - Starts Vite + Electron desktop flow.
- `npm run build`
  - Builds renderer and Electron outputs.
- `npm run lint`
  - Runs ESLint with `--max-warnings 0`.
- `npm run test`
  - Runs full Vitest suite.
- `npm run test:smoke`
  - Builds app and runs Electron startup smoke test.

## Useful partial commands

- `npm run dev:renderer`
  - Start Vite only.
- `npm run dev:electron`
  - Build Electron layer and launch against local Vite URL.
- `npm run build:electron`
  - Compile only Electron TypeScript layer.
- Focused test runs:
  - `npm run test -- tests/sidebar-panels.test.ts`
  - `npm run test -- tests/use-project-editor.test.ts`
  - `npm run test -- tests/ipc-contract.test.ts`

## Typical development loop

1. Start with `npm run dev`.
2. In app, pick folder and verify preload status is available.
3. Validate core flow for touched area (editor/sidebar/IPC).
4. Run `npm run lint` and focused tests while iterating.
5. Run `npm run test` before finishing.
6. Run `npm run build` for final compile confidence.
7. Run `npm run test:smoke` when touching preload/window/IPC startup paths.

## Sidebar-specific manual checks

- Filter with Ctrl/Cmd+F.
- Collapse all folders and confirm state remains collapsed.
- Create article/category from footer.
- Right-click file row and validate rename/delete flow.
- Confirm newly created empty folders are visible in tree.

## IPC change checklist

1. Add channel + schemas in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/...`.
3. Register channel in `electron/ipc.ts`.
4. Expose preload API in `electron/preload.cts`.
5. Update typings in `src/types/trama-api.d.ts`.
6. Update renderer action hooks/components.
7. Add/update tests.
8. When adding workspace context-menu commands, update `src/shared/workspace-context-menu.ts`, add the native menu entry in `electron/main-process/context-menu.ts`, and handle the command in the renderer (`use-project-editor-context-menu-effect.ts` and any editor listeners such as `rich-markdown-editor-core.ts`). Add focused tests for the command.

## Lint and structure constraints (important)

- `max-lines: 200` and `max-lines-per-function: 50` are enforced.
- Split UI into helper components/hooks before limits are hit.
- Keep `electron/ipc.ts` thin; move logic into handlers/services.

## Dev script behavior to remember

- `npm run dev` uses `concurrently --kill-others --success command-electron`.
- If Electron exits, renderer process will also terminate by design.

## Build artifact expectations

After `npm run build:electron`, verify:

- `dist-electron/electron/main.js`
- `dist-electron/electron/ipc.js`
- `dist-electron/electron/preload.cjs`
- `dist-electron/electron/ipc/handlers/index.js`
- `dist-electron/src/shared/ipc.js`

If `preload.cjs` is missing or main points to another path, `window.tramaApi` will be unavailable.
