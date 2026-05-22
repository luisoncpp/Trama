import {
  createCenterIconButton,
  createHistoryBackIconButton,
  createPagebreakIconButton,
  createRevertIconButton,
  createZoomSelect,
} from './rich-markdown-editor-toolbar-helpers'

interface ToolbarBaseGroups {
  header: HTMLElement
  inline: HTMLElement
  blocks: HTMLElement
  media: HTMLElement
  clean: HTMLElement
}

export interface ToolbarElements {
  toolbar: HTMLElement
  centerButton: HTMLButtonElement
  pagebreakButton: HTMLButtonElement
  historyBackButton: HTMLButtonElement
  revertButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  syncIcon: HTMLSpanElement
  zoomSelect: HTMLSelectElement
}

export function attachToolbarElements(toolbar: HTMLElement): ToolbarElements {
  const layoutGroup = ensureLayoutGroup(toolbar)
  const controls = ensureControls(toolbar)
  const elements = {
    toolbar,
    centerButton: (layoutGroup.querySelector('button.ql-center-layout') ?? createCenterIconButton()) as HTMLButtonElement,
    pagebreakButton: (layoutGroup.querySelector('button.ql-pagebreak-layout') ?? createPagebreakIconButton()) as HTMLButtonElement,
    historyBackButton: (controls.querySelector('button.ql-history-back') ?? createHistoryBackIconButton()) as HTMLButtonElement,
    revertButton: (controls.querySelector('button.ql-revert-changes') ?? createRevertIconButton()) as HTMLButtonElement,
    saveButton: (controls.querySelector('button[data-trama-action="save"]') ?? createSaveButton()) as HTMLButtonElement,
    syncIcon: (controls.querySelector('.rich-toolbar-sync') ?? createSyncIcon()) as HTMLSpanElement,
    zoomSelect: (toolbar.querySelector('select.ql-zoom-level') as HTMLSelectElement | null) ?? createZoomSelect(),
  }
  applyToolbarOrder(toolbar, layoutGroup, elements.zoomSelect, controls)
  return elements
}

export function applyToolbarOrder(
  toolbar: HTMLElement,
  layoutGroup: HTMLDivElement,
  zoomSelect: HTMLSelectElement,
  controls: HTMLDivElement,
): void {
  const baseGroups = readBaseGroups(toolbar)
  if (!baseGroups) return
  const orderedChildren = [
    zoomSelect,
    baseGroups.header,
    baseGroups.inline,
    baseGroups.blocks,
    baseGroups.media,
    baseGroups.clean,
    layoutGroup,
    controls,
  ]
  for (const child of orderedChildren) {
    toolbar.append(child)
  }
}

function ensureLayoutGroup(toolbar: HTMLElement): HTMLDivElement {
  let layoutGroup = toolbar.querySelector('.rich-toolbar-layout-group') as HTMLDivElement | null
  if (!layoutGroup) {
    layoutGroup = document.createElement('div')
    layoutGroup.className = 'ql-formats rich-toolbar-layout-group'
  }
  const centerButton = layoutGroup.querySelector('button.ql-center-layout') ?? createCenterIconButton()
  const pagebreakButton = layoutGroup.querySelector('button.ql-pagebreak-layout') ?? createPagebreakIconButton()
  layoutGroup.append(centerButton, pagebreakButton)
  return layoutGroup
}

function ensureControls(toolbar: HTMLElement): HTMLDivElement {
  let controls = toolbar.querySelector('.rich-toolbar-controls') as HTMLDivElement | null
  if (!controls) {
    controls = document.createElement('div')
    controls.className = 'rich-toolbar-controls'
  }
  controls.append(
    controls.querySelector('button.ql-history-back') ?? createHistoryBackIconButton(),
    controls.querySelector('button.ql-revert-changes') ?? createRevertIconButton(),
    controls.querySelector('button[data-trama-action="save"]') ?? createSaveButton(),
    controls.querySelector('.rich-toolbar-sync') ?? createSyncIcon(),
  )
  return controls
}

function readBaseGroups(toolbar: HTMLElement): ToolbarBaseGroups | null {
  const formatGroups = Array.from(toolbar.children).filter((child): child is HTMLElement => {
    return child instanceof HTMLElement
      && child.classList.contains('ql-formats')
      && !child.classList.contains('rich-toolbar-layout-group')
  })
  const [header, inline, blocks, media, clean] = formatGroups
  return header && inline && blocks && media && clean ? { header, inline, blocks, media, clean } : null
}

function createSaveButton(): HTMLButtonElement {
  const saveButton = document.createElement('button')
  saveButton.type = 'button'
  saveButton.className = 'editor-button editor-button--secondary editor-button--inline'
  saveButton.dataset.tramaAction = 'save'
  return saveButton
}

function createSyncIcon(): HTMLSpanElement {
  const syncIcon = document.createElement('span')
  syncIcon.className = 'rich-toolbar-sync is-disabled'
  syncIcon.setAttribute('role', 'status')
  return syncIcon
}
