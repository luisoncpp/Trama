interface AiExportStagingChipsProps {
  selectedPaths: string[]
  exporting: boolean
  focusedIndex: number | null
  onFocusIndexChange: (index: number | null) => void
  onRemovePath: (index: number) => void
  onKeyDown: (event: KeyboardEvent) => void
}

function getShortFilename(relativePath: string): string {
  const segments = relativePath.split('/')
  return segments[segments.length - 1] ?? relativePath
}

function AiExportStagingChip({
  filePath,
  index,
  focusedIndex,
  exporting,
  onRemovePath,
}: {
  filePath: string
  index: number
  focusedIndex: number | null
  exporting: boolean
  onRemovePath: (index: number) => void
}) {
  return (
    <span
      class={`ai-export-dialog__basket-chip${focusedIndex === index ? ' ai-export-dialog__basket-chip--focused' : ''}`}
      role="option"
      aria-selected={focusedIndex === index}
      title={filePath}
    >
      <span class="ai-export-dialog__basket-chip-label">{getShortFilename(filePath)}</span>
      <button
        type="button"
        class="ai-export-dialog__basket-chip-remove"
        aria-label={`Remove ${filePath}`}
        disabled={exporting}
        onClick={() => onRemovePath(index)}
      >
        ×
      </button>
    </span>
  )
}

export function AiExportStagingChips({
  selectedPaths,
  exporting,
  focusedIndex,
  onFocusIndexChange,
  onRemovePath,
  onKeyDown,
}: AiExportStagingChipsProps) {
  if (selectedPaths.length === 0) {
    return <p class="ai-export-dialog__basket-empty">No files in the staging basket. Use Add Files or Add Folder.</p>
  }

  return (
    <div
      class="ai-export-dialog__basket-chips"
      tabIndex={0}
      role="listbox"
      aria-label="Staging basket"
      aria-multiselectable="false"
      onKeyDown={onKeyDown}
      onFocus={() => {
        if (focusedIndex === null && selectedPaths.length > 0) {
          onFocusIndexChange(0)
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (next && (event.currentTarget as HTMLElement).contains(next)) {
          return
        }
        onFocusIndexChange(null)
      }}
    >
      {selectedPaths.map((filePath, index) => (
        <AiExportStagingChip
          key={filePath}
          filePath={filePath}
          index={index}
          focusedIndex={focusedIndex}
          exporting={exporting}
          onRemovePath={onRemovePath}
        />
      ))}
    </div>
  )
}
