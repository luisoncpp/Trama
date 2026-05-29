import type { IpcEnvelope } from '../../../src/shared/ipc.js'
import {
  gitHistoryStatusResponseSchema,
  listDocumentRevisionsRequestSchema,
  loadDocumentRevisionRequestSchema,
  readDocumentRevisionRequestSchema,
  saveGitSnapshotRequestSchema,
  type GitHistoryStatusResponse,
  type ListDocumentRevisionsResponse,
  type LoadDocumentRevisionResponse,
  type ReadDocumentRevisionResponse,
  type SaveGitSnapshotResponse,
} from '../../../src/shared/ipc.js'
import { errorEnvelope } from '../../ipc-errors.js'
import { getActiveProjectRoot } from '../../ipc-runtime.js'
import { gitHistoryService } from '../../services/git-history-service.js'

export async function handleGitHistoryStatus(): Promise<IpcEnvelope<GitHistoryStatusResponse>> {
  try {
    const result = await gitHistoryService.getStatus(getActiveProjectRoot())
    return { ok: true, data: gitHistoryStatusResponseSchema.parse(result) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read Git status'
    return errorEnvelope('GIT_HISTORY_STATUS_FAILED', message)
  }
}

export async function handleSaveGitSnapshot(rawPayload: unknown): Promise<IpcEnvelope<SaveGitSnapshotResponse>> {
  const payload = saveGitSnapshotRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for Git snapshot', payload.error.flatten())
  }
  try {
    const result = await gitHistoryService.saveSnapshot(getActiveProjectRoot(), payload.data.initializeRepository)
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save Git snapshot'
    return errorEnvelope('GIT_SNAPSHOT_FAILED', message)
  }
}

export async function handleListDocumentRevisions(rawPayload: unknown): Promise<IpcEnvelope<ListDocumentRevisionsResponse>> {
  const payload = listDocumentRevisionsRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document revisions', payload.error.flatten())
  }
  try {
    const result = await gitHistoryService.listDocumentRevisions(getActiveProjectRoot(), payload.data.path, payload.data.cursor)
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to list document revisions'
    return errorEnvelope('GIT_REVISIONS_LIST_FAILED', message)
  }
}

export async function handleReadDocumentRevision(rawPayload: unknown): Promise<IpcEnvelope<ReadDocumentRevisionResponse>> {
  const payload = readDocumentRevisionRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document revision read', payload.error.flatten())
  }
  try {
    const result = await gitHistoryService.readDocumentRevision(
      getActiveProjectRoot(),
      payload.data.path,
      payload.data.commitSha,
      payload.data.pathAtRevision,
    )
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read document revision'
    return errorEnvelope('GIT_REVISION_READ_FAILED', message)
  }
}

export async function handleLoadDocumentRevision(rawPayload: unknown): Promise<IpcEnvelope<LoadDocumentRevisionResponse>> {
  const payload = loadDocumentRevisionRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for document revision load', payload.error.flatten())
  }
  try {
    const result = await gitHistoryService.loadDocumentRevision(
      getActiveProjectRoot(),
      payload.data.path,
      payload.data.commitSha,
      payload.data.pathAtRevision,
    )
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load document revision'
    return errorEnvelope('GIT_REVISION_LOAD_FAILED', message)
  }
}
