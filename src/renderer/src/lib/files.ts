import type { FileUpload } from '@shared/types'

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif'
])

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type)
}

export async function toFileUpload(file: File): Promise<FileUpload> {
  return { name: file.name, bytes: await file.arrayBuffer() }
}

/** Extracts droppable image files from a drag-and-drop event. */
export function imageFilesFromDrop(event: React.DragEvent): File[] {
  return Array.from(event.dataTransfer.files).filter(isImageFile)
}
