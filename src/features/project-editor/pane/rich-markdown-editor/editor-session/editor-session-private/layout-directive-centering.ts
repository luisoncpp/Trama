// @Architecture(descriptionShort="Synchronizes centered styling for editor blocks located between `center:start` and")
import type Quill from 'quill'

const CENTERED_CONTENT_CLASS = 'trama-centered-content'

export function syncCenteredLayoutArtifacts(editor: Quill): void {
  const blocks = Array.from(editor.root.children)
  let isCentered = false

  for (const block of blocks) {
    if (!(block instanceof Element)) {
      continue
    }

    const isCenterBoundary = block.classList.contains('trama-center-boundary')
    const isLayoutDirective = block.classList.contains('trama-layout-directive')

    if (isCenterBoundary) {
      const role = block.getAttribute('data-trama-role')
      if (role === 'start') isCentered = true
      if (role === 'end') isCentered = false
      continue
    }

    if (isLayoutDirective) {
      block.classList.remove(CENTERED_CONTENT_CLASS)
      continue
    }

    if (isCentered) {
      block.classList.add(CENTERED_CONTENT_CLASS)
    } else {
      block.classList.remove(CENTERED_CONTENT_CLASS)
    }
  }
}
