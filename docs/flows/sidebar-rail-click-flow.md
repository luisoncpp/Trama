# Sidebar Rail Click Flow

## Trigger

User clicks a rail section button (e.g., `explorer`, `outline`, `lore`, `transfer`, `settings`) in the sidebar rail when the sidebar panel is collapsed.

## Entry point

`SidebarRail` component — `src/features/project-editor/components/sidebar/sidebar-rail.tsx:43`

```typescript
onClick={() => onSelectSection(item.section)}
```

---

## Step-by-step sequence

### Step 1 — User clicks rail item

**File:** `sidebar-rail.tsx:43`

The button's `onClick` handler calls `onSelectSection(item.section)` where `item.section` is a `SidebarSection` value (`'explorer' | 'outline' | 'lore' | 'transfer' | 'settings'`).

---

### Step 2 — `SidebarPanel` passes callback to rail

**File:** `sidebar-panel.tsx:123`

```typescript
onSelectSection={props.onSelectSidebarSection}
```

The `SidebarPanel` component receives `onSelectSidebarSection` as a prop and wires it directly to the `SidebarRail`'s `onSelectSection` prop.

---

### Step 3 — `project-editor-view.tsx` wires model action

**File:** `project-editor-view.tsx:90`

```typescript
onSelectSidebarSection: actions.setSidebarSection,
```

`buildSidebarSectionProps` passes `actions.setSidebarSection` (the model's bound action) to `SidebarPanel`'s `onSelectSidebarSection` prop.

---

### Step 4 — `useSidebarActions` handles the action with auto-expand logic

**File:** `use-project-editor-ui-actions-helpers.ts:139-147`

```typescript
setSidebarSection: useCallback(
  (section: SidebarSection) => {
    setters.setSidebarActiveSection(section)
    if (sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled) {
      setters.setSidebarPanelCollapsed(false)
    }
  },
  [setters, sidebarState.sidebarPanelCollapsed, layout.focusModeEnabled],
),
```

**Decisions taken at this step:**

| Condition | Action |
|-----------|--------|
| `sidebarPanelCollapsed === true` AND `focusModeEnabled === false` | Call `setSidebarPanelCollapsed(false)` to expand the panel |
| `sidebarPanelCollapsed === false` | Only update the active section; no state change needed for collapse |
| `sidebarPanelCollapsed === true` AND `focusModeEnabled === true` | Do NOT expand — focus mode locks sidebar in collapsed state |

This is the core of the auto-expand behavior. The `useSidebarActions` hook receives `layout` (containing `focusModeEnabled`) and `sidebarState` (containing `sidebarPanelCollapsed`) as parameters from its caller.

---

### Step 5 — State setters update Preact state

**File:** `use-sidebar-ui-state.ts:64-66`

The `setters` passed to `useSidebarActions` come from `useSidebarUiState`, which returns setters backed by `useState`:

```typescript
const [activeSection, setActiveSection] = useState<SidebarSection>(() => readSidebarUiState().activeSection)
const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => readSidebarUiState().panelCollapsed)
```

Calling `setSidebarActiveSection(section)` and `setSidebarPanelCollapsed(false)` schedules a re-render of all components consuming these states.

---

### Step 6 — Re-render: sidebar width updates

**File:** `sidebar-panel.tsx:116-117`

```typescript
class={`sidebar-shell ${effectiveCollapsed ? 'is-collapsed' : ''}`}
style={{ width: `${effectiveCollapsed ? 72 : props.sidebarPanelWidth}px` }}
```

After the state update, `SidebarPanel` re-renders. Since `effectiveCollapsed` (derived from `props.sidebarPanelCollapsed || isResponsiveCollapsed`) is now `false`, the `sidebar-shell` element loses the `is-collapsed` class and its width changes from `72px` to `sidebarPanelWidth` (e.g., `300px`).

The panel body (`SidebarPanelBody`) also becomes visible since `effectiveCollapsed` is now `false`.

---

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/components/sidebar/sidebar-rail.tsx:43` | Entry: button `onClick` calls `onSelectSection` |
| `src/features/project-editor/components/sidebar/sidebar-panel.tsx:123` | Passes `onSelectSidebarSection` prop to rail |
| `src/features/project-editor/project-editor-view.tsx:90` | Wires `actions.setSidebarSection` to panel prop |
| `src/features/project-editor/use-project-editor-ui-actions-helpers.ts:139-147` | Core logic: sets section + conditionally expands panel |
| `src/features/project-editor/use-sidebar-ui-state.ts:64-66` | State setters backed by `useState` |
| `src/features/project-editor/components/sidebar/sidebar-panel.tsx:116-117` | CSS class and width driven by `effectiveCollapsed` |

## Common failure modes

1. **`setSidebarSection` called but panel stays collapsed** — Check that `sidebarState` and `layout` are being passed correctly to `useSidebarActions`. If either is stale, the condition `sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled` may never evaluate to `true`.

2. **Panel expands during focus mode** — The `!layout.focusModeEnabled` guard should prevent this. If it still happens, verify `focusModeEnabled` in `layout` matches `workspaceLayout.focusModeEnabled` from state.

3. **Responsive collapse overriding** — `useSidebarResponsiveCollapse` can independently collapse the panel on narrow viewports. The `effectiveCollapsed` in `sidebar-panel.tsx:62` is `props.sidebarPanelCollapsed || isResponsiveCollapsed`, meaning responsive collapse takes precedence and cannot be undone by `setSidebarSection` alone.

## Related flows

- `sidebar-render-chain-flow.md` — How the sidebar renders from collapsed to expanded state
- `project-state-propagation-flow.md` — How `sidebarState` sub-state is derived and propagated to action hooks