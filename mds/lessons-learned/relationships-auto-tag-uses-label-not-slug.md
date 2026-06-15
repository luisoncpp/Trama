# Relationships chart: Auto tag uses the character name, not the node id slug

## What happened

Add-character **Auto** tag matches `tagIndex` using the trimmed, lowercased **label** (`resolveAutoNodeTag`). Node `id` is assigned separately by `buildNodeId`, which slugifies (`Aldren the Bold` → `aldren-the-bold`). Expecting Auto to use the slug (or assuming `id` equals the wiki tag) leads to "tag not found" after save even when a single-word tag like `aldren` exists.

## What to do next time

1. Auto lookup key = full lowered label text (optional leading `#` stripped), same normalization as `resolveMarkerDestination`.
2. Node `id` = slug for edge `from`/`to` references only; never derive `destinationTag` from `buildNodeId`.
3. Multi-word tags (e.g. `norte salvaje`) require the character name to match that phrase, not a hyphenated slug.

## Files

- `relationships-editor-helpers.ts` — `resolveAutoNodeTag`, `buildNodeId`
- `relationships-node-dialog.tsx` — Auto checkbox and live preview
- `mds/architecture/relationships-document-architecture.md` — add-character flow + debug playbook
