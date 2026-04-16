export type SidebarFolderActionMode = 'rename' | 'delete'

interface SidebarFolderActionsDialogProps {
  mode: SidebarFolderActionMode | null
  targetPath: string | null
  renameValue: string
  onRenameValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function getCopy(mode: SidebarFolderActionMode) {
  if (mode === 'rename') {
    return {
      title: 'Rename Folder',
      confirmLabel: 'Rename',
      danger: false,
    }
  }

  return {
    title: 'Delete Folder',
    confirmLabel: 'Delete',
    danger: true,
  }
}

export function SidebarFolderActionsDialog({
  mode,
  targetPath,
  renameValue,
  onRenameValueChange,
  onConfirm,
  onCancel,
}: SidebarFolderActionsDialogProps) {
  if (!mode || !targetPath) {
    return null
  }

  const copy = getCopy(mode)

  return (
    <div class="sidebar-create-modal" onClick={onCancel}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{copy.title}</p>
        <p class="sidebar-create-dialog__hint">Target: {targetPath}</p>
        {mode === 'rename' ? (
          <label class="sidebar-create-dialog__field">
            <span>New folder name</span>
            <input type="text" value={renameValue} placeholder="Chapter-02" onInput={(event) => onRenameValueChange(event.currentTarget.value)} />
          </label>
        ) : (
          <p class="sidebar-create-dialog__hint">This action removes the folder and all nested files.</p>
        )}
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" class={`editor-button ${copy.danger ? 'editor-button--warning' : 'editor-button--primary'} editor-button--inline`} onClick={onConfirm}>
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
