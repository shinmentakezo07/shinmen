import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import { Header } from '@/components/shell/Header'
import { Footer } from '@/components/shell/Footer'
import { MotionRoot } from '@/components/ui/motion'
import { Home } from '@/pages/Home'

// Case studies, their MDX runtime, and the command palette are all deferred —
// first paint pays for the home page and nothing else.
const CaseStudy = lazy(() =>
  import('@/pages/CaseStudy').then((m) => ({ default: m.CaseStudy })),
)
const CommandMenu = lazy(() =>
  import('@/components/shell/CommandMenu').then((m) => ({ default: m.CommandMenu })),
)
const Resume = lazy(() =>
  import('@/pages/Resume').then((m) => ({ default: m.Resume })),
)

function NotFound() {
  return (
    <div className="frame py-24">
      <p className="label mb-3">404</p>
      <h1 className="text-4">Nothing here.</h1>
    </div>
  )
}

/** React Router doesn't scroll to URL hashes; do it once the target mounts. */
function ScrollToHash() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    let raf = 0
    let tries = 0
    const find = () => {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView()
        return
      }
      if (tries++ < 60) raf = requestAnimationFrame(find)
    }
    raf = requestAnimationFrame(find)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash])
  return null
}

/*
  ── Palette: one machine, one key owner ────────────────────────────────────
    eager → idle → open ⇄ closed      (closed = mounted, Radix keeps the exit)
  The ⌘K listener used to live here and *also* toggle, while Radix's dialog
  advertised ⌘K in its footer — two owners of one transition, so ⌘K pressed
  while typing in another field could open the palette mid-sentence. The key
  now belongs to the palette component alone; App only decides when to mount
  the chunk (first intent, never on load).
*/
export default function App() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Mount the palette chunk on first intent (⌘K or the header button), not on load.
  const [paletteMounted, setPaletteMounted] = useState(false)

  const openPalette = () => {
    setPaletteMounted(true)
    setPaletteOpen(true)
  }

  return (
    <ThemeProvider>
      <ScrollToHash />
      {/* Atmosphere: drifting light under the paper, grain over everything. */}
      <div className="aurora" aria-hidden>
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
      </div>
      <div className="grain" aria-hidden />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>

      <Header onOpenCommand={openPalette} paletteOpen={paletteOpen} />

      <main id="main" className="relative z-10">
        <MotionRoot>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/work/:slug" element={<CaseStudy />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MotionRoot>
      </main>

      <Footer />

      {paletteMounted && (
        <Suspense fallback={null}>
          <CommandMenu
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            onFirstKey={() => setPaletteOpen(true)}
          />
        </Suspense>
      )}
    </ThemeProvider>
  )
}
