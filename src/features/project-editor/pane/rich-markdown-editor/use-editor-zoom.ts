import { useEffect } from 'preact/hooks'
import type Quill from 'quill'
import type { EditorZoomRef } from '../../project-editor-types'

interface UseEditorZoomParams {
  editorRef: { current: Quill | null }
  hostRef: { current: HTMLDivElement | null }
  zoomRef: EditorZoomRef
  triggerTagOverlayRender: () => void
}

export function useEditorZoom({ editorRef, hostRef, zoomRef, triggerTagOverlayRender }: UseEditorZoomParams): void {
  useEffect(() => {
    const zoomLevel = zoomRef.current

    const host = hostRef.current
    if (!host) return

    const editor = editorRef.current
    if (!editor) return

    const root = editor.root as HTMLElement
    if (!root) return

    root.style.zoom = `${zoomLevel * 100}%`
    triggerTagOverlayRender()
  }, [editorRef, hostRef, zoomRef, triggerTagOverlayRender])
}
