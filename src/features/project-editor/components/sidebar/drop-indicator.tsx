export type DropIndicatorType = 'before' | 'after' | 'onFolder' | 'onSection'

export interface DropIndicatorPosition {
  type: DropIndicatorType
  targetPath?: string
  targetIndex?: number
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
        data-folder={position.targetPath}
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

  if ((position.type === 'before' || position.type === 'after') && position.targetIndex !== undefined) {
    return (
      <div
        class={`sidebar-drop-indicator is-line is-${position.type}`}
        data-target-index={position.targetIndex}
      />
    )
  }

  return null
}