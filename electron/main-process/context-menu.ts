import { BrowserWindow, Menu } from 'electron'
import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron'

function buildContextMenuTemplate(
  win: BrowserWindow,
  params: ContextMenuParams,
): MenuItemConstructorOptions[] {
  const template: MenuItemConstructorOptions[] = []

  if (params.misspelledWord) {
    const suggestions = params.dictionarySuggestions || []
    if (suggestions.length > 0) {
      suggestions.slice(0, 5).forEach((suggestion: string) => {
        template.push({
          label: suggestion,
          click: () => {
            win.webContents.replaceMisspelling(suggestion)
          },
        })
      })
      template.push({ type: 'separator' })
    }

    template.push({
      label: 'Agregar al diccionario',
      click: () => {
        win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      },
    })
    template.push({ type: 'separator' })
  }

  if (params.isEditable) {
    template.push({ label: 'Cortar', role: 'cut' })
    template.push({ label: 'Copiar', role: 'copy' })
    template.push({ label: 'Pegar', role: 'paste' })
  } else if (params.selectionText) {
    template.push({ label: 'Copiar', role: 'copy' })
  }

  return template
}

export function setupContextMenu(win: BrowserWindow): void {
  win.webContents.on('context-menu', (_event, params) => {
    const template = buildContextMenuTemplate(win, params)
    if (template.length === 0) {
      return
    }

    const menu = Menu.buildFromTemplate(template)
    menu.popup({ window: win })
  })
}
