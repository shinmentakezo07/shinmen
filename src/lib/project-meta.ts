/*
  Eager metadata index. Import graph contains ONLY src/content/generated/*.meta.ts
  (produced by scripts/content.mjs) — never the MDX bodies — so the work list's
  first paint does not pull in the case-study prose or the MDX runtime.
*/
import type { ProjectMeta } from './project-meta-types'
import { slugs } from '@/content/generated/index'

type MetaModule = { meta: Omit<ProjectMeta, 'slug'> }

const modules = import.meta.glob<MetaModule>('@/content/generated/*.meta.ts', { eager: true })
const bySlug = Object.fromEntries(
  Object.entries(modules).map(([path, mod]) => [
    path.split('/').pop()!.replace(/\.meta\.ts$/, ''),
    mod.meta,
  ]),
)

export const projectMeta: ProjectMeta[] = (slugs as readonly string[])
  .map((slug) => ({ slug, ...bySlug[slug] }))
  .sort((a, b) => b.year - a.year || a.slug.localeCompare(b.slug))
