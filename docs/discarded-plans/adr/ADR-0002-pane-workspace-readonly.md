# ADR-0002: PaneWorkspace Read-Only Query Facade

## Status

Accepted (2026-05-02)

## Context

Before this refactor, action hooks received `layoutState` + `paneState` as separate props and locally recalculated pane projections using `deriveActivePaneDocument()`. Every hook that needed pane information had to know about `workspaceLayout.activePane` and how to derive which pane to target.

The problem manifested in two ways:
1. **Scattered pane logic**: 6+ action hooks accessed raw `useState` atoms or derived pane state locally, duplicating the `activePane` lookup pattern.
2. **Timing hazards**: When a pane switch races with an autosave debounce, action hooks that inferred pane identity from global state could target the wrong pane.

The earlier approach (ADR-0001, now discarded) proposed a full `PaneWorkspace` class that owned save/load orchestration and replaced Preact state atoms. That was too invasive for the initial step.

## Decision

We introduce `PaneWorkspace` as a **read-only query facade** — it receives raw layout + pane state and exposes a small interface for reading pane information. It does **not** replace any Preact state, mutate anything, or own persistence logic.

```typescript
// src/features/project-editor/pane-workspace.ts
class PaneWorkspace {
  constructor(
    private layoutState: WorkspaceLayoutState,
    private primaryPane: PaneDocumentState,
    private secondaryPane: PaneDocumentState,
  ) {}

  getActivePaneDocument(): ActivePaneDocumentInfo
  getPaneDocument(pane: WorkspacePane): PaneDocumentInfo
  isPaneDirty(pane?: WorkspacePane): boolean
  canSwitchAwayFrom(pane?: WorkspacePane): boolean

  get layout(): Readonly<WorkspaceLayoutState>   // frozen copy — mutation-proof
  get primary(): Readonly<PaneDocumentState>    // frozen copy — mutation-proof
  get secondary(): Readonly<PaneDocumentState>   // frozen copy — mutation-proof
}

// src/features/project-editor/use-pane-workspace.ts
function usePaneWorkspace(
  layoutState: WorkspaceLayoutState,
  primaryPane: PaneDocumentState,
  secondaryPane: PaneDocumentState,
): PaneWorkspace {
  return useMemo(
    () => new PaneWorkspace(layoutState, primaryPane, secondaryPane),
    [layoutState, primaryPane, secondaryPane],
  )
}
```

`usePaneWorkspace` is created once in `useProjectEditorUiActions` and passed down to all action hooks that need pane info, replacing separate `layoutState` + `paneState` parameters.

## Consequences

**Positive:**
- **Interface reduction**: 6+ action hooks consume `PaneWorkspace` instead of knowing about `activePane` + two `PaneDocumentState` instances separately.
- **Consistent pane decisions**: All pane logic routes through 4 methods (`getActivePaneDocument`, `getPaneDocument`, `isPaneDirty`, `canSwitchAwayFrom`) + 3 getters instead of ad-hoc state access.
- **Testability**: `PaneWorkspace` is a plain class testable without Preact. Unit tests cover all 4 methods and edge cases (empty panes, undefined pane defaults to active, etc.).
- **Incremental**: No Preact state atoms replaced. The class is introduced alongside existing state and ports action hooks one by one.

**Negative:**
- **Indirection**: Adds a layer between action hooks and raw state. Mitigated by the fact that the 4 methods map 1:1 to the queries action hooks actually need.
- **Memo dependency**: The hook adapter uses `useMemo` — callers must pass stable references to avoid unnecessary re-creations. This is handled naturally since `layoutState`, `primaryPane`, and `secondaryPane` come from memoized sub-state hooks.

## Key Design Decisions

### `selectedPath` comes from layout, not document state
`getActivePaneDocument()` returns `selectedPath` from `workspaceLayout.primaryPath` / `secondaryPath` — not from `pane.path`. This is critical because during async document loading, the pane document may be `null` while the layout already knows which file belongs to that pane. Deriving `selectedPath` from layout prevents sidebar blanking during pane switches.

### `canSwitchAwayFrom` returns true for panes with no path
A pane with `path === null` is considered switchable-away from regardless of dirty state, because there's no file to lose work on. This matches the `canSelectFile` guard logic.

### No mutation — purely a query facade
The class holds no internal state. All reads derive from the constructor inputs at call time. This means `PaneWorkspace` instances are cheap to create and have no risk of stale internal state.

## Files

- `src/features/project-editor/pane-workspace.ts` — class definition
- `src/features/project-editor/use-pane-workspace.ts` — hook adapter
- `tests/pane-workspace.test.ts` — class unit tests
- `tests/use-pane-workspace.test.ts` — hook adapter tests

## References

- Architecture: `docs/architecture/split-pane-coordination.md`
- Switch pane flow: `docs/flows/switch-pane-flow.md`
- Previous (discarded) approach: `docs/adr/ADR-0001-pane-workspace-module.md`
