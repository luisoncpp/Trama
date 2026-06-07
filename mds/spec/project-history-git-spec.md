# Project History with Local Git

Trama supports local Git-backed project history for Trama-managed project content. The feature is local-first: it does not require GitHub, remotes, authentication, network access, or cloud synchronization.

## Terms

- **Git available**: the local `git` command is usable on the user's machine.
- **Trama-managed project content**: `book/`, `outline/`, `lore/`, `res/`, and root `.trama.index.json`.
- **Snapshot**: a Git commit created by Trama for Trama-managed project content.
- **Revision**: a committed historical state of a document.
- **Current document state**: the active document content shown above committed revisions. It may be unsaved, saved-but-uncommitted, or identical to the latest revision.

## Availability

- Hide **Save Snapshot** and **See Revisions** when the Git CLI is unavailable.
- Show both actions when the Git CLI is available, even if the project is not yet inside a Git repository.
- If the project is inside a parent Git repository, use that repository and do not initialize a nested repository.
- If the project is not inside any Git repository, **Save Snapshot** asks for confirmation to initialize a repository at the Project root, then creates the snapshot.
- **See Revisions** in a non-repository project opens the rail with only Current and a message that saving a snapshot starts revision history.

## Save Snapshot

- **Save Snapshot** is exposed in the Import/Export section.
- The action first flushes and saves all dirty open editor panes. If this save fails, the snapshot is aborted.
- The snapshot stages only Trama-managed project content, respecting `.gitignore`.
- Include tracked, modified, deleted, and untracked files under `book/`, `outline/`, `lore/`, `res/`, plus root `.trama.index.json` when not ignored.
- Do not force-add ignored files, including `.trama.index.json` if ignored.
- Do not stage or commit unrelated files outside Trama-managed project content.
- If unrelated changes are already staged, abort with a clear message instead of mixing them into the snapshot.
- If only ignored managed files changed, report that there are no Trama changes to snapshot.
- Use a fixed timestamped commit message: `Trama snapshot: YYYY-MM-DD HH:mm` in local time.
- Commit directly on the current `HEAD`, including detached `HEAD`.
- Let `git commit` fail naturally when author identity or other Git configuration is missing, and show a friendly error. Trama must not mutate Git config.
- Block snapshot creation during active merge, rebase, cherry-pick, or bisect states.
- If a revision rail is open, refresh it after a successful snapshot and reselect Current.

## See Revisions

- **See Revisions** is exposed in the rich text editor context menu when Git is available.
- In split-pane mode, the command targets the pane where the context menu was opened.
- The revisions rail opens inside the owning pane as a right-side rail.
- Invoking **See Revisions** again for the same pane/document toggles the rail closed; invoking it for another pane/document opens or focuses the relevant rail.
- Rail state is session-only and does not persist across app restarts.
- The rail uses a fixed width in V1, with responsive collapse or overlay behavior on narrow panes if needed.
- The rail loads a bounded first page of 100 revisions and provides **Load more** for older entries.
- Revisions are ordered using Git `--date-order`, newest first, with Current always at the top.
- Revisions include only commits where the current document changed.
- Rename history should be followed where practical.
- Deletion commits are not shown in V1 because they are not previewable document revisions.
- If a document is new and has never been committed, the rail shows only Current changes.
- Revision rows show only local date and time in the UI. Commit message and SHA may exist in internal responses for diagnostics but are not shown in V1.

## Current Row

- Current always appears at the top of the revision list.
- Label it **Current changes** when it differs from the latest listed revision.
- Label it **Current** when it matches the latest listed revision.
- Difference is not limited to unsaved editor changes; saved-but-uncommitted disk changes also count.
- Opening the rail flushes pending editor serialization into pane state without saving to disk or Git so Current matches what the user sees.
- For an open document, Current is based on in-memory pane state after flush. For a closed document, Current can be read from disk.

## Preview

- Selecting a revision previews the full document content in the active rich text editor area.
- Preview uses the same rich editor component with an explicit read-only preview mode, not the generic disabled/no-file state.
- Preview must allow text selection, normal Copy, Copy as Markdown, find, navigation controls that are safe, and zoom.
- Preview must block editing and mutation commands, including save, revert, formatting, image insert, layout directives, paste, Paste Markdown, smart typography, and direct typing.
- Preview changes must not enter the editor undo/redo stack.
- Preview content is loaded from Git raw markdown and passed through the same read-time hydration/parsing behavior used for normal documents.
- Historical `res/*.png` image links should resolve from the selected commit first, falling back to the current working tree only for preview if the image is missing from the commit.
- While previewing, selecting another document or using pane Back/Forward exits revision preview and loads the new document normally.
- The context menu in preview should still show Copy plus revision controls, while mutation commands are hidden or disabled.

## Load This Revision

- The selected revision exposes **Load this revision**.
- Loading a revision shows a confirmation dialog because it overwrites current document content and may overwrite referenced `res/*.png` files.
- The action can overwrite unsaved editor changes after confirmation; it does not require saving first.
- Loading a revision restores the entire markdown file, including historical frontmatter.
- Loading a revision restores only the `res/*.png` files referenced by the selected document revision and present in that commit.
- Loading a revision does not delete current `res/` files that are not referenced by the selected revision.
- If restoring a referenced historical image overwrites an existing file at the same `res/*.png` path, overwrite it.
- If a referenced historical image is missing from Git, do not fall back to current working-tree assets during load; existing broken-image behavior should handle the missing asset.
- Loading a revision must not rename the document file.
- Loading a revision must not full-reconcile `.trama.index.json` or modify corkboard order.
- Loading a revision must update only the restored document's index cache entry so frontmatter metadata remains consistent with current code behavior.
- Loading a revision leaves the restored document and images as uncommitted working-tree changes; it does not automatically create a Snapshot.
- After loading, keep the rail open and select Current changes.
- Allow load even when unrelated files outside Trama-managed content have changes.
- Allow load even when other Trama-managed files have uncommitted changes, as long as they are not the active document or overwritten referenced images.
- Block load during active merge, rebase, cherry-pick, or bisect states.

## Acceptance Criteria

- Git actions are hidden when the Git CLI is unavailable.
- Save Snapshot commits only Trama-managed project content and respects `.gitignore`.
- Save Snapshot never commits unrelated staged files.
- Save Snapshot can initialize a new repository at the Project root after user confirmation.
- See Revisions works before the first snapshot and shows only Current changes.
- The revision rail targets the context-clicked pane in split mode.
- Current distinguishes unsaved editor changes from saved-but-uncommitted Git changes.
- Preview is rich, read-only, selectable, copyable, and non-mutating.
- Loading a revision restores exact document markdown plus referenced historical images present in Git.
- Loading a revision updates current editor state and index cache without creating a commit.
