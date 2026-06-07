# Startup project restore should clear invalid memory

When startup remembers the last opened project root, validation failure should clear that stored value before falling back to the folder picker.

Why this matters:

- Otherwise every app launch retries the same broken path first.
- Startup validation should reuse the same required-folder contract as the manual picker flow so both entry points agree on what counts as a valid Trama project.

Reusable pattern:

1. Persist only successful roots.
2. Validate the remembered root through the backend seam that already owns the folder-structure rules.
3. On invalid result, clear the stored value before prompting the user.
