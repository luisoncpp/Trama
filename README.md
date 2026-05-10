# Trama ✍️

A file-first desktop application for writers and worldbuilders, built with Electron, Preact, and Tailwind CSS.

Trama is designed for managing long-form manuscripts and complex lore through a local-first philosophy, using standard Markdown files with YAML frontmatter.

## 🚀 Features

### ✅ Currently Implemented
-   **File-First Architecture**: Your data stays in your folders. Trama works directly with the local file system.
-   **Semantic Project Tree**: A specialized sidebar designed for writers with distinct sections for Manuscripts, Lore, Characters, Locations, and more.
-   **Rich Markdown Editor**: A Quill-based editing experience with full Markdown persistence, YAML frontmatter integration, and inline find.
-   **Split Pane Workspace**: Multi-pane support to keep notes, lore, and manuscript side-by-side.
-   **Focus Mode & Fullscreen**: Zero-distraction writing environment with native fullscreen and configurable line, sentence, or paragraph focus scope.
-   **Document Zoom**: Zoom in/out via Ctrl++/Ctrl+- shared across twin panes.
-   **Appearance**: Support for **Light, Dark, and System** themes.
-   **AI Import / Export**: Structured clipboard import and multi-file export flows for working with LLMs without leaving the file-first model.
-   **Paste Markdown**: Convert Markdown from the clipboard directly into the rich editor.
-   **Wiki Tag Navigation**: Tag index refreshes after saves so Ctrl/Cmd+Click tag navigation remains reliable.
-   **Smart Conflict Resolution**: Built-in watcher detects external changes and helps resolve edit conflicts.
-   **Folder Operations**: Safe rename, delete, and move workflows with subtree tracking and index reconciliation.
-   **Drag-and-Drop Reorder**: Reorder files and move them between folders with visual drop indicators and corkboard order persistence.
-   **Book Export**: Multi-format export (Markdown, HTML, DOCX, EPUB, PDF) with layout directives and image support.
-   **ZuluPad Import**: Import ZuluPad `.zulu` documents into your project structure.
-   **Spellcheck**: Configurable spellcheck with language selection and optimistic UI sync.

### ⏳ Planned / In Progress
-   **Project Templates**: Pre-defined schemas for characters, locations, and world-building notes.

### ❌ Cancelled
-   **Corkboard View**: Drag-and-drop cards for planning and reorganizing scenes or ideas.

## 🛠️ Tech Stack

-   **Backend**: [Electron](https://www.electronjs.org/) 41.x (Node.js for native FS access)
-   **Frontend**: [Preact](https://preactjs.com/) 10.x + [Vite](https://vitejs.dev/) 8.x
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4.x
-   **Editor**: [Quill](https://quilljs.com/) 2.x (Custom Markdown integration)
-   **Validation**: [Zod](https://zod.dev/) 3.x for IPC contracts
-   **PDF Generation**: [pdf-lib](https://pdf-lib.js.org/) 1.x
-   **DOCX Generation**: [docx](https://docx.js.org/) 9.x
-   **EPUB Generation**: [epub-gen](https://github.com/zipweb/epub-gen) 0.1.x
-   **YAML Parsing**: [yaml](https://eemeli.github.io/yaml/) 2.x

## 📦 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Project uses `package.json` with ESM)
-   npm

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
    -   `ipc/handlers/`: Typed IPC handler modules (project, AI, book export, Zulu).
    -   `services/`: Document repository, index service, watcher, book export pipeline.
-   `src/`: Preact renderer source code.
    -   `features/project-editor/`: Domain-driven feature modules (Editor, Sidebar, Pane workspace).
    -   `shared/`: Shared IPC types and constants between Main and Renderer.
-   `docs/`: Design specifications, architecture docs, implementation plans, and lessons learned.
-   `tests/`: Comprehensive test suite (unit, integration, and smoke tests).

## 🧭 Developer Documentation Entry

If you are starting a new implementation conversation, begin with:

-   [docs/START-HERE.md](docs/START-HERE.md)

This entrypoint routes to the mandatory docs that are often missed:
-   [docs/live/current-status.md](docs/live/current-status.md)
-   [docs/live/file-map.md](docs/live/file-map.md)
-   [docs/lessons-learned/README.md](docs/lessons-learned/README.md)
-   [docs/dev-workflow.md](docs/dev-workflow.md)

## 🤝 Contributing

Contributions are welcome. Please read [docs/dev-workflow.md](docs/dev-workflow.md) for the development workflow, testing requirements, and documentation update protocol.

## 📄 License

GPL-3.0-or-later - see the [LICENSE](LICENSE) file for details.
