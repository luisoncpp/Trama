export type DropIndicatorType = 'between' | 'onFolder' | 'onSection'

export interface DropIndicatorPosition {
  type: DropIndicatorType
  folderPath?: string
  beforeIndex?: number
}

interface DropIndicatorProps {
  position: DropIndicatorPosition | null
}

export function DropIndicator({ position }: DropIndicatorProps) {
  if (!position) return null

  if (position.type === 'onFolder') {
    return (
      <div
        class="sidebar-drop-indicator is-folder-highlight"
        data-folder={position.folderPath}
      />
    )
  }

  if (position.type === 'between' && position.beforeIndex !== undefined) {
    return (
      <div
        class="sidebar-drop-indicator is-between"
        data-before-index={position.beforeIndex}
      />
    )
  }

  if (position.type === 'onSection') {
    return (
      <div
        class="sidebar-drop-indicator is-section-root"
      />
    )
  }

  return null
}
