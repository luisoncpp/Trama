# Theme Architecture

Goal: document how Trama resolves theme preference, applies the root theme, and fans that state out through CSS tokens and renderer props.

## Ownership map

| Concern | Single owner | Notes |
|------|------|------|
| Theme preference types | `src/theme/theme-types.ts` | Defines `ThemePreference` (`light | dark | system`) and `ResolvedTheme` (`light | dark`) |
| Preference parsing and resolution | `src/theme/theme-logic.ts` | Owns the storage key, media query string, validation, and `system -> resolved` mapping |
| DOM application and live OS sync | `src/theme/use-theme-preference.ts` | Reads storage, listens to `matchMedia`, persists preference, and writes `document.documentElement.dataset.theme` plus `colorScheme` |
| App composition seam | `src/app.tsx` | Instantiates `useThemePreference()` once and threads the state into `ProjectEditorView` |
| Theme token source of truth | `src/styles/01-theme-tokens.css` | Defines dark-mode root tokens plus `html[data-theme='light']` overrides |
| Theme selection UI | `src/features/project-editor/components/sidebar/sidebar-settings.tsx` | Exposes the three preference buttons and reports user changes upward |

## End-to-end flow

### Startup

1. `App` calls `useThemePreference()`.
2. `useThemePreference()` reads `localStorage['trama.theme.preference']` through `readThemePreference()`.
3. It reads the current OS mode through `window.matchMedia('(prefers-color-scheme: dark)')`.
4. `resolveThemePreference()` converts the stored preference into a concrete `ResolvedTheme`.
5. `applyResolvedTheme()` writes `document.documentElement.dataset.theme` and `document.documentElement.style.colorScheme`.
6. CSS token selection happens automatically through `:root` for dark mode and `html[data-theme='light']` for light mode.

### User changes the preference

1. Sidebar Settings calls `onThemePreferenceChange()` with `light`, `dark`, or `system`.
2. `useThemePreference()` updates `preference` state.
3. An effect persists the new preference to `localStorage`.
4. The resolved theme is recomputed.
5. A second effect rewrites the root `data-theme` and `colorScheme` values.
6. All renderer surfaces update because they consume CSS variables instead of duplicating per-component color logic.

### OS theme changes while preference is `system`

1. `useThemePreference()` subscribes to the `matchMedia` `change` event.
2. The event updates `systemPrefersDark`.
3. `resolveThemePreference()` re-runs.
4. The root `data-theme` value is rewritten.
5. The CSS token layer switches without component-specific theme code.

## Token model

- `src/styles/01-theme-tokens.css` is the canonical palette file.
- Dark mode lives in `:root`.
- Light mode overrides only the tokens that differ inside `html[data-theme='light']`.
- Components should consume semantic tokens such as `--text-main`, `--border`, `--surface-input-bg`, `--accent`, and `--quill-active` rather than hard-coded colors.
- In dark mode, major shell surfaces should prefer solid fills over transparency or subtle gradients; near-black blends and layered card treatments make neutral greys read warmer than they are.

### Interaction-color invariant

- `--accent` is reserved for transient interaction cues such as hover, focus, drag, and editor-toolbar active states.
- Persistent selection/active surfaces should use the neutral tokens (`--accent-strong`, `--surface-accent-bg`, `--accent-border`) unless the UI is intentionally signaling warning/error state.
- Quill toolbar and picker active states should stay aligned with `--accent`; if `--quill-active` drifts warm in dark mode, the editor chrome picks up an unintended brown cast.

## Key files

- `src/theme/theme-types.ts`
- `src/theme/theme-logic.ts`
- `src/theme/use-theme-preference.ts`
- `src/app.tsx`
- `src/features/project-editor/project-editor-view.tsx`
- `src/features/project-editor/components/sidebar/sidebar-settings.tsx`
- `src/styles/01-theme-tokens.css`
- `tests/theme-preference.test.ts`

## Debug playbook

1. Theme toggle appears stuck: inspect `localStorage['trama.theme.preference']`, then confirm `document.documentElement.dataset.theme` changes after clicking the Settings buttons.
2. `system` mode does not follow the OS: verify the browser/Electron environment supports `matchMedia`, then confirm `THEME_MEDIA_QUERY` still matches the listener in `use-theme-preference.ts`.
3. Only one area looks off-color: start in `src/styles/01-theme-tokens.css`, then search the affected token usage in `src/styles/` before editing component rules.
4. Dark mode has unexpected warm/brown chrome: verify transient interaction tokens such as `--quill-active` still match the intended accent model instead of warning colors.
5. Dark mode still feels warm even with neutral hex values: look for gradients, transparency, shadows, and permanently filled rows/buttons before changing hue tokens again.

## Focused tests

- `npm run test -- tests/theme-preference.test.ts`
- `npm run build`

## References

- `mds/START-HERE.md`
- `mds/live/file-map.md`
- `mds/lessons-learned/flat-dark-surfaces-reduce-warm-illusion.md`
- `mds/lessons-learned/theme-interaction-tokens-should-follow-the-accent-model.md`
- `tests/theme-preference.test.ts`
