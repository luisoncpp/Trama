import { render } from 'preact'
import 'quill/dist/quill.snow.css'
import './index.css'
import { App } from './app.tsx'

const root = document.getElementById('app')

if (!root) {
	throw new Error('Missing #app root element')
}

// Defensive mount: clear stale children to avoid duplicate trees during module reloads.
root.replaceChildren()
render(<App />, root)

if (import.meta.hot) {
	import.meta.hot.accept()
	import.meta.hot.dispose(() => {
		render(null, root)
	})
}
