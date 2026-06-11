import { createContext, type ComponentChildren } from 'preact'
import { useContext, useMemo, useRef } from 'preact/hooks'
import type { ProjectEditorActions } from './project-editor-types'

const EditorActionsContext = createContext<ProjectEditorActions | null>(null)

function buildStableActionsFacade(
  ref: { current: ProjectEditorActions },
  actions: ProjectEditorActions,
): ProjectEditorActions {
  const facade = {} as ProjectEditorActions
  for (const key of Object.keys(actions) as Array<keyof ProjectEditorActions>) {
    ;(facade as any)[key] = (...args: any[]) => {
      const currentAction = ref.current[key] as (...actionArgs: any[]) => unknown
      return currentAction(...args)
    }
  }
  return facade
}

interface EditorActionsProviderProps {
  actions: ProjectEditorActions
  children: ComponentChildren
}

export function EditorActionsProvider({ actions, children }: EditorActionsProviderProps) {
  const ref = useRef(actions)
  ref.current = actions
  const facade = useMemo(
    /* buildEditorActionsFacade */ () => buildStableActionsFacade(ref, actions),
    [] /*Inputs for buildEditorActionsFacade — stable*/,
  )
  return <EditorActionsContext.Provider value={facade}>{children}</EditorActionsContext.Provider>
}

export function useEditorActions(): ProjectEditorActions {
  const ctx = useContext(EditorActionsContext)
  if (!ctx) {
    throw new Error('useEditorActions must be used inside EditorActionsProvider')
  }
  return ctx
}
