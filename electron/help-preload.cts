import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('tramaHelpApi', {
  getGettingStartedDismissed(): Promise<boolean> {
    return ipcRenderer.invoke('trama:help:get-getting-started-dismissed')
  },
  setGettingStartedDismissed(dismissed: boolean): Promise<void> {
    return ipcRenderer.invoke('trama:help:set-getting-started-dismissed', { dismissed })
  },
})
