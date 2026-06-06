import type { MapAssetResult } from './map-editor-types'

export type { MapConfig, MapMarker, MapAssetResult } from './map-editor-types'
export { getMapConfig, withMapConfig } from './map-config-serialization'

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
