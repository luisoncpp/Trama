import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { AiImportPreview } from '../../../shared/ipc'
import { AiImportPreviewSection } from './ai-import-preview-section'

interface AiImportDialogProps {
  open: boolean
  onClose: () => void
  onPreview: (clipboardContent: string) => Promise<AiImportPreview | null>
  onExecute: (clipboardContent: string) => Promise<boolean>
  projectRoot: string | null
}

interface AiImportFormContentProps {
  state: ReturnType<typeof useAiImportDialogState>
  projectRoot: string | null
  onPreview: () => void
  onExecute: () => void
  onClose: () => void
  textareaRef: { current: HTMLTextAreaElement | null }
}

function useAiImportDialogState() {
  const [clipboardContent, setClipboardContent] = useState('')
  const [preview, setPreview] = useState<AiImportPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  return {
    clipboardContent,
    setClipboardContent,
    preview,
    setPreview,
    loading,
    setLoading,
    importing,
    setImporting,
  }
}

function useAiImportDialogActions(
  state: ReturnType<typeof useAiImportDialogState>,
  projectRoot: string | null,
  onPreview: (clipboardContent: string) => Promise<AiImportPreview | null>,
  onExecute: (clipboardContent: string) => Promise<boolean>,
  onClose: () => void,
) {
  const { clipboardContent, setLoading, setPreview, setImporting } = state

  const handlePreview = useCallback(/* handlePreview */ async () => {
    if (!clipboardContent.trim() || !projectRoot) return
    setLoading(true)
    try {
      const result = await onPreview(clipboardContent)
      setPreview(result)
    } catch (error) {
      console.error('Preview failed:', error)
    } finally {
      setLoading(false)
    }
  }, [clipboardContent, onPreview, projectRoot, setLoading, setPreview] /*Inputs for handlePreview*/)

  const handleExecute = useCallback(/* handleExecute */ async () => {
    if (!clipboardContent.trim() || !projectRoot) return
    setImporting(true)
    try {
      const success = await onExecute(clipboardContent)
      if (success) {
        onClose()
      }
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setImporting(false)
    }
  }, [clipboardContent, onClose, onExecute, projectRoot, setImporting] /*Inputs for handleExecute*/)

  return { handlePreview, handleExecute }
}

function useAiImportDialogLifecycle(open: boolean, closeDialog: () => void, textareaRef: { current: HTMLTextAreaElement | null }) {
  useEffect(/* focusTextareaOnOpen */ () => {
    if (!open) {
      return
    }
    textareaRef.current?.focus()
  }, [open, textareaRef] /*Inputs for focusTextareaOnOpen*/)

  useEffect(/* closeOnEscape */ () => {
    if (!open) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDialog, open] /*Inputs for closeOnEscape*/)
}

function AiImportFormContent({
  state,
  projectRoot,
  onPreview,
  onExecute,
  onClose,
  textareaRef,
}: AiImportFormContentProps) {
  return (
    <>
      <p class="ai-import-dialog__title">Import AI Content</p>
      <p class="ai-import-dialog__hint">
        Paste content in the format: <code>=== FILE: filename.md ===</code>
      </p>
      <textarea
        ref={textareaRef}
        class="ai-import-dialog__textarea"
        value={state.clipboardContent}
        onInput={(e) => state.setClipboardContent((e.target as HTMLTextAreaElement).value)}
        placeholder={`=== FILE: book/Chapter-01/Scene-001.md ===\n---\ntitle: My Scene\n---\n\nYour content here...`}
        rows={12}
      />
      <div class="ai-import-dialog__actions">
        <button type="button" class="editor-button editor-button--secondary editor-button--inline" onClick={onClose} disabled={state.loading || state.importing}>
          Cancel
        </button>
        <button
          type="button"
          class="editor-button editor-button--primary editor-button--inline"
          onClick={onPreview}
          disabled={!state.clipboardContent.trim() || !projectRoot || state.loading || state.importing}
        >
          {state.loading ? 'Previewing...' : 'Preview'}
        </button>
      </div>

      {state.preview && (
        <AiImportPreviewSection preview={state.preview} importing={state.importing} onExecute={onExecute} />
      )}
    </>
  )
}

export function AiImportDialog({ open, onClose, onPreview, onExecute, projectRoot }: AiImportDialogProps) {
  const state = useAiImportDialogState()
  const { loading, importing, setClipboardContent, setPreview, setLoading, setImporting } = state
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const canClose = !loading && !importing

  const resetDialogState = useCallback(/* resetDialogState */ () => {
    setClipboardContent('')
    setPreview(null)
    setLoading(false)
    setImporting(false)
  }, [setClipboardContent, setImporting, setLoading, setPreview] /*Inputs for resetDialogState*/)

  const closeDialog = useCallback(/* closeDialog */ () => {
    if (!canClose) {
      return
    }

    resetDialogState()
    onClose()
  }, [canClose, onClose, resetDialogState] /*Inputs for closeDialog*/)

  const { handlePreview, handleExecute } = useAiImportDialogActions(state, projectRoot, onPreview, onExecute, closeDialog)
  useAiImportDialogLifecycle(open, closeDialog, textareaRef)

  if (!open) {
    return null
  }

  return createPortal(
    <div class="ai-import-modal" onClick={closeDialog}>
      <div class="ai-import-dialog" role="dialog" aria-modal="true" aria-label="Import AI Content" onClick={(e) => e.stopPropagation()}>
        <AiImportFormContent
          state={state}
          projectRoot={projectRoot}
          onPreview={handlePreview}
          onExecute={handleExecute}
          onClose={closeDialog}
          textareaRef={textareaRef}
        />
      </div>
    </div>,
    document.body,
  )
}
