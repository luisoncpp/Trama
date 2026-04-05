import { useRef } from 'preact/hooks'
import type { SidebarCreateInput } from '../../project-editor-types'
import { SidebarExplorerBody } from './sidebar-explorer-body.tsx'
import { useSidebarCreateDialog } from './use-sidebar-create-dialog'
import { useSidebarFilterShortcut } from './use-sidebar-filter-shortcut'

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

export function SidebarExplorerContent(props: SidebarExplorerContentProps) {
  const { createMode, createInput, setCreateDirectory, setCreateName, openCreateDialog, closeCreateDialog, submitCreateDialog } = useSidebarCreateDialog({
    selectedPath: props.selectedPath,
    onCreateArticle: props.onCreateArticle,
    onCreateCategory: props.onCreateCategory,
  })
  const filterInputElementRef = useRef<HTMLInputElement | null>(null)
  const setFilterInputRef = (element: HTMLInputElement | null) => {
    filterInputElementRef.current = element
  }

  useSidebarFilterShortcut({
    enabled: props.apiAvailable && !props.loadingProject,
    focusFilterInput: () => {
      filterInputElementRef.current?.focus()
      filterInputElementRef.current?.select()
    },
  })

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar" aria-busy={props.loadingProject ? 'true' : 'false'}>
        <SidebarHeader title={props.title} apiAvailable={props.apiAvailable} loadingProject={props.loadingProject} onPickFolder={props.onPickFolder} />
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
          createMode={createMode}
          createInput={createInput}
          openCreateDialog={openCreateDialog}
          closeCreateDialog={closeCreateDialog}
          submitCreateDialog={submitCreateDialog}
          onDirectoryChange={setCreateDirectory}
          onNameChange={setCreateName}
          filterInputRef={setFilterInputRef}
        />
      </aside>
    </div>
  )
}
