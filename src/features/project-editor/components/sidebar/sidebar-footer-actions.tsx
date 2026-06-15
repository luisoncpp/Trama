/* eslint-disable max-lines-per-function */
import { useEffect, useRef, useState } from 'preact/hooks'

interface SidebarFooterActionsProps {
  disabled: boolean
  onCreateArticle: () => void
  onCreateMap?: () => void
  onCreateRelationships?: () => void
  onCreateCategory: () => void
}

export function SidebarFooterActions({
  disabled,
  onCreateArticle,
  onCreateMap,
  onCreateRelationships,
  onCreateCategory,
}: SidebarFooterActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(/* closeSplitMenuOnOutsidePointerDown */ () => {
    if (!menuOpen) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return
      }

      setMenuOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [menuOpen] /*Inputs for closeSplitMenuOnOutsidePointerDown*/)

  return (
    <div class="sidebar-footer-actions">
      {onCreateMap || onCreateRelationships ? (
        <div class="sidebar-split-button" ref={menuRef}>
          <button
            type="button"
            class="editor-button editor-button--secondary editor-button--inline sidebar-split-button__main"
            disabled={disabled}
            onClick={onCreateArticle}
          >
            + Article
          </button>
          <button
            type="button"
            class="editor-button editor-button--secondary editor-button--inline sidebar-split-button__toggle"
            disabled={disabled}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label="Article creation options"
            title="Article creation options"
            aria-expanded={menuOpen ? 'true' : 'false'}
            aria-haspopup="menu"
          >
            ▼
          </button>
          {menuOpen && !disabled && (
            <div class="sidebar-split-button__menu" role="menu" aria-label="Article creation options">
              {onCreateMap && (
                <button
                  type="button"
                  class="sidebar-split-button__menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onCreateMap()
                  }}
                >
                  Create map
                </button>
              )}
              {onCreateRelationships && (
                <button
                  type="button"
                  class="sidebar-split-button__menu-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onCreateRelationships()
                  }}
                >
                  Create relationships chart
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          class="editor-button editor-button--secondary editor-button--inline"
          disabled={disabled}
          onClick={onCreateArticle}
        >
          + Article
        </button>
      )}
      <button
        type="button"
        class="editor-button editor-button--secondary editor-button--inline"
        disabled={disabled}
        onClick={onCreateCategory}
      >
        + Category
      </button>
    </div>
  )
}

