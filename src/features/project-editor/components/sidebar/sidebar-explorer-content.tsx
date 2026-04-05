import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { SidebarCreateInput } from '../../project-editor-types'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'
import { SidebarFilter } from './sidebar-filter.tsx'
import { SidebarTree } from './sidebar-tree.tsx'
import { useSidebarCreateDialog } from './use-sidebar-create-dialog'

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
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
  onPickFolder: () => void
}

interface SidebarExplorerBodyProps {
  title: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  loadingProject: boolean
  apiAvailable: boolean
  scopePathLabel: string
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  createMode: ReturnType<typeof useSidebarCreateDialog>['createMode']
  createInput: SidebarCreateInput
  openCreateDialog: ReturnType<typeof useSidebarCreateDialog>['openCreateDialog']
  closeCreateDialog: ReturnType<typeof useSidebarCreateDialog>['closeCreateDialog']
  submitCreateDialog: ReturnType<typeof useSidebarCreateDialog>['submitCreateDialog']
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
}

function SidebarExplorerBody({
  title,
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
  loadingProject,
  apiAvailable,
  scopePathLabel,
  filterQuery,
  onFilterQueryChange,
  createMode,
  createInput,
  openCreateDialog,
  closeCreateDialog,
  submitCreateDialog,
  onDirectoryChange,
  onNameChange,
}: SidebarExplorerBodyProps) {
  return (
    <>
      <p class="project-menu__path">{scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      <SidebarFilter value={filterQuery} onChange={onFilterQueryChange} />
      <SidebarTree
        visibleFiles={visibleFiles}
        selectedPath={selectedPath}
        loadingDocument={loadingDocument}
        onSelectFile={onSelectFile}
        filterQuery={filterQuery}
      />
      <SidebarFooterActions
        disabled={loadingProject || !apiAvailable}
        onCreateArticle={() => openCreateDialog('article')}
        onCreateCategory={() => openCreateDialog('category')}
      />
      <SidebarCreateDialog
        mode={createMode}
        sectionTitle={title}
        value={createInput}
        onDirectoryChange={onDirectoryChange}
        onNameChange={onNameChange}
        onSubmit={submitCreateDialog}
        onCancel={closeCreateDialog}
      />
    </>
  )
}

function SidebarHeader({ title, apiAvailable, loadingProject, onPickFolder }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <div>
        <p class="workspace-panel__eyebrow">{title}</p>
      </div>
      <div class="sidebar-controls">
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
  filterQuery,
  onFilterQueryChange,
  onCreateArticle,
  onCreateCategory,
  onPickFolder,
}: SidebarExplorerContentProps) {
  const { createMode, createInput, setCreateDirectory, setCreateName, openCreateDialog, closeCreateDialog, submitCreateDialog } = useSidebarCreateDialog({ selectedPath, onCreateArticle, onCreateCategory })

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <SidebarHeader title={title} apiAvailable={apiAvailable} loadingProject={loadingProject} onPickFolder={onPickFolder} />
        <SidebarExplorerBody
          title={title}
          visibleFiles={visibleFiles}
          selectedPath={selectedPath}
          loadingDocument={loadingDocument}
          onSelectFile={onSelectFile}
          loadingProject={loadingProject}
          apiAvailable={apiAvailable}
          scopePathLabel={scopePathLabel}
          filterQuery={filterQuery}
          onFilterQueryChange={onFilterQueryChange}
          createMode={createMode}
          createInput={createInput}
          openCreateDialog={openCreateDialog}
          closeCreateDialog={closeCreateDialog}
          submitCreateDialog={submitCreateDialog}
          onDirectoryChange={setCreateDirectory}
          onNameChange={setCreateName}
        />
      </aside>
    </div>
  )
}
