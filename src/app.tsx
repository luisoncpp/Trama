import { ProjectEditorView } from './features/project-editor/project-editor-view'
import { useProjectEditor } from './features/project-editor/use-project-editor'

export function App() {
  const model = useProjectEditor()
  return <ProjectEditorView model={model} />
}
