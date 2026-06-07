# Explicit toolbar order needs one DOM owner

Toolbar order becomes hard to follow when one Module creates the base toolbar and several other Modules mutate it later with `append`, `prepend`, or `insertBefore`.

## The trap

Quill already provides a toolbar Adapter, so it is tempting to keep extending it from multiple places:

- base groups declared in Quill config
- layout buttons appended later
- zoom inserted before controls
- history/revert/save/sync reordered inside another container

This keeps each file small, but the Interface becomes larger than the Implementation. Understanding order requires replaying several DOM mutations in your head.

## The fix

Keep Quill as the Seam, but give one private Module ownership of toolbar DOM composition and explicit order.

- public hook stays thin
- one controller class owns synchronization
- one DOM helper owns element creation and current order

The current order should be declared once, even if the product team plans to revisit that order later.

## Why this works

- **Locality:** toolbar order lives in one place instead of being inferred across files.
- **Leverage:** changing order becomes a single edit instead of coordinated DOM surgery.
- **Testability:** one focused test can assert the full toolbar order at the Interface.

## Generalizing

Any DOM-heavy Module with a stable visual order should have one owner for:

- element discovery/creation
- ordering
- state synchronization

Split public and private seams if needed, but do not split ordering policy across multiple shallow Modules.
