interface SidebarFooterActionsProps {
  disabled: boolean
  onCreateArticle: () => void
  onCreateCategory: () => void
}

export function SidebarFooterActions({ disabled, onCreateArticle, onCreateCategory }: SidebarFooterActionsProps) {
  return (
    <div class="sidebar-footer-actions">
      <button
        type="button"
        class="editor-button editor-button--secondary editor-button--inline"
        disabled={disabled}
        onClick={onCreateArticle}
      >
        + Article
      </button>
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