import { useEffect, useRef } from 'preact/hooks'
import { isGettingStartedDismissed } from './help-preferences.js'

export function useAutoOpenGettingStartedEffect(rootPath: string | null): void {
  const hasAttemptedOpenRef = useRef(false)

  useEffect(/* autoOpenGettingStarted */ () => {
    if (!rootPath) {
      hasAttemptedOpenRef.current = false
      return
    }

    if (hasAttemptedOpenRef.current) {
      return
    }

    hasAttemptedOpenRef.current = true

    if (isGettingStartedDismissed()) {
      return
    }

    if (window.tramaApi && typeof window.tramaApi.openHelp === 'function') {
      void window.tramaApi.openHelp({ page: 'getting-started' })
    }
  }, [rootPath] /*Inputs for autoOpenGettingStarted*/)
}
