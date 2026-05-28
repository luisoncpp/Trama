import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

const LAST_PROJECT_STORAGE_KEY = 'trama.last-project.v1'

function readLastProjectRootPath(): string | null {
  try {
    const stored = window.localStorage.getItem(LAST_PROJECT_STORAGE_KEY)
    return stored && stored.trim().length > 0 ? stored : null
  } catch {
    return null
  }
}

export interface LastProjectState {
  lastProjectRootPath: string | null
  setLastProjectRootPath: (rootPath: string) => void
  clearLastProjectRootPath: () => void
}

export function useLastProjectState(): LastProjectState {
  const [lastProjectRootPath, setLastProjectRootPathState] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return readLastProjectRootPath()
  })

  useEffect(/* persistLastProjectRootPath */ () => {
    try {
      if (!lastProjectRootPath) {
        window.localStorage.removeItem(LAST_PROJECT_STORAGE_KEY)
        return
      }

      window.localStorage.setItem(LAST_PROJECT_STORAGE_KEY, lastProjectRootPath)
    } catch {
      // Ignore persistence failures and keep the in-memory value.
    }
  }, [lastProjectRootPath] /*Inputs for persistLastProjectRootPath*/)

  const setLastProjectRootPath = useCallback(
    /* setLastProjectRootPath */ (rootPath: string) => {
      setLastProjectRootPathState(rootPath)
    },
    [] /*Inputs for setLastProjectRootPath — stable*/,
  )

  const clearLastProjectRootPath = useCallback(
    /* clearLastProjectRootPath */ () => {
      setLastProjectRootPathState(null)
    },
    [] /*Inputs for clearLastProjectRootPath — stable*/,
  )

  return useMemo(
    /* buildLastProjectState */ () => ({
      lastProjectRootPath,
      setLastProjectRootPath,
      clearLastProjectRootPath,
    }),
    [lastProjectRootPath, setLastProjectRootPath, clearLastProjectRootPath] /*Inputs for buildLastProjectState*/,
  )
}

export { LAST_PROJECT_STORAGE_KEY }
