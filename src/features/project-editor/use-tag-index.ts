import { useState, useCallback, useEffect } from 'preact/hooks'
import type { TagGetIndexResponse } from '../../shared/ipc-tag'

export interface TagIndexState {
  tagIndex: TagGetIndexResponse['tags'] | null
  loading: boolean
  error: string | null
}

function createInitialState(): TagIndexState {
  return { tagIndex: null, loading: false, error: null }
}

async function fetchTagIndex(
  setState: (value: TagIndexState | ((prev: TagIndexState) => TagIndexState)) => void,
): Promise<void> {
  if (!window.tramaApi) return

  // Keep previous index while refreshing to avoid brief "no tags" windows.
  setState((prev) => ({
    ...prev,
    loading: true,
    error: null,
  }))

  try {
    const response = await window.tramaApi.getTagIndex()

    if (!response.ok) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: response.error.message || 'Failed to fetch tag index',
      }))
      return
    }

    setState({
      tagIndex: response.data.tags,
      loading: false,
      error: null,
    })
  } catch (error) {
    setState((prev) => ({
      ...prev,
      loading: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tag index',
    }))
  }
}

export function useTagIndex(rootPath: string | null) {
  const [state, setState] = useState<TagIndexState>(createInitialState)

  const fetchTagIndexCallback = useCallback(() => {
    fetchTagIndex(setState)
  }, [])

  useEffect(() => {
    if (rootPath) {
      fetchTagIndexCallback()
    } else {
      setState(createInitialState())
    }
  }, [rootPath, fetchTagIndexCallback])

  useEffect(() => {
    if (!window.tramaApi) return
    const unsubscribe = window.tramaApi.onExternalFileEvent(fetchTagIndexCallback)
    return unsubscribe
  }, [fetchTagIndexCallback])

  return {
    tagIndex: state.tagIndex,
    loading: state.loading,
    error: state.error,
    refetch: fetchTagIndexCallback,
  }
}
