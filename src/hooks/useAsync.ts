import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Small data hook: runs an async loader and re-runs it whenever the global
 * refresh key changes, so every view reflects writes made elsewhere.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const refreshKey = useAppStore((state) => state.refreshKey)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localKey, setLocalKey] = useState(0)
  const alive = useRef(true)

  const run = useCallback(async () => {
    setLoading(true)
    try {
      const result = await loader()
      if (alive.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (alive.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    alive.current = true
    void run()
    return () => {
      alive.current = false
    }
  }, [run, refreshKey, localKey])

  return { data, loading, error, reload: () => setLocalKey((key) => key + 1) }
}
