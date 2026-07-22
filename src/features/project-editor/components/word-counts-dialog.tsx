// @Architecture(descriptionShort="Modal dialog displaying on-demand project section word counts")
import { useEffect } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { WordCountsResponse } from '../../../shared/ipc'

interface WordCountsDialogProps {
  open: boolean
  loading: boolean
  wordCounts: WordCountsResponse | null
  error: string | null
  onClose: () => void
}

function WordCountsGrid({ wordCounts }: { wordCounts: WordCountsResponse }) {
  return (
    <div class="word-counts-dialog__grid">
      <div class="word-counts-dialog__card">
        <span class="word-counts-dialog__label">Manuscript</span>
        <span class="word-counts-dialog__value">{wordCounts.manuscript.toLocaleString()}</span>
      </div>
      <div class="word-counts-dialog__card">
        <span class="word-counts-dialog__label">Outline</span>
        <span class="word-counts-dialog__value">{wordCounts.outline.toLocaleString()}</span>
      </div>
      <div class="word-counts-dialog__card">
        <span class="word-counts-dialog__label">Lore</span>
        <span class="word-counts-dialog__value">{wordCounts.lore.toLocaleString()}</span>
      </div>
      <div class="word-counts-dialog__card word-counts-dialog__card--total">
        <span class="word-counts-dialog__label">Total Words</span>
        <span class="word-counts-dialog__value">{wordCounts.total.toLocaleString()}</span>
      </div>
    </div>
  )
}

function WordCountsDialogBodyContent({
  loading,
  error,
  wordCounts,
}: Pick<WordCountsDialogProps, 'loading' | 'error' | 'wordCounts'>) {
  if (loading) {
    return (
      <div class="word-counts-dialog__loading">
        <span>Calculating section word counts...</span>
      </div>
    )
  }
  if (error) {
    return (
      <div class="word-counts-dialog__error">
        <span>{error}</span>
      </div>
    )
  }
  if (wordCounts) {
    return <WordCountsGrid wordCounts={wordCounts} />
  }
  return null
}

export function WordCountsDialog({
  open,
  loading,
  wordCounts,
  error,
  onClose,
}: WordCountsDialogProps) {
  useEffect(/* closeOnEscape */ () => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose] /* Inputs for closeOnEscape */)

  if (!open) return null

  return createPortal(
    <div class="ai-import-modal" onClick={onClose}>
      <div
        class="ai-import-dialog word-counts-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-counts-dialog-title"
      >
        <div class="word-counts-dialog__header">
          <div>
            <h2 id="word-counts-dialog-title" class="ai-import-dialog__title">Word Counts</h2>
            <p class="word-counts-dialog__subtitle">On-demand word count breakdown for project sections.</p>
          </div>
          <button type="button" class="word-counts-dialog__close" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <div class="word-counts-dialog__body">
          <WordCountsDialogBodyContent loading={loading} error={error} wordCounts={wordCounts} />
        </div>
        <div class="ai-import-dialog__actions">
          <button type="button" class="editor-button editor-button--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
