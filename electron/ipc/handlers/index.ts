export { buildPingResponse } from './ping-handler.js'
export {
  handleCreateDocument,
  handleCreateFolder,
  handleGetIndex,
  handleOpenProject,
  handleReadDocument,
  handleSaveDocument,
  handleSelectProjectFolder,
} from './project-handlers/index.js'
export { configureMainWindowResolver, shutdownIpcServices } from '../../ipc-runtime.js'
