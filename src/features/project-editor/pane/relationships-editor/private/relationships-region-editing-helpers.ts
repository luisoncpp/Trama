import {
  buildRegionId,
  clampRegionPosition,
  clampRegionRect,
  DEFAULT_REGION_COLOR,
  rectFromDragCorners,
  RELATIONSHIPS_DEFAULT_REGION_HEIGHT,
  RELATIONSHIPS_DEFAULT_REGION_WIDTH,
  RELATIONSHIPS_REGION_MIN_HEIGHT,
  RELATIONSHIPS_REGION_MIN_WIDTH,
} from './relationships-editor-helpers'
import type { RelationshipRegion, RelationshipsConfig } from './relationships-editor-types'

const DRAG_THRESHOLD_PX = 4

export interface RegionDialogState { mode: 'add' | 'edit'; regionIndex: number | null; region: RelationshipRegion }

export type RegionResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface RegionGeometryOverride {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface RegionDragState {
  pointerId: number
  regionIndex: number
  clientX: number
  clientY: number
  regionX: number
  regionY: number
  moved: boolean
}

export interface RegionResizeState {
  pointerId: number
  regionIndex: number
  edge: RegionResizeEdge
  clientX: number
  clientY: number
  startRect: { x: number; y: number; width: number; height: number }
  moved: boolean
}

export interface RegionDrawState {
  pointerId: number
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export function createRegionDraft(x: number, y: number, width = RELATIONSHIPS_DEFAULT_REGION_WIDTH, height = RELATIONSHIPS_DEFAULT_REGION_HEIGHT): RelationshipRegion {
  return { id: '', ...clampRegionRect(x, y, width, height), label: '', color: DEFAULT_REGION_COLOR }
}

export function saveRegionToConfig(
  config: RelationshipsConfig,
  regionDialog: RegionDialogState | null,
  nextRegion: RelationshipRegion,
): RelationshipsConfig {
  if (regionDialog?.mode === 'add') {
    const id = buildRegionId(nextRegion.label, config.regions.map((region) => region.id))
    return { ...config, regions: [...config.regions, { ...nextRegion, id }] }
  }
  if (regionDialog?.regionIndex !== null && regionDialog !== null) {
    return {
      ...config,
      regions: config.regions.map((region, index) => index === regionDialog.regionIndex ? { ...nextRegion, id: region.id } : region),
    }
  }
  return config
}

export function moveRegionInConfig(
  config: RelationshipsConfig,
  regionIndex: number,
  regionX: number,
  regionY: number,
  deltaX: number,
  deltaY: number,
): RelationshipsConfig {
  const region = config.regions[regionIndex]
  const nextPosition = clampRegionPosition({
    ...region,
    x: regionX + deltaX,
    y: regionY + deltaY,
  })
  return {
    ...config,
    regions: config.regions.map((item, index) => index === regionIndex ? { ...item, ...nextPosition } : item),
  }
}

export function regionToGeometryOverride(region: RelationshipRegion): RegionGeometryOverride {
  return { id: region.id, x: region.x, y: region.y, width: region.width, height: region.height }
}

export function getRegionDragPreview(
  config: RelationshipsConfig,
  regionDrag: RegionDragState,
  deltaX: number,
  deltaY: number,
): RegionGeometryOverride {
  const region = config.regions[regionDrag.regionIndex]
  const nextPosition = clampRegionPosition({ ...region, x: regionDrag.regionX + deltaX, y: regionDrag.regionY + deltaY })
  return { id: region.id, ...nextPosition, width: region.width, height: region.height }
}

export function resizeRegionFromEdge(
  startRect: { x: number; y: number; width: number; height: number },
  edge: RegionResizeEdge,
  deltaX: number,
  deltaY: number,
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = startRect
  if (edge.includes('e')) width += deltaX
  if (edge.includes('w')) {
    x += deltaX
    width -= deltaX
  }
  if (edge.includes('s')) height += deltaY
  if (edge.includes('n')) {
    y += deltaY
    height -= deltaY
  }
  if (width < RELATIONSHIPS_REGION_MIN_WIDTH) {
    if (edge.includes('w')) x -= RELATIONSHIPS_REGION_MIN_WIDTH - width
    width = RELATIONSHIPS_REGION_MIN_WIDTH
  }
  if (height < RELATIONSHIPS_REGION_MIN_HEIGHT) {
    if (edge.includes('n')) y -= RELATIONSHIPS_REGION_MIN_HEIGHT - height
    height = RELATIONSHIPS_REGION_MIN_HEIGHT
  }
  return clampRegionRect(x, y, width, height)
}

export function getRegionResizePreview(
  config: RelationshipsConfig,
  regionResize: RegionResizeState,
  deltaX: number,
  deltaY: number,
): RegionGeometryOverride {
  const region = config.regions[regionResize.regionIndex]
  const nextRect = resizeRegionFromEdge(regionResize.startRect, regionResize.edge, deltaX, deltaY)
  return { id: region.id, ...nextRect }
}

export function resizeRegionInConfig(
  config: RelationshipsConfig,
  regionIndex: number,
  startRect: { x: number; y: number; width: number; height: number },
  edge: RegionResizeEdge,
  deltaX: number,
  deltaY: number,
): RelationshipsConfig {
  const region = config.regions[regionIndex]
  const nextRect = resizeRegionFromEdge(startRect, edge, deltaX, deltaY)
  return {
    ...config,
    regions: config.regions.map((item, index) => index === regionIndex ? { ...item, ...nextRect } : item),
  }
}

export function deleteRegionFromConfig(config: RelationshipsConfig, regionIndex: number): RelationshipsConfig {
  return { ...config, regions: config.regions.filter((_, index) => index !== regionIndex) }
}

export function updateRegionColorInConfig(config: RelationshipsConfig, regionIndex: number, color: string): RelationshipsConfig {
  return {
    ...config,
    regions: config.regions.map((region, index) => index === regionIndex ? { ...region, color } : region),
  }
}

export function shouldStartRegionDrag(regionDrag: RegionDragState, clientX: number, clientY: number): boolean {
  return Math.hypot(clientX - regionDrag.clientX, clientY - regionDrag.clientY) >= DRAG_THRESHOLD_PX
}

export function getRegionDrawPreview(draw: RegionDrawState) {
  return { ...rectFromDragCorners(draw.startX, draw.startY, draw.currentX, draw.currentY), color: DEFAULT_REGION_COLOR }
}

export function finishRegionDraw(draw: RegionDrawState): RelationshipRegion | null {
  const rect = rectFromDragCorners(draw.startX, draw.startY, draw.currentX, draw.currentY)
  if (rect.width < RELATIONSHIPS_REGION_MIN_WIDTH || rect.height < RELATIONSHIPS_REGION_MIN_HEIGHT) return null
  return { id: '', ...rect, label: '', color: DEFAULT_REGION_COLOR }
}
