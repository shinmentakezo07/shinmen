/*
  Case studies live in src/content/projects/*.mdx. Adding a file publishes it.

  This module owns metadata only. MDX *bodies* are resolved lazily inside the
  case-study page, so the work list pays for frontmatter and nothing else — a
  body (and its MDX runtime) loads only when that route is visited.
*/
import { projectMeta } from './project-meta'

export type { ProjectMeta, Metric } from './project-meta-types'

/** Newest-first, then slug for a stable tie-break. */
export const projects = projectMeta

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug)
}

/** Per-project hue from the subject palette — the work's dominant language. */
const HUES: Record<string, string> = {
  atlas: 'var(--hue-go)',
  ledger: 'var(--hue-python)',
  sift: 'var(--hue-rust)',
}

export function projectHue(slug: string) {
  return HUES[slug] ?? 'var(--accent)'
}
