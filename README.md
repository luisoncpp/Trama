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
-   **Appearance**: Support for **Light, Dark, and System** themes.
-   **AI Import / Export**: Structured clipboard import and multi-file export flows for working with LLMs without leaving the file-first model.
-   **Paste Markdown**: Convert Markdown from the clipboard directly into the rich editor.
-   **Wiki Tag Navigation**: Tag index refreshes after saves so Ctrl/Cmd+Click tag navigation remains reliable.
-   **Smart Conflict Resolution**: Built-in watcher detects external changes and helps resolve edit conflicts.

### ⏳ Planned / In Progress
-   **Folder Operations**: Safer folder rename, delete, and move workflows are planned for a later phase.
-   **Corkboard View**: Drag-and-drop cards for planning and reorganizing scenes or ideas.
-   **Project Templates**: Pre-defined schemas for characters, locations, and world-building notes.

## 🛠️ Tech Stack

-   **Backend**: [Electron](https://www.electronjs.org/) (Node.js for native FS access)
-   **Frontend**: [Preact](https://preactjs.com/) + [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Editor**: [Quill](https://quilljs.com/) (Custom Markdown integration)
-   **Validation**: [Zod](https://zod.dev/) for IPC contracts

## 📦 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Project uses `package.json` with ESM)
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/trama.git
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

### 📂 Creating Your Project Structure
To use Trama, you should point it to a project directory. Trama recognizes the following semantic structure to organize your manuscript and lore:

```text
/MyProject
  /book/     (Manuscript scenes and chapters)
  /lore/     (Worldbuilding notes, characters, etc.)
  /outline/  (Planning documents)
```

You can use the example project located in [example-fantasia](example-fantasia) as a reference for the expected folder layout.

### Testing

Run the test suite (Vitest):
```bash
npm run test
```

In agent or sandboxed environments, prefer the PowerShell runner:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-tests.ps1
```

In VS Code you can also run the task `Run Tests & Report`, which writes the output to `reports/test-report.txt`.

For smoke tests (requires build):
```bash
npm run test:smoke
```

### Building

To create a production-ready Windows installer:
```bash
npm run dist:win
```

## 📂 Project Structure

-   `electron/`: Main process and IPC handlers (TypeScript).
-   `src/`: Preact renderer source code.
    -   `features/`: Domain-driven feature modules (Editor, Sidebar, Project logic).
    -   `shared/`: Shared types and constants between Main and Renderer.
-   `docs/`: Design specifications, implementation plans, and lessons learned.
-   `tests/`: Comprehensive test suite (Unit, Integration, and Smoke tests).

## 🧭 Developer Documentation Entry

If you are starting a new implementation conversation, begin with:

-   [docs/START-HERE.md](docs/START-HERE.md)

This entrypoint routes to the mandatory docs that are often missed:
-   [docs/current-status.md](docs/current-status.md)
-   [docs/file-map.md](docs/file-map.md)
-   [docs/lessons-learned/README.md](docs/lessons-learned/README.md)
-   [docs/dev-workflow.md](docs/dev-workflow.md)

## 📄 License

GPL-3.0-or-later - see the [LICENSE](LICENSE) file for details.
