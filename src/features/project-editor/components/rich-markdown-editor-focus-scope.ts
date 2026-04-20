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

function getEditorElements(host: HTMLDivElement): { editorRoot: HTMLElement; container: HTMLElement } | null {
	const editorRoot = host.querySelector('.ql-editor')
	if (!(editorRoot instanceof HTMLElement)) {
		return null
	}

	const container = host.querySelector('.ql-container')
	if (!(container instanceof HTMLElement)) {
		return null
	}

	return { editorRoot, container }
}

function setupScrollCentering(
	container: HTMLElement,
	editorRoot: HTMLElement,
	quill: Quill,
	focusScope: FocusScope,
): () => void {
	const updateCenteredScroll = createUpdateCenteredScroll(
		container,
		editorRoot,
		quill,
		() => getSelectionViewportRect(quill),
	)

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

	return () => {
		if (rafId.current) {
			cancelAnimationFrame(rafId.current)
		}

		quill.off('selection-change', scheduleRefresh)
		quill.off('text-change', scheduleRefresh)
		window.removeEventListener('resize', scheduleRefresh)
		editorRoot.style.removeProperty('--focus-extra-top')
		editorRoot.style.removeProperty('--focus-extra-bottom')
	}
}

function initializeAndSetup(
	host: HTMLDivElement,
	quill: Quill,
	focusScope: FocusScope,
): { scheduleRefresh: () => void; cleanup: () => void } | null {
	const elements = getEditorElements(host)
	if (!elements) {
		return null
	}

	const { editorRoot, container } = elements
	editorRoot.classList.add('is-focus-mode')
	updateFocusScopeClasses(editorRoot, focusScope)
	applyFocusScope(quill, editorRoot, focusScope)

	const cleanupScroll = setupScrollCentering(container, editorRoot, quill, focusScope)

	return {
		scheduleRefresh: () => {
			updateFocusScopeClasses(editorRoot, focusScope)
			applyFocusScope(quill, editorRoot, focusScope)
		},
		cleanup: cleanupScroll,
	}
}

function cleanupInactiveEditor(editorRoot: HTMLElement): void {
	clearFocusScope(editorRoot)
	editorRoot.classList.remove('is-focus-mode')
	editorRoot.classList.add('is-focus-mode-inactive')
}

function cleanupAllFocus(editorRoot: HTMLElement): void {
	clearFocusScope(editorRoot)
	editorRoot.classList.remove('is-focus-mode', 'is-focus-mode-inactive')
}

function activateFocusMode(
	host: HTMLDivElement,
	quill: Quill,
	focusScope: FocusScope,
): { scheduleRefresh: () => void; cleanup: () => void } | null {
	const setup = initializeAndSetup(host, quill, focusScope)
	if (!setup) {
		return null
	}

	return setup
}

export function useFocusModeScopeEffect(
	editorRef: { current: Quill | null },
	hostRef: { current: HTMLDivElement | null },
	focusModeEnabled: boolean,
	focusScope: FocusScope,
	isActive: boolean,
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
			cleanupAllFocus(editorRoot)
			return
		}

		if (isActive === false) {
			cleanupInactiveEditor(editorRoot)
			return
		}

		editorRoot.classList.remove('is-focus-mode-inactive')
		editorRoot.classList.add('is-focus-mode')

		const active = activateFocusMode(host, quill, focusScope)
		if (!active) {
			return
		}

		active.scheduleRefresh()

		return active.cleanup
	}, [editorRef, hostRef, focusModeEnabled, focusScope, isActive])
}
