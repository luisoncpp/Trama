import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { SidebarCreateDialog } from './sidebar-create-dialog.tsx'
import { SidebarFooterActions } from './sidebar-footer-actions.tsx'
import { SidebarFilter } from './sidebar-filter.tsx'
import { SidebarTree } from './sidebar-tree.tsx'

interface SidebarStateHintProps {
  loadingProject: boolean
  apiAvailable: boolean
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
  createMode: SidebarCreateMode | null
  createInput: SidebarCreateInput
  openCreateDialog: (mode: SidebarCreateMode) => void
  closeCreateDialog: () => void
  submitCreateDialog: () => void
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
  filterInputRef: (element: HTMLInputElement | null) => void
}

function SidebarStateHint({ loadingProject, apiAvailable }: SidebarStateHintProps) {
  if (!apiAvailable) {
    return <p class="file-tree__empty">Preload API unavailable. Reopen the app to restore sidebar actions.</p>
  }

  if (loadingProject) {
    return <p class="file-tree__empty">Loading project files...</p>
  }

  return null
}

export function SidebarExplorerBody(props: SidebarExplorerBodyProps) {
  const showOnlyStateHint = !props.apiAvailable || props.loadingProject

  return (
    <>
      <p class="project-menu__path">{props.scopePathLabel || PROJECT_EDITOR_STRINGS.noFolderSelected}</p>
      <SidebarFilter
        value={props.filterQuery}
        disabled={showOnlyStateHint}
        inputRef={props.filterInputRef}
        onChange={props.onFilterQueryChange}
      />
      {showOnlyStateHint ? (
        <SidebarStateHint loadingProject={props.loadingProject} apiAvailable={props.apiAvailable} />
      ) : (
        <SidebarTree
          visibleFiles={props.visibleFiles}
          selectedPath={props.selectedPath}
          loadingDocument={props.loadingDocument}
          onSelectFile={props.onSelectFile}
          filterQuery={props.filterQuery}
        />
      )}
      <SidebarFooterActions
        disabled={props.loadingProject || !props.apiAvailable}
        onCreateArticle={() => props.openCreateDialog('article')}
        onCreateCategory={() => props.openCreateDialog('category')}
      />
      <SidebarCreateDialog
        mode={props.createMode}
        sectionTitle={props.title}
        value={props.createInput}
        onDirectoryChange={props.onDirectoryChange}
        onNameChange={props.onNameChange}
        onSubmit={props.submitCreateDialog}
        onCancel={props.closeCreateDialog}
      />
    </>
  )
}
