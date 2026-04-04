import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface ProjectHeaderProps {
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  statusMessage: string
  onPickFolder: () => void
}

export function ProjectHeader({
  apiAvailable,
  loadingProject,
  rootPath,
  statusMessage,
  onPickFolder,
}: ProjectHeaderProps) {
  return (
    <header class="editor-topbar">
      <div class="editor-topbar__brand">
        <div>
          <p class="editor-topbar__eyebrow">Trama</p>
          <h1 class="editor-topbar__title">Editor</h1>
        </div>
        <span class={`editor-topbar__status ${apiAvailable ? 'is-live' : 'is-offline'}`}>
          {apiAvailable ? 'API disponible' : 'API no disponible'}
        </span>
      </div>

      <div class="editor-topbar__controls">
        <div class="editor-topbar__row">
          <button
            type="button"
            onClick={onPickFolder}
            disabled={loadingProject || !apiAvailable}
            class="editor-button editor-button--primary"
          >
            {loadingProject ? PROJECT_EDITOR_STRINGS.opening : PROJECT_EDITOR_STRINGS.openFolder}
          </button>
          <div class="editor-topbar__path">{rootPath || PROJECT_EDITOR_STRINGS.noFolderSelected}</div>
        </div>
        <p class="editor-topbar__message">{statusMessage}</p>
      </div>
    </header>
  )
}
