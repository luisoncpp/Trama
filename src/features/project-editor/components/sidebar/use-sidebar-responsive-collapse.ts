import { useEffect, useState } from 'preact/hooks'

const RESPONSIVE_COLLAPSE_BREAKPOINT = 900

function isNarrowViewport(): boolean {
  return window.innerWidth <= RESPONSIVE_COLLAPSE_BREAKPOINT
}

export function useSidebarResponsiveCollapse(): boolean {
  const [isNarrow, setIsNarrow] = useState<boolean>(isNarrowViewport)

  useEffect(() => {
    const onResize = () => {
      setIsNarrow(isNarrowViewport())
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return isNarrow
}
