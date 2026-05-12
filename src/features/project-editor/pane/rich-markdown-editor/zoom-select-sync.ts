const ZOOM_PAIRS: Array<[number, string]> = [
  [0.5, '0.5'],
  [0.75, '0.75'],
  [1.0, '1.0'],
  [1.25, '1.25'],
  [1.5, '1.5'],
  [1.75, '1.75'],
  [2.0, '2.0'],
]

export function syncZoomSelect(
  zoomSelect: HTMLSelectElement | undefined,
  zoomLevel: number | undefined,
  onZoomChange: ((level: number) => void) | undefined,
): void {
  if (!zoomSelect) return

  const normalizedZoom = zoomLevel ?? 1.0
  const found = ZOOM_PAIRS.find(([num]) => Math.abs(num - normalizedZoom) < 0.001)
  zoomSelect.value = found ? found[1] : String(normalizedZoom)

  if (onZoomChange) {
    zoomSelect.onchange = () => {
      const newLevel = parseFloat(zoomSelect.value)
      if (!isNaN(newLevel)) {
        onZoomChange(newLevel)
      }
    }
  }
}