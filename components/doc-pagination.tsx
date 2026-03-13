import Link from 'next/link'

import type { DocPage } from '@/lib/docs'

import { VisibilityBadge } from '@/components/visibility-badge'

type DocPaginationProps = {
  previous: DocPage | null
  next: DocPage | null
}

function NavCard({
  direction,
  doc,
}: {
  direction: '이전' | '다음'
  doc: DocPage
}) {
  return (
    <Link
      href={doc.routePath}
      className="group flex min-h-32 flex-col justify-between rounded-[1.75rem] border border-border/60 bg-card/65 p-5 transition hover:border-primary/35 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">
          {direction}
        </span>
        {doc.visibilityBadge ? <VisibilityBadge variant={doc.visibilityBadge} /> : null}
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{doc.title}</p>
        {doc.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
        ) : null}
      </div>
    </Link>
  )
}

export function DocPagination({ previous, next }: DocPaginationProps) {
  if (!previous && !next) {
    return null
  }

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {previous ? <NavCard direction="이전" doc={previous} /> : <div className="hidden md:block" />}
      {next ? <NavCard direction="다음" doc={next} /> : <div className="hidden md:block" />}
    </div>
  )
}

