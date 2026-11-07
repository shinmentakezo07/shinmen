/* Shared types for MDX frontmatter — imported by both the eager meta module
   and the lazy body module, which must not import each other. */

export interface Metric {
  value: string
  label: string
}

export interface ProjectMeta {
  slug: string
  title: string
  client: string
  role: string
  year: number
  summary: string
  stack: string[]
  metrics?: Metric[]
  url?: string
  featured?: boolean
}
