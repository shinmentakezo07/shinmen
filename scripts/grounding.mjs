#!/usr/bin/env node
/*
  "Grounding" gate, run before every build.

  A portfolio's claims are its only product. This script refuses to build when
  the content stops being defensible:
    1. Regenerates the content index (scripts/content.mjs).
    2. Every project must carry the metadata the layout renders.
    3. No placeholder copy ("lorem", "TODO", "example.com" links).
    4. Every metric value must look like a number, not a promise.
  Exits non-zero, which fails `npm run build`.
*/
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

execFileSync(process.execPath, [path.join(root, 'scripts/content.mjs')], { stdio: 'inherit' })

const dir = path.join(root, 'src/content/generated')
const problems = []
const PLACEHOLDERS = /\b(lorem ipsum|TODO|FIXME|coming soon|placeholder)\b/i
const REPO_OWNER = process.env.PORTFOLIO_URL ?? 'roshankhatri.dev'

let checked = 0
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.meta.ts'))) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8')
  const body = text.slice(text.indexOf('= ') + 2)
  let meta
  try {
    meta = JSON.parse(body.replace(/ as const\n?$/, ''))
  } catch {
    problems.push(`${file}: metadata is not valid JSON — regenerate with npm run content`)
    continue
  }

  for (const key of ['title', 'client', 'role', 'year', 'summary', 'stack']) {
    if (meta[key] === undefined || meta[key] === '') problems.push(`${file}: missing "${key}"`)
  }
  if (!Array.isArray(meta.stack) || meta.stack.length === 0) {
    problems.push(`${file}: "stack" must be a non-empty array`)
  }
  if (!Array.isArray(meta.metrics) || meta.metrics.length < 1) {
    problems.push(`${file}: at least one metric is required — a case study with no number is a blog post`)
  } else {
    for (const m of meta.metrics) {
      const numeric = /\d/.test(String(m.value))
      if (!numeric) problems.push(`${file}: metric "${m.label}" has a non-numeric value (${m.value})`)
      if (!m.label) problems.push(`${file}: a metric is missing its label`)
    }
  }
  if (meta.url && /example\.(com|org)/.test(meta.url)) {
    problems.push(`${file}: placeholder URL ${meta.url} (site host is ${REPO_OWNER})`)
  }

  const slug = file.replace(/\.meta\.ts$/, '')
  const bodyFile = path.join(dir, `${slug}.body.mdx`)
  if (!fs.existsSync(bodyFile)) problems.push(`${file}: no matching body`)

  // Summary and body must be clean of placeholder prose.
  if (PLACEHOLDERS.test(meta.summary)) problems.push(`${file}: placeholder text in summary`)
  if (fs.existsSync(bodyFile) && PLACEHOLDERS.test(fs.readFileSync(bodyFile, 'utf8'))) {
    problems.push(`${bodyFile}: placeholder text in body`)
  }
  checked++
}

if (checked === 0) problems.push('no case studies found — the work section would be empty')

if (problems.length) {
  console.error(`\n✗ grounding failed (${problems.length}):`)
  for (const p of problems) console.error(`  · ${p}`)
  console.error('')
  process.exit(1)
}

console.log(`✓ grounding passed — ${checked} case studies are defensible`)
