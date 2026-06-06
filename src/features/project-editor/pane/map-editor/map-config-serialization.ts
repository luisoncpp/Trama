import type { DocumentMeta } from '../../../../shared/ipc'
import type { MapConfig, MapMarker } from './map-editor-types'

const DEFAULT_MARKER_COLOR = '#6ea6ff'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeMarker(value: unknown): MapMarker | null {
  if (!isRecord(value)) return null
  const x = typeof value.x === 'number' ? value.x : Number(value.x)
  const y = typeof value.y === 'number' ? value.y : Number(value.y)
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const destinationTag = typeof value.destinationTag === 'string' ? value.destinationTag.trim() : ''
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color.trim())
    ? value.color.trim()
    : DEFAULT_MARKER_COLOR
  const description = typeof value.description === 'string' ? value.description.trim() : ''
  if (!Number.isFinite(x) || !Number.isFinite(y) || !label || !destinationTag) return null
  return { x, y, label, destinationTag, color, description: description || undefined }
}

export function getMapConfig(meta: DocumentMeta): MapConfig {
  const rawMapConfig = meta.mapConfig
  if (!isRecord(rawMapConfig)) {
    return { backgroundImage: '', markers: [] }
  }
  const backgroundImage = typeof rawMapConfig.backgroundImage === 'string'
    ? rawMapConfig.backgroundImage.trim()
    : ''
  const markers = Array.isArray(rawMapConfig.markers)
    ? rawMapConfig.markers.map(normalizeMarker).filter((marker): marker is MapMarker => marker !== null)
    : []
  return { backgroundImage, markers }
}

export function withMapConfig(meta: DocumentMeta, mapConfig: MapConfig): DocumentMeta {
  return {
    ...meta,
    type: 'map',
    mapConfig: {
      backgroundImage: mapConfig.backgroundImage,
      markers: mapConfig.markers.map((marker) => ({
        x: marker.x,
        y: marker.y,
        label: marker.label,
        destinationTag: marker.destinationTag,
        color: marker.color,
        ...(marker.description ? { description: marker.description } : {}),
      })),
    },
  }
}
