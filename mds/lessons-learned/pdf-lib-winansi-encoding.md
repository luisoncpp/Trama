# PDF export and WinAnsi encoding limits

Date: 2026-04-13

## Context

Book export Phase C added PDF generation with `pdf-lib` using `StandardFonts.TimesRoman` / `TimesRomanBold`.

## Symptom

Export can fail with runtime errors such as:

- `WinAnsi cannot encode ...`

when manuscript text includes characters outside the WinAnsi character set.

## Root cause

`pdf-lib` standard fonts are WinAnsi-encoded. They do not support full Unicode coverage.

## Practical guidance

1. Register `@pdf-lib/fontkit` and prefer embedded Unicode-capable system fonts for regular/bold body text.
2. Keep fallback to `pdf-lib` standard fonts for environments where system serif fonts are unavailable.
3. Add regression tests that include Unicode text and directive-driven pagination (`<!-- trama:pagebreak -->` and HTML pagebreak variants).

## Resolution status

Resolved in current codebase:

- PDF renderer now loads Unicode-capable system serif fonts when available.
- Export no longer crashes on common non-WinAnsi characters in those environments.
- Regression coverage exists in `tests/book-export-renderers.test.ts` for Unicode + pagebreak behavior.
