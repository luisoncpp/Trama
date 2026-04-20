# Index reorder payloads must match persisted index semantics

## What to know

If `.trama.index.json` uses document IDs for `corkboardOrder`, renderer reorder flows must send those same IDs.

In current drag-drop sidebar implementation, `onReorderFiles` sends section-relative file paths taken from visible tree rows, not document IDs. That creates two kinds of drift:

- key drift: folder keys are section-relative instead of project-relative
- value drift: order entries are paths instead of `meta.id` values for documents that define explicit IDs

This means reorder state can disappear on next reconciliation and can also be unreadable by consumers that compare against resolved document IDs, such as export ordering logic.

## Rule

When adding or extending reorder/corkboard features, pick one canonical identifier and keep it consistent across:

- renderer payloads
- persisted `corkboardOrder`
- reconciliation logic
- downstream readers like export/corkboard services

If the UI only has file paths available, either convert them to canonical IDs before persisting or explicitly define the index contract as path-based everywhere.