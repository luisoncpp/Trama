# **Trama \- Technical Design Specification**

## **1\. Problem Summary and Objectives**

**Trama** is a local, "File-First" desktop application designed for writers and worldbuilders. Its primary goal is to provide a seamless environment for managing long-form manuscripts and complex lore. The application relies entirely on standard local files (Markdown \+ YAML Frontmatter) to prevent vendor lock-in, seamlessly integrate with cloud syncing services (like Google Drive), and provide specialized tools for AI-assisted writing workflows.

### **Core Objectives:**

* **File-First Architecture:** No proprietary databases. The file system is the source of truth.  
* **AI Interoperability:** Custom clipboard-based import/export logic to easily feed context to LLMs and ingest generated content.  
* **Performance:** Fluid UI for large projects through in-memory indexing.  
* **Visual Organization:** Corkboard and tree views utilizing a hidden index to maintain custom sorting without altering physical file names.

## **2\. Technology Stack and Justification**

* **Runtime / Container:** Electron.js. Chosen for its native file system access via Node.js APIs, allowing for direct read/write operations and file watching.  
* **Frontend Framework:** Preact (with preact/compat if needed). Chosen for its incredibly small bundle size and fast rendering, critical for complex tree and corkboard views.  
* **Styling:** Tailwind CSS. Enables rapid UI development and easy implementation of native-feeling Dark/Light modes.  
* **Data Storage:** .md (Markdown) files with YAML frontmatter.  
* **File Watching:** chokidar (Node.js library). More reliable than native fs.watch for handling Google Drive sync events and external file changes.  
* **Markdown Parsing:** remark/rehype ecosystem. Highly extensible for handling custom wiki-links (\[\[Link\]\]) and YAML extraction.

## **3\. Data Modeling**

### **3.1. File System Structure**

/MyProject  
  ├── /Manuscript  
  │     └── /Act\_1  
  │           ├── /Chapter\_01  
  │           │     ├── 01\_scene\_intro.md  
  │           │     └── 02\_scene\_incident.md  
  │           └── /Chapter\_02  
  │                 └── 01\_scene\_resolution.md  
  ├── /Lore  
  │     └── selene.md  
  ├── /Outlines              \<-- High-level planning, beat sheets, and synopses  
  │     └── main\_plot.md  
  ├── /Templates  
  │     └── \_char\_template.md  
  ├── /Assets                \<-- Auto-managed folder for pasted images  
  │     └── img\_1684392.png  
  └── .trama.index.json      \<-- Hidden index for custom ordering & metadata caching

### **3.2. TypeScript Interfaces**

// Represents the YAML Frontmatter structure  
interface DocumentMeta {  
  id: string;  
  type: 'character' | 'location' | 'scene' | 'note' | 'outline';  
  name: string;  
  tags?: string\[\];  
  \[key: string\]: any; // Allow custom user-defined fields  
}

// Represents an item in the File Tree / Corkboard  
interface TreeItem {  
  id: string;         // Unique ID from frontmatter (or generated)  
  title: string;      // Display title  
  path: string;       // Relative path to the .md file  
  type: 'file' | 'folder';  
  children?: TreeItem\[\];  
}

// Structure of the hidden .trama.index.json  
interface ProjectIndex {  
  version: string;  
  corkboardOrder: Record\<string, string\[\]\>; // FolderPath \-\> Array of File IDs  
  cache: Record\<string, DocumentMeta\>;      // FilePath \-\> Frontmatter (for fast startup)  
}

## **4\. Logic Flow**

### **4.1. Application Startup & Indexing**

1. User opens a project folder in Trama.  
2. Main Process (Node) recursively scans the directory, ignoring .git and Assets.  
3. Node parses the .trama.index.json (if it exists) to establish visual order.  
4. Node parses the YAML frontmatter of the Markdown files to build an in-memory cache.  
5. The memory representation is sent to the Renderer (Preact) via IPC (Inter-Process Communication).  
6. Preact renders the Sidebar (Tree) and Corkboard based on the index order.

### **4.2. External File Changes (Google Drive Sync)**

1. chokidar watches the project directory for change events.  
2. If fileX.md changes, the Main Process alerts the Renderer.  
3. Renderer checks if fileX.md is currently active in the editor.  
   * **If active & has NO unsaved changes:** Auto-reload the content seamlessly.  
   * **If active & HAS unsaved changes:** Show a subtle UI banner: "This file was modified externally. \[Reload and lose changes\] or \[Save as copy\]".  
   * **If not active:** Update the background cache silently.

### **4.3. Image Handling (Paste & Export)**

* **Paste Event:** When a user pastes an image, Preact intercepts it. The image buffer is sent to Node. Node saves it to /Assets/timestamp.png. Preact inserts \!\[Image\](../Assets/timestamp.png) into the editor.  
* **AI Export:** When exporting to clipboard, Node reads the selected .md files. A RegEx finds \!\[...\](path). Node reads the local image, converts it to data:image/png;base64,..., and replaces the path in the exported text string before copying to the clipboard.

### **4.4. AI Import (Clipboard Parsing)**

1. User clicks "Import from AI".  
2. App reads clipboard text.  
3. Regex matches \=== ARCHIVO: (.\*?) \===\\n(\[\\s\\S\]\*?)(?==== ARCHIVO:|$).  
4. For each match, Node executes fs.writeFileSync(path, content, 'utf8'). (Silently overwriting as per requirements).  
5. chokidar detects these writes and automatically updates the UI.

## **5\. Edge Cases and Error Handling**

* **Dangling Files in Index:** If a user deletes a file via the OS File Explorer, the .trama.index.json will reference a missing file. *Handling:* During the startup index build, cross-reference index IDs with actual files. Prune missing IDs automatically.  
* **Malformed AI Output:** LLMs might hallucinate the separator or forget the .md extension. *Handling:* Implement robust regex fallbacks and ensure the extracted filepath is sanitized (no invalid OS characters) before writing to disk.  
* **Corrupted Frontmatter:** If a user manually breaks the YAML syntax. *Handling:* The parser should catch the error, fallback to treating the whole file as standard markdown, and display a warning icon next to the file in the sidebar.

## **6\. Implementation Plan**

* **Phase 1: Foundation, Security, and IPC Baseline**  
  * Scaffold Electron, Vite, Preact, and Tailwind.  
  * Configure secure Electron defaults (`nodeIntegration=false`, context isolation enabled) and `contextBridge` API shell.  
  * Establish typed IPC request/response contracts and global error envelope.  
  * **DoD:** App boots, opens shell UI, and can execute at least one round-trip IPC call from renderer to main process.  
  * **Minimum Tests:** App startup smoke test; IPC contract validation test (valid/invalid payload).
* **Phase 2: File System, Indexing, and Core Editing Loop**  
  * Implement project scan, markdown read/write, YAML frontmatter parse/serialize, and `.trama.index.json` reconciliation.  
  * Build sidebar tree + basic markdown editor with autosave and dirty state.  
  * Wire watcher events with `internal` vs `external` change source tagging.  
  * **DoD:** User can open a project, edit a document, autosave to disk, and recover safely from external updates.  
  * **Minimum Tests:** Frontmatter parser unit tests; index reconciliation tests; save/reload conflict integration test.
* **Phase 3: Workspace UX (Split, Dark Mode, Fullscreen)**  
  * Implementation reference: `docs/sidebar-technical-design-and-implementation-plan.md`.  
  * Implement real split-pane layout with persistent panel sizes and active tabs.  
  * Implement dark/light mode toggle with optional system sync.  
  * Implement native fullscreen/focus mode wiring through window APIs.  
  * **DoD:** User can keep editor + notes/wiki side-by-side, switch theme, and enter/exit distraction-free fullscreen mode.  
  * **Minimum Tests:** Layout persistence test; theme persistence test; fullscreen IPC behavior test.
* **Phase 4: Knowledge Layer (Wiki Links and Templates)**  
  * Implement wiki-link parsing, autocomplete, navigation, and backlinks query surface.  
  * Implement template browser and "create from template" flow under `/Templates`.  
  * **DoD:** User can create notes from templates and traverse bidirectional lore references from the editor.  
  * **Minimum Tests:** Wiki-link resolution/backlink tests; template instantiation test (frontmatter + body output).
* **Phase 5: Corkboard and Visual Ordering**  
  * Implement drag-and-drop corkboard cards and folder-scoped ordering.  
  * Persist ordering to `.trama.index.json` and reconcile against file-system mutations.  
  * **DoD:** Corkboard order survives restart and remains resilient after external file add/remove operations.  
  * **Minimum Tests:** DnD ordering persistence test; index reconciliation regression test.
* **Phase 6: AI Interoperability (Import + Dual Export)**  
  * Implement structured clipboard import (`=== ARCHIVO: ... ===`) with robust parsing and path sanitization.  
  * Implement dual export modes: consolidated markdown and LLM-structured export.  
  * Convert linked local images to Base64 asynchronously during AI exports.  
  * **DoD:** User can import multi-file AI output and export either a single compiled manuscript or structured context blocks for LLMs without UI freezes.  
  * **Minimum Tests:** Import parser edge-case tests; consolidated export snapshot test; async image conversion performance test.

## **7\. Technical Risks (Critical Review)**

* **Security Risk (IPC & Markdown):** Because the app renders Markdown and relies on file parsing, there is an XSS (Cross-Site Scripting) vulnerability if we render external, untrusted Markdown files. *Mitigation:* nodeIntegration MUST be set to false in Electron. We must use contextBridge strictly. All rendered HTML from Markdown (if a preview mode is added) must be heavily sanitized using DOMPurify.  
* **Scalability Risk (Index Desync):** The decision to use a hidden .trama.index.json for custom sorting is great for keeping filenames clean, but it introduces a "split brain" problem. If the user heavily reorganizes files using Windows Explorer / macOS Finder, the app's custom order will be lost or corrupted. *Mitigation:* The startup indexing routine must be highly resilient, capable of auto-appending new files to the end of the custom order and silently dropping deleted files.  
* **Performance Risk (Base64 Export):** While converting images to Base64 on export is required for AI context, doing this synchronously on the main thread for a manuscript with 50+ high-res images will freeze the UI. *Mitigation:* The export compilation must run asynchronously or in an Electron Web Worker / hidden window to keep the app responsive during the export process.

## **8\. Detailed Technical Architecture**

This section defines a stricter responsibility split to avoid "god services" and support iterative delivery. The architecture keeps the file system as source of truth while exposing stable IPC contracts to the UI.

### **8.1. Main Process (Node.js) Modules**

* **DocumentRepository (Singleton)**  
  * *Responsibilities:* Read/write/delete/rename Markdown files. Parse and serialize YAML frontmatter. Provide canonical path resolution and safe write operations.  
  * *Non-responsibilities:* Does not manage indexing order, file watching, clipboard, or UI events.  
  * *Lifecycle:* Created on app startup and reused across projects.
* **ProjectScanner (Stateless Service)**  
  * *Responsibilities:* Recursively scan project directories, filter ignored paths (.git, node_modules, binary/temp files), and return normalized file/folder trees.  
  * *Non-responsibilities:* Does not read/write index files.  
  * *Lifecycle:* Called during project load and explicit refresh.
* **IndexService (Project-Scoped Singleton)**  
  * *Responsibilities:* Read/write/reconcile .trama.index.json. Maintain corkboard ordering and metadata cache. Prune dangling entries and append newly discovered files.  
  * *Non-responsibilities:* Does not perform direct markdown file I/O beyond cache hydration needs.  
  * *Lifecycle:* Re-created when switching project roots.
* **AssetService (Singleton)**  
  * *Responsibilities:* Persist pasted images under /Assets, generate deterministic names, validate file type/size, and resolve asset references.  
  * *Non-responsibilities:* Does not transform whole exports for AI.
* **WikiGraphService (Project-Scoped Singleton)**  
  * *Responsibilities:* Parse wiki-links ([[Name]]), resolve targets, and maintain backlinks index for navigation/autocomplete/tooltips.  
  * *Non-responsibilities:* Does not render markdown UI.
* **AIInteropService (Singleton)**  
  * *Responsibilities:* Parse "Import from Clipboard" blocks, sanitize destination paths, batch file updates, and produce both export formats: consolidated markdown and structured delimiter format for LLMs.  
  * *Non-responsibilities:* Does not directly watch file changes.
* **WatcherService (Project-Scoped Singleton)**  
  * *Responsibilities:* Wrap chokidar, debounce bursts, classify event source (internal write vs external sync), and emit normalized events.  
  * *Non-responsibilities:* Does not apply business decisions in UI state.
* **WindowStateService (Singleton)**  
  * *Responsibilities:* Handle native fullscreen transitions, window events, and persistence hooks needed by layout/theme preferences.  
  * *Non-responsibilities:* Does not store renderer state itself.
* **IPCController (Singleton)**  
  * *Responsibilities:* Own all ipcMain handlers and event channels. Validate payload schemas, authorize path access, route to services, and return typed responses/errors.  
  * *Non-responsibilities:* No business logic beyond orchestration.

### **8.2. Renderer Process (Preact) Modules**

* **ProjectStore (Global State)**  
  * *Responsibilities:* Active project, tree data, open documents, dirty flags, and current ProjectIndex snapshot.
* **LayoutStore (Global UI State)**  
  * *Responsibilities:* Split-pane configuration, active panels, focus mode, fullscreen state mirror, and persisted layout presets.
* **ThemeController (Hook/Service)**  
  * *Responsibilities:* Dark/light mode toggling, system-theme sync, and CSS token application.
* **WorkspaceController (Component/Hook)**  
  * *Responsibilities:* Compose Sidebar, Editor panes, Corkboard, and preview surfaces; bind routing/view mode to LayoutStore.
* **EditorController (Hook/Class)**  
  * *Responsibilities:* Editor lifecycle (CodeMirror/Textarea), local edits, autosave debounce, paste interception routing (text/image), and conflict prompts.
* **WikiLinkController (Hook/Service)**  
  * *Responsibilities:* Link autocomplete, hover tooltip queries, click navigation, and backlink panel hydration from IPC APIs.
* **TemplateController (Hook/Service)**  
  * *Responsibilities:* Load templates from /Templates, render creation dialog, instantiate documents with initial frontmatter/body.
* **CorkboardController (Hook)**  
  * *Responsibilities:* Drag-and-drop ordering and grouping behavior; request order persistence through index APIs.
* **ExportController (Hook/Service)**  
  * *Responsibilities:* UI flow for selecting scope and export mode (consolidated vs LLM-structured), progress and cancellation UX.

### **8.3. IPC Contract Surface (MVP)**

All IPC APIs are exposed via contextBridge (`window.api`) and use runtime schema validation.

* **Project APIs**  
  * `openProject(rootPath)` -> `ProjectSnapshot`  
  * `refreshProject()` -> `ProjectSnapshot`
* **Document APIs**  
  * `readDocument(path)` -> `{ content, meta }`  
  * `saveDocument(path, content, meta?)` -> `{ ok, version }`  
  * `createFromTemplate(templatePath, destinationPath, variables?)` -> `{ path }`
* **Index APIs**  
  * `getIndex()` -> `ProjectIndex`  
  * `updateCorkboardOrder(folderPath, orderedIds)` -> `{ ok }`
* **Wiki APIs**  
  * `resolveWikiLink(query, fromPath)` -> `LinkTarget[]`  
  * `getBacklinks(path)` -> `BacklinkRef[]`
* **AI Interop APIs**  
  * `importFromClipboard(payload)` -> `{ created, updated, skipped, errors }`  
  * `exportStructured(paths, options)` -> `{ text }`  
  * `exportConsolidated(paths, options)` -> `{ markdown }`
* **Asset APIs**  
  * `savePastedImage(buffer, mimeType, contextPath)` -> `{ assetPath, markdownTag }`
* **Window/UI APIs**  
  * `setFullscreen(enabled)` -> `{ enabled }`  
  * `onExternalFileEvent(callback)` -> stream of normalized watcher events

### **8.4. Editing Loop and Conflict Resolution**

1. **Edit Start:** User types in an editor pane; `ProjectStore` marks document dirty immediately.  
2. **Autosave Debounce:** `EditorController` calls `saveDocument` after inactivity window.  
3. **Version Stamp:** Main process persists content and returns a write version/timestamp.  
4. **Watcher Event:** `WatcherService` emits change events with `source=internal|external`.  
5. **Internal Write Handling:** Renderer ignores matching internal events to prevent save loops.  
6. **External Change Handling:**  
   * If document is clean: silent reload.  
   * If dirty: show non-destructive conflict banner with actions: reload, compare, save as copy.

### **8.5. Runtime Flows for Missing MVP Features**

* **Dark Mode:** `ThemeController` toggles theme tokens and persists preference; optional system sync fallback.  
* **Fullscreen / Focus Mode:** Renderer requests `setFullscreen(true|false)` and updates `LayoutStore` for distraction-free writing.  
  * **Operational definition (Focus Mode):**
    * Focus Mode is renderer-local UI state (not a native window mode).
    * Entering Focus Mode minimizes non-essential chrome: collapses/hides sidebar panel content, de-emphasizes secondary controls, and keeps editor surface primary.
    * Focus Mode includes a text emphasis scope around the caret, inspired by Scrivener-style behavior:
      * `line`: emphasize current line, dim surrounding text.
      * `sentence`: emphasize current sentence, dim surrounding text.
      * `paragraph`: emphasize current paragraph, dim surrounding text.
    * Dimming is visual-only (no text mutation) and follows caret movement while typing or editing.
    * If scope detection is ambiguous (rich text boundaries), fallback to `paragraph` to avoid erratic highlighting.
    * Core safety UI remains visible: save/sync state, external-change conflict banner, and conflict actions.
    * Focus Mode must be reversible with no data loss and no document reassignment side effects.
    * Fullscreen and Focus Mode are independent toggles: either can be enabled alone, or both together.
    * Preference is persisted in layout settings and restored on startup.
* **Real Split Workspace:** `LayoutStore` persists panel count, sizes, and pinned documents so users can keep editor + notes/wiki side-by-side.

### **8.6. Boundaries and Scaling Notes**

* Use async pipelines for heavy exports and image base64 conversion to avoid blocking the Electron main thread.  
* Keep markdown rendering sanitized (DOMPurify) and disable nodeIntegration in renderer.  
* Avoid service coupling by depending on interfaces (`IDocumentRepository`, `IIndexService`, etc.) so modules can be tested in isolation.