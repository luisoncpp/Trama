import { useEffect } from 'preact/hooks'
import Quill from 'quill'
import { createUpdateCenteredScroll } from './rich-markdown-editor-focus-scope-scroll'
import {
	clearFocusScope,
	updateFocusScopeClasses,
	applyFocusScope,
	getSelectionViewportRect,
} from './rich-markdown-editor-focus-scope-helpers'
import type { FocusScope } from '../project-editor-types'

function initializeFocusMode(
	host: HTMLDivElement,
	quill: Quill,
	focusScope: FocusScope,
): { editorRoot: HTMLElement; container: HTMLElement; updateCenteredScroll: () => void } | null {
	const editorRoot = host.querySelector('.ql-editor')
	if (!(editorRoot instanceof HTMLElement)) {
		return null
	}

	const container = host.querySelector('.ql-container')
	if (!(container instanceof HTMLElement)) {
		return null
	}

	editorRoot.classList.add('is-focus-mode')
	updateFocusScopeClasses(editorRoot, focusScope)
	applyFocusScope(quill, editorRoot, focusScope)

	const updateCenteredScroll = createUpdateCenteredScroll(
		container,
		editorRoot,
		quill,
		() => getSelectionViewportRect(quill),
	)

	return { editorRoot, container, updateCenteredScroll }
}

function setupFocusModeListeners(
	quill: Quill,
	editorRoot: HTMLElement,
	focusScope: FocusScope,
	updateCenteredScroll: () => void,
): { scheduleRefresh: () => void; rafId: { current: number } } {
	const rafId = { current: 0 }

	const refresh = () => {
		updateFocusScopeClasses(editorRoot, focusScope)
		applyFocusScope(quill, editorRoot, focusScope)
		updateCenteredScroll()
	}

	const scheduleRefresh = () => {
		if (rafId.current) {
			cancelAnimationFrame(rafId.current)
		}

		rafId.current = requestAnimationFrame(() => {
			rafId.current = 0
			refresh()
		})
	}

	quill.on('selection-change', scheduleRefresh)
	quill.on('text-change', scheduleRefresh)
	window.addEventListener('resize', scheduleRefresh)

	return { scheduleRefresh, rafId }
}

export function useFocusModeScopeEffect(
	editorRef: { current: Quill | null },
	hostRef: { current: HTMLDivElement | null },
	focusModeEnabled: boolean,
	focusScope: FocusScope,
): void {
	useEffect(() => {
		const quill = editorRef.current
		const host = hostRef.current
		if (!quill || !host) {
			return
		}

		const editorRoot = host.querySelector('.ql-editor')
		if (!(editorRoot instanceof HTMLElement)) {
			return
		}

		if (!focusModeEnabled) {
			clearFocusScope(editorRoot)
			return
		}

		const init = initializeFocusMode(host, quill, focusScope)
		if (!init) {
			return
		}

		const { scheduleRefresh, rafId } = setupFocusModeListeners(
			quill,
			init.editorRoot,
			focusScope,
			init.updateCenteredScroll,
		)

		scheduleRefresh()

		return () => {
			if (rafId.current) {
				cancelAnimationFrame(rafId.current)
			}

			quill.off('selection-change', scheduleRefresh)
			quill.off('text-change', scheduleRefresh)
			window.removeEventListener('resize', scheduleRefresh)
			init.editorRoot.style.removeProperty('--focus-extra-top')
			init.editorRoot.style.removeProperty('--focus-extra-bottom')
		}
	}, [editorRef, hostRef, focusModeEnabled, focusScope])
}
