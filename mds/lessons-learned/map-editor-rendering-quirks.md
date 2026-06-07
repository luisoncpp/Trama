# Map Editor Rendering Quirks

When implementing non-text editor surfaces (like `MapEditor`), specific layout and security constraints in Electron require special handling compared to standard DOM development.

## The `file:///` Protocol is Blocked

Electron renderer processes block `file:///` resource requests by default for security. 
- You cannot construct a `file:///C:/path/to/project/res/image.png` string and drop it into an `<img src>` or `url()` CSS property.
- **Solution**: Use an IPC bridge (like `readImageFile`) to read the file buffer in the main process and return it as a Base64 `data:` URL (`data:image/svg+xml;base64,...`).

## SVGs Missing Dimensions Collapse as Data URLs

When rendering an SVG image *via a data URL* inside an `<img>` tag, Chromium uses the SVG's intrinsic dimensions.
- If the SVG only defines `viewBox="0 0 1600 1000"` but lacks explicit `width="1600" height="1000"` attributes on the root `<svg>` element, Chromium bounds its fallback intrinsic size (e.g., to 300x150 or 240x150 depending on layout context).
- This results in the map appearing tiny or "blank" if it's placed against a large dark background.
- **Solution**: Ensure SVG assets (like map backgrounds) explicitly declare `width` and `height` attributes, not just `viewBox`.

## CSS Layout Collapse in Non-Text Editors

Rich text editors often handle their own internal scroll constraints. When replacing the text editor body with a custom component (like the Map pan/zoom stage), the wrapper must explicitly define its layout strategy.
- `MapEditor` relies on `flex: 1 1 auto` to expand, but its parent `.editor-manuscript` lacked `display: flex; flex-direction: column`.
- Because `.editor-manuscript` had no flex layout, `.map-editor` collapsed to `0px` vertical height.
- **Solution**: Ensure pane component wrappers like `.editor-manuscript` apply `display: flex; flex-direction: column` so that `min-height: 0; flex: 1 1 auto;` works predictably for injected non-text child components.

## Testing Layout Collapse

- Layout issues like "height collapsing to 0px because a parent is missing `display: flex`" cannot be reliably tested in Vitest/JSDOM. JSDOM does not implement a real CSS layout engine (all elements have 0x0 bounding boxes by default unless mocked).
- These regressions must be guarded architecturally by strictly mapping out CSS responsibilities or caught in end-to-end tests (e.g., Playwright/Cypress) that run in a real Chromium browser context.