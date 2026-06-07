import { contextBridge, ipcRenderer } from 'electron'
import {
  assertGettingStartedDismissedSaved,
  unwrapGettingStartedDismissed,
} from '../src/shared/help-getting-started-ipc-bridge.js'

contextBridge.exposeInMainWorld('tramaHelpApi', {
  getGettingStartedDismissed(): Promise<boolean> {
    return ipcRenderer
      .invoke('trama:help:get-getting-started-dismissed')
      .then(unwrapGettingStartedDismissed)
  },
  setGettingStartedDismissed(dismissed: boolean): Promise<void> {
    return ipcRenderer
      .invoke('trama:help:set-getting-started-dismissed', { dismissed })
      .then(assertGettingStartedDismissedSaved)
  },
})
