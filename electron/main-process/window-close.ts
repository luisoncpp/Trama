import type { BrowserWindow } from 'electron'
import { dialog } from 'electron'
import { getMainWindowHasUnsavedChanges } from '../ipc.js'

function handleSaveAndClose(win: BrowserWindow): Promise<void> {
  return win.webContents
    .executeJavaScript('window.__tramaSaveAll && window.__tramaSaveAll()', true)
    .then(() => undefined)
}

export function configureWindowCloseBehavior(win: BrowserWindow): void {
  let forceClose = false

  win.on('close', (event) => {
    if (forceClose) return

    event.preventDefault()

    const hasUnsaved = getMainWindowHasUnsavedChanges()

    if (!hasUnsaved) {
      forceClose = true
      win.destroy()
      return
    }

    dialog
      .showMessageBox(win, {
        type: 'warning',
        title: 'Cambios sin guardar',
        message: 'Hay cambios sin guardar.',
        detail: '¿Deseas guardar los cambios antes de cerrar?',
        buttons: ['Guardar y cerrar', 'Cerrar sin guardar', 'Cancelar'],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
      })
      .then((result) => {
        if (result.response === 2) {
          return Promise.reject(new Error('CANCELLED'))
        }

        if (result.response === 0) {
          return handleSaveAndClose(win)
        }

        return undefined
      })
      .then(() => {
        forceClose = true
        win.destroy()
      })
      .catch((err) => {
        if (err?.message === 'CANCELLED') return
        forceClose = true
        win.destroy()
      })
  })
}
