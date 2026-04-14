interface SidebarTransferContentProps {
  disabled: boolean
  onImport: () => void
  onExport: () => void
}

function SidebarTransferActions({ disabled, onImport, onExport }: SidebarTransferContentProps) {
  return (
    <div class="project-menu__actions">
      <button
        type="button"
        class="editor-button editor-button--secondary"
        disabled={disabled}
        onClick={onImport}
      >
        Import AI Content
      </button>
      <button
        type="button"
        class="editor-button editor-button--secondary"
        disabled={disabled}
        onClick={onExport}
      >
        Export Files
      </button>
    </div>
  )
}

export function SidebarTransferContent({ disabled, onImport, onExport }: SidebarTransferContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Import / Export</p>
          </div>
        </div>
        <div class="project-menu">
          <label class="project-menu__field">
            <span>Project interchange</span>
            <span class="project-menu__field-note">
              Import structured AI output into the project or export the current files for reuse elsewhere.
            </span>
          </label>
          <SidebarTransferActions disabled={disabled} onImport={onImport} onExport={onExport} />
        </div>
      </aside>
    </div>
  )
}