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

export interface MapAssetResult {
  dataUrl: string
  error: string | null
}
