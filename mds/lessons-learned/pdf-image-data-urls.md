# PDF Image Data URLs Path Resolution Bug

**Date**: 2026-04-14  
**Component**: `book-export-pdf-renderer.ts`  
**Status**: Fixed

## Problem

PDF export added support for embedding images (both local files and base64 data URLs). The renderer initially attempted to resolve **all** image paths—including data URLs—through `path.resolve(projectRoot, chapterDir, imagePath)`.

When Markdown contained `![alt](data:image/png;base64,iVBORw0K...)`, the path normalization would corrupt the data URL into something like:
```
C:\Proyectos\trama\example-fantasia\book\Act-01\Chapter-01\data:image\png;base64,iVB...
```

This broke the data URL format, causing `pdf-lib` embed calls to fail silently.

## Root Cause

Data URLs are **not filesystem paths** and should never be normalized through `path.resolve()`. The code assumed all image references were file paths.

## Solution

Added a guard check before path resolution:

```typescript
const imagePath = imageMatch[2]
const absolutePath = imagePath.startsWith('data:image/')
  ? imagePath
  : path.resolve(projectRoot, chapterDir, imagePath)
```

**Key points**:
- Data URLs are detected by prefix `data:image/`
- Detected data URLs bypass `path.resolve()` entirely
- Local file paths continue to resolve relative to chapter directory

## Regression Coverage

Added test case in `tests/book-export-renderers.test.ts`:
- Embeds a valid PNG data URL directly in markdown
- Verifies PDF renders without errors
- Confirms page count and file size are valid

## Lesson for Future Work

- String prefixes/schemes (data URLs, HTTP URIs, etc.) need early detection **before** filesystem path operations
- Consider normalizing all image path types in a single validation pass rather than scattered throughout the render pipeline
