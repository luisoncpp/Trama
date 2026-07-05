// @Architecture(descriptionShort="Preact context carrying the sidebar project state snapshot; value identity")
import { createContext, type ComponentChildren } from 'preact'
import { useContext } from 'preact/hooks'
import type { FocusScope, GitHistoryState, SidebarSection } from '../../project-editor-types'
import type { ProjectEditorShellState } from '../../project-editor-shell-props'

export interface SidebarProjectState {
  apiAvailable: boolean
  rootPath: string
  visibleFiles: string[]
  selectedPath: string | null
  loadingProject: boolean
  loadingDocument: boolean
  statusMessage: string
  corkboardOrder: Record<string, string[]>
  gitHistory: GitHistoryState
  sidebarActiveSection: SidebarSection
  focusModeEnabled: boolean
  focusScope: FocusScope
}

export function buildSidebarProjectState(shellState: ProjectEditorShellState): SidebarProjectState {
  return {
    apiAvailable: shellState.apiAvailable,
    rootPath: shellState.rootPath,
    visibleFiles: shellState.visibleFiles,
    selectedPath: shellState.selectedPath,
    loadingProject: shellState.loadingProject,
    loadingDocument: shellState.loadingDocument,
    statusMessage: shellState.statusMessage,
    corkboardOrder: shellState.corkboardOrder,
    gitHistory: shellState.gitHistory,
    sidebarActiveSection: shellState.sidebarActiveSection,
    focusModeEnabled: shellState.workspaceLayout.focusModeEnabled,
    focusScope: shellState.workspaceLayout.focusScope,
  }
}

const SidebarStateContext = createContext<SidebarProjectState | null>(null)

export function SidebarStateProvider({ value, children }: {
  value: SidebarProjectState
  children: ComponentChildren
}) {
  return <SidebarStateContext.Provider value={value}>{children}</SidebarStateContext.Provider>
}

export function useSidebarState(): SidebarProjectState {
  const ctx = useContext(SidebarStateContext)
  if (!ctx) {
    throw new Error('useSidebarState must be used inside SidebarStateProvider')
  }
  return ctx
}
