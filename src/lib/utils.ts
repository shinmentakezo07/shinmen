import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ids that cannot collide, without useId's colons `querySelector` cannot
 * address. Used where markup must reference another element by id — a
 * description, a label, a note — rather than through a React ref.
 */
let uid = 0
export const nextId = (prefix: string) => `${prefix}-${++uid}`

/** Zero-padded index, the spec-sheet numbering used across sections. */
export function pad(n: number, width = 2) {
  return String(n).padStart(width, '0')
}

/**
 * A deterministic 32-bit hash. Illustrative series derive their shape from it,
 * so the same subject always draws the same line — a chart that redraws itself
 * on every render would imply live data it does not have.
 */
export function hash(input: string) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
