import type Quill from 'quill'

const CENTERED_CONTENT_CLASS = 'trama-centered-content'
const CENTERED_MEDIA_CLASS = 'trama-centered-media'

function isCenterBoundary(node: Element): boolean {
  return node.classList.contains('trama-center-boundary')
}

function isLayoutDirective(node: Element): boolean {
  return node.classList.contains('trama-layout-directive')
}

function isCenterStartBoundary(node: Element): boolean {
  return node.getAttribute('data-trama-role') === 'start'
}

function isCenterEndBoundary(node: Element): boolean {
  return node.getAttribute('data-trama-role') === 'end'
}

function syncCenteredBlockMedia(block: Element, centered: boolean): void {
  const images = Array.from(block.querySelectorAll('img'))

  for (const image of images) {
    if (centered) {
      image.classList.add(CENTERED_MEDIA_CLASS)
    } else {
      image.classList.remove(CENTERED_MEDIA_CLASS)
    }
  }
}

export function syncCenteredLayoutArtifacts(editor: Quill): void {
  const blocks = Array.from(editor.root.children)
  let isCentered = false

  for (const block of blocks) {
    if (!(block instanceof Element)) {
      continue
    }

    if (isCenterBoundary(block)) {
      if (isCenterStartBoundary(block)) isCentered = true
      if (isCenterEndBoundary(block)) isCentered = false
      continue
    }

    if (isLayoutDirective(block)) {
      block.classList.remove(CENTERED_CONTENT_CLASS)
      syncCenteredBlockMedia(block, false)
      continue
    }

    if (isCentered) {
      block.classList.add(CENTERED_CONTENT_CLASS)
      syncCenteredBlockMedia(block, true)
    } else {
      block.classList.remove(CENTERED_CONTENT_CLASS)
      syncCenteredBlockMedia(block, false)
    }
  }
}
