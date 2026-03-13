import type { DocHeading } from '@/lib/docs'

export function TableOfContents({ headings }: { headings: DocHeading[] }) {
  if (headings.length === 0) {
    return null
  }

  return (
    <aside className="sticky top-24 hidden h-fit xl:block">
      <div className="rounded-[1.75rem] border border-border/60 bg-card/65 p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">
          현재 페이지
        </p>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li key={heading.slug}>
              <a
                href={`#${heading.slug}`}
                className="block text-sm text-muted-foreground transition hover:text-primary"
                style={{
                  paddingLeft: heading.depth === 3 ? '1rem' : '0',
                }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

