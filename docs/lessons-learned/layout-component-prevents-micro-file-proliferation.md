# Layout component prevents micro-file proliferation

Lint limits (`max-lines: 200`, `max-lines-per-function: 50`) can drive atomization that produces shallow modules — files where the interface is nearly as complex as the implementation.

## The trap

In the sidebar settings area, each control had its own wrapper component (`ThemeSetting`, `SpellcheckSetting`, etc.) that did nothing but add `<div class="project-menu"><label class="project-menu__field">...</label></div>`. The result: 10 files for ~200 lines of settings UI. Understanding "how settings work" required opening 10 files.

## The fix

Introduce a `SettingsField` layout component:

```tsx
<SettingsField label="Theme" note="Resolved now: Dark">
  <ThemePreferenceButtons ... />
</SettingsField>
```

`SettingsField` owns the `project-menu` + `project-menu__field` wrapper. Inner components (the actual controls) no longer need their own label structure. They render only the control itself. The settings panel goes from 10 files to 1.

## Why this works

- **Locality:** All settings UI lives in one file. Change a label, layout rule, or CSS class → one edit.
- **Leverage:** `SettingsField` is a deep module — small interface (`label`, `children`, `note?`), significant behavior (wrapping, labeling, note placement).
- **Lint compliance:** `SidebarSettingsContent` stays under 50 lines because each `SettingsField` call is one line. The inner components are small private functions, not separate files.

## Generalizing

This pattern applies anywhere repeated wrapper structure appears:
- Form rows with label + input + error
- Toolbar buttons with icon + tooltip
- Card headers with title + actions

Extract the **layout**, not the **content**. Content components stay focused on their domain; the layout component owns the repeated shell.
