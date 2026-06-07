/* eslint-disable max-lines-per-function */
import type { SidebarCreateInput } from '../../project-editor-types'
import type { FilteredTemplate } from '../../templates/templates-catalog-private/filter-template-paths'
import { TemplatePickerCombobox } from '../template-picker-combobox.tsx'

export type SidebarCreateMode = 'article' | 'category' | 'map'

interface SidebarCreateDialogProps {
  mode: SidebarCreateMode | null
  sectionTitle: string
  value: SidebarCreateInput
  onDirectoryChange: (value: string) => void
  onNameChange: (value: string) => void
  onSourceImagePathChange: (value: string) => void
  onBrowseSourceImage: () => Promise<void>
  onSubmit: () => void
  onCancel: () => void
  showTemplatePicker?: boolean
  templateSearchQuery?: string
  templateSelectedPath?: string | null
  filteredTemplates?: FilteredTemplate[]
  onTemplateSearchChange?: (value: string) => void
  onTemplateSelect?: (path: string | null) => void
}

function getDialogCopy(mode: SidebarCreateMode) {
  if (mode === 'article') {
    return {
      title: 'Create New Article',
      buttonLabel: 'Create article',
      nameLabel: 'Article name',
    }
  }

  if (mode === 'map') {
    return {
      title: 'Create New Map',
      buttonLabel: 'Create map',
      nameLabel: 'Map name',
    }
  }

  return {
    title: 'Create New Category',
    buttonLabel: 'Create category',
    nameLabel: 'Category name',
  }
}

export function SidebarCreateDialog({
  mode,
  sectionTitle,
  value,
  onDirectoryChange,
  onNameChange,
  onBrowseSourceImage,
  onSubmit,
  onCancel,
  showTemplatePicker = false,
  templateSearchQuery = '',
  templateSelectedPath = null,
  filteredTemplates = [],
  onTemplateSearchChange,
  onTemplateSelect,
}: SidebarCreateDialogProps) {
  if (!mode) {
    return null
  }

  const copy = getDialogCopy(mode)

  return (
    <div class="sidebar-create-modal" onClick={onCancel}>
      <div class="sidebar-create-dialog" role="dialog" aria-modal="true" aria-label={copy.title} onClick={(event) => event.stopPropagation()}>
        <p class="sidebar-create-dialog__title">{copy.title}</p>
        <p class="sidebar-create-dialog__hint">Section: {sectionTitle}</p>
        <label class="sidebar-create-dialog__field">
          <span>Folder (optional)</span>
          <input
            type="text"
            value={value.directory}
            placeholder="Act-01/Chapter-01"
            onInput={(event) => onDirectoryChange(event.currentTarget.value)}
          />
        </label>
        {showTemplatePicker && mode === 'article' && onTemplateSearchChange && onTemplateSelect && (
          <TemplatePickerCombobox
            filteredTemplates={filteredTemplates}
            searchQuery={templateSearchQuery}
            selectedPath={templateSelectedPath}
            onSearchChange={onTemplateSearchChange}
            onSelect={onTemplateSelect}
          />
        )}
        <label class="sidebar-create-dialog__field">
          <span>{copy.nameLabel}</span>
          <input
            type="text"
            value={value.name}
            placeholder={mode === 'article' ? 'Scene-001' : mode === 'map' ? 'World Map' : 'Locations'}
            onInput={(event) => onNameChange(event.currentTarget.value)}
          />
        </label>
        {mode === 'map' && (
          <label class="sidebar-create-dialog__field">
            <span>Map image</span>
            <div class="sidebar-create-dialog__browse-row">
              <input
                type="text"
                value={value.sourceImagePath}
                placeholder="No image selected"
                readOnly
              />
              <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={() => void onBrowseSourceImage()}>
                Browse...
              </button>
            </div>
          </label>
        )}
        <div class="sidebar-create-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" class="editor-button editor-button--primary editor-button--inline" onClick={onSubmit}>
            {copy.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

