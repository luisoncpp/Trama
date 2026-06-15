import type {
  RelationshipEdgeDirection,
  RelationshipEdgePreset,
  RelationshipLinkTemplate,
  RelationshipsEditorTool,
} from './relationships-editor-types'

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

function ToolIconSelect() {
  return (
    <svg class="relationships-editor__tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

function ToolIconAddLink() {
  return (
    <svg class="relationships-editor__tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  )
}

function ToolIconRemoveLink() {
  return (
    <svg class="relationships-editor__tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <path d="M9 12h6" />
    </svg>
  )
}

function PresetDirectionGlyph({ direction }: { direction: RelationshipEdgeDirection }) {
  const glyph = direction === 'forward' ? '→' : direction === 'both' ? '↔' : '—'
  return <span class="relationships-editor__preset-direction" aria-hidden="true">{glyph}</span>
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
      <span class="relationships-editor__subtoolbar-label">Edge type</span>
      <div class="relationships-editor__preset-strip">
        {presets.map((preset) => {
          const active = isPresetActive(preset, linkTemplate)
          return (
            <button
              key={preset.name}
              type="button"
              class={`relationships-editor__preset${active ? ' is-active' : ''}`}
              aria-pressed={active}
              style={{ '--preset-color': preset.color } as Record<string, string>}
              onClick={() => onPresetSelect(preset)}
            >
              <span class="relationships-editor__preset-swatch" style={{ backgroundColor: preset.color }} />
              <span class="relationships-editor__preset-copy">
                <span class="relationships-editor__preset-name">{preset.name}</span>
                <PresetDirectionGlyph direction={preset.direction} />
              </span>
            </button>
          )
        })}
        <button
          type="button"
          class={`relationships-editor__preset relationships-editor__preset--custom${hasCustomActive ? ' is-active' : ''}`}
          aria-pressed={hasCustomActive}
          onClick={onCustomType}
        >
          <span class="relationships-editor__preset-swatch relationships-editor__preset-swatch--custom" />
          <span class="relationships-editor__preset-copy">
            <span class="relationships-editor__preset-name">Custom…</span>
          </span>
        </button>
      </div>
    </div>
  )
}

const TOOL_ITEMS: Array<{ id: RelationshipsEditorTool; label: string; icon: () => JSX.Element; modifier?: string }> = [
  { id: 'select', label: 'Select', icon: ToolIconSelect },
  { id: 'add-relationship', label: 'Connect', icon: ToolIconAddLink },
  { id: 'remove-relationship', label: 'Remove', icon: ToolIconRemoveLink, modifier: 'remove' },
]

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
      <div class="relationships-editor__tool-strip" role="group" aria-label="Chart mode">
        {TOOL_ITEMS.map(({ id, label, icon: Icon, modifier }) => (
          <button
            key={id}
            type="button"
            class={`relationships-editor__tool${activeTool === id ? ' is-active' : ''}${modifier ? ` relationships-editor__tool--${modifier}` : ''}`}
            aria-pressed={activeTool === id}
            onClick={() => onToolChange(id)}
          >
            <Icon />
            <span class="relationships-editor__tool-label">{label}</span>
          </button>
        ))}
      </div>
      {activeTool === 'add-relationship' ? (
        <RelationshipsEditorSubtoolbar
          presets={presets}
          linkTemplate={linkTemplate}
          onPresetSelect={onPresetSelect}
          onCustomType={onCustomType}
        />
      ) : null}
    </div>
  )
}
