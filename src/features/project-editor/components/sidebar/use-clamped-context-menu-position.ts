// @Architecture(descriptionShort="Measure-then-clamp hook for fixed context menus")
import { useLayoutEffect, useRef, useState } from 'preact/hooks'
import { clampContextMenuPosition, type ContextMenuPoint } from './clamp-context-menu-position'

export function useClampedContextMenuPosition(position: ContextMenuPoint) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [clamped, setClamped] = useState(position)

  useLayoutEffect(/* clampMenuToViewportAfterMeasure */ () => {
    const node = menuRef.current
    if (!node) {
      setClamped(position)
      return
    }
    const rect = node.getBoundingClientRect()
    setClamped(
      clampContextMenuPosition(position, { width: rect.width, height: rect.height }, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    )
  }, [position.x, position.y] /*Inputs for clampMenuToViewportAfterMeasure*/)

  return {
    menuRef,
    style: {
      left: `${clamped.x}px`,
      top: `${clamped.y}px`,
    },
  }
}
