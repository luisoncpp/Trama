# Help Screenshot Overlay Timing

## Symptom

Region-based help captures for sidebar context menus showed the tree row but not the open menu, even though the harness computed a crop that included the menu bounds.

## Cause

`help-screenshot-capture.ts` waited 400ms after the renderer scenario returned before calling `capturePage(region)`. Transient overlays (context menus) closed during that delay.

## Fix

Capture cropped regions immediately when the scenario returns. Keep the settle delay only for full-window screenshots.

## Rule

When adding new overlay scenarios (menus, dialogs, tooltips), return a `CaptureRegion` and verify the overlay is still mounted on the frame used for capture.
