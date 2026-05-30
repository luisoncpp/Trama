import type { DocumentMeta } from '../../../../shared/ipc'

export interface MapMarker {
  x: number
  y: number
  label: string
  destinationTag: string
  color: string
  description?: string
}

export interface MapConfig {
  backgroundImage: string
  markers: MapMarker[]
}

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

export interface MapAssetResult {
  dataUrl: string
  error: string | null
}

export async function resolveMapAssetUrl(_projectRoot: string, backgroundImage: string): Promise<MapAssetResult> {
  const relative = backgroundImage.trim().replace(/^\/+/, '')
  if (!relative) return { dataUrl: '', error: 'Missing backgroundImage path.' }
  if (!window.tramaApi || typeof window.tramaApi.readImageFile !== 'function') {
    return { dataUrl: '', error: 'Image bridge unavailable. Restart Electron to reload preload changes.' }
  }
  const response = await window.tramaApi.readImageFile({ path: relative })
  return response.ok
    ? { dataUrl: response.data.dataUrl, error: null }
    : { dataUrl: '', error: response.error.message || `Could not load ${relative}` }
}

export function resolveMarkerDestination(destinationTag: string, tagIndex: Record<string, string> | null): string | null {
  if (!tagIndex) return null
  const normalizedTag = destinationTag.trim().toLowerCase().replace(/^#/, '')
  return normalizedTag ? (tagIndex[normalizedTag] ?? null) : null
}

export function clampMapValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
