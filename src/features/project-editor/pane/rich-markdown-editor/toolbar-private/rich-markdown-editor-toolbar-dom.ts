import {
  createCenterIconButton,
  createHistoryBackIconButton,
  createPagebreakIconButton,
  createRevertIconButton,
  createSaveIconButton,
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
  centerButton: HTMLButtonElement
  pagebreakButton: HTMLButtonElement
  toolbarRight: HTMLDivElement
  historyBackButton: HTMLButtonElement
  revertButton: HTMLButtonElement
  saveButton: HTMLButtonElement
  zoomSelect: HTMLSelectElement
}

export function attachToolbarElements(toolbar: HTMLElement): ToolbarElements {
  const centerButton = (toolbar.querySelector('button.ql-center-layout') ?? createCenterIconButton()) as HTMLButtonElement
  const pagebreakButton = (toolbar.querySelector('button.ql-pagebreak-layout') ?? createPagebreakIconButton()) as HTMLButtonElement
  const historyBackButton = (toolbar.querySelector('button.ql-history-back') ?? createHistoryBackIconButton()) as HTMLButtonElement
  const revertButton = (toolbar.querySelector('button.ql-revert-changes') ?? createRevertIconButton()) as HTMLButtonElement
  const saveButton = (toolbar.querySelector('button.ql-save-changes') ?? createSaveIconButton()) as HTMLButtonElement
  const zoomSelect = (toolbar.querySelector('select.ql-zoom-level') ?? createZoomSelect()) as HTMLSelectElement
  const baseGroups = readBaseGroups(toolbar)
  if (!baseGroups) {
    console.error('Could not find all required toolbar groups. Toolbar buttons may not be rendered correctly.', { toolbar });
    throw new Error('Toolbar initialization failed');
  }
  const leftToolbarElements = [historyBackButton, zoomSelect, baseGroups.header, baseGroups.inline, baseGroups.clean, baseGroups.blocks, centerButton, baseGroups.media, pagebreakButton]
  toolbar.append(...leftToolbarElements);

  const toolbarRight = ensureToolbarRight(toolbar, [revertButton, saveButton])
  toolbar.append(toolbarRight);
  return { centerButton, pagebreakButton, toolbarRight, historyBackButton, revertButton, saveButton, zoomSelect };
}

function ensureToolbarRight(
  toolbar: HTMLElement,
  elements : HTMLElement[]
): HTMLDivElement {
  let rightContainer = toolbar.querySelector('.rich-toolbar-right') as HTMLDivElement | null
  if (!rightContainer) {
    rightContainer = document.createElement('div')
    rightContainer.className = 'rich-toolbar-right'
  }
  rightContainer.append(...elements)
  return rightContainer
}

function readBaseGroups(toolbar: HTMLElement): ToolbarBaseGroups | null {
  const formatGroups = Array.from(toolbar.children).filter((child): child is HTMLElement => {
    return child instanceof HTMLElement && child.classList.contains('ql-formats')
  })
  const [header, inline, blocks, media, clean] = formatGroups
  return header && inline && blocks && media && clean ? { header, inline, blocks, media, clean } : null
}


