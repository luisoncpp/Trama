import type { BrowserWindow, IpcMain } from 'electron'
import {
  IPC_CHANNELS,
  type AiImportRequest,
  type AiExportRequest,
  type BookExportRequest,
  type ZuluImportPreviewRequest,
  type ZuluImportRequest,
} from '../src/shared/ipc.js'
import {
  handleCreateDocument,
  handleCreateMapDocument,
  handleCreateFolder,
  handleDeleteFolder,
  handleDeleteDocument,
  handleMoveFolder,
  handleGetIndex,
  handleOpenProject,
  handleCloseProject,
  handleRevealProjectInFileManager,
  handleReadDocument,
  handleReadImageFile,
  handleRenameDocument,
  handleRenameFolder,
  handleSaveDocument,
  handleSelectMapImage,
  handleSelectProjectFolder,
  handleValidateProjectFolder,
  handleAiImportPreview,
  handleAiImport,
  handleAiExport,
  handleAiExportPickStaging,
  handleBookExport,
  handleGitHistoryStatus,
  handleListDocumentRevisions,
  handleLoadDocumentRevision,
  handleReadDocumentRevision,
  handleSaveGitSnapshot,
  handleTagGetIndex,
  handleTagResolve,
  handleReorderFiles,
  handleMoveFile,
  handleZuluSelectFile,
  handleZuluImportPreview,
  handleZuluImport,
  handleOpenHelp,
  handleGetGettingStartedDismissed,
  handleSetGettingStartedDismissed,
} from './ipc/handlers/index.js'

export function registerProjectHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.openProject, (_event, payload) => handleOpenProject(payload))
  ipcMain.handle(IPC_CHANNELS.closeProject, () => handleCloseProject())
  ipcMain.handle(IPC_CHANNELS.revealProjectInFileManager, (_event, payload) => handleRevealProjectInFileManager(payload))
  ipcMain.handle(IPC_CHANNELS.selectProjectFolder, () => handleSelectProjectFolder())
  ipcMain.handle(IPC_CHANNELS.validateProjectFolder, (_event, payload) => handleValidateProjectFolder(payload))
  ipcMain.handle(IPC_CHANNELS.getIndex, () => handleGetIndex())
  ipcMain.handle(IPC_CHANNELS.reorderFiles, (_event, payload) => handleReorderFiles(payload))
  ipcMain.handle(IPC_CHANNELS.moveFile, (_event, payload) => handleMoveFile(payload))
}

export function registerDocumentHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.readDocument, (_event, payload) => handleReadDocument(payload))
  ipcMain.handle(IPC_CHANNELS.readImageFile, (_event, payload) => handleReadImageFile(payload))
  ipcMain.handle(IPC_CHANNELS.saveDocument, (_event, payload) => handleSaveDocument(payload))
  ipcMain.handle(IPC_CHANNELS.createDocument, (_event, payload) => handleCreateDocument(payload))
  ipcMain.handle(IPC_CHANNELS.createMapDocument, (_event, payload) => handleCreateMapDocument(payload))
  ipcMain.handle(IPC_CHANNELS.selectMapImage, () => handleSelectMapImage())
  ipcMain.handle(IPC_CHANNELS.renameDocument, (_event, payload) => handleRenameDocument(payload))
  ipcMain.handle(IPC_CHANNELS.deleteDocument, (_event, payload) => handleDeleteDocument(payload))
}

export function registerFolderHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.createFolder, (_event, payload) => handleCreateFolder(payload))
  ipcMain.handle(IPC_CHANNELS.renameFolder, (_event, payload) => handleRenameFolder(payload))
  ipcMain.handle(IPC_CHANNELS.deleteFolder, (_event, payload) => handleDeleteFolder(payload))
  ipcMain.handle(IPC_CHANNELS.moveFolder, (_event, payload) => handleMoveFolder(payload))
}

export function registerAiHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.aiImport, (_event, payload: AiImportRequest) => {
    return handleAiImport(_event, payload)
  })
  ipcMain.handle(IPC_CHANNELS.aiImportPreview, (_event, payload: AiImportRequest) => {
    return handleAiImportPreview(_event, payload)
  })
  ipcMain.handle(IPC_CHANNELS.aiExport, (_event, payload: AiExportRequest) => {
    return handleAiExport(_event, payload)
  })
  ipcMain.handle(IPC_CHANNELS.aiExportPickStaging, (_event, payload) => {
    return handleAiExportPickStaging(_event, payload)
  })
  ipcMain.handle(IPC_CHANNELS.bookExport, (_event, payload: BookExportRequest) => {
    return handleBookExport(_event, payload)
  })
}

export function registerGitHistoryHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.gitHistoryStatus, () => handleGitHistoryStatus())
  ipcMain.handle(IPC_CHANNELS.saveGitSnapshot, (_event, payload) => handleSaveGitSnapshot(payload))
  ipcMain.handle(IPC_CHANNELS.listDocumentRevisions, (_event, payload) => handleListDocumentRevisions(payload))
  ipcMain.handle(IPC_CHANNELS.readDocumentRevision, (_event, payload) => handleReadDocumentRevision(payload))
  ipcMain.handle(IPC_CHANNELS.loadDocumentRevision, (_event, payload) => handleLoadDocumentRevision(payload))
}

export function registerTagHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.tagGetIndex, () => handleTagGetIndex())
  ipcMain.handle(IPC_CHANNELS.tagResolve, (_event, payload) => handleTagResolve(payload))
}

export function registerZuluHandlers(ipcMain: IpcMain): void {
  ipcMain.handle(IPC_CHANNELS.zuluSelectFile, () => handleZuluSelectFile())
  ipcMain.handle(IPC_CHANNELS.zuluImportPreview, (_event, payload: ZuluImportPreviewRequest) => {
    return handleZuluImportPreview(_event, payload)
  })
  ipcMain.handle(IPC_CHANNELS.zuluImport, (_event, payload: ZuluImportRequest) => {
    return handleZuluImport(_event, payload)
  })
}

export function registerHelpHandlers(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.openHelp, (_event, payload) => handleOpenHelp(getMainWindow, payload))
  ipcMain.handle(IPC_CHANNELS.getGettingStartedDismissed, () => handleGetGettingStartedDismissed(getMainWindow))
  ipcMain.handle(IPC_CHANNELS.setGettingStartedDismissed, (_event, payload) => handleSetGettingStartedDismissed(getMainWindow, payload))
}
