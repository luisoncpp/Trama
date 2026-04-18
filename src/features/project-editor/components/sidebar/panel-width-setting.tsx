import { PanelWidthControl } from './panel-width-control'

interface PanelWidthSettingProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
}

export function PanelWidthSetting({ panelWidth, onPanelWidthChange }: PanelWidthSettingProps) {
  return (
    <div class="project-menu">
      <PanelWidthControl panelWidth={panelWidth} onPanelWidthChange={onPanelWidthChange} />
    </div>
  )
}
