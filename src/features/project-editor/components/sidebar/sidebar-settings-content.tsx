interface SidebarSettingsContentProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
}

export function SidebarSettingsContent({ panelWidth, onPanelWidthChange }: SidebarSettingsContentProps) {
  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Settings</p>
          </div>
        </div>
        <div class="project-menu">
          <label class="project-menu__field">
            <span>Panel width: {panelWidth}px</span>
            <input
              type="range"
              min={260}
              max={460}
              step={10}
              value={panelWidth}
              onInput={(event) =>
                onPanelWidthChange(Number((event.currentTarget as HTMLInputElement).value))
              }
            />
          </label>
        </div>
      </aside>
    </div>
  )
}
