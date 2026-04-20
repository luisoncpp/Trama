# Focus mode CSS variables need synchronous init

## What

Focus mode uses CSS custom properties (`--focus-extra-top`, `--focus-extra-bottom`) to maintain scroll centering. The original code relied on a RAF-based `scheduleRefresh` triggered by `selection-change`, which never fired immediately on editor activation, leaving CSS variables empty until the first user interaction.

## Root cause

Quill does not fire `selection-change` on initial render. The `scheduleRefresh` function was only called via `quill.on('selection-change')`, which meant `updateCenteredScroll` was never invoked synchronously when focus mode activated. The test `aplica variables CSS de padding al activar focus mode y las limpia al desactivar` failed because the initial render had no selection and therefore no CSS variables set.

## Fix pattern

1. `updateCenteredScroll` now sets default padding using `container.clientHeight / 2` even when no selection exists, rather than returning early.
2. `setupScrollCentering` returns `{ updateCenteredScroll, cleanup }` instead of just `cleanup`.
3. `scheduleRefresh` calls `updateCenteredScroll()` synchronously (not via RAF) when scheduling, ensuring the initial state is set immediately.

## When to apply

Any effect or hook that manages visual state through RAF callbacks should initialize that state synchronously on activation, not rely solely on event-driven RAF updates. Test initial state explicitly.
