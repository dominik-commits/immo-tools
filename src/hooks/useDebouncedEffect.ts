import { useEffect, useRef } from 'react'

export function useDebouncedEffect(effect: () => void | (()=>void), deps: any[], delay = 500) {
  const cleanup = useRef<void | (()=>void)>()
  useEffect(() => {
    const id = setTimeout(() => { cleanup.current = effect() }, delay)
    return () => {
      clearTimeout(id)
      if (typeof cleanup.current === 'function') cleanup.current()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay])
}
