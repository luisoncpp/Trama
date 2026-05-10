export type SidebarFileActionMode = 'rename' | 'delete' | 'edit-tags'

interface SidebarFileActionsDialogProps {
  mode: SidebarFileActionMode | null
  targetPath: string | null
  renameValue: string
  tagsValue: string
  loadingTags: boolean
  loadingDeleteInfo?: boolean
  linkedImagePaths?: string[]
  deleteAssociatedImages?: boolean
  onRenameValueChange: (value: string) => void
  onTagsValueChange: (value: string) => void
  onDeleteAssociatedImagesChange?: (value: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}

function getCopy(mode: SidebarFileActionMode) {
  if (mode === 'rename') {
    return {
      title: 'Rename File',
      confirmLabel: 'Rename',
      danger: false,
    }
  }

  if (mode === 'edit-tags') {
    return {
      title: 'Edit Tags',
      confirmLabel: 'Save Tags',
      danger: false,
    }
  }

  return {
    title: 'Delete File',
    confirmLabel: 'Delete',
    danger: true,
  }
}

function SidebarFileActionsDialogField({
  mode,
  renameValue,
  tagsValue,
  loadingTags,
  loadingDeleteInfo,
  linkedImagePaths,
  deleteAssociatedImages,
  onRenameValueChange,
  onTagsValueChange,
  onDeleteAssociatedImagesChange,
}: Pick<
  SidebarFileActionsDialogProps,
  'mode' | 'renameValue' | 'tagsValue' | 'loadingTags' | 'loadingDeleteInfo' | 'linkedImagePaths' | 'deleteAssociatedImages' | 'onRenameValueChange' | 'onTagsValueChange' | 'onDeleteAssociatedImagesChange'
>) {
  const safeLinkedImagePaths = linkedImagePaths ?? []
  const safeDeleteAssociatedImages = deleteAssociatedImages ?? false

  if (mode === 'rename') {
    return (
      <label class="sidebar-create-dialog__field">
        <span>New file name</span>
        <input type="text" value={renameValue} placeholder="Scene-002.md" onInput={(event) => onRenameValueChange(event.currentTarget.value)} />
      </label>
    )
  }

  if (mode === 'edit-tags') {
    return (
      <label class="sidebar-create-dialog__field">
        <span>Tags (comma or newline separated)</span>
        <textarea
          value={tagsValue}
          placeholder={'magic, north\nselene valeria'}
          rows={4}
          onInput={(event) => onTagsValueChange(event.currentTarget.value)}
          disabled={loadingTags}
        />
        <span>{loadingTags ? 'Loading tags...' : 'Duplicates are removed automatically.'}</span>
      </label>
    )
  }

  if (loadingDeleteInfo) {
    return <p class="sidebar-create-dialog__hint">Checking for associated images...</p>
  }

  if (safeLinkedImagePaths.length > 0) {
    return (
      <label class="sidebar-create-dialog__field">
        <span>This action cannot be undone.</span>
        <label>
          <input
            type="checkbox"
            checked={safeDeleteAssociatedImages}
            onInput={(event) => onDeleteAssociatedImagesChange?.(event.currentTarget.checked)}
          />
          Delete {safeLinkedImagePaths.length} associated image{safeLinkedImagePaths.length === 1 ? '' : 's'} from res/
        </label>
      </label>
    )
  }

  return <p class="sidebar-create-dialog__hint">This action cannot be undone.</p>
}

export function SidebarFileActionsDialog({
  mode,
  targetPath,
  renameValue,
  tagsValue,
  loadingTags,
  loadingDeleteInfo,
  linkedImagePaths,
  deleteAssociatedImages,
  onRenameValueChange,
  onTagsValueChange,
  onDeleteAssociatedImagesChange,
  onConfirm,
  onCancel,
}: SidebarFileActionsDialogProps) {
  if (!mode || !targetPath) {
    return null
  }

  const copy = getCopy(mode)

  return (
    <div class="sidebar-create-modal" onClick={onCancel}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{copy.title}</p>
        <p class="sidebar-create-dialog__hint">Target: {targetPath}</p>
        <SidebarFileActionsDialogField
          mode={mode}
          renameValue={renameValue}
          tagsValue={tagsValue}
          loadingTags={loadingTags}
          loadingDeleteInfo={loadingDeleteInfo}
          linkedImagePaths={linkedImagePaths}
          deleteAssociatedImages={deleteAssociatedImages}
          onRenameValueChange={onRenameValueChange}
          onTagsValueChange={onTagsValueChange}
          onDeleteAssociatedImagesChange={onDeleteAssociatedImagesChange}
        />
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
