# Development Workflow

## Mandatory startup checklist (new conversations)

Before searching the codebase, read `docs/START-HERE.md` first — it provides the full bootstrap sequence.

If the hard part of the task is following behavior end-to-end rather than understanding subsystem design, also read `docs/flows/README.md`.

If work touches AI import/export, also read `docs/architecture/ai-import-export-architecture.md`.

## Current phase

Phase 4 planning is documented in `docs/plan/phase-4-detailed-plan.md`. The recommended execution sequence is: WS1 (Wiki Tag Links) → WS2 (Folder Operations) → WS3 (Templates) → WS4 (Corkboard) → WS5 (AI Import/Export) → Phase 4 closure.

For WS1 execution details, see `docs/spec/wiki-tag-links-spec.md` and `docs/plan/done/wiki-tag-links-implementation-plan.md`.

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
  - `npm run test -- tests/project-editor-conflict-flow.test.ts`
  - `npm run test -- tests/typescript-compile.test.ts`

## Typical development loop

1. Start with `npm run dev`.
2. In app, pick folder and verify preload status is available.
3. Validate core flow for touched area (editor/sidebar/IPC).
4. If the behavior path is hard to follow, open the matching doc in `docs/flows/` before changing code.
5. Run `npm run lint` and focused tests while iterating.
6. Run tests with `npm run test` before finishing.
7. Run `npm run build` for final compile confidence.
8. Run `npm run test:smoke` when touching preload/window/IPC startup paths.
9. Update the documentation (see mandatory checklist below)
10. If a whole md implementation plan is finished, move it to `docs/plan/done`.

## Documentation requirements (mandatory)

When a change affects behavior (not only formatting) or when detecting anything in the code that contradicts existing documentation, documentation updates are required in the same task. Read the requirements in `docs/update.md`.

Use the doc types consistently:

- `docs/architecture/` for subsystem design and invariants
- `docs/flows/` for "when this happens, what runs next?"
- `docs/lessons-learned/` for counter-intuitive facts
- `docs/plan/` for active refactors or implementation slices

Add or update a flow doc when:

- the debugging path is easier to explain as a trigger sequence than as architecture
- you had to trace several files to answer "what happens when I do X?"
- a behavior hotspot keeps forcing repeated codebase searches

Good candidates:

- typing in the editor
- switching file
- switching pane
- saving
- external file change handling
- window close flow

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

## Split-pane dirty/unsaved manual checks

- In split mode, open one file in primary and another in secondary.
- Type in secondary and verify only secondary dirty indicator/status changes.
- Switch active pane and verify dirty state remains attached to the edited pane.
- Run `npm run test -- tests/project-editor-conflict-flow.test.ts` after touching split-pane editor/state wiring.

## IPC change checklist

1. Add channel + schemas in `src/shared/ipc.ts`.
2. Implement handler in `electron/ipc/handlers/...`.
3. Register channel in `electron/ipc.ts`.
4. Expose preload API in `electron/preload.cts`.
5. Update typings in `src/types/trama-api.d.ts`.
6. Update renderer action hooks/components.
7. Add/update tests.
8. When adding workspace context-menu commands, update `src/shared/workspace-context-menu.ts`, add the native menu entry in `electron/main-process/context-menu.ts`, and handle the command in the renderer (`use-project-editor-context-menu-effect.ts` and any editor listeners such as `rich-markdown-editor-core.ts`). Add focused tests for the command.

## Bug fixing

Every time you make a change to fix a bug, leave logs along the way to double check your assumptions.

After the user confirms you that the bug is fixed, delete the logs.

## Working with Quill

Before writing any code that interacts with Quill's API (coordinates, bounds, selection, events, DOM structure), consult the official docs first:

- API reference: https://quilljs.com/docs/api
- Key gotcha: `quill.getBounds()` returns coordinates **relative to `quill.container`**, not `quill.root`. See `docs/lessons-learned/quill-getbounds-container-reference.md`.
- Quill owns its DOM (`quill.root` / `.ql-editor`). Never inject or mutate nodes inside it; overlays must be siblings outside `.ql-editor`.
- Embedded markdown images must use a single canonical in-memory representation while editing. In Trama, editor state should keep short `<!-- IMAGE_PLACEHOLDER:... -->` markers plus the cached image map, and only hydrate back to `![...](data:image/...)` when rendering into Quill or saving to disk.
- When syncing external editor values, compare canonicalized markdown, not raw source text. Base64 markdown and placeholder markdown may represent the same document; treating them as different will trigger destructive re-renders and can drop typed text or images.
- If the issue is behavioral rather than API-specific, check `docs/flows/rich-editor-typing-flow.md` before changing editor lifecycle code.

## When you are getting stuck

- The user doesn't want you to spend long time reasoning, consider adding logs or fetching the documentation of external libraries that are causing issues.

## Lint and structure constraints (important)

- `max-lines: 200` and `max-lines-per-function: 50` are enforced.
- Split UI into helper components/hooks before limits are hit.
- Keep `electron/ipc.ts` thin; move logic into handlers/services.
- lint limits are meant to encourage to break down long files and long functions, and avoid code repetition, NOT to compact white spaces/indentation.


## Hook naming convention (mandatory)

Every `useEffect`, `useCallback`, `useMemo`, and similar hook must include a descriptive name comment and dependency documentation:

**🤢🤮❌ BAD, TERRIBLE, AWFUL, ABOMINATION**

```ts
useEffect(() => { ... }, [dep1, dep2])
const fn = useCallback(() => { ... }, [dep1, dep2])
const value = useMemo(() => { ... }, [dep1, dep2])
```

**GOOD**
```ts
useEffect(/* descriptiveEffectName */ () => { ... }, [dep1, dep2] /*Inputs for descriptiveEffectName*/)
const fn = useCallback(/* descriptiveFnName */ () => { ... }, [dep1, dep2] /*Inputs for descriptiveFnName*/)
const value = useMemo(/* descriptiveMemoName */ () => { ... }, [dep1, dep2] /*Inputs for descriptiveMemoName*/)
```

When there are no dependencies, use `/*Inputs for name — stable*/` to make the intent explicit.

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
