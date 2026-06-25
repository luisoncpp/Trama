// @Architecture(descriptionShort="Hook orchestrating relationships region editing state and effects")
import { useCallback, useMemo, useRef, useState } from 'preact/hooks'
import { createRegionPointerHandlers } from './relationships-region-pointer-handlers'
import {
  createRegionDraft,
  deleteRegionFromConfig,
  saveRegionToConfig,
  updateRegionColorInConfig,
  type RegionDialogState,
  type RegionDragState,
  type RegionDrawState,
  type RegionGeometryOverride,
  type RegionResizeState,
} from './relationships-region-editing-helpers'
import type { RelationshipRegion, RelationshipsConfig } from './relationships-editor-types'

interface UseRelationshipsRegionEditingOptions {
  config: RelationshipsConfig
  activeTool: string
  readOnlyPreview: boolean
  scale: number
  updateConfig: (nextConfig: RelationshipsConfig) => void
}

export function useRelationshipsRegionEditing({
  config, activeTool, readOnlyPreview, scale, updateConfig,
}: UseRelationshipsRegionEditingOptions) {
  const regionDragRef = useRef<RegionDragState | null>(null)
  const regionResizeRef = useRef<RegionResizeState | null>(null)
  const regionDrawRef = useRef<RegionDrawState | null>(null)
  const [regionDialog, setRegionDialog] = useState<RegionDialogState | null>(null)
  const [regionDrawPreview, setRegionDrawPreview] = useState<{ x: number; y: number; width: number; height: number; color: string } | null>(null)
  const [regionGeometryOverride, setRegionGeometryOverride] = useState<RegionGeometryOverride | null>(null)

  const pointerHandlers = useMemo(
    () => createRegionPointerHandlers({
      config, activeTool, readOnlyPreview, scale, regionDragRef, regionResizeRef, regionDrawRef,
      setRegionDialog, setRegionDrawPreview, setRegionGeometryOverride, updateConfig,
    }),
    [activeTool, config, readOnlyPreview, scale, updateConfig],
  )

  const saveRegionFromDialog = useCallback(/* saveRelationshipsRegionFromDialog */ (nextRegion: RelationshipRegion) => {
    updateConfig(saveRegionToConfig(config, regionDialog, nextRegion))
    setRegionDialog(null)
  }, [config, regionDialog, updateConfig] /*Inputs for saveRelationshipsRegionFromDialog*/)

  const deleteRegion = useCallback(/* deleteRelationshipsRegion */ (index: number) => {
    updateConfig(deleteRegionFromConfig(config, index))
  }, [config, updateConfig] /*Inputs for deleteRelationshipsRegion*/)

  const updateRegionColor = useCallback(/* updateRelationshipsRegionColor */ (index: number, color: string) => {
    updateConfig(updateRegionColorInConfig(config, index, color))
  }, [config, updateConfig] /*Inputs for updateRelationshipsRegionColor*/)

  const openAddRegionDialog = useCallback(/* openAddRelationshipsRegionDialog */ (x: number, y: number) => {
    setRegionDialog({ mode: 'add', regionIndex: null, region: createRegionDraft(x, y) })
  }, [] /*Inputs for openAddRelationshipsRegionDialog - stable*/)

  return {
    regionDialog, regionDrawPreview, regionGeometryOverride, setRegionDialog,
    saveRegionFromDialog, deleteRegion, updateRegionColor, openAddRegionDialog, ...pointerHandlers,
  }
}
