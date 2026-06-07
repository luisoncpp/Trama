# Quill Drops Custom data-* Directive Artifacts During Markdown->HTML Ingestion

Date: 2026-04-12

## Symptom

Directive artifacts rendered as custom HTML nodes with `data-trama-*` attributes did not survive the Quill ingestion/normalization pipeline. Copy-as-markdown serialization from editor HTML then lost directive comments.

## Why it happened

Quill clipboard/import sanitization normalizes DOM to supported formats. Unknown nodes/attributes can be dropped unless represented via supported formats/blots.

Additionally, Turndown can treat empty directive embed nodes as `blank` and bypass custom conversion rules, silently dropping directive comments on markdown serialization.

## What to do next time

1. Do not rely on raw `data-*` attributes alone for persistence across Quill round-trips.
2. For durable semantic objects (especially pagebreak), implement dedicated Quill blot/embed registration.
3. Keep parser/serializer logic isolated in shared utilities so editor model upgrades (blot migration) do not affect canonical markdown tokens.
4. Ensure directive embed DOM nodes are non-empty (or handle Turndown blank replacement explicitly), otherwise custom Turndown rules may never execute.
