export const WORKSPACE_CONTEXT_MENU_EVENT = 'trama:workspace-command'

export type WorkspaceContextCommand =
  | { type: 'toggle-split' }
  | { type: 'toggle-fullscreen' }
  | { type: 'toggle-focus' }
  | { type: 'set-focus-scope'; scope: 'line' | 'sentence' | 'paragraph' }
  | { type: 'set-split-ratio'; ratio: number }
  | { type: 'paste-markdown' }
