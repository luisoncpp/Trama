interface PanelWidthControlProps {
  panelWidth: number
  onPanelWidthChange: (width: number) => void
}

export function PanelWidthControl({ panelWidth, onPanelWidthChange }: PanelWidthControlProps) {
  return (
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
  )
}
