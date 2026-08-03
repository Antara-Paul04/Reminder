import { useCallback, useEffect, useState } from 'react'

/**
 * Loads per-project collections and reloads whenever the active project
 * changes — or whenever `version` bumps (e.g. the runtime produced an
 * artifact). `loader` must be referentially stable (the api facade is).
 */
export function useProjectData<T>(
  projectId: string | null,
  loader: (projectId: string) => Promise<T[]>,
  version = 0
): { items: T[]; reload: () => Promise<void> } {
  const [items, setItems] = useState<T[]>([])

  const reload = useCallback(async () => {
    if (!projectId) {
      setItems([])
      return
    }
    setItems(await loader(projectId))
  }, [projectId, loader])

  // Clear immediately on project switch; refresh in place on version bumps.
  useEffect(() => {
    setItems([])
  }, [projectId])

  useEffect(() => {
    void reload()
  }, [reload, version])

  return { items, reload }
}
