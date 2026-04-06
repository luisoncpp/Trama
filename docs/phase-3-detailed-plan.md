# Phase 3 Detailed Plan - Workspace UX

Date: 2026-04-05
Status: **In Progress** — WS1 complete, WS2 complete (theme + polish), WS3-5 pending
Status: **In Progress** — WS1 complete, WS2 complete (theme + polish), WS3 complete (fullscreen + focus mode), WS4-5 pending
Related: `docs/current-status.md`, `docs/implementation-overview.md`, `DESIGN_SPEC.md`

## 1. Context and Starting Point

Phase 2 is complete and stable. The project already has:
- Open project flow with native folder picker.
- Markdown read/save loop with autosave and frontmatter support.
- Index reconciliation (`.trama.index.json`) and file watcher integration.
- Conflict-safe external change handling (reload/keep/compare/save-as-copy).
- Rich markdown editing loop and coverage for key integration flows.
- Green quality gates (`build`, `lint`, `test`, `test:smoke`).

This means Phase 3 can focus on workspace UX without reworking the file-first core.

## 2. Phase 3 Goal

Deliver a production-ready workspace experience with:
- Real split-pane layout for side-by-side work.
- Theme management (light/dark, optional system sync).
- Native fullscreen/focus mode wiring.
- Persistence of user workspace preferences.

Definition of Done target (from design spec, expanded):
- User can keep editor + secondary context side-by-side.
- User can switch theme and keep preference across restarts.
- User can enter/exit distraction-free fullscreen/focus mode.
- Feature set is covered by tests and does not regress Phase 2 flows.

## 3. Scope

### In Scope

- Renderer layout model (pane structure, sizes, active pane/tab state).
- Persisted layout settings and restoration on startup.
- Theme state, CSS token strategy, and persistence.
- Fullscreen IPC contract and renderer/main wiring.
- Focus mode UX (chrome minimization, optional panel hiding).
- Keyboard-first controls for key workspace actions.
- Automated tests for persistence and fullscreen behavior.

### Out of Scope (Phase 4+)

- Wiki links and backlinks knowledge graph.
- Templates browser and create-from-template workflow.
- Corkboard drag-and-drop ordering UX.
- AI import/export pipeline.

## 4. Technical Baseline and Constraints

Current architecture to preserve:
- Renderer feature-centric editor module in `src/features/project-editor/*`.
- Typed IPC contracts in `src/shared/ipc.ts` and preload typing in `src/types/trama-api.d.ts`.
- Main-process orchestration through `electron/ipc.ts` with modular handlers.
- Window security baseline from `electron/window-config.ts`.

Known constraint to keep in mind:
- `sandbox: false` remains a temporary tradeoff; do not increase renderer attack surface.

## 5. Workstreams and Deliverables

## WS1 - Split Workspace Usability

Objective:
- Make split-pane mode actually usable for writing and reviewing side-by-side content.

Status:
- Completed on 2026-04-05.

Deliverables:
- Both panel editors remain visible and readable at the same time (no inactive editor disappearing).
- Clicking directly inside an editor makes that pane active (without requiring an "Activate" button).
- Split width is adjusted by dragging a center divider (mouse drag interaction).
- Pane headers show the current file name (not "Primary"/"Secondary").
- Top control bar is removed from split workspace mode.

Implementation notes (updated):
- Remove UI patterns that compete with direct manipulation (top slider + activate buttons).
- Keep split interactions in-pane: click-to-focus and drag-to-resize from divider.
- Preserve existing persistence behavior, but avoid exposing internal pane names in end-user labels.
- Treat old WS1 details as historical context, not current guidance.

Primary files likely touched:
- `src/features/project-editor/components/workspace-editor-panels.tsx`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/use-project-editor-layout-actions.ts`
- `src/index.css`

Acceptance criteria:
- In split mode, both editor surfaces are visible simultaneously and text remains readable in both panes.
- User can switch active pane by clicking inside the pane/editor area.
- User can resize panes via drag handle centered between panes.
- Pane labels show file name (or a clear empty-state label if pane has no file).
- Top split control bar is removed and no longer required for core split interaction.

Delivered notes:
- Split panes now stay mounted and visible together instead of swapping inactive content out.
- Active pane follows pointer interaction inside the editor surface.
- The divider drag range was widened to 80/20 and split mode removes the old side-width constraint.
- Pane headers were compacted into a single metadata row.
- Split toggle is reachable through `Ctrl/Cmd + .` and the native editor context menu.

Tests:
- Extend `tests/sidebar-panels.test.ts` or add dedicated split-pane interaction tests for click-to-focus and dual-pane visibility.
- Extend `tests/workspace-layout-persistence.test.ts` to validate divider-driven ratio changes still persist.
- Extend `tests/project-editor-conflict-flow.test.ts` to ensure split conflict UX remains stable after UI control changes.

## WS2 - Theme System (Light/Dark/System)

Objective:
- Implement stable theme controller with persistence and optional system sync.

Status:
- **Completed** (2026-04-05). Theme foundation fully implemented with rollout polish finished.

Deliverables:
- Theme preference model: `light | dark | system`.
- Theme application mechanism on app root (`data-theme` or class strategy).
- CSS tokens for semantic colors (surface, text, border, accent, danger).
- Startup restore and live update when system theme changes (only if `system` selected).

Suggested implementation details:
- Store preference in local storage with key namespace (`trama.theme.preference`).
- Resolve effective theme at runtime (`system` -> `matchMedia`).
- Keep editor and list panels using semantic tokens instead of hardcoded values.
- Prefer a dedicated theme hook/provider over scattering theme state through existing editor state.
- Start by centralizing reusable color tokens before introducing new toggle UI.

Delivered now:
- Dedicated theme state lives outside `useProjectEditor` and applies a root `data-theme` attribute.
- Settings panel exposes `light`, `dark`, and `system` options with visual feedback of resolved theme.
- Preference persists in local storage and `system` reacts to `matchMedia` changes with live updates.
- Core workspace surfaces now consume 90+ semantic theme tokens across sidebar, editor, split panes, and conflict UI.
- **Visual Polish Complete**: All light-mode colors audited and optimized for WCAG AA compliance (4.5:1 text, 3:1 UI components):
  - Tree icons: darkened from #71839d → #5d6f89 (4.55:1 contrast)
  - Button text: darkened from #f7fbff → #1b1f23 (4.69:1 contrast)
  - Sync indicators: optimized for accessibility (#349b60, #bf782e, #3168cc at min 3:1)
- Dark mode already exceeds all WCAG AA standards with excellent contrast ratios (6.7:1 to 16.87:1).

Primary files likely touched:
- `src/app.css`
- `src/index.css`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/*` (where hardcoded classes/colors exist)
- `src/features/project-editor/use-project-editor-state.ts` (or dedicated theme hook)

Acceptance criteria:
- Theme switcher exposes light/dark/system.
- Selected preference persists across restart.
- `system` mode responds to OS theme changes without reload.
- Contrast remains usable in both themes for editor and conflict UI.

Tests:
- New `tests/theme-persistence.test.ts`: preference save/restore.
- New `tests/theme-system-sync.test.ts`: `matchMedia` event handling behavior.

## WS3 - Fullscreen and Focus Mode

Objective:
- Wire native fullscreen with renderer state mirror and focus-mode UX controls.

Deliverables:
- IPC channel(s) for fullscreen set/get or set + window event stream.
- Main handler invoking BrowserWindow fullscreen APIs.
- Renderer actions and UI controls for entering/exiting fullscreen.
- Focus mode toggle that simplifies visible chrome (file list optional collapse).
- Focus text scope options: `line | sentence | paragraph` with contextual dimming around caret.

Suggested implementation details:
- Extend IPC contracts with:
  - `trama:window:set-fullscreen`
  - `trama:window:on-fullscreen-changed` (event)
- Keep focus mode renderer-local initially; only fullscreen should be native.
- Ensure renderer state reconciles if user exits fullscreen via OS shortcut (F11/Escape where applicable).

Focus mode operational contract:
- Focus mode is a renderer UI state that reduces distraction without changing document data.
- When enabled: hide/collapse non-essential chrome (sidebar body and secondary controls), keep editor workspace dominant.
- Focus text scope is user-selectable: `line`, `sentence`, or `paragraph`.
- Active scope remains emphasized while surrounding text is dimmed; behavior tracks caret during typing and navigation.
- If sentence detection in rich content is uncertain, fallback to paragraph-level emphasis.
- Always keep critical safety surfaces visible: save/sync status, conflict banner, compare/reload/save-as-copy actions.
- Exiting focus mode restores previous layout visibility and active pane context.
- Focus mode can coexist with fullscreen (independent toggles).
- Persist preference in workspace layout storage and restore on startup.

Primary files likely touched:
- `src/shared/ipc.ts`
- `src/types/trama-api.d.ts`
- `electron/preload.cts`
- `electron/ipc.ts`
- `electron/ipc/handlers/index.ts`
- `electron/ipc/handlers/*` (new window handler module)
- `electron/main.ts` (if window event wiring is required)
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/project-editor-view.tsx`

Acceptance criteria:
- Fullscreen toggle works from UI command.
- Renderer reflects actual fullscreen state after native changes.
- Focus mode hides secondary chrome and is reversible without data loss.
- Focus mode preserves conflict and save affordances while active.
- User can switch focus scope (`line|sentence|paragraph`) and see consistent dimming behavior around caret.

Tests:
- New `tests/fullscreen-ipc.test.ts`: payload validation and envelope behavior.
- Extend `tests/electron-smoke.test.ts`: fullscreen contract available in preload.
- New `tests/focus-mode-scope.test.ts`: verifies scope selection state, persistence, and fallback to paragraph behavior.

## WS4 - UX Hardening and Accessibility

Objective:
- Make Phase 3 ergonomics reliable for daily writing sessions.

Deliverables:
- Keyboard shortcuts for split toggle, pane focus switch, fullscreen/focus toggle.
- Clear visual affordances for active pane and unsaved indicators per pane.
- Empty states and disabled-state handling for split mode with no secondary file.
- Responsiveness rules for narrow widths (auto-fallback to single pane).

Primary files likely touched:
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/*`
- `src/app.css`

Acceptance criteria:
- Main workspace actions are keyboard reachable.
- On narrow viewport, UI remains usable and avoids clipped controls.
- No regressions in conflict banner and save behavior in both pane modes.

Tests:
- Extend `tests/project-editor-conflict-flow.test.ts` for split-mode conflict scenario.
- Add focused UI interaction tests where practical in existing test harness.

## WS5 - Final Hardening, Docs, and Sign-off

Objective:
- Close Phase 3 with confidence and accurate documentation.

Deliverables:
- Regression pass of core commands.
- Updated docs with final behavior and extension guidance.
- Explicit Phase 3 completion evidence.

Docs to update at closure:
- `docs/current-status.md`
- `docs/implementation-overview.md`
- `docs/new-conversation-handoff.md`
- `docs/file-map.md`
- `docs/dev-workflow.md` (if workflow changes)

Validation gate:
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- Manual smoke in dev app:
  - open project,
  - single/split operations,
  - theme switching,
  - fullscreen/focus transitions,
  - conflict actions still safe.

## 6. Proposed Execution Sequence (PR Plan)

PR-1: Split UX interaction overhaul
- Keep both editors rendered in split mode.
- Activate pane by editor click.
- Replace top ratio slider with center drag divider.
- Replace "Primary/Secondary" labels with file names.
- Remove top control bar.

Status: Completed.

PR-2: Split UX stabilization and regression safety
- Verify conflict flow and autosave behavior with new split interactions.
- Expand persistence tests for drag-based resizing.
- Polish empty-state and focus affordances.

Status: Completed for WS1 scope.

PR-3: Theme foundation and persistence
- Add theme preference model (`light | dark | system`).
- Add resolved-theme application on app root.
- Introduce semantic CSS tokens for core surfaces and states.
- Cover preference persistence with focused tests.

Status: Completed.

PR-4: Theme rollout and system sync
- Apply theme tokens across sidebar, editor, split-pane affordances, and conflict UI.
- Add system-theme listeners for live updates in `system` mode.
- Validate contrast and regressions in both themes.

Status: In progress.

PR-3: Theme subsystem
- Introduce semantic tokens and switcher.
- Persistence + system sync.
- Theme tests.

PR-4: Fullscreen IPC + focus mode
- Add new IPC contracts and handlers.
- Renderer controls and fullscreen state sync.
- IPC tests and smoke updates.

PR-5: Accessibility polish + responsive behavior
- Keyboard shortcuts and focus UX.
- Narrow layout fallback behavior.
- Integration test adjustments.

PR-6: Phase 3 closure and docs
- Full regression run, docs update, completion checklist.

## 7. Risks and Mitigations

Risk: State complexity explosion in `use-project-editor`.
- Mitigation: keep layout/theme/fullscreen logic in isolated hooks/modules; avoid monolithic hook growth.

Risk: Split-pane introduces save/conflict race conditions.
- Mitigation: use explicit per-pane document state (`primaryPane` and `secondaryPane`) and require pane-aware `loadDocument` calls.

Risk: Fullscreen desync between OS window state and renderer state.
- Mitigation: subscribe to native fullscreen change events and reconcile renderer state from source-of-truth events.

Risk: Theme regressions reduce readability.
- Mitigation: semantic token audit and explicit contrast checks on conflict/disabled states.

Risk: Test fragility due to UI restructuring.
- Mitigation: prioritize behavior-level tests over brittle DOM shape assertions and normalize persisted layout state in test setup before assertions.

## 8. Exit Criteria for Phase 3

Phase 3 is complete when all are true:
- Split workspace is usable, persistent, and stable.
- Theme preference works and persists, including optional system sync.
- Fullscreen/focus mode works through native wiring and renderer sync.
- Core Phase 2 behaviors remain intact (autosave, external conflict handling, compare/save-as-copy).
- Build/lint/test/smoke all pass.
- Documentation reflects the real implementation.

## 9. Immediate Next Step

Start WS3 fullscreen/focus mode implementation: add native fullscreen IPC wiring, keep renderer fullscreen state synchronized with window events, and land initial focus-mode UX controls.
