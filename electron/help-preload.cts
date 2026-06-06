import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tramaHelpApi', {
  dismissGettingStarted(): Promise<void> {
    return ipcRenderer.invoke('trama:help:dismiss-getting-started')
  },
})
