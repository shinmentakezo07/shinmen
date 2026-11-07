#!/usr/bin/env node
/*
  Builds the content index from case studies authored as one .mdx file each
  (YAML frontmatter + prose). Emits, per project:

    src/content/generated/<slug>.meta.ts   typed metadata, imported eagerly
    src/content/generated/<slug>.body.mdx  prose only, imported lazily

  Why two files: the eager and lazy import graphs must be disjoint, otherwise a
  bundler folds every body into the main chunk and lazy loading is a lie. The
  generated directory is disposable — delete it and re-run.

  Runs automatically before `dev` and `build` (see package.json).
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const src = path.join(root, 'src/content/projects')
const out = path.join(root, 'src/content/generated')

fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })

const files = fs.readdirSync(src).filter((f) => f.endsWith('.mdx')).sort()
const index = []

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '')
  const { data, content } = matter(fs.readFileSync(path.join(src, file), 'utf8'))

  for (const key of ['title', 'client', 'role', 'year', 'summary', 'stack']) {
    if (data[key] === undefined) throw new Error(`${file}: missing frontmatter "${key}"`)
  }

  fs.writeFileSync(
    path.join(out, `${slug}.meta.ts`),
    `// GENERATED from src/content/projects/${file} — do not edit by hand.
import type { ProjectMeta } from '@/lib/project-meta-types'

export const meta: Omit<ProjectMeta, 'slug'> = ${JSON.stringify(data, null, 2)}
`,
  )

  fs.writeFileSync(path.join(out, `${slug}.body.mdx`), content.trimStart() + '\n')

  index.push(slug)
}

fs.writeFileSync(path.join(out, 'index.ts'), `// GENERATED — do not edit by hand.
export const slugs = ${JSON.stringify(index)} as const
`)

console.log(`content: ${index.length} case stud${index.length === 1 ? 'y' : 'ies'} → ${path.relative(root, out)}`)
