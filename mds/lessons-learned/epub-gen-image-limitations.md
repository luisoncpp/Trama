# EPUB Image Embedding with epub-gen

**Date**: 2026-04-14  
**Component**: `book-export-epub-renderer.ts`, `book-export-renderers.ts`  
**Status**: Fixed — EPUB image support implemented with temporary files + file URL rewriting

## Problem

When attempting to embed images in EPUB by converting local files to base64 data URLs and passing them to `epub-gen`, the library failed with file-not-found errors (`ENOENT`).

The error showed `epub-gen` was trying to literally open a file path like:
```
C:\...\tempDir\...\OEBPS\data:image\png;base64,iVBORw0KGg...
```

This indicates `epub-gen` tried to treat the data URL as a filesystem path, attempting to create a real file with that literal name.

## Root Cause

`epub-gen` assumes all image references in markdown/HTML are relative file paths, not data URLs. It:
1. Parses `![alt](path.jpg)` from the HTML
2. Looks for the file at `path.jpg` relative to its working directory
3. Copies the file into the EPUB archive
4. Does NOT recognize or handle base64 data URLs (`data:image/png;base64,...`)

## Why Other Formats Work

- **PDF**: Uses `pdf-lib` which can embed image bytes directly via `embedPng(bytes)` / `embedJpg(bytes)` — does NOT require file paths
- **DOCX**: Uses `docx` which accepts image bytes directly via `ImageRun({data: bytes, type: 'png'})` — does NOT require file paths
- **HTML**: Direct HTML output; `<img src="data:...">` is standard and browsers handle it natively
- **EPUB**: Uses a third-party generator (`epub-gen`) which lacks image bytes API and only accepts file paths

## Implemented Solution

1. Detect markdown image tokens in chapter content (`![alt](src)`).
2. For `data:image/...` sources: decode base64 and write a temporary PNG/JPG file.
3. For local image paths: resolve path relative to `projectRoot + chapterDir`.
4. Rewrite each markdown source to `file://...` so `epub-gen` copies it into `OEBPS/images`.
5. Keep HTTP/HTTPS sources unchanged.
6. Cleanup temporary image directory after EPUB generation.

Windows-specific detail:
- `epub-gen` strips the first 7 chars from `file://` and then uses the remainder as a filesystem path.
- `file:///C:/...` produced `C:\C:\...` in this flow.
- Using `file://C:/...` avoids the duplicated drive-prefix issue on Windows.

## Outcome

EPUB now exports with embedded local images and data-url images using the temp-file pipeline.

Regression coverage in `tests/book-export-renderers.test.ts` now includes:
1. EPUB chapter with data-url image source.
2. EPUB chapter with local image path resolved from `projectRoot` + chapter directory.
3. Cross-format companion checks for HTML/PDF/DOCX image handling to prevent format drift.

## Remaining Risks

1. Very large embedded images can increase EPUB generation time and temporary disk usage.
2. Broken local image paths are skipped and logged as warnings.
3. `epub-gen` behavior is implementation-specific; future library updates may require revalidation of file URL handling.

## Lesson

- Third-party generators with implicit assumptions (e.g., "images are always filesystem paths") can be hard to extend beyond their design
- Image handling varies significantly between format-specific libraries — PDF and DOCX are bytes-based, EPUB generators often path-based
- Pre-integration testing of "can this library handle my data format X" is critical for choice-of-framework decisions
