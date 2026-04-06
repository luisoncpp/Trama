import { useEffect } from 'preact/hooks'

interface UseProjectEditorFullscreenEffectParams {
  setIsFullscreen: (value: boolean) => void
}

export function useProjectEditorFullscreenEffect({
  setIsFullscreen,
}: UseProjectEditorFullscreenEffectParams): void {
  useEffect(() => {
    if (!window.tramaApi?.onFullscreenChanged) {
      return
    }

    const unsubscribe = window.tramaApi.onFullscreenChanged((event) => {
      setIsFullscreen(event.enabled)
    })

    return () => {
      unsubscribe()
    }
  }, [setIsFullscreen])
}
