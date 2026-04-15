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
export {
  handleAiImportPreview,
  handleAiImport,
  handleAiExport,
} from './ai-handlers.js'
export { handleBookExport } from './book-export-handler.js'
export { handleTagGetIndex, handleTagResolve } from './tag-handlers.js'
export { configureMainWindowResolver, shutdownIpcServices, getActiveTagIndexService } from '../../ipc-runtime.js'
