import { useRef } from 'preact/hooks'
import { useEditorActions } from '../../project-editor-actions-context.tsx'
import { SidebarExplorerBody } from './sidebar-explorer-body/index.ts'
import type { SidebarExplorerCommonProps } from './sidebar-types'
import { useSidebarFileActionsDialog } from './use-sidebar-file-actions-dialog'
import { useSidebarCreateDialog, useSidebarFolderActionsDialog } from './sidebar-dialog-hooks'
import { useSidebarCreateControllerBridge } from '../../templates/use-sidebar-create-controller-bridge'
import { SIDEBAR_SECTION_CONFIG } from './sidebar-section-roots'

interface SidebarHeaderProps {
  title: string
}

interface SidebarExplorerContentProps {
  title: string
  visibleFiles: SidebarExplorerCommonProps['visibleFiles']
  selectedPath: SidebarExplorerCommonProps['selectedPath']
  loadingDocument: SidebarExplorerCommonProps['loadingDocument']
  apiAvailable: SidebarExplorerCommonProps['apiAvailable']
  loadingProject: SidebarExplorerCommonProps['loadingProject']
  statusMessage: SidebarExplorerCommonProps['statusMessage']
  projectRootPath: string
  pickFolderDisabled: boolean
  filterQuery: string
  onFilterQueryChange: (value: string) => void
  corkboardOrder?: Record<string, string[]>
  allVisibleFiles?: string[]
  activeSection?: string
}

function useSidebarExplorerDialogs(props: SidebarExplorerContentProps) {
  const actions = useEditorActions()
  const createDialog = useSidebarCreateDialog({
    selectedPath: props.selectedPath,
  })

  const fileDialog = useSidebarFileActionsDialog()
  const folderDialog = useSidebarFolderActionsDialog()

  const allVisibleFiles = props.allVisibleFiles ?? []

  const { controller: createCtrl, snapshot: createCtrlSnapshot } = useSidebarCreateControllerBridge({
    getTemplatePaths: () => allVisibleFiles,
    isActiveSectionContent: (section: string) => Object.hasOwn(SIDEBAR_SECTION_CONFIG, section),
    getActiveSection: () => props.activeSection ?? 'explorer',
    getSelectedPath: () => props.selectedPath,
    getProjectRoot: () => props.projectRootPath,
  })

  const submitWithTemplate = () => {
    const payload = createCtrl.buildSubmitPayload()
    if (!payload) {
      return
    }

    if (payload.mode === 'article') {
      actions.createArticle(
        payload.input,
        payload.selectedTemplatePath,
      )
    } else if (payload.mode === 'map') {
      actions.createMap(payload.input)
    } else if (payload.mode === 'relationships') {
      actions.createRelationships(payload.input)
    } else if (payload.mode === 'category') {
      actions.createCategory(payload.input)
    }
    createCtrl.close()
  }

  return { createDialog, fileDialog, folderDialog, createCtrl, createCtrlSnapshot, submitWithTemplate }
}

function SidebarHeader({ title }: SidebarHeaderProps) {
  return (
    <div class="workspace-panel__header">
      <p class="workspace-panel__eyebrow">{title}</p>
    </div>
  )
}

export function SidebarExplorerContent(props: SidebarExplorerContentProps) {
  const { fileDialog, folderDialog, createCtrl, createCtrlSnapshot, submitWithTemplate } = useSidebarExplorerDialogs(props)
  const filterInputElementRef = useRef<HTMLInputElement | null>(null)
  const setFilterInputRef = (el: HTMLInputElement | null) => { filterInputElementRef.current = el }

  const catalogSnapshot = createCtrlSnapshot.catalog

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar" aria-busy={props.loadingProject ? 'true' : 'false'}>
        <SidebarHeader title={props.title} />
        <SidebarExplorerBody
          title={props.title} visibleFiles={props.visibleFiles} selectedPath={props.selectedPath}
          loadingDocument={props.loadingDocument}
          loadingProject={props.loadingProject} apiAvailable={props.apiAvailable}
          statusMessage={props.statusMessage} projectRootPath={props.projectRootPath}
          pickFolderDisabled={props.pickFolderDisabled}
          filterQuery={props.filterQuery} onFilterQueryChange={props.onFilterQueryChange}
          createMode={createCtrlSnapshot.mode} createInput={createCtrlSnapshot.input}
          openCreateDialog={createCtrl.open.bind(createCtrl)} closeCreateDialog={createCtrl.close.bind(createCtrl)}
          submitCreateDialog={submitWithTemplate}
          fileActionMode={fileDialog.mode} fileActionTargetPath={fileDialog.targetPath}
          renameValue={fileDialog.renameValue} openRenameDialog={fileDialog.openRename}
          openDeleteDialog={fileDialog.openDelete} openEditTagsDialog={fileDialog.openEditTags}
          openRenameFolderDialog={folderDialog.openRename} openDeleteFolderDialog={folderDialog.openDelete}
          closeFileActionDialog={fileDialog.closeDialog} confirmFileActionDialog={fileDialog.confirm}
          onRenameValueChange={fileDialog.setRenameValue} tagsValue={fileDialog.tagsValue}
          loadingTags={fileDialog.loadingTags} onTagsValueChange={fileDialog.setTagsValue}
          loadingDeleteInfo={fileDialog.loadingDeleteInfo} linkedImagePaths={fileDialog.linkedImagePaths}
          deleteAssociatedImages={fileDialog.deleteAssociatedImages} onDeleteAssociatedImagesChange={fileDialog.setDeleteAssociatedImages}
          folderActionMode={folderDialog.mode} folderRenameValue={folderDialog.renameValue}
          folderActionTargetPath={folderDialog.targetPath} onFolderRenameValueChange={folderDialog.setRenameValue}
          confirmFolderActionDialog={folderDialog.confirm} closeFolderActionDialog={folderDialog.closeDialog}
          onDirectoryChange={createCtrl.setDirectory.bind(createCtrl)} onNameChange={createCtrl.setName.bind(createCtrl)}
          onSourceImagePathChange={createCtrl.setSourceImagePath.bind(createCtrl)} onBrowseSourceImage={createCtrl.browseSourceImage.bind(createCtrl)}
          filterInputRef={setFilterInputRef} corkboardOrder={props.corkboardOrder}
          showTemplatePicker={createCtrlSnapshot.showTemplatePicker} templateSearchQuery={catalogSnapshot.query}
          templateSelectedPath={catalogSnapshot.selectedPath} filteredTemplates={catalogSnapshot.filteredPaths}
          onTemplateSearchChange={createCtrl.setTemplateSearch.bind(createCtrl)} onTemplateSelect={createCtrl.selectTemplate.bind(createCtrl)}
          hideMapOption={props.activeSection === 'templates'}
        />
      </aside>
    </div>
  )
}
