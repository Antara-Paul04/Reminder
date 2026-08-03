import { app, net, protocol } from 'electron'
import { randomUUID } from 'crypto'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { extname, join, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import type { FileUpload } from '@shared/types'

export type MediaCategory = 'inspiration' | 'screenshots'

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])

export function libraryRoot(): string {
  return join(app.getPath('userData'), 'library')
}

/** Must be called before the app 'ready' event. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

/** Serves files from the media library at media://library/<relative-path>. */
export function registerMediaProtocol(): void {
  protocol.handle('media', (request) => {
    const { host, pathname } = new URL(request.url)
    if (host !== 'library') return new Response('Not found', { status: 404 })

    const root = libraryRoot()
    const abs = resolve(root, decodeURIComponent(pathname).replace(/^\/+/, ''))
    if (!abs.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })

    return net.fetch(pathToFileURL(abs).toString())
  })
}

export function mediaUrl(relativePath: string): string {
  return `media://library/${relativePath}`
}

/** Persists an uploaded file into the library. Returns its relative path. */
export function saveLibraryFile(
  category: MediaCategory,
  projectId: string,
  upload: FileUpload
): string {
  const rawExt = extname(upload.name).toLowerCase()
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.png'
  const filename = `${randomUUID()}${ext}`

  const dir = join(libraryRoot(), category, projectId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, filename), Buffer.from(new Uint8Array(upload.bytes)))

  return `${category}/${projectId}/${filename}`
}

export function deleteLibraryFile(relativePath: string): void {
  const root = libraryRoot()
  const abs = resolve(root, relativePath)
  if (!abs.startsWith(root + sep)) return
  rmSync(abs, { force: true })
}

/** Removes every stored file for a project (on project deletion). */
export function deleteProjectLibrary(projectId: string): void {
  for (const category of ['inspiration', 'screenshots'] as const) {
    rmSync(join(libraryRoot(), category, projectId), { recursive: true, force: true })
  }
}
