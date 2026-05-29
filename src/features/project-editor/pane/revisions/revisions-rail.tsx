import type { GitDocumentRevision } from '../../../../shared/ipc'
import type { RevisionRailState } from '../../project-editor-types'

interface RevisionsRailProps {
  rail: RevisionRailState
  onClose: () => void
  onSelectCurrent: () => void
  onSelectRevision: (commitSha: string) => void
  onLoadMore: () => void
  onCancelLoadRevision: () => void
  onConfirmLoadRevision: () => void
}

interface RevisionItemProps {
  rail: RevisionRailState
  revision: GitDocumentRevision
  onSelectRevision: (commitSha: string) => void
}

function formatRevisionDate(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function isSelectedRevision(rail: RevisionRailState, revision: GitDocumentRevision): boolean {
  return rail.selected.kind === 'revision' && rail.selected.commitSha === revision.sha
}

function CurrentRevisionRow({ rail, onSelectCurrent }: Pick<RevisionsRailProps, 'rail' | 'onSelectCurrent'>) {
  return (
    <button
      type="button"
      class={`revisions-rail__row ${rail.selected.kind === 'current' ? 'is-selected' : ''}`}
      onClick={onSelectCurrent}
    >
      <span class="revisions-rail__row-title">{rail.currentLabel}</span>
    </button>
  )
}

function RevisionItem({ rail, revision, onSelectRevision }: RevisionItemProps) {
  const selected = isSelectedRevision(rail, revision)
  return (
    <div key={revision.sha} class={`revisions-rail__item ${selected ? 'is-selected' : ''}`} role="listitem">
      <button type="button" class="revisions-rail__row" onClick={() => onSelectRevision(revision.sha)}>
        <span class="revisions-rail__row-title">{formatRevisionDate(revision.committedAt)}</span>
      </button>
    </div>
  )
}

function RevisionsRailConfirmation({ rail, onCancelLoadRevision, onConfirmLoadRevision }: Pick<RevisionsRailProps, 'rail' | 'onCancelLoadRevision' | 'onConfirmLoadRevision'>) {
  if (!rail.confirmation.open || !rail.confirmation.revision) {
    return null
  }
  return (
    <div class="revisions-rail__modal" onClick={onCancelLoadRevision}>
      <div class="revisions-rail__confirm" role="alertdialog" aria-modal="true" aria-label="Confirm revision load" onClick={(event) => event.stopPropagation()}>
        <p>Load this revision and overwrite the current document and any referenced historical images?</p>
        <div class="revisions-rail__confirm-actions">
          <button type="button" class="editor-button editor-button--secondary" onClick={onCancelLoadRevision}>Cancel</button>
          <button type="button" class="editor-button editor-button--warning" onClick={onConfirmLoadRevision}>Load this revision</button>
        </div>
      </div>
    </div>
  )
}

function RevisionsRailList({ rail, onSelectCurrent, onSelectRevision }: Pick<RevisionsRailProps,
  'rail'
  | 'onSelectCurrent'
  | 'onSelectRevision'
>) {
  return (
    <div class="revisions-rail__list" role="list">
      <CurrentRevisionRow rail={rail} onSelectCurrent={onSelectCurrent} />
      {rail.revisions.map((revision) => (
        <RevisionItem
          key={revision.sha}
          rail={rail}
          revision={revision}
          onSelectRevision={onSelectRevision}
        />
      ))}
    </div>
  )
}

function RevisionsRailFooter({ rail, onLoadMore }: Pick<RevisionsRailProps, 'rail' | 'onLoadMore'>) {
  return (
    <>
      {rail.loading ? <p class="revisions-rail__hint">Loading revisions...</p> : null}
      {!rail.loading && !rail.error && rail.revisions.length === 0 ? (
        <p class="revisions-rail__hint">No snapshots yet. Save Snapshot to start revision history.</p>
      ) : null}
      {rail.error ? <p class="revisions-rail__error">{rail.error}</p> : null}
      {rail.hasMore ? (
        <button type="button" class="editor-button editor-button--secondary revisions-rail__more" onClick={onLoadMore}>
          Load more
        </button>
      ) : null}
    </>
  )
}

export function RevisionsRail({
  rail,
  onClose,
  onSelectCurrent,
  onSelectRevision,
  onLoadMore,
  onCancelLoadRevision,
  onConfirmLoadRevision,
}: RevisionsRailProps) {
  if (!rail.open) {
    return null
  }

  return (
    <aside class="revisions-rail" aria-label="Document revisions">
      <header class="revisions-rail__header">
        <button type="button" class="revisions-rail__back" onClick={onClose} aria-label="Back from revisions">←</button>
        <div class="revisions-rail__header-copy">
          <p class="revisions-rail__eyebrow">Revisions</p>
          <p class="revisions-rail__path" title={rail.documentPath ?? undefined}>{rail.documentPath}</p>
        </div>
      </header>
      <RevisionsRailList
        rail={rail}
        onSelectCurrent={onSelectCurrent}
        onSelectRevision={onSelectRevision}
      />
      <RevisionsRailFooter rail={rail} onLoadMore={onLoadMore} />
      <RevisionsRailConfirmation
        rail={rail}
        onCancelLoadRevision={onCancelLoadRevision}
        onConfirmLoadRevision={onConfirmLoadRevision}
      />
    </aside>
  )
}
