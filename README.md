# Trama ✍️

A file-first desktop application for writers and worldbuilders, built with Electron, Preact, and Tailwind CSS.

Trama is designed for managing long-form manuscripts and complex lore through a local-first philosophy, using standard Markdown files with YAML frontmatter.

## 🚀 Features

### ✅ Currently Implemented
-   **File-First Architecture**: Your data stays in your folders. Trama works directly with the local file system.
-   **Semantic Project Tree**: A specialized sidebar designed for writers with distinct sections for Manuscripts, Lore, Characters, Locations, and more.
-   **Markdown Editor**: A rich editing experience with full Markdown support and YAML frontmatter integration.
-   **Focus Mode & Fullscreen**: Zero-distraction writing environment with specialized focus rendering.
-   **Appearance**: Support for both **Light and Dark themes**.
-   **Split Pane Workspace**: Multi-pane support to keep your notes and manuscript side-by-side.
-   **Smart Conflict Resolution**: Built-in watcher detects external changes and helps resolve edit conflicts.

### ⏳ Planned / In Progress
-   **Wiki-style Linking**: Cross-reference your lore world using `[[Links]]` with real-time autocompletion.
-   **IA-Ready Workflow**: Structured export and import tools specifically designed for seamless communication with LLMs.
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

## 📄 License

GPL-3.0-or-later - see the [LICENSE](LICENSE) file for details.
