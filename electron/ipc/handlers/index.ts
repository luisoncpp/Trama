export { buildPingResponse } from './ping-handler.js'
export {
  handleCreateDocument,
  handleCreateFolder,
  handleDeleteDocument,
  handleGetIndex,
  handleOpenProject,
  handleReadDocument,
  handleRenameDocument,
  handleSaveDocument,
  handleSelectProjectFolder,
} from './project-handlers/index.js'
export { configureMainWindowResolver, shutdownIpcServices } from '../../ipc-runtime.js'
