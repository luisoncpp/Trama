# Toolbar icon buttons should sync labels, not text

When a toolbar action is icon-only, state synchronization should update `title`, `aria-label`, and `disabled`, not `textContent`.

If a generic toolbar sync helper writes `button.textContent = label`, it destroys the SVG icon markup and silently turns an icon button back into a text button.

In Trama's rich editor toolbar, the save control and revert control live in the same right-side cluster and should share the same visual language. The safe pattern is:

- create the icon button once in the DOM helper
- preserve its SVG markup across sync cycles
- reflect dirty/saving state through `disabled`, tooltip text, and ARIA labels

This keeps icon-only controls visually stable while still exposing the current action state to users and tests.
