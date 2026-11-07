/// <reference types="vite/client" />

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  import type { ProjectMeta } from '@/lib/projects'

  const Component: ComponentType
  export default Component
  export const frontmatter: Omit<ProjectMeta, 'slug'>
}

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
