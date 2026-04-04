# Phase 3 Detailed Plan - Workspace UX

Date: 2026-04-04
Status: Proposed plan aligned to current codebase state
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

## WS1 - Layout Foundation (Split Panes + Tabs + Persistence)

Objective:
- Introduce a layout state model capable of two-pane workspace operation with persisted panel sizes and active contexts.

Deliverables:
- Layout model and actions integrated into project editor state.
- Resizable split workspace (horizontal first, optional vertical toggle).
- Active pane selection and tab memory for open documents.
- Persistent layout storage and restoration.

Suggested implementation details:
- Add a `workspaceLayout` object to project editor state (or dedicated layout module):
  - `mode`: `single | split`
  - `ratio`: number (left pane width fraction)
  - `primaryPath`: string | null
  - `secondaryPath`: string | null
  - `activePane`: `primary | secondary`
- Persist via local storage in renderer first (fast path), with clean abstraction so future migration to config file is easy.
- Keep file list single-source; both panes open docs from same project file registry.

Primary files likely touched:
- `src/features/project-editor/project-editor-types.ts`
- `src/features/project-editor/use-project-editor-state.ts`
- `src/features/project-editor/use-project-editor-ui-actions.ts`
- `src/features/project-editor/use-project-editor.ts`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/editor-panel.tsx`
- `src/features/project-editor/components/sidebar/sidebar-panel.tsx`

Acceptance criteria:
- User can toggle single/split modes.
- User can resize split and ratio persists after restart.
- User can assign/open documents independently in both panes.
- Active pane is visually clear and keyboard addressable.

Tests:
- `tests/use-project-editor.test.ts`: layout state transitions and persistence restore.
- New `tests/workspace-layout-persistence.test.ts`: split ratio, pane assignment, startup restore.

## WS2 - Theme System (Light/Dark/System)

Objective:
- Implement stable theme controller with persistence and optional system sync.

Deliverables:
- Theme preference model: `light | dark | system`.
- Theme application mechanism on app root (`data-theme` or class strategy).
- CSS tokens for semantic colors (surface, text, border, accent, danger).
- Startup restore and live update when system theme changes (only if `system` selected).

Suggested implementation details:
- Store preference in local storage with key namespace (`trama.theme.preference`).
- Resolve effective theme at runtime (`system` -> `matchMedia`).
- Keep editor and list panels using semantic tokens instead of hardcoded values.

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

Suggested implementation details:
- Extend IPC contracts with:
  - `trama:window:set-fullscreen`
  - `trama:window:on-fullscreen-changed` (event)
- Keep focus mode renderer-local initially; only fullscreen should be native.
- Ensure renderer state reconciles if user exits fullscreen via OS shortcut (F11/Escape where applicable).

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

Tests:
- New `tests/fullscreen-ipc.test.ts`: payload validation and envelope behavior.
- Extend `tests/electron-smoke.test.ts`: fullscreen contract available in preload.

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

PR-1: Layout state + split rendering skeleton
- Add state model and UI skeleton.
- Persist split ratio and mode.
- Tests for state transitions.

PR-2: Two-pane document workflows
- Pane assignment/open behavior.
- Active pane controls and visual states.
- Conflict flow compatibility in split mode.

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
- Mitigation: maintain one canonical document state map keyed by path; pane views are projections only.

Risk: Fullscreen desync between OS window state and renderer state.
- Mitigation: subscribe to native fullscreen change events and reconcile renderer state from source-of-truth events.

Risk: Theme regressions reduce readability.
- Mitigation: semantic token audit and explicit contrast checks on conflict/disabled states.

Risk: Test fragility due to UI restructuring.
- Mitigation: prioritize behavior-level tests over brittle DOM shape assertions.

## 8. Exit Criteria for Phase 3

Phase 3 is complete when all are true:
- Split workspace is usable, persistent, and stable.
- Theme preference works and persists, including optional system sync.
- Fullscreen/focus mode works through native wiring and renderer sync.
- Core Phase 2 behaviors remain intact (autosave, external conflict handling, compare/save-as-copy).
- Build/lint/test/smoke all pass.
- Documentation reflects the real implementation.

## 9. Immediate Next Step

Start PR-3 for sidebar filter/search UX (auto-expansion + restore expanded-state), then continue with PR-4 create actions and window/theme tracks.
