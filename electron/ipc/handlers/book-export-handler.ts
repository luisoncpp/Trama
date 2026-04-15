import type { IpcMainInvokeEvent } from 'electron'
import type {
  BookExportRequest,
  BookExportResponse,
  IpcEnvelope,
} from '../../../src/shared/ipc.js'
import { bookExportRequestSchema } from '../../../src/shared/ipc.js'
import { errorEnvelope } from '../../ipc-errors.js'
import { exportBookPhaseA } from '../../services/book-export-service.js'

export async function handleBookExport(
  _event: IpcMainInvokeEvent,
  rawPayload: unknown,
): Promise<IpcEnvelope<BookExportResponse>> {
  const payload = bookExportRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for book export', payload.error.flatten())
  }

  try {
    const result = await exportBookPhaseA(payload.data as BookExportRequest)
    return { ok: true, data: result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to export book'
    return errorEnvelope('BOOK_EXPORT_FAILED', message)
  }
}
