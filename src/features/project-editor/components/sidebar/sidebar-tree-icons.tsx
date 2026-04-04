export function TreeChevron({ expanded }: { expanded: boolean }) {
  return (
    <span class={`sidebar-tree__chevron ${expanded ? 'is-expanded' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          d="M6 3l5 5-5 5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  )
}

export function TreeNodeIcon({ type }: { type: 'folder' | 'file' }) {
  if (type === 'folder') {
    return (
      <span class="sidebar-tree__icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <path
            d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h4.2c.4 0 .78.16 1.06.44l1 1c.28.28.66.44 1.06.44H16a1.5 1.5 0 0 1 1.5 1.5v7.12A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V5.5Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span class="sidebar-tree__icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" focusable="false">
        <path
          d="M5 3.5h6.5L15.5 7v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16V5A1.5 1.5 0 0 1 5 3.5Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
        <path d="M11.5 3.5V7h4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
      </svg>
    </span>
  )
}
