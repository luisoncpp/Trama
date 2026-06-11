import { createContext } from 'preact'
import { useContext } from 'preact/hooks'

const SidebarSectionScopeContext = createContext<string | null>(null)

export function SidebarSectionScopeProvider({
  root,
  children,
}: {
  root: string
  children: preact.ComponentChildren
}) {
  return <SidebarSectionScopeContext.Provider value={root}>{children}</SidebarSectionScopeContext.Provider>
}

export function useSidebarSectionRoot(): string {
  const ctx = useContext(SidebarSectionScopeContext)
  if (!ctx) {
    throw new Error('useSidebarSectionRoot must be used inside SidebarSectionScopeProvider')
  }
  return ctx
}
