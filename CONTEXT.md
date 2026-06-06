# Trama Context

Trama is a file-first desktop writing tool where a project is an opened folder containing writing documents and project metadata.

## Language

**Staging Basket**:
The transient UI collection tracking project-relative file paths actively selected by a user for data collection or processing during an export or batch session.
_Avoid_: Selection queue, download cart

**Relative Path Hardening**:
The validation pipeline that intercepts absolute operating system file paths returned by native picker dialogs, enforces that they reside within the current project root workspace directory, strips the absolute prefix, and filters out non-project or irrelevant system files.
_Avoid_: Path cleaning, absolute resolution

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

**Map Document**:
A writing document of type `map` stored as a standard `.md` file, whose metadata configuration (frontmatter) defines a background image and interactive points (markers) with destination tag links, and whose contents are rendered visually as an interactive zoomable/pannable map layer instead of a text editor.
_Avoid_: JSON document, standalone image map

**Pane exit**:
Leaving the current document state of one editor pane. A **Pane exit** may require saving or discarding unsaved changes before Trama switches pane focus, opens another document in that pane, closes the window, or prepares project-wide operations like a **Snapshot**.
_Avoid_: Safe exit, pane transition guard

**Git available**:
The user's machine has a usable local Git command. This does not imply GitHub, a remote, authentication, network access, cloud sync, or that the opened **Project** is already inside a Git repository.
_Avoid_: GitHub available

**Git repository available**:
The opened **Project** is either inside an existing local Git repository or can be initialized as one after explicit user confirmation.
_Avoid_: GitHub available

## Book export

**Author page break**:
An explicit layout directive in exported manuscript markdown (`<!-- trama:pagebreak -->` or equivalent HTML form) that requires the following content to begin on a new printed page. It is not inferred from folder structure or document boundaries.
_Avoid_: Chapter break, automatic pagination break

**PDF export segment**:
A contiguous span of book export content between two **Author page break** boundaries (or from start/end of the manuscript). Each segment is rendered to HTML and then to PDF separately; concatenating segment PDFs reproduces **Author page break** positions in the final document.
_Avoid_: Chapter, chunk (parallelism), page

**Inter-document gap**:
The standard vertical separation between two corkboard-ordered export documents when the earlier one did not end with an **Author page break**. Book export uses the equivalent of two blank body lines at that boundary.
_Avoid_: Chapter break, section break

**PDF segment merge**:
Combining **PDF export segment** print outputs into one file by loading each segment PDF once, copying its pages into a single in-memory document, and saving once. The merge must not save and reload the growing book between segments (that would re-copy earlier pages and scale quadratically).
_Avoid_: Pairwise rebuild merge, matrix-chain merge (unless disk-backed merge is added later)

**Book export PDF typography**:
Printed book PDFs use Times New Roman (with reasonable fallbacks) for body and headings. Layout may differ from legacy pdf-lib output; correctness means structure, directives, images, and breaks — not pixel-identical pages.
_Avoid_: Matching old pdf-lib metrics exactly

**Book export print surface**:
The hidden Electron `BrowserWindow` used only for `printToPDF` during book export. One process-wide singleton serializes export jobs; tests may replace it with a mock `WebContents` via injection.
_Avoid_: Main editor window, per-segment window

**Segment print document**:
The temporary HTML file written for one **PDF export segment** before `printToPDF`. Removed after the segment PDF is produced (or when the export job’s temp directory is cleaned up).
_Avoid_: Final export file, preview HTML

## Help

**Help menu**:
The native application menu section that exposes user-assistance actions. It is not part of the workspace UI and does not use in-app highlights or coach marks.
_Avoid_: Onboarding overlay, context menu

**Getting Started**:
The bundled static HTML guide that introduces Trama's workspace to end users. It is shipped inside the application package and shown offline.
_Avoid_: README setup instructions, developer docs

**Help window**:
A child `BrowserWindow` that loads bundled help HTML via `loadFile()`. It is separate from the main workspace window and is not an embedded `<webview>` in the editor shell.
_Avoid_: Modal dialog, in-app panel, docs website tab

**Getting Started dismissal**:
The user's choice to stop auto-opening the **Getting Started** page after their first successful **Project** open. Stored in app preferences; does not block manual access from the **Help menu**.
_Avoid_: Permanent help block, onboarding completion trophy

**Help theme sync**:
The **Help window** adopts the same resolved light or dark theme as the main workspace when it opens, not a fixed palette or OS-only preference.
_Avoid_: Independent help theme, always-light docs

**Getting Started dismissal persistence**:
The **Getting Started dismissal** flag is stored in the main workspace renderer's app preferences, not in the **Help window**'s isolated storage. The Help page signals dismissal through a minimal preload bridge and IPC.
_Avoid_: Help-window localStorage, main-process preference file (for this flag)

**Getting Started guide tiers**:
The primary **Getting Started** page covers project basics and workspace power features for first-time readers. Advanced product capabilities live on separate help pages linked from a Learn more section, still within the same **Help window** site.
_Avoid_: Single scroll-all guide, in-app coach marks

**Advanced help page**:
A bundled HTML page documenting one advanced product capability (maps, wiki tag links, AI import/export, book export, or Git snapshots). Each **Advanced help page** is its own file, not a grouped chapter.
_Avoid_: Combined advanced guide, external docs link (for v1)

**Help screenshot asset**:
A PNG captured from the live Electron workspace by `npm run help:screenshots` and referenced from bundled help HTML under `help/en/assets/`.
_Avoid_: Manual crop outside the app, runtime screenshot API for end users

## Flagged ambiguities

**Chapter (in export conversations)**:
Colloquial label for book-tree material (a single markdown file or a folder of sections). Trama does not define a canonical **Chapter** entity for export; corkboard-ordered documents and **Author page break** directives define structure instead.
_Avoid_: Assuming one markdown file equals one chapter

## Example Dialogue

Developer: Should Trama show the snapshot action for this project?

Domain expert: Only if Git is available for the opened project. The action creates a project Snapshot, not a cloud backup.

Developer: When viewing one document's history, should unsaved edits appear?

Domain expert: Yes. The current unsaved state appears above saved Revisions, but it is not a Snapshot until the user saves one.

Developer: Does "current changes" always mean unsaved editor text?

Domain expert: No. Unsaved changes are not the same as uncommitted changes; the current document state may already be saved to disk but not committed to Git.

Developer: When exporting several book files with no pagebreak between them, should HTML leave no gap?

Domain expert: No. Every book format should apply the **Inter-document gap** unless an **Author page break** already ended the prior document. If HTML export skips that gap, treat it as a bug, not the standard.
