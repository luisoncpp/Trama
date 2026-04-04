import { contextBridge, ipcRenderer } from 'electron'
import type { IpcEnvelope, PingRequest, PingResponse } from '../src/shared/ipc'

const IPC_PING_CHANNEL = 'trama:ping'

const tramaApi = {
  ping(payload: PingRequest): Promise<IpcEnvelope<PingResponse>> {
    return ipcRenderer.invoke(IPC_PING_CHANNEL, payload)
  },
}

contextBridge.exposeInMainWorld('tramaApi', tramaApi)
