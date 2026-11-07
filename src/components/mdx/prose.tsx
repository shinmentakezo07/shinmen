import type { MDXComponents } from 'mdx/types'
import { Aside } from './Aside'

/*
  MDX renders into these components. Keeping typography here (rather than in a
  .prose stylesheet) means case-study bodies inherit the site's real type scale.
*/
export const mdxComponents: MDXComponents = {
  h2: (props) => (
    <h2 className="mt-12 mb-4 text-3 text-fg first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-9 mb-3 font-mono text-[length:var(--step--1)] uppercase tracking-[0.1em] text-fg-muted" {...props} />
  ),
  p: (props) => (
    <p className="my-4 text-1 leading-relaxed text-fg-soft" {...props} />
  ),
  ul: (props) => <ul className="my-4 space-y-2 pl-5 text-1 text-fg-soft" {...props} />,
  ol: (props) => <ol className="my-4 space-y-2 pl-5 text-1 text-fg-soft" {...props} />,
  li: (props) => <li className="list-disc marker:text-accent" {...props} />,
  strong: (props) => <strong className="font-medium text-fg" {...props} />,
  a: (props) => <a className="u-link text-accent" {...props} />,
  code: (props) => (
    <code
      className="rounded-[2px] bg-bg-sunk px-[0.35em] py-[0.1em] font-mono text-[0.9em] text-fg"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-6 overflow-x-auto border border-line bg-bg-sunk p-4 font-mono text-[length:var(--step--1)] leading-relaxed [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 h-px border-0 bg-line" />,
  blockquote: (props) => (
    <blockquote className="my-6 border-l-2 border-line-strong pl-5 text-1 italic text-fg-soft" {...props} />
  ),
  Aside,
}
