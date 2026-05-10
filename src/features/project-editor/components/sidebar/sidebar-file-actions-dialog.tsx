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

function RenameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label class="sidebar-create-dialog__field">
      <span>New file name</span>
      <input type="text" value={value} placeholder="Scene-002.md" onInput={(event) => onChange(event.currentTarget.value)} />
    </label>
  )
}

function EditTagsField({ value, onChange, loadingTags }: { value: string; onChange: (v: string) => void; loadingTags: boolean }) {
  return (
    <label class="sidebar-create-dialog__field">
      <span>Tags (comma or newline separated)</span>
      <textarea
        value={value}
        placeholder={'magic, north\nselene valeria'}
        rows={4}
        onInput={(event) => onChange(event.currentTarget.value)}
        disabled={loadingTags}
      />
      <span>{loadingTags ? 'Loading tags...' : 'Duplicates are removed automatically.'}</span>
    </label>
  )
}

function DeleteImageCheckbox({
  linkedImagePaths,
  deleteAssociatedImages,
  onDeleteAssociatedImagesChange,
}: {
  linkedImagePaths: string[]
  deleteAssociatedImages: boolean
  onDeleteAssociatedImagesChange?: (value: boolean) => void
}) {
  return (
    <label class="sidebar-create-dialog__field">
      <span>This action cannot be undone.</span>
      <label>
        <input
          type="checkbox"
          checked={deleteAssociatedImages}
          onInput={(event) => onDeleteAssociatedImagesChange?.(event.currentTarget.checked)}
        />
        Delete {linkedImagePaths.length} associated image{linkedImagePaths.length === 1 ? '' : 's'} from res/
      </label>
    </label>
  )
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
  if (mode === 'rename') {
    return <RenameField value={renameValue} onChange={onRenameValueChange} />
  }

  if (mode === 'edit-tags') {
    return <EditTagsField value={tagsValue} onChange={onTagsValueChange} loadingTags={loadingTags} />
  }

  if (loadingDeleteInfo) {
    return <p class="sidebar-create-dialog__hint">Checking for associated images...</p>
  }

  const safeLinkedImagePaths = linkedImagePaths ?? []
  if (safeLinkedImagePaths.length > 0) {
    return (
      <DeleteImageCheckbox
        linkedImagePaths={safeLinkedImagePaths}
        deleteAssociatedImages={deleteAssociatedImages ?? false}
        onDeleteAssociatedImagesChange={onDeleteAssociatedImagesChange}
      />
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
