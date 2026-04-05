import { useEffect, useState } from 'preact/hooks'
import {
  WORKSPACE_LAYOUT_STORAGE_KEY,
  createDefaultWorkspaceLayoutState,
  normalizeWorkspaceLayoutState,
  restoreWorkspaceLayoutState,
} from './project-editor-logic'
import type { WorkspaceLayoutState } from './project-editor-types'

export type WorkspaceLayoutSetter = (
  value: WorkspaceLayoutState | ((previous: WorkspaceLayoutState) => WorkspaceLayoutState)
) => void

export function useWorkspaceLayoutState(): [WorkspaceLayoutState, WorkspaceLayoutSetter] {
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayoutState>(() => {
    if (typeof window === 'undefined') {
      return createDefaultWorkspaceLayoutState()
    }

    return restoreWorkspaceLayoutState(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY))
  })

  useEffect(() => {
    window.localStorage.setItem(
      WORKSPACE_LAYOUT_STORAGE_KEY,
      JSON.stringify(normalizeWorkspaceLayoutState(workspaceLayout)),
    )
  }, [workspaceLayout])

  return [workspaceLayout, setWorkspaceLayout]
}
