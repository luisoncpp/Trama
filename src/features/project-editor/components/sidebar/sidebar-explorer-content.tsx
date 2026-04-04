import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { SidebarTree } from './sidebar-tree.tsx'

interface SidebarHeaderProps {
  count: number
  apiAvailable: boolean
  loadingProject: boolean
  onPickFolder: () => void
}

interface SidebarExplorerContentProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
}

function SidebarHeader({ count, apiAvailable, loadingProject, onPickFolder }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <div>
        <p class="workspace-panel__eyebrow">Proyecto</p>
      </div>
      <div class="sidebar-controls">
        <span class="workspace-panel__count">{count}</span>
        <button
          type="button"
          class="sidebar-menu-btn"
          onClick={onPickFolder}
          disabled={loadingProject || !apiAvailable}
          aria-label="Elegir carpeta del proyecto"
        >
          ⚙
        </button>
      </div>
    </div>
  )
}

export function SidebarExplorerContent({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  apiAvailable,
  loadingProject,
  rootPath,
  onPickFolder,
}: SidebarExplorerContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <SidebarHeader
          count={visibleFiles.length}
          apiAvailable={apiAvailable}
          loadingProject={loadingProject}
          onPickFolder={onPickFolder}
        />
        <p class="project-menu__path">{rootPath || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
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
