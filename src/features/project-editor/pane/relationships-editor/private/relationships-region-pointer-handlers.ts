// @Architecture(descriptionShort="Handles relationships region pointer IPC requests with envelope responses")
import {
  finishRegionDraw,
  getRegionDragPreview,
  getRegionDrawPreview,
  getRegionResizePreview,
  moveRegionInConfig,
  resizeRegionInConfig,
  shouldStartRegionDrag,
  type RegionDragState,
  type RegionDrawState,
  type RegionResizeEdge,
  type RegionResizeState,
} from './relationships-region-editing-helpers'
import { DEFAULT_REGION_COLOR, RELATIONSHIPS_REGION_MIN_HEIGHT, RELATIONSHIPS_REGION_MIN_WIDTH } from './relationships-editor-helpers'
import type { MutableRef } from 'preact/hooks'
import type { RelationshipRegion, RelationshipsConfig } from './relationships-editor-types'
import type { RegionGeometryOverride } from './relationships-region-editing-helpers'

interface RegionPointerContext {
  config: RelationshipsConfig
  activeTool: string
  readOnlyPreview: boolean
  scale: number
  regionDragRef: MutableRef<RegionDragState | null>
  regionResizeRef: MutableRef<RegionResizeState | null>
  regionDrawRef: MutableRef<RegionDrawState | null>
  setRegionDialog: (value: { mode: 'add' | 'edit'; regionIndex: number | null; region: RelationshipRegion } | null) => void
  setRegionDrawPreview: (value: { x: number; y: number; width: number; height: number; color: string } | null) => void
  setRegionGeometryOverride: (value: RegionGeometryOverride | null) => void
  updateConfig: (nextConfig: RelationshipsConfig) => void
}

function canEditRegions(ctx: RegionPointerContext): boolean {
  return !ctx.readOnlyPreview && ctx.activeTool === 'select'
}

function captureRegionPointer(event: PointerEvent) {
  ;(event.currentTarget as Element | null)?.setPointerCapture(event.pointerId)
}

export function handleRegionMovePointerDown(ctx: RegionPointerContext, index: number, event: PointerEvent) {
  if (event.button !== 0 || !canEditRegions(ctx)) return
  const region = ctx.config.regions[index]
  captureRegionPointer(event)
  ctx.regionDragRef.current = {
    pointerId: event.pointerId,
    regionIndex: index,
    clientX: event.clientX,
    clientY: event.clientY,
    regionX: region.x,
    regionY: region.y,
    moved: false,
  }
}

export function handleRegionResizePointerDown(ctx: RegionPointerContext, index: number, edge: RegionResizeEdge, event: PointerEvent) {
  if (event.button !== 0 || !canEditRegions(ctx)) return
  const region = ctx.config.regions[index]
  captureRegionPointer(event)
  ctx.regionResizeRef.current = {
    pointerId: event.pointerId,
    regionIndex: index,
    edge,
    clientX: event.clientX,
    clientY: event.clientY,
    startRect: { x: region.x, y: region.y, width: region.width, height: region.height },
    moved: false,
  }
}

export function startRegionDraw(
  regionDrawRef: MutableRef<RegionDrawState | null>,
  setRegionDrawPreview: RegionPointerContext['setRegionDrawPreview'],
  pointerId: number,
  x: number,
  y: number,
) {
  regionDrawRef.current = { pointerId, startX: x, startY: y, currentX: x, currentY: y }
  setRegionDrawPreview({ x, y, width: RELATIONSHIPS_REGION_MIN_WIDTH, height: RELATIONSHIPS_REGION_MIN_HEIGHT, color: DEFAULT_REGION_COLOR })
}

export function handleRegionPointerMoveAt(ctx: RegionPointerContext, event: PointerEvent, stageX: number, stageY: number) {
  const regionResize = ctx.regionResizeRef.current
  if (regionResize && regionResize.pointerId === event.pointerId) {
    if (!canEditRegions(ctx)) return true
    const deltaX = (event.clientX - regionResize.clientX) / ctx.scale
    const deltaY = (event.clientY - regionResize.clientY) / ctx.scale
    if (!regionResize.moved && Math.hypot(event.clientX - regionResize.clientX, event.clientY - regionResize.clientY) < 4) return true
    regionResize.moved = true
    ctx.setRegionGeometryOverride(getRegionResizePreview(ctx.config, regionResize, deltaX, deltaY))
    return true
  }
  const regionDrag = ctx.regionDragRef.current
  if (regionDrag && regionDrag.pointerId === event.pointerId) {
    if (!canEditRegions(ctx)) return true
    const deltaX = (event.clientX - regionDrag.clientX) / ctx.scale
    const deltaY = (event.clientY - regionDrag.clientY) / ctx.scale
    if (!regionDrag.moved && !shouldStartRegionDrag(regionDrag, event.clientX, event.clientY)) return true
    regionDrag.moved = true
    ctx.setRegionGeometryOverride(getRegionDragPreview(ctx.config, regionDrag, deltaX, deltaY))
    return true
  }
  const draw = ctx.regionDrawRef.current
  if (draw && draw.pointerId === event.pointerId) {
    draw.currentX = stageX
    draw.currentY = stageY
    ctx.setRegionDrawPreview(getRegionDrawPreview(draw))
    return true
  }
  return false
}

export function handleRegionPointerUp(ctx: RegionPointerContext, event: PointerEvent) {
  const regionResize = ctx.regionResizeRef.current
  if (regionResize && regionResize.pointerId === event.pointerId) {
    ctx.regionResizeRef.current = null
    if (regionResize.moved && canEditRegions(ctx)) {
      const deltaX = (event.clientX - regionResize.clientX) / ctx.scale
      const deltaY = (event.clientY - regionResize.clientY) / ctx.scale
      ctx.updateConfig(resizeRegionInConfig(ctx.config, regionResize.regionIndex, regionResize.startRect, regionResize.edge, deltaX, deltaY))
    }
    ctx.setRegionGeometryOverride(null)
    return true
  }
  const regionDrag = ctx.regionDragRef.current
  if (regionDrag && regionDrag.pointerId === event.pointerId) {
    ctx.regionDragRef.current = null
    if (regionDrag.moved && canEditRegions(ctx)) {
      const deltaX = (event.clientX - regionDrag.clientX) / ctx.scale
      const deltaY = (event.clientY - regionDrag.clientY) / ctx.scale
      ctx.updateConfig(moveRegionInConfig(ctx.config, regionDrag.regionIndex, regionDrag.regionX, regionDrag.regionY, deltaX, deltaY))
    }
    ctx.setRegionGeometryOverride(null)
    return true
  }
  const draw = ctx.regionDrawRef.current
  if (draw && draw.pointerId === event.pointerId) {
    ctx.regionDrawRef.current = null
    ctx.setRegionDrawPreview(null)
    const draft = finishRegionDraw(draw)
    if (draft) ctx.setRegionDialog({ mode: 'add', regionIndex: null, region: draft })
    return true
  }
  return false
}

export function cancelRegionDraw(
  regionDrawRef: MutableRef<RegionDrawState | null>,
  setRegionDrawPreview: RegionPointerContext['setRegionDrawPreview'],
) {
  regionDrawRef.current = null
  setRegionDrawPreview(null)
}

export function createRegionPointerHandlers(ctx: RegionPointerContext) {
  return {
    handleRegionMovePointerDown: (index: number, event: PointerEvent) => handleRegionMovePointerDown(ctx, index, event),
    handleRegionResizePointerDown: (index: number, edge: RegionResizeEdge, event: PointerEvent) => handleRegionResizePointerDown(ctx, index, edge, event),
    startRegionDraw: (pointerId: number, x: number, y: number) => startRegionDraw(ctx.regionDrawRef, ctx.setRegionDrawPreview, pointerId, x, y),
    handleRegionPointerMoveAt: (event: PointerEvent, stageX: number, stageY: number) => handleRegionPointerMoveAt(ctx, event, stageX, stageY),
    handleRegionPointerUp: (event: PointerEvent) => handleRegionPointerUp(ctx, event),
    cancelRegionDraw: () => cancelRegionDraw(ctx.regionDrawRef, ctx.setRegionDrawPreview),
  }
}
