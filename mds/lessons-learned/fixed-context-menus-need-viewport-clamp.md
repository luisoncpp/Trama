# Fixed context menus need measure-then-clamp, not click coords alone

## Lesson

`position: fixed` at `clientX`/`clientY` still clips inside an Electron window when the click is near the bottom or right edge. Parent `overflow: hidden` is not the cause — the BrowserWindow viewport is.

## Strategy

1. Render the menu at the preferred click point.
2. In `useLayoutEffect`, read `getBoundingClientRect()` for the real menu size.
3. Clamp with `min/max` against `window.innerWidth` / `window.innerHeight` and a small padding.
4. Share one shell (`SidebarContextMenuShell`) so sidebar, map, and relationships menus stay consistent.

Do not assume estimated item heights; menu content varies (file vs folder vs chart). Measure after mount.

## Focused tests

`npm run test -- tests/clamp-context-menu-position.test.ts`