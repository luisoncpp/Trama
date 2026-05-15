import type Quill from 'quill'

export type RichEditorSyncState = 'clean' | 'dirty' | 'saving' | 'disabled'

export function createToolbarIconButton(className: string, title: string, iconMarkup: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.title = title
  button.setAttribute('aria-label', title)
  button.innerHTML = iconMarkup
  return button
}

export function createCenterIconButton(): HTMLButtonElement {
  return createToolbarIconButton(
    'ql-center-layout',
    'Centrar bloque',
    [
      '<svg class="rich-toolbar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">',
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M8 12h8M6 18h12" />',
      '</svg>',
    ].join(''),
  )
}

export function createPagebreakIconButton(): HTMLButtonElement {
  return createToolbarIconButton(
    'ql-pagebreak-layout',
    'Insertar salto de pagina',
    [
      '<svg class="rich-toolbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '<path d="M3 10h18" stroke-dasharray="4 4" />',
      '<path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4" />',
      '<path d="M5 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />',
      '</svg>',
    ].join(''),
  )
}

export function createRevertIconButton(): HTMLButtonElement {
  return createToolbarIconButton(
    'ql-revert-changes',
    'Revertir cambios no guardados',
    [
      '<svg class="rich-toolbar-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '<polyline points="1 4 1 10 7 10" />',
      '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />',
      '</svg>',
    ].join(''),
  )
}

export function createZoomSelect(): HTMLSelectElement {
  const select = document.createElement('select')
  select.className = 'ql-zoom-level'
  select.title = 'Zoom'
  select.setAttribute('aria-label', 'Zoom')

  const zoomOptions = [
    { value: '0.5', label: '50%' },
    { value: '0.75', label: '75%' },
    { value: '1.0', label: '100%' },
    { value: '1.25', label: '125%' },
    { value: '1.5', label: '150%' },
    { value: '1.75', label: '175%' },
    { value: '2.0', label: '200%' },
  ]

  for (const option of zoomOptions) {
    const opt = document.createElement('option')
    opt.value = option.value
    opt.textContent = option.label
    select.appendChild(opt)
  }

  return select
}

export function isEditorInteractive(editor: Quill | null): boolean {
  if (!editor) {
    return false
  }

  const maybeEditor = editor as Quill & { isEnabled?: () => boolean }
  if (typeof maybeEditor.isEnabled === 'function') {
    return maybeEditor.isEnabled()
  }

  return true
}

export const ZOOM_PAIRS: Array<[number, string]> = [
  [0.5, '0.5'],
  [0.75, '0.75'],
  [1.0, '1.0'],
  [1.25, '1.25'],
  [1.5, '1.5'],
  [1.75, '1.75'],
  [2.0, '2.0'],
]

export function normalizeZoomValue(zoomLevel: number | undefined): string {
  const normalizedZoom = zoomLevel ?? 1.0
  const found = ZOOM_PAIRS.find(([num]) => Math.abs(num - normalizedZoom) < 0.001)
  return found ? found[1] : String(normalizedZoom)
}
