# Trama ✍️

A file-first desktop application for writers and worldbuilders, built with Electron, Preact, and Tailwind CSS.

Trama opens a folder on your machine and works directly with standard Markdown files and YAML frontmatter. Your manuscript, outline, and lore stay on disk in formats you can edit anywhere.

## 🚀 Features

### ✅ Currently Implemented

**Project & files**
- **File-first workflow** — Data lives in your folders; Trama reads and writes real `.md` files and keeps `.trama.index.json` in sync.
- **Section sidebar** — Trees scoped to `book/`, `outline/`, and `lore/` with filter, create/rename/delete, and drag-and-drop reorder.
- **Smart conflict handling** — Detects external file changes and helps you resolve edits safely.
- **Git version history** — Save snapshots, browse revisions per document, preview past versions in the editor, and restore when you need to roll back. Local Git on your machine; no remote or account required.

**Editing**
- **Rich Markdown editor** — Quill-based visual editing with Markdown persistence and YAML frontmatter.
- **Split workspace** — Two panes side by side, draggable divider, per-pane back/forward history, and shared zoom.
- **Focus mode & fullscreen** — Distraction-free writing with line, sentence, or paragraph emphasis around the caret.
- **Paste from Markdown** — Clipboard Markdown becomes rich editor content.
- **Smart typography** — Common shortcuts (e.g. `--` → em dash) with undo support.
- **Wiki tag links** — Tag index stays fresh after saves; Ctrl/Cmd+click jumps to linked documents.
- **Images** — Embedded images are stored under project-local `res/` when you save.

**Special document types**
- **Map documents** — Image-based maps with pan/zoom and interactive markers tied to your lore.

**Themes & chrome**
- **Appearance** — Light, dark, and system themes.
- **Context menu** — Workspace actions (split, focus, export, and more) from the native right-click menu.

**Import, export & integrations**
- **AI import / export** — Structured clipboard import (`=== FILE: … ===`) with preview and replace/append modes; export selected project files for LLM workflows, with optional frontmatter stripping.
- **Book export** — Multi-format export (Markdown, HTML, DOCX, EPUB, PDF) with layout directives and images.
- **ZuluPad import** — Bring `.zulu` notes into your project structure.

### ⏳ Planned

- **Project templates** — Pre-defined schemas for characters, locations, and world-building notes.


## 🛠️ Tech Stack

- **Backend**: [Electron](https://www.electronjs.org/) 41.x (Node.js for native FS access)
- **Frontend**: [Preact](https://preactjs.com/) 10.x + [Vite](https://vitejs.dev/) 8.x
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.x
- **Editor**: [Quill](https://quilljs.com/) 2.x (Custom Markdown integration)
- **Validation**: [Zod](https://zod.dev/) 3.x for IPC contracts
- **PDF Generation**: [pdf-lib](https://pdf-lib.js.org/) 1.x
- **DOCX Generation**: [docx](https://docx.js.org/) 9.x
- **EPUB Generation**: [epub-gen](https://github.com/zipweb/epub-gen) 0.1.x
- **YAML Parsing**: [yaml](https://eemeli.github.io/yaml/) 2.x

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Project uses `package.json` with ESM)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/luisoncpp/trama.git
    cd trama
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Run the development server (starts both Vite and Electron):
```bash
npm run dev
```

### Testing

Run the test suite (Vitest):
```bash
npm run test
```

In agent or sandboxed environments, prefer the PowerShell runner:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1
```

For smoke tests (requires build):
```bash
npm run test:smoke
```

### Building

To create a production-ready Windows installer:
```bash
npm run dist:win
```

To build without packaging:
```bash
npm run pack:win
```

## 📂 Project Structure

-   `electron/`: Main process, IPC handlers, and services (TypeScript).
    -   `ipc/handlers/`: Typed IPC handler modules (project, AI, book export, Zulu, Git history).
    -   `services/`: Document repository, index service, watcher, export pipelines.
-   `src/`: Preact renderer source code.
    -   `features/project-editor/`: Domain-driven feature modules (editor, sidebar, pane workspace).
    -   `shared/`: Shared IPC types and constants between main and renderer.
-   `mds/`: Design specifications, architecture docs, implementation plans, and lessons learned.
-   `tests/`: Comprehensive test suite (unit, integration, and smoke tests).

## 🧭 Developer Documentation Entry

If you are starting a new implementation conversation, begin with:

-   [mds/START-HERE.md](mds/START-HERE.md)

This entrypoint routes to the mandatory docs that are often missed:
-   [mds/live/current-status.md](mds/live/current-status.md)
-   [mds/live/file-map.md](mds/live/file-map.md)
-   [mds/lessons-learned/README.md](mds/lessons-learned/README.md)
-   [mds/dev-workflow.md](mds/dev-workflow.md)

## 🤝 Contributing

Contributions are welcome. Please read [mds/dev-workflow.md](mds/dev-workflow.md) for the development workflow, testing requirements, and documentation update protocol.

## 📄 License

GPL-3.0-or-later - see the [LICENSE](LICENSE) file for details.
