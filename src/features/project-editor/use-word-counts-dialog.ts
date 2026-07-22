// @Architecture(descriptionShort="Renderer hook managing word counts modal state and on-demand IPC calculation")
import { useState, useCallback, useMemo } from 'preact/hooks'
import type { WordCountsResponse } from '../../shared/ipc'

export interface WordCountsDialogState {
  isOpen: boolean
  loading: boolean
  wordCounts: WordCountsResponse | null
  error: string | null
}

async function fetchWordCountsHelper(
  rootPath: string,
  setState: (fn: (prev: WordCountsDialogState) => WordCountsDialogState) => void,
) {
  if (!window.tramaApi) return

  try {
    const response = await window.tramaApi.getWordCounts(rootPath)
    if (response.ok) {
      setState((prev) => ({
        ...prev,
        loading: false,
        wordCounts: response.data,
        error: null,
      }))
    } else {
      setState((prev) => ({
        ...prev,
        loading: false,
        wordCounts: null,
        error: response.error.message || 'Failed to compute word counts',
      }))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error fetching word counts'
    setState((prev) => ({
      ...prev,
      loading: false,
      wordCounts: null,
      error: message,
    }))
  }
}

export function useWordCountsDialog(rootPath: string | null) {
  const [state, setState] = useState<WordCountsDialogState>({
    isOpen: false,
    loading: false,
    wordCounts: null,
    error: null,
  })

  const openDialog = useCallback(
    /* openWordCountsDialog */ () => {
      if (!rootPath) return
      setState({
        isOpen: true,
        loading: true,
        wordCounts: null,
        error: null,
      })
      void fetchWordCountsHelper(rootPath, setState)
    },
    [rootPath] /* Inputs for openWordCountsDialog */,
  )

  const closeDialog = useCallback(
    /* closeWordCountsDialog */ () => {
      setState((prev) => ({ ...prev, isOpen: false }))
    },
    [] /* Inputs for closeWordCountsDialog — stable */,
  )

  return useMemo(
    /* buildWordCountsDialogState */ () => ({
      isOpen: state.isOpen,
      loading: state.loading,
      wordCounts: state.wordCounts,
      error: state.error,
      openDialog,
      closeDialog,
    }),
    [state.isOpen, state.loading, state.wordCounts, state.error, openDialog, closeDialog] /* Inputs for buildWordCountsDialogState */,
  )
}
