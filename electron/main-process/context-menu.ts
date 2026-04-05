import { BrowserWindow, Menu } from 'electron'
import type { ContextMenuParams, MenuItemConstructorOptions } from 'electron'

function triggerSplitLayoutToggle(win: BrowserWindow): void {
  const modifierKey = process.platform === 'darwin' ? 'metaKey' : 'ctrlKey'
  void win.webContents.executeJavaScript(
    `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Period', ${modifierKey}: true, bubbles: true }));`,
    true,
  )
}

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
      label: 'Add to Dictionary',
      click: () => {
        win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      },
    })
    template.push({ type: 'separator' })
  }

  if (params.isEditable) {
    template.push({ label: 'Cut', role: 'cut' })
    template.push({ label: 'Copy', role: 'copy' })
    template.push({ label: 'Paste', role: 'paste' })
    template.push({ type: 'separator' })
    template.push({
      label: 'Toggle Split Layout',
      accelerator: 'CmdOrCtrl+.',
      click: () => {
        triggerSplitLayoutToggle(win)
      },
    })
  } else if (params.selectionText) {
    template.push({ label: 'Copy', role: 'copy' })
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
