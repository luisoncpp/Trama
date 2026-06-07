import { useEffect, useRef, useState } from 'preact/hooks'
import type { SidebarCreateMode } from '../components/sidebar/sidebar-create-dialog.tsx'
void 0 as unknown as SidebarCreateMode
import {
  SidebarCreateController,
  type CreateControllerDeps,
  type CreateControllerSnapshot,
} from './sidebar-create-controller'

export function useSidebarCreateControllerBridge(deps: CreateControllerDeps): {
  controller: SidebarCreateController
  snapshot: CreateControllerSnapshot
} {
  const controllerRef = useRef<SidebarCreateController | null>(null)
  const [snapshot, setSnapshot] = useState<CreateControllerSnapshot>(() => {
    const ctrl = new SidebarCreateController(deps)
    controllerRef.current = ctrl
    return ctrl.getSnapshot()
  })

  useEffect(/* subscribeToController */ () => {
    const controller = controllerRef.current
    if (!controller) {
      return undefined
    }
    const unsubscribe = controller.subscribe(setSnapshot)
    return unsubscribe
  }, [] /*Inputs for subscribeToController — stable*/)

  return {
    controller: controllerRef.current!,
    snapshot,
  }
}
