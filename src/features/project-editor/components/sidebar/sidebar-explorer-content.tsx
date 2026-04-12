import { useRef } from 'preact/hooks'
import { SidebarExplorerBody } from './sidebar-explorer-body.tsx'
import type { SidebarExplorerCommonProps } from './sidebar-types'
import { useSidebarCreateDialog } from './use-sidebar-create-dialog'
import { useSidebarFileActionsDialog } from './use-sidebar-file-actions-dialog'

function SelectProjectFolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6.5Z" />
      <path d="M8 13h8" />
      <path d="M12 9v8" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <rect x="3" y="7" width="14" height="14" rx="2" />
    </svg>
  )
}

function ImportIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  )
}

interface SidebarHeaderProps {
  title: string
  apiAvailable: boolean
  loadingProject: boolean
  onPickFolder: () => void
  onImport: () => void
  onExport: () => void
}

interface SidebarExplorerContentProps {
  title: string
  visibleFiles: SidebarExplorerCommonProps['visibleFiles']
  selectedPath: SidebarExplorerCommonProps['selectedPath']
  loadingDocument: SidebarExplorerCommonProps['loadingDocument']
  onSelectFile: SidebarExplorerCommonProps['onSelectFile']
  apiAvailable: SidebarExplorerCommonProps['apiAvailable']
  loadingProject: SidebarExplorerCommonProps['loadingProject']
  scopePathLabel: string
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  onCreateArticle: SidebarExplorerCommonProps['onCreateArticle']
  onCreateCategory: SidebarExplorerCommonProps['onCreateCategory']
  onRenameFile: SidebarExplorerCommonProps['onRenameFile']
  onDeleteFile: SidebarExplorerCommonProps['onDeleteFile']
  onEditFileTags: SidebarExplorerCommonProps['onEditFileTags']
  onLoadFileTags: (path: string) => Promise<string[]>
  onPickFolder: SidebarExplorerCommonProps['onPickFolder']
  onImport: () => void
  onExport: () => void
}

function useSidebarExplorerDialogs(props: SidebarExplorerContentProps) {
  const createDialog = useSidebarCreateDialog({
    selectedPath: props.selectedPath,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
  })

  const fileDialog = useSidebarFileActionsDialog({
    onRenameFile: props.onRenameFile,
    onDeleteFile: props.onDeleteFile,
    onEditFileTags: props.onEditFileTags,
    onLoadFileTags: props.onLoadFileTags,
  })

  return { createDialog, fileDialog }
}

function SidebarHeader({ title, apiAvailable, loadingProject, onPickFolder, onImport, onExport }: SidebarHeaderProps) {
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
        <button
          type="button"
          class="sidebar-menu-btn"
          onClick={onImport}
          disabled={loadingProject || !apiAvailable}
          aria-label="Import AI Content"
          title="Import AI Content"
        >
          <ImportIcon />
        </button>
        <button
          type="button"
          class="sidebar-menu-btn"
          onClick={onExport}
          disabled={loadingProject || !apiAvailable}
          aria-label="Export Files"
          title="Export Files"
        >
          <ExportIcon />
        </button>
      </div>
    </div>
  )
}

export function SidebarExplorerContent(props: SidebarExplorerContentProps) {
  const { createDialog, fileDialog } = useSidebarExplorerDialogs(props)
  const filterInputElementRef = useRef<HTMLInputElement | null>(null)
  const setFilterInputRef = (element: HTMLInputElement | null) => {
    filterInputElementRef.current = element
  }

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar" aria-busy={props.loadingProject ? 'true' : 'false'}>
        <SidebarHeader title={props.title} apiAvailable={props.apiAvailable} loadingProject={props.loadingProject} onPickFolder={props.onPickFolder} onImport={props.onImport} onExport={props.onExport} />
        <SidebarExplorerBody
          title={props.title}
          visibleFiles={props.visibleFiles}
          selectedPath={props.selectedPath}
          loadingDocument={props.loadingDocument}
          onSelectFile={props.onSelectFile}
          loadingProject={props.loadingProject}
          apiAvailable={props.apiAvailable}
          scopePathLabel={props.scopePathLabel}
          filterQuery={props.filterQuery}
          onFilterQueryChange={props.onFilterQueryChange}
          createMode={createDialog.createMode}
          createInput={createDialog.createInput}
          openCreateDialog={createDialog.openCreateDialog}
          closeCreateDialog={createDialog.closeCreateDialog}
          submitCreateDialog={createDialog.submitCreateDialog}
          fileActionMode={fileDialog.mode}
          fileActionTargetPath={fileDialog.targetPath}
          renameValue={fileDialog.renameValue}
          openRenameDialog={fileDialog.openRename}
          openDeleteDialog={fileDialog.openDelete}
          openEditTagsDialog={fileDialog.openEditTags}
          closeFileActionDialog={fileDialog.closeDialog}
          confirmFileActionDialog={fileDialog.confirm}
          onRenameValueChange={fileDialog.setRenameValue}
          tagsValue={fileDialog.tagsValue}
          loadingTags={fileDialog.loadingTags}
          onTagsValueChange={fileDialog.setTagsValue}
          onDirectoryChange={createDialog.setCreateDirectory}
          onNameChange={createDialog.setCreateName}
          filterInputRef={setFilterInputRef}
        />
      </aside>
    </div>
  )
}
