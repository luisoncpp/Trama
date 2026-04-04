import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { SidebarTree } from './sidebar-tree.tsx'

function SelectProjectFolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6.5Z" />
      <path d="M8 13h8" />
      <path d="M12 9v8" />
    </svg>
  )
}

interface SidebarHeaderProps {
  title: string
  count: number
  apiAvailable: boolean
  loadingProject: boolean
  onPickFolder: () => void
}

interface SidebarExplorerContentProps {
  title: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  apiAvailable: boolean
  loadingProject: boolean
  scopePathLabel: string
  onPickFolder: () => void
}

function SidebarHeader({ title, count, apiAvailable, loadingProject, onPickFolder }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <div>
        <p class="workspace-panel__eyebrow">{title}</p>
      </div>
      <div class="sidebar-controls">
        <span class="workspace-panel__count">{count}</span>
        <button
          type="button"
          class="sidebar-menu-btn"
          onClick={onPickFolder}
          disabled={loadingProject || !apiAvailable}
          aria-label="Select Project Folder..."
          title="Select Project Folder..."
        >
          <SelectProjectFolderIcon />
        </button>
      </div>
    </div>
  )
}

export function SidebarExplorerContent({
  title,
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  apiAvailable,
  loadingProject,
  scopePathLabel,
  onPickFolder,
}: SidebarExplorerContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <SidebarHeader
          title={title}
          count={visibleFiles.length}
          apiAvailable={apiAvailable}
          loadingProject={loadingProject}
          onPickFolder={onPickFolder}
        />
        <p class="project-menu__path">{scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
        <SidebarTree
          visibleFiles={visibleFiles}
          selectedPath={selectedPath}
          loadingDocument={loadingDocument}
          onSelectFile={onSelectFile}
        />
      </aside>
    </div>
  )
}
