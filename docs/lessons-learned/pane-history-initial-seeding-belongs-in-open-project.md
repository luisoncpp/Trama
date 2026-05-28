# Pane history initial seeding belongs in openProject

## What to know

Initial pane-history entries must be seeded inside the `openProject()` transaction, after history reset and from the reconciled layout that will actually be opened.

Passive render effects keyed only by `workspaceLayout.primaryPath` or `secondaryPath` are not reliable for this.

## Why the effect approach fails

If `openProject()` clears pane history and then restores the same persisted pane paths, a path-based effect may not re-run because the string values did not change.

That leaves the pane visually open on its initial document but with an empty or incomplete history stack, so Back cannot reach the first session document.

## Effective pattern

1. Reset pane history explicitly in `openProject()`.
2. Reconcile the next layout.
3. Seed `primaryPath` and `secondaryPath` from that reconciled layout into pane history immediately.
4. Then load the active pane and preload the inactive pane.

## When this applies

- persisted split-pane startup
- reopen flows that preserve pane assignments
- any browser-like history that is reset and restored within the same action transaction
