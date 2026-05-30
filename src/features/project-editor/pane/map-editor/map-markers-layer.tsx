import type { JSX } from 'preact'
import type { MapMarker } from './map-editor-helpers'

interface MapMarkersLayerProps {
  markers: MapMarker[]
  onMarkerClick: (index: number) => void
  onMarkerContextMenu: (index: number, event: MouseEvent) => void
}

function buildMarkerStyle(marker: MapMarker): JSX.CSSProperties {
  return {
    left: `${marker.x}px`,
    top: `${marker.y}px`,
    backgroundColor: marker.color,
  }
}

export function MapMarkersLayer({ markers, onMarkerClick, onMarkerContextMenu }: MapMarkersLayerProps) {
  return (
    <div class="map-markers-layer">
      {markers.map((marker, index) => (
        <button
          key={`${marker.label}-${marker.x}-${marker.y}-${index}`}
          type="button"
          class="map-marker"
          data-map-marker="true"
          style={buildMarkerStyle(marker)}
          aria-label={marker.label}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onMarkerClick(index)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onMarkerContextMenu(index, event as MouseEvent)
          }}
        >
          <span class="map-marker__tooltip">
            <strong>{marker.label}</strong>
            {marker.description ? <span>{marker.description}</span> : null}
          </span>
        </button>
      ))}
    </div>
  )
}
