import { useState } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ProjectMenuProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  onPickFolder: () => void
}

interface SidebarHeaderProps {
  count: number
  menuOpen: boolean
  onToggle: () => void
}

interface FileListPanelProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  onPickFolder: () => void
}

function ProjectMenu({ apiAvailable, loadingProject, rootPath, statusMessage, onPickFolder }: ProjectMenuProps) {
  return (
    <div class="project-menu">
      <p class="project-menu__path">{rootPath || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      <button
        type="button"
        onClick={onPickFolder}
        disabled={loadingProject || !apiAvailable}
        class="editor-button editor-button--primary project-menu__open-btn"
      >
        {loadingProject ? PROJECT_EDITOR_STRINGS.opening : PROJECT_EDITOR_STRINGS.openFolder}
      </button>
      <p class="project-menu__status">{statusMessage}</p>
    </div>
  )
}

function SidebarHeader({ count, menuOpen, onToggle }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <div>
        <p class="workspace-panel__eyebrow">Proyecto</p>
        <h2 class="workspace-panel__title">{PROJECT_EDITOR_STRINGS.markdownFilesTitle}</h2>
      </div>
      <div class="sidebar-controls">
        <span class="workspace-panel__count">{count}</span>
        <button
          type="button"
          class={`sidebar-menu-btn ${menuOpen ? 'is-open' : ''}`}
          onClick={onToggle}
          aria-label="Configuracion del proyecto"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}

export function FileListPanel({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  apiAvailable,
  loadingProject,
  rootPath,
  statusMessage,
  onPickFolder,
}: FileListPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <aside class="workspace-panel workspace-panel--sidebar">
      <SidebarHeader
        count={visibleFiles.length}
        menuOpen={menuOpen}
        onToggle={() => setMenuOpen((o) => !o)}
      />
      {menuOpen && (
        <ProjectMenu
          apiAvailable={apiAvailable}
          loadingProject={loadingProject}
          rootPath={rootPath}
          statusMessage={statusMessage}
          onPickFolder={onPickFolder}
        />
      )}
      <div class="file-tree">
        {visibleFiles.map((filePath) => (
          <button
            key={filePath}
            type="button"
            onClick={() => onSelectFile(filePath)}
            disabled={loadingDocument}
            class={`file-tree__item ${selectedPath === filePath ? 'is-active' : ''}`}
          >
            <span class="file-tree__item-label">{filePath}</span>
          </button>
        ))}
        {visibleFiles.length === 0 && (
          <p class="file-tree__empty">{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>
        )}
      </div>
    </aside>
  )
}
