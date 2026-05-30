import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { DocumentMeta } from '../../../../shared/ipc'
import type { WorkspaceLayoutMode, WorkspacePane } from '../../project-editor-types'
import { clampMapValue, getMapConfig, resolveMapAssetUrl, resolveMarkerDestination, withMapConfig, type MapMarker } from './map-editor-helpers'
import { MapMarkerDialog } from './map-marker-dialog'
import { MapMarkersLayer } from './map-markers-layer'

interface MapEditorProps {
  projectRoot: string
  meta: DocumentMeta
  pane: WorkspacePane
  layoutMode: WorkspaceLayoutMode
  readOnlyPreview?: boolean
  tagIndex?: Record<string, string> | null
  onMetaChange: (meta: DocumentMeta) => void
  onNavigate: (filePath: string, pane: WorkspacePane) => void
}

interface ContextMenuState { clientX: number; clientY: number; markerIndex: number | null; marker: MapMarker | null }

interface DialogState {
  mode: 'add' | 'edit'
  markerIndex: number | null
  marker: MapMarker
}

function getTargetPane(layoutMode: WorkspaceLayoutMode, pane: WorkspacePane): WorkspacePane {
  return layoutMode === 'split' ? 'secondary' : pane
}

export function MapEditor({ projectRoot, meta, pane, layoutMode, readOnlyPreview = false, tagIndex, onMetaChange, onNavigate }: MapEditorProps) {
  const mapConfig = getMapConfig(meta)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 1200, height: 800 })
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)

  useEffect(/* clearMapNoticeAfterDelay */ () => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [notice] /*Inputs for clearMapNoticeAfterDelay*/)

  const updateMarkers = useCallback(/* updateMapMarkers */ (markers: MapMarker[]) => {
    onMetaChange(withMapConfig(meta, { ...mapConfig, markers }))
  }, [mapConfig, meta, onMetaChange] /*Inputs for updateMapMarkers*/)

  const toImagePoint = useCallback(/* toMapImagePoint */ (clientX: number, clientY: number) => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: clampMapValue((clientX - bounds.left - offset.x) / scale, 0, imageSize.width),
      y: clampMapValue((clientY - bounds.top - offset.y) / scale, 0, imageSize.height),
    }
  }, [imageSize.height, imageSize.width, offset.x, offset.y, scale] /*Inputs for toMapImagePoint*/)

  const handleWheel = useCallback(/* handleMapWheelZoom */ (event: WheelEvent) => {
    event.preventDefault()
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const pointX = event.clientX - bounds.left
    const pointY = event.clientY - bounds.top
    setScale((previousScale) => {
      const nextScale = clampMapValue(previousScale * (event.deltaY < 0 ? 1.12 : 0.9), 0.25, 4)
      setOffset((previousOffset) => ({
        x: pointX - ((pointX - previousOffset.x) / previousScale) * nextScale,
        y: pointY - ((pointY - previousOffset.y) / previousScale) * nextScale,
      }))
      return nextScale
    })
  }, [] /*Inputs for handleMapWheelZoom - stable*/)

  const handlePointerDown = useCallback(/* handleMapPointerDown */ (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return
    if ((event.target as HTMLElement | null)?.closest('[data-map-marker="true"]')) return
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
  }, [offset.x, offset.y] /*Inputs for handleMapPointerDown*/)

  const handlePointerMove = useCallback(/* handleMapPointerMove */ (event: PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    setOffset({ x: dragRef.current.offsetX + event.clientX - dragRef.current.x, y: dragRef.current.offsetY + event.clientY - dragRef.current.y })
  }, [] /*Inputs for handleMapPointerMove - stable*/)

  const handlePointerUp = useCallback(/* handleMapPointerUp */ (event: PointerEvent) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }, [] /*Inputs for handleMapPointerUp - stable*/)

  const handleMarkerClick = useCallback(/* handleMapMarkerClick */ (index: number) => {
    const marker = mapConfig.markers[index]
    const destination = resolveMarkerDestination(marker.destinationTag, tagIndex ?? null)
    if (!destination) {
      setNotice(`Tag not found: ${marker.destinationTag}`)
      return
    }
    onNavigate(destination, getTargetPane(layoutMode, pane))
  }, [layoutMode, mapConfig.markers, onNavigate, pane, tagIndex] /*Inputs for handleMapMarkerClick*/)

  useEffect(/* loadMapBackgroundImage */ () => {
    let cancelled = false
    setImageLoading(true)
    setImageError(null)
    void resolveMapAssetUrl(projectRoot, mapConfig.backgroundImage).then((result) => {
      if (cancelled) return
      setImageUrl(result.dataUrl)
      setImageError(result.error)
      setImageLoading(false)
    }).catch((error) => {
      if (cancelled) return
      setImageUrl('')
      setImageError(error instanceof Error ? error.message : 'Could not load map background.')
      setImageLoading(false)
    })
    return () => { cancelled = true }
  }, [mapConfig.backgroundImage, projectRoot] /*Inputs for loadMapBackgroundImage*/)

  return (
    <div class="map-editor">
      <div class="map-editor__hud"><span>Map</span><span>{Math.round(scale * 100)}%</span></div>
      <div
        ref={viewportRef}
        class={`map-editor__viewport${readOnlyPreview ? ' is-readonly' : ''}`}
        onWheel={(event) => handleWheel(event as WheelEvent)}
        onPointerDown={(event) => handlePointerDown(event as PointerEvent)}
        onPointerMove={(event) => handlePointerMove(event as PointerEvent)}
        onPointerUp={(event) => handlePointerUp(event as PointerEvent)}
        onPointerCancel={(event) => handlePointerUp(event as PointerEvent)}
        onContextMenu={(event) => {
          event.preventDefault()
          if (readOnlyPreview) return
          const point = toImagePoint(event.clientX, event.clientY)
          setContextMenu({ clientX: event.clientX, clientY: event.clientY, markerIndex: null, marker: { x: point.x, y: point.y, label: '', destinationTag: '', color: '#6ea6ff', description: '' } })
        }}
      >
        <div class="map-editor__stage" style={{ width: `${imageSize.width}px`, height: `${imageSize.height}px`, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          {imageUrl
            ? <img class="map-editor__image" src={imageUrl} alt={meta.name ?? 'Map background'} draggable={false} onLoad={(event) => { setImageSize({ width: event.currentTarget.naturalWidth || 1200, height: event.currentTarget.naturalHeight || 800 }); setImageError(null) }} onError={() => { setImageUrl(''); setImageError(`The image at ${mapConfig.backgroundImage} could not be rendered.`) }} />
            : <div class="map-editor__missing">{imageLoading ? 'Loading map background...' : (imageError ?? 'Set `mapConfig.backgroundImage` to render this map.')}</div>}
          <MapMarkersLayer
            markers={mapConfig.markers}
            onMarkerClick={handleMarkerClick}
            onMarkerContextMenu={(index, event) => setContextMenu({ clientX: event.clientX, clientY: event.clientY, markerIndex: index, marker: mapConfig.markers[index] })}
          />
        </div>
      </div>
      {notice ? <div class="map-editor__notice" role="status">{notice}</div> : null}
      {contextMenu ? <div class="sidebar-context-menu-layer" onClick={() => setContextMenu(null)}><div class="sidebar-context-menu" style={{ left: `${contextMenu.clientX}px`, top: `${contextMenu.clientY}px` }} onClick={(event) => event.stopPropagation()}>{contextMenu.markerIndex === null ? <button type="button" class="sidebar-context-menu__item" onClick={() => { if (contextMenu.marker) { setDialogState({ mode: 'add', markerIndex: null, marker: contextMenu.marker }) } setContextMenu(null) }}>Add a marker</button> : [<button key="edit" type="button" class="sidebar-context-menu__item" onClick={() => { if (contextMenu.marker) { setDialogState({ mode: 'edit', markerIndex: contextMenu.markerIndex, marker: contextMenu.marker }) } setContextMenu(null) }}>Edit marker</button>, <button key="delete" type="button" class="sidebar-context-menu__item sidebar-context-menu__item--danger" onClick={() => { updateMarkers(mapConfig.markers.filter((_, index) => index !== contextMenu.markerIndex)); setContextMenu(null) }}>Delete marker</button>]}</div></div> : null}
      <MapMarkerDialog open={dialogState !== null} marker={dialogState?.marker ?? null} title={dialogState?.mode === 'edit' ? 'Edit marker' : 'Add marker'} readOnly={readOnlyPreview} onClose={() => { setDialogState(null); setContextMenu(null) }} onSave={(nextMarker) => { const nextMarkers = dialogState?.mode === 'add' ? [...mapConfig.markers, nextMarker] : mapConfig.markers.map((marker, index) => index === dialogState?.markerIndex ? nextMarker : marker); updateMarkers(nextMarkers); setDialogState(null); setContextMenu(null) }} />
    </div>
  )
}
