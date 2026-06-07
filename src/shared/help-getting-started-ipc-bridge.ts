import type {
  GetGettingStartedDismissedResponse,
  IpcEnvelope,
  SetGettingStartedDismissedResponse,
} from './ipc.js'

type OkEnvelope<T> = { ok: true; data: T }

export function unwrapGettingStartedDismissed(
  envelope: IpcEnvelope<GetGettingStartedDismissedResponse> | unknown,
): boolean {
  if (
    typeof envelope === 'object' &&
    envelope !== null &&
    'ok' in envelope &&
    (envelope as { ok: boolean }).ok === true &&
    'data' in envelope &&
    typeof (envelope as { data: unknown }).data === 'object' &&
    (envelope as { data: { dismissed?: unknown } }).data !== null
  ) {
    const data = (envelope as OkEnvelope<GetGettingStartedDismissedResponse>).data
    return Boolean(data.dismissed)
  }
  return false
}

export function assertGettingStartedDismissedSaved(
  envelope: IpcEnvelope<SetGettingStartedDismissedResponse> | unknown,
): void {
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    !('ok' in envelope) ||
    (envelope as IpcEnvelope<SetGettingStartedDismissedResponse>).ok !== true
  ) {
    throw new Error('Failed to persist Getting Started dismissal preference')
  }
}
