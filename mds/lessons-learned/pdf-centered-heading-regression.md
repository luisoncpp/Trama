# PDF Centered Heading Regression

Date: 2026-04-16

Problem:
Rendering markdown headings in PDF by routing `# ...` lines to a dedicated `drawHeading()` fixed H1 styling, but broke `trama:center` behavior because headings stopped using the centered paragraph path.

Lesson:
When a renderer has separate paragraph and heading code paths, layout state like centered alignment must be threaded through both paths. Otherwise format-specific fixes can silently regress directive behavior.

Fix:
Make `drawHeading()` accept a `centered` flag and compute `x` from heading width the same way centered paragraph lines do.
