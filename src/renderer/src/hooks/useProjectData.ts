import { useCallback, useEffect, useState } from 'react'

/**
 * Loads per-project collections and reloads whenever the active project
 * changes. `loader` must be referentially stable (the api facade is).
 */
export function useProjectData<T>(
  projectId: string | null,
  loader: (projectId: string) => Promise<T[]>
): { items: T[]; reload: () => Promise<void> } {
  const [items, setItems] = useState<T[]>([])

  const reload = useCallback(async () => {
    if (!projectId) {
      setItems([])
      return
    }
    setItems(await loader(projectId))
  }, [projectId, loader])

  useEffect(() => {
    setItems([])
    void reload()
  }, [reload])

  return { items, reload }
}
