import { useEffect, useRef } from 'preact/hooks'
import type Quill from 'quill'
import { clampZoomLevel } from '../../editor-zoom'

interface UseEditorZoomParams {
  editorRef: { current: Quill | null }
  hostRef: { current: HTMLDivElement | null }
  zoomLevel: number
  triggerTagOverlayRender: () => void
}

export function useEditorZoom({ editorRef, hostRef, zoomLevel, triggerTagOverlayRender }: UseEditorZoomParams): void {
  const zoomStyleRef = useRef<{ scale: number; applied: boolean }>({ scale: 1, applied: false })

  useEffect(() => {
    const clampedZoom = clampZoomLevel(zoomLevel)
    if (clampedZoom === zoomStyleRef.current.scale && zoomStyleRef.current.applied) {
      return
    }

    const host = hostRef.current
    if (!host) {
      return
    }

    const editor = editorRef.current
    if (!editor) {
      return
    }

    const root = editor.root as HTMLElement
    if (!root) {
      return
    }

    const scale = clampedZoom
    root.style.transform = `scale(${scale})`
    root.style.transformOrigin = 'top left'
    root.style.width = `${100 / scale}%`
    root.style.height = 'auto'
    root.style.overflow = 'hidden'

    const editorContainer = editor.container
    if (editorContainer) {
      editorContainer.style.overflow = 'hidden'
      editorContainer.style.height = `${100 / scale}%`
    }
    zoomStyleRef.current = { scale, applied: true }
    triggerTagOverlayRender()
  }, [editorRef, hostRef, zoomLevel, triggerTagOverlayRender])
}
