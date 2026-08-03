import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Resolves a media-library relative path to a renderer-loadable URL. */
export function mediaUrl(relativePath: string): string {
  return `media://library/${relativePath}`
}
