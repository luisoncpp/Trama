export const WORKSPACE_CONTEXT_MENU_EVENT = 'trama:workspace-command'
export const WORKSPACE_CONTEXT_MENU_STATE_GLOBAL = '__tramaWorkspaceContextMenuState'

export interface WorkspaceContextMenuState {
  gitAvailable: boolean
  pane: 'primary' | 'secondary' | null
  path: string | null
  previewReadOnly: boolean
}

export type WorkspaceContextCommand =
  | { type: 'toggle-split' }
  | { type: 'toggle-fullscreen' }
  | { type: 'toggle-focus' }
  | { type: 'history-back' }
  | { type: 'history-forward' }
  | { type: 'set-focus-scope'; scope: 'line' | 'sentence' | 'paragraph' }
  | { type: 'set-split-ratio'; ratio: number }
  | { type: 'see-revisions'; pane: 'primary' | 'secondary'; path: string }
  | { type: 'paste-markdown' }
  | { type: 'copy-as-markdown' }
