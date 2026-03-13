import { notFound } from 'next/navigation'

import {
  SECTION_ORDER,
  getDocBySlug,
  getDocsForSection,
  getPrevNextDocs,
  getSectionLabel,
  type DocPage as DocPageType,
} from '@/lib/docs'
import { renderDocBody } from '@/lib/mdx'

import { DocPagination } from '@/components/doc-pagination'
import { createMdxComponents } from '@/components/mdx-components'
import { TableOfContents } from '@/components/table-of-contents'
import { VisibilityBadge } from '@/components/visibility-badge'

export async function DocPage({ slugSegments }: { slugSegments: string[] }) {
  const doc = await getDocBySlug(slugSegments)

  if (!doc) {
    notFound()
  }

  const docsBySectionEntries = await Promise.all(
    SECTION_ORDER.map(async (section) => [section, await getDocsForSection(section)] as const),
  )

  const docsBySection = Object.fromEntries(docsBySectionEntries) as Record<string, DocPageType[]>
  const body = await renderDocBody(doc, createMdxComponents(docsBySection))
  const { previous, next } = await getPrevNextDocs(doc.routePath)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0">
          <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/75 shadow-[0_24px_80px_-48px_rgba(8,145,178,0.45)]">
            <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-emerald-400/10 px-6 py-8 sm:px-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.28em] text-primary">
                  {doc.section === 'root' ? '홈' : getSectionLabel(doc.section as (typeof SECTION_ORDER)[number])}
                </span>
                {doc.visibilityBadge ? <VisibilityBadge variant={doc.visibilityBadge} /> : null}
                <span className="text-xs text-muted-foreground">Jotai 한국어 문서</span>
              </div>
              <h1 className="max-w-4xl text-balance text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                {doc.title}
              </h1>
              {doc.description ? (
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {doc.description}
                </p>
              ) : null}
              <p className="mt-6 text-sm text-muted-foreground">소스 파일: {doc.relativePath}</p>
            </div>

            <div className="px-6 py-8 sm:px-10">
              <div className="prose prose-slate prose-headings:scroll-mt-28 dark:prose-invert prose-pre:rounded-2xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-transparent">
                {body}
              </div>
            </div>
          </div>

          <DocPagination previous={previous} next={next} />
        </article>

        <TableOfContents headings={doc.headings} />
      </div>
    </div>
  )
}
