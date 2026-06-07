import {
  createFromTemplateRequestSchema,
  type CreateFromTemplateResponse,
  type GetTemplatesResponse,
  type IpcEnvelope,
} from '../../../../src/shared/ipc.js'
import { errorEnvelope } from '../../../ipc-errors.js'
import { getActiveProjectRoot } from '../../../ipc-runtime.js'
import { templateService } from '../../../services/template-service.js'

export async function handleCreateFromTemplate(rawPayload: unknown): Promise<IpcEnvelope<CreateFromTemplateResponse>> {
  const payload = createFromTemplateRequestSchema.safeParse(rawPayload)
  if (!payload.success) {
    return errorEnvelope('VALIDATION_ERROR', 'Invalid payload for template create', payload.error.flatten())
  }

  try {
    const projectRoot = getActiveProjectRoot()
    const result = await templateService.createFromTemplate(
      projectRoot,
      payload.data.templatePath,
      payload.data.destinationPath,
    )

    return {
      ok: true,
      data: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create document from template'
    return errorEnvelope('TEMPLATE_CREATE_FAILED', message)
  }
}

export async function handleGetTemplates(): Promise<IpcEnvelope<GetTemplatesResponse>> {
  try {
    const projectRoot = getActiveProjectRoot()
    const paths = await templateService.listTemplates(projectRoot)

    return {
      ok: true,
      data: { paths },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load templates'
    return errorEnvelope('TEMPLATE_LIST_FAILED', message)
  }
}
