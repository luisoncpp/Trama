import { useState } from 'preact/hooks'
import type { SidebarCreateInput } from '../../project-editor-types'
import type { SidebarCreateMode } from './sidebar-create-dialog.tsx'

interface UseSidebarCreateDialogParams {
  selectedPath: string | null
  onCreateArticle: (input: SidebarCreateInput) => void
  onCreateCategory: (input: SidebarCreateInput) => void
}

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
  }
}

export function useSidebarCreateDialog({
  selectedPath,
  onCreateArticle,
  onCreateCategory,
}: UseSidebarCreateDialogParams) {
  const [createMode, setCreateMode] = useState<SidebarCreateMode | null>(null)
  const [createInput, setCreateInput] = useState<SidebarCreateInput>(buildInitialInput(selectedPath))

  const openCreateDialog = (mode: SidebarCreateMode) => {
    setCreateMode(mode)
    setCreateInput(buildInitialInput(selectedPath))
  }

  const closeCreateDialog = () => {
    setCreateMode(null)
    setCreateInput({ directory: '', name: '' })
  }

  const setCreateDirectory = (value: string) => setCreateInput((current) => ({ ...current, directory: value }))
  const setCreateName = (value: string) => setCreateInput((current) => ({ ...current, name: value }))

  const submitCreateDialog = () => {
    const payload = {
      directory: normalizeDirectory(createInput.directory),
      name: createInput.name.trim(),
    }

    if (createMode === 'article') {
      onCreateArticle(payload)
      closeCreateDialog()
      return
    }

    if (createMode === 'category') {
      onCreateCategory(payload)
      closeCreateDialog()
    }
  }

  return { createMode, createInput, setCreateDirectory, setCreateName, openCreateDialog, closeCreateDialog, submitCreateDialog }
}
