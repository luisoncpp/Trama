import type { RelationshipEdgePreset, RelationshipLinkTemplate, RelationshipsEditorTool } from './relationships-editor-types'

interface RelationshipsEditorToolbarProps {
  activeTool: RelationshipsEditorTool
  presets: RelationshipEdgePreset[]
  linkTemplate: RelationshipLinkTemplate | null
  readOnly: boolean
  onToolChange: (tool: RelationshipsEditorTool) => void
  onPresetSelect: (preset: RelationshipEdgePreset) => void
  onCustomType: () => void
}

function isPresetActive(preset: RelationshipEdgePreset, linkTemplate: RelationshipLinkTemplate | null): boolean {
  if (!linkTemplate) return false
  return (
    linkTemplate.label === preset.name
    && linkTemplate.color === preset.color
    && linkTemplate.style === preset.style
    && linkTemplate.direction === preset.direction
  )
}

interface RelationshipsEditorSubtoolbarProps {
  presets: RelationshipEdgePreset[]
  linkTemplate: RelationshipLinkTemplate | null
  onPresetSelect: (preset: RelationshipEdgePreset) => void
  onCustomType: () => void
}

function RelationshipsEditorSubtoolbar({ presets, linkTemplate, onPresetSelect, onCustomType }: RelationshipsEditorSubtoolbarProps) {
  const hasCustomActive = Boolean(linkTemplate && !presets.some((preset) => isPresetActive(preset, linkTemplate)))
  return (
    <div class="relationships-editor__subtoolbar" role="group" aria-label="Relationship type">
      {presets.map((preset) => (
        <button
          key={preset.name}
          type="button"
          class={`relationships-editor__preset${isPresetActive(preset, linkTemplate) ? ' is-active' : ''}`}
          aria-pressed={isPresetActive(preset, linkTemplate)}
          onClick={() => onPresetSelect(preset)}
        >
          <span class="relationships-editor__preset-swatch" style={{ backgroundColor: preset.color }} />
          {preset.name}
        </button>
      ))}
      <button
        type="button"
        class={`relationships-editor__preset relationships-editor__preset--custom${hasCustomActive ? ' is-active' : ''}`}
        onClick={onCustomType}
      >
        Custom…
      </button>
    </div>
  )
}

export function RelationshipsEditorToolbar({
  activeTool,
  presets,
  linkTemplate,
  readOnly,
  onToolChange,
  onPresetSelect,
  onCustomType,
}: RelationshipsEditorToolbarProps) {
  if (readOnly) return null

  return (
    <div class="relationships-editor__toolbar" role="toolbar" aria-label="Relationships chart tools">
      <button
        type="button"
        class={`relationships-editor__tool${activeTool === 'select' ? ' is-active' : ''}`}
        aria-pressed={activeTool === 'select'}
        onClick={() => onToolChange('select')}
      >
        Select / Move
      </button>
      <div class="relationships-editor__tool-group">
        <button
          type="button"
          class={`relationships-editor__tool${activeTool === 'add-relationship' ? ' is-active' : ''}`}
          aria-pressed={activeTool === 'add-relationship'}
          onClick={() => onToolChange('add-relationship')}
        >
          Add relationship
        </button>
        {activeTool === 'add-relationship' ? (
          <RelationshipsEditorSubtoolbar
            presets={presets}
            linkTemplate={linkTemplate}
            onPresetSelect={onPresetSelect}
            onCustomType={onCustomType}
          />
        ) : null}
      </div>
      <button
        type="button"
        class={`relationships-editor__tool${activeTool === 'remove-relationship' ? ' is-active' : ''}`}
        aria-pressed={activeTool === 'remove-relationship'}
        onClick={() => onToolChange('remove-relationship')}
      >
        Remove relationship
      </button>
    </div>
  )
}
