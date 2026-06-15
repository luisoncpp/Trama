/* eslint-disable max-lines-per-function */
import { useState } from 'preact/hooks'
import { useEditorActions } from '../../project-editor-actions-context.tsx'
import { useScopedSidebarActions } from './use-scoped-sidebar-actions'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'
import { getBaseName } from '../../../../shared/sidebar-utils'
import type { SidebarFolderActionMode } from './sidebar-folder-actions-dialog.tsx'

function normalizeDirectory(value: string): string {
  return value.trim().replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

function getSelectedDirectory(selectedPath: string | null): string {
  if (!selectedPath || selectedPath.endsWith('/')) {
    return ''
  }

  const slashIndex = selectedPath.lastIndexOf('/')
  if (slashIndex < 0) {
    return ''
  }

  return selectedPath.slice(0, slashIndex)
}

function buildInitialInput(selectedPath: string | null): SidebarCreateInput {
  return {
    directory: getSelectedDirectory(selectedPath),
    name: '',
    sourceImagePath: '',
  }
}

export function useSidebarCreateDialog({ selectedPath }: { selectedPath: string | null }) {
  const actions = useEditorActions()
  const [createMode, setCreateMode] = useState<SidebarCreateMode | null>(null)
  const [createInput, setCreateInput] = useState<SidebarCreateInput>(buildInitialInput(selectedPath))

  const openCreateDialog = (mode: SidebarCreateMode) => {
    setCreateMode(mode)
    setCreateInput(buildInitialInput(selectedPath))
  }

  const closeCreateDialog = () => {
    setCreateMode(null)
    setCreateInput({ directory: '', name: '', sourceImagePath: '' })
  }

  const setCreateDirectory = (value: string) => setCreateInput((current) => ({ ...current, directory: value }))
  const setCreateName = (value: string) => setCreateInput((current) => ({ ...current, name: value }))
  const setCreateSourceImagePath = (value: string) => setCreateInput((current) => ({ ...current, sourceImagePath: value }))
  const browseCreateImage = async () => {
    const response = await window.tramaApi.selectMapImage()
    if (!response.ok || !response.data.filePath) {
      return
    }

    setCreateSourceImagePath(response.data.filePath)
  }

  const submitCreateDialog = () => {
    const payload = {
      directory: normalizeDirectory(createInput.directory),
      name: createInput.name.trim(),
      sourceImagePath: createInput.sourceImagePath.trim(),
    }

    if (createMode === 'article') {
      actions.createArticle(payload)
      closeCreateDialog()
      return
    }

    if (createMode === 'map') {
      actions.createMap(payload)
      closeCreateDialog()
      return
    }

    if (createMode === 'relationships') {
      actions.createRelationships(payload)
      closeCreateDialog()
      return
    }

    if (createMode === 'category') {
      actions.createCategory(payload)
      closeCreateDialog()
    }
  }

  return {
    createMode,
    createInput,
    setCreateDirectory,
    setCreateName,
    setCreateSourceImagePath,
    browseCreateImage,
    openCreateDialog,
    closeCreateDialog,
    submitCreateDialog,
  }
}

export function useSidebarFolderActionsDialog() {
  const actions = useScopedSidebarActions()
  const [mode, setMode] = useState<SidebarFolderActionMode | null>(null)
  const [targetPath, setTargetPath] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const closeDialog = () => {
    setMode(null)
    setTargetPath(null)
    setRenameValue('')
  }

  const openRename = (path: string) => {
    if (!path) {
      return
    }

    setMode('rename')
    setTargetPath(path)
    setRenameValue(getBaseName(path))
  }

  const openDelete = (path: string) => {
    if (!path) {
      return
    }

    setMode('delete')
    setTargetPath(path)
    setRenameValue('')
  }

  const confirm = () => {
    if (!targetPath || !mode) {
      return
    }

    if (mode === 'rename') {
      actions.renameFolder({ path: targetPath, newName: renameValue })
    } else {
      actions.deleteFolder(targetPath)
    }

    closeDialog()
  }

  return {
    mode,
    targetPath,
    renameValue,
    setRenameValue,
    openRename,
    openDelete,
    closeDialog,
    confirm,
  }
}

