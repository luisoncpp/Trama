import { PROJECT_EDITOR_STRINGS } from '../project-editor-strings'

interface FileListPanelProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
}

export function FileListPanel({
  visibleFiles,
  selectedPath,
  loadingDocument,
  onSelectFile,
}: FileListPanelProps) {
  return (
    <aside class="workspace-panel workspace-panel--sidebar">
      <div class="workspace-panel__header">
        <div>
          <p class="workspace-panel__eyebrow">Navegacion</p>
          <h2 class="workspace-panel__title">{PROJECT_EDITOR_STRINGS.markdownFilesTitle}</h2>
        </div>
        <span class="workspace-panel__count">{visibleFiles.length}</span>
      </div>
      <div class="file-tree">
        {visibleFiles.map((filePath) => (
          <button
            key={filePath}
            type="button"
            onClick={() => onSelectFile(filePath)}
            disabled={loadingDocument}
            class={`file-tree__item ${selectedPath === filePath ? 'is-active' : ''}`}
          >
            <span class="file-tree__item-label">{filePath}</span>
          </button>
        ))}
        {visibleFiles.length === 0 && <p class="file-tree__empty">{PROJECT_EDITOR_STRINGS.noMarkdownFiles}</p>}
      </div>
    </aside>
  )
}
