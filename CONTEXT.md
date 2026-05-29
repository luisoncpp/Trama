# Trama Context

Trama is a file-first desktop writing tool where a project is an opened folder containing writing documents and project metadata.

## Language

**Project**:
An opened folder that Trama treats as a writing workspace. A **Project** contains documents and project metadata, and may be either the root of a local Git repository or a subfolder inside one.

**Revision**:
A version of a document as seen through project history. A saved **Revision** comes from a Git commit; the current document state is shown alongside saved revisions but is not itself a commit.
_Avoid_: Version, history item

**Current document state**:
The active document content Trama should show at the top of the revision list. It may include unsaved editor changes, saved-but-uncommitted disk changes, or content identical to the latest listed **Revision**.
_Avoid_: Unsaved changes when referring to all uncommitted content

**Unsaved changes**:
Document edits present in Trama's editor state but not yet written to disk.
_Avoid_: Uncommitted changes

**Uncommitted changes**:
Document or project content differences present in the Git working tree but not yet captured in a **Snapshot**.
_Avoid_: Unsaved changes

**Snapshot**:
A user-created Git commit that records the current Trama-managed project content. A **Snapshot** includes known writing sections, image resources, and root project metadata, but excludes unrelated files in the same Git repository.
_Avoid_: Backup, checkpoint

Unrelated staged or unstaged repository changes are not part of a **Snapshot**.

**Trama-managed project content**:
The content Trama owns inside a **Project**: `book/`, `outline/`, `lore/`, `res/`, and the root `.trama.index.json` file.
_Avoid_: Whole repository, whole worktree

**Git available**:
The user's machine has a usable local Git command. This does not imply GitHub, a remote, authentication, network access, cloud sync, or that the opened **Project** is already inside a Git repository.
_Avoid_: GitHub available

**Git repository available**:
The opened **Project** is either inside an existing local Git repository or can be initialized as one after explicit user confirmation.
_Avoid_: GitHub available

## Example Dialogue

Developer: Should Trama show the snapshot action for this project?

Domain expert: Only if Git is available for the opened project. The action creates a project Snapshot, not a cloud backup.

Developer: When viewing one document's history, should unsaved edits appear?

Domain expert: Yes. The current unsaved state appears above saved Revisions, but it is not a Snapshot until the user saves one.

Developer: Does "current changes" always mean unsaved editor text?

Domain expert: No. Unsaved changes are not the same as uncommitted changes; the current document state may already be saved to disk but not committed to Git.
