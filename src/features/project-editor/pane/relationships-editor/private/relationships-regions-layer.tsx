import type { RegionGeometryOverride, RegionResizeEdge } from './relationships-region-editing-helpers'
import type { RelationshipRegion } from './relationships-editor-types'

const REGION_RESIZE_HANDLES: RegionResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

interface RelationshipsRegionsLayerProps {
  regions: RelationshipRegion[]
  preview?: { x: number; y: number; width: number; height: number; color: string } | null
  geometryOverride?: RegionGeometryOverride | null
  onRegionMovePointerDown: (index: number, event: PointerEvent) => void
  onRegionResizePointerDown: (index: number, edge: RegionResizeEdge, event: PointerEvent) => void
  onRegionLabelContextMenu: (index: number, event: MouseEvent) => void
  onRegionBodyContextMenu: (index: number, event: MouseEvent) => void
}

function resolveRegionGeometry(region: RelationshipRegion, geometryOverride: RelationshipsRegionsLayerProps['geometryOverride']) {
  if (geometryOverride?.id !== region.id) return region
  return { ...region, x: geometryOverride.x, y: geometryOverride.y, width: geometryOverride.width, height: geometryOverride.height }
}

function buildRegionStyle(region: RelationshipRegion) {
  return {
    left: `${region.x}px`,
    top: `${region.y}px`,
    width: `${region.width}px`,
    height: `${region.height}px`,
    '--region-color': region.color,
  } as Record<string, string>
}

interface RelationshipsRegionBoxProps {
  region: RelationshipRegion
  onMovePointerDown: (event: PointerEvent) => void
  onResizePointerDown: (edge: RegionResizeEdge, event: PointerEvent) => void
  onLabelContextMenu: (event: MouseEvent) => void
  onBodyContextMenu: (event: MouseEvent) => void
}

interface RelationshipsRegionResizeHandlesProps {
  onResizePointerDown: (edge: RegionResizeEdge, event: PointerEvent) => void
  onBodyContextMenu: (event: MouseEvent) => void
}

function RelationshipsRegionResizeHandles({ onResizePointerDown, onBodyContextMenu }: RelationshipsRegionResizeHandlesProps) {
  return (
    <>
      {REGION_RESIZE_HANDLES.map((edge) => (
        <div
          key={edge}
          class={`relationships-region__resize-handle relationships-region__resize-handle--${edge}`}
          data-relationships-region-handle={edge}
          onPointerDown={(event) => {
            event.stopPropagation()
            onResizePointerDown(edge, event as PointerEvent)
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onBodyContextMenu(event as MouseEvent)
          }}
        />
      ))}
    </>
  )
}

function RelationshipsRegionBox({
  region,
  onMovePointerDown,
  onResizePointerDown,
  onLabelContextMenu,
  onBodyContextMenu,
}: RelationshipsRegionBoxProps) {
  return (
    <div
      class="relationships-region"
      data-relationships-region="true"
      style={buildRegionStyle(region)}
    >
      <RelationshipsRegionResizeHandles onResizePointerDown={onResizePointerDown} onBodyContextMenu={onBodyContextMenu} />
      <div
        class="relationships-region__header"
        data-relationships-region-header="true"
        onPointerDown={(event) => {
          event.stopPropagation()
          onMovePointerDown(event as PointerEvent)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onLabelContextMenu(event as MouseEvent)
        }}
      >
        <span class="relationships-region__label">{region.label}</span>
      </div>
      <div
        class="relationships-region__body"
        data-relationships-region-body="true"
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onBodyContextMenu(event as MouseEvent)
        }}
      />
    </div>
  )
}

export function RelationshipsRegionsLayer({
  regions,
  preview,
  geometryOverride,
  onRegionMovePointerDown,
  onRegionResizePointerDown,
  onRegionLabelContextMenu,
  onRegionBodyContextMenu,
}: RelationshipsRegionsLayerProps) {
  return (
    <div class="relationships-regions-layer">
      {regions.map((region, index) => (
        <RelationshipsRegionBox
          key={region.id}
          region={resolveRegionGeometry(region, geometryOverride)}
          onMovePointerDown={(event) => onRegionMovePointerDown(index, event)}
          onResizePointerDown={(edge, event) => onRegionResizePointerDown(index, edge, event)}
          onLabelContextMenu={(event) => onRegionLabelContextMenu(index, event)}
          onBodyContextMenu={(event) => onRegionBodyContextMenu(index, event)}
        />
      ))}
      {preview ? (
        <div
          class="relationships-region relationships-region--preview"
          style={{
            left: `${preview.x}px`,
            top: `${preview.y}px`,
            width: `${preview.width}px`,
            height: `${preview.height}px`,
            '--region-color': preview.color,
          } as Record<string, string>}
          aria-hidden="true"
        >
          <div class="relationships-region__header">
            <span class="relationships-region__label">New region</span>
          </div>
          <div class="relationships-region__body" />
        </div>
      ) : null}
    </div>
  )
}
