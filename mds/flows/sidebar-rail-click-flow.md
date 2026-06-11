# Sidebar Rail Click Flow

## Trigger

User clicks a rail section button (e.g., `explorer`, `outline`, `lore`, `transfer`, `settings`) in the sidebar rail when the sidebar panel is collapsed.

## Entry point

`SidebarRail` component — `src/features/project-editor/components/sidebar/sidebar-rail.tsx:34`

```typescript
const { setSidebarSection, toggleSidebarPanelCollapsed } = useEditorActions()
```

---

## Step-by-step sequence

### Step 1 — User clicks rail item

**File:** `sidebar-rail.tsx:46`

The button's `onClick` handler calls `setSidebarSection(item.section)` where `item.section` is a `SidebarSection` value (`'explorer' | 'outline' | 'lore' | 'transfer' | 'settings'`). The action is consumed directly from `useEditorActions()` — no prop drilling through the sidebar shell.

---

### Step 2 — `useSidebarActions` handles the action with auto-expand logic

**File:** `src/features/project-editor/workspace-actions.ts` (via `ProjectEditorActions` facade)

```typescript
setSidebarSection: (section: SidebarSection) => {
  setters.setSidebarActiveSection(section)
  if (sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled) {
    setters.setSidebarPanelCollapsed(false)
  }
}
```

**Decisions taken at this step:**

| Condition | Action |
|-----------|--------|
| `sidebarPanelCollapsed === true` AND `focusModeEnabled === false` | Call `setSidebarPanelCollapsed(false)` to expand the panel |
| `sidebarPanelCollapsed === false` | Only update the active section; no state change needed for collapse |
| `sidebarPanelCollapsed === true` AND `focusModeEnabled === true` | Do NOT expand — focus mode locks sidebar in collapsed state |

This is the core of the auto-expand behavior. The action reads `sidebarState` and `layout` from the stable model state.

---

### Step 3 — State setters update Preact state

**File:** `use-sidebar-ui-state.ts`

The `setters` used by the action come from `useSidebarUiState`, which returns setters backed by `useState`:

```typescript
const [activeSection, setActiveSection] = useState<SidebarSection>(() => readSidebarUiState().activeSection)
const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => readSidebarUiState().panelCollapsed)
```

Calling `setSidebarActiveSection(section)` and `setSidebarPanelCollapsed(false)` schedules a re-render of all components consuming these states.

---

### Step 4 — Re-render: sidebar width updates

**File:** `sidebar-panel.tsx:51`

```typescript
class={`sidebar-shell ${effectiveCollapsed ? 'is-collapsed' : ''}`}
```

After the state update, `SidebarPanel` re-renders. Since `effectiveCollapsed` (derived from `props.sidebarPanelCollapsed || isResponsiveCollapsed`) is now `false`, the `sidebar-shell` element loses the `is-collapsed` class and its width is driven by the layout CSS.

The panel body (`SidebarPanelBody`) also becomes visible since `effectiveCollapsed` is now `false`.

---

## Files to inspect

| File | Role |
|------|------|
| `src/features/project-editor/components/sidebar/sidebar-rail.tsx:34` | Entry: button `onClick` calls `setSidebarSection` from `useEditorActions()` |
| `src/features/project-editor/project-editor-actions-context.tsx` | Stable Preact context for `ProjectEditorActions` |
| `src/features/project-editor/workspace-actions.ts` | Core logic: sets section + conditionally expands panel |
| `src/features/project-editor/use-sidebar-ui-state.ts` | State setters backed by `useState` |
| `src/features/project-editor/components/sidebar/sidebar-panel.tsx:51` | CSS class driven by `effectiveCollapsed` |

## Common failure modes

1. **`setSidebarSection` called but panel stays collapsed** — Check that `sidebarState` and `layout` are being passed correctly to `useSidebarActions`. If either is stale, the condition `sidebarState.sidebarPanelCollapsed && !layout.focusModeEnabled` may never evaluate to `true`.

2. **Panel expands during focus mode** — The `!layout.focusModeEnabled` guard should prevent this. If it still happens, verify `focusModeEnabled` in `layout` matches `workspaceLayout.focusModeEnabled` from state.

3. **Responsive collapse overriding** — `useSidebarResponsiveCollapse` can independently collapse the panel on narrow viewports. The `effectiveCollapsed` in `sidebar-panel.tsx:62` is `props.sidebarPanelCollapsed || isResponsiveCollapsed`, meaning responsive collapse takes precedence and cannot be undone by `setSidebarSection` alone.

## Related flows

- `sidebar-render-chain-flow.md` — How the sidebar renders from collapsed to expanded state
- `project-state-propagation-flow.md` — How `sidebarState` sub-state is derived and propagated to action hooks