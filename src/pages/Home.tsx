import { Hero } from '@/components/sections/Hero'
import { Work } from '@/components/sections/Work'
import { Toolbelt } from '@/components/sections/Toolbelt'
import { About } from '@/components/sections/About'
import { Agents } from '@/components/sections/Agents'
import { Contact } from '@/components/sections/Contact'

export function Home() {
  return (
    <>
      <Hero />
      <Work />
      <Toolbelt />
      <About />
      <Agents />
      <Contact />
    </>
  )
}
