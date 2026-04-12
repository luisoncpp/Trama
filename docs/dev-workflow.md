# Development Workflow

## Mandatory startup checklist (new conversations)

Before searching the codebase, read in this order:
1. `docs/START-HERE.md`
2. `docs/file-map.md`
3. `docs/lessons-learned/README.md`

If work touches AI import/export, also read:

## Current phase

Phase 4 planning is documented in `docs/phase-4-detailed-plan.md`. The recommended execution sequence is: WS1 (Wiki Tag Links) → WS2 (Folder Operations) → WS3 (Templates) → WS4 (Corkboard) → WS5 (AI Import/Export) → Phase 4 closure.

For WS1 execution details, use `docs/wiki-tag-links-implementation-plan.md` together with `docs/wiki-tag-links-spec.md`.

## Main commands

- `npm run dev`
  - Starts Vite + Electron desktop flow.
- `npm run build`
  - Builds renderer and Electron outputs.
- `npm run lint`
  - Runs ESLint with `--max-warnings 0`.
- `npm run test`
  - Runs full Vitest suite.
  - **Note**: In sandboxed agent environments (e.g., Qwen Code), `npm test` may fail due to environment restrictions. Use the PowerShell script instead:
    - `powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1`
    - VS Code shortcut: `Ctrl+Shift+T` (task: "Run Tests & Report")
    - Report saved to `reports/test-report.txt` with timestamp.
  - Focused test runs work normally: `npm run test -- tests/sidebar-panels.test.ts`
- `npm run test:smoke`
  - Builds app and runs Electron startup smoke test.

## Useful partial commands

- `npm run dev:renderer`
  - Start Vite only.
- `npm run dev:electron`
  - Build Electron layer and launch against local Vite URL.
- `npm run build:electron`
  - Compile only Electron TypeScript layer.
- Focused test runs (use PowerShell script or `npm run test --`):
  - `npm run test -- tests/sidebar-panels.test.ts`
  - `npm run test -- tests/use-project-editor.test.ts`
  - `npm run test -- tests/ipc-contract.test.ts`
  - `npm run test -- tests/rich-markdown-editor.test.ts`

## Typical development loop

1. Start with `npm run dev`.
2. In app, pick folder and verify preload status is available.
3. Validate core flow for touched area (editor/sidebar/IPC).
4. Run `npm run lint` and focused tests while iterating.
5. Run tests with `npm run test` before finishing.
6. Run `npm run build` for final compile confidence.
7. Run `npm run test:smoke` when touching preload/window/IPC startup paths.
8. Update the documentation
9. If a whole md implementation plan is finished, move it to `docs/done`.

## Sidebar-specific manual checks

- Filter from sidebar input manually.
- Collapse all folders and confirm state remains collapsed.
- Create article/category from footer.
- Right-click file row and validate rename/delete flow.
- Confirm newly created empty folders are visible in tree.

## Editor search manual checks

- Focus editor and press Ctrl/Cmd+F to open floating find bar.
- Type query and verify active match highlight appears in the document.
- Press Enter / Shift+Enter and verify next/previous navigation updates counter and highlight.
- Verify typing keeps focus in find input (no focus steal to editor).

## IPC change checklist

1. Add channel + schemas in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/...`.
3. Register channel in `electron/ipc.ts`.
4. Expose preload API in `electron/preload.cts`.
5. Update typings in `src/types/trama-api.d.ts`.
6. Update renderer action hooks/components.
7. Add/update tests.
8. When adding workspace context-menu commands, update `src/shared/workspace-context-menu.ts`, add the native menu entry in `electron/main-process/context-menu.ts`, and handle the command in the renderer (`use-project-editor-context-menu-effect.ts` and any editor listeners such as `rich-markdown-editor-core.ts`). Add focused tests for the command.

## Working with Quill

Before writing any code that interacts with Quill's API (coordinates, bounds, selection, events, DOM structure), consult the official docs first:

- API reference: https://quilljs.com/docs/api
- Key gotcha: `quill.getBounds()` returns coordinates **relative to `quill.container`**, not `quill.root`. See `docs/lessons-learned/quill-getbounds-container-reference.md`.
- Quill owns its DOM (`quill.root` / `.ql-editor`). Never inject or mutate nodes inside it; overlays must be siblings outside `.ql-editor`.

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
