# DOCX ImageRun Transformation Units

The `docx` library's `ImageRun` accepts `transformation: { width, height }` in **pixels**, not EMU (English Metric Units).

## What happened

We calculated image dimensions in EMU (1 inch = 914400 EMU) and passed those values directly to `ImageRun.transformation`. This caused three distinct symptoms across readers:

- **LibreOffice**: images invisible or not rendered (values interpreted as impossibly large pixels)
- **Calibre/ebook viewer**: each image occupied a full page (multi-million "pixel" widths)
- **Web-based DOCX viewers**: auto-scaled and looked acceptable, masking the bug

## Root cause

`docx` internally converts pixels to EMU using `pixels * 9525`. Passing EMU directly multiplies the value again, producing nonsense dimensions.

## Fix

Return **pixels** from the size calculation:

```typescript
function calculateDocxImageSize(
  dimensions: { width: number; height: number },
  maxWidthPx = 600,
  maxHeightPx = 800,
): { width: number; height: number } {
  const scale = Math.min(
    maxWidthPx / dimensions.width,
    maxHeightPx / dimensions.height,
    1, // never upscale
  )
  return {
    width: Math.round(dimensions.width * scale),
    height: Math.round(dimensions.height * scale),
  }
}
```

The library handles EMU conversion internally.

## When this applies

Any time you embed images in DOCX output, or use `ImageRun`, `PictureRun`, or any other `docx` API that accepts a `transformation` object. Always provide pixel dimensions.

## Related

Same principle applies to any third-party library that claims to handle unit conversion — verify the input unit contract in the type definitions or source, never assume.
