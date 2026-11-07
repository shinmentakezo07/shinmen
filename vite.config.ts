import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    {
      // Must run before the React plugin so JSX inside .mdx goes through the
      // normal transform. Only generated bodies contain MDX — frontmatter is
      // stripped into .meta.ts by scripts/content.mjs.
      enforce: 'pre',
      ...mdx({ providerImportSource: '@mdx-js/react' }),
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Local dev talks to the Go API; in production it lives on Fly/Railway.
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    // `vite preview` serves the built artifact; keep the same API proxy so the
    // production bundle is exercisable end-to-end against the local Go service.
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
  },
})
