import type { ComponentPropsWithoutRef } from 'react'

import Link from 'next/link'

import type { DocPage } from '@/lib/docs'

import { VisibilityBadge } from '@/components/visibility-badge'

function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:)/.test(href)
}

function MdxLink({
  href = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('#')) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}

function ExampleCard({
  provider,
  title,
  href,
  meta,
}: {
  provider: 'StackBlitz' | 'CodeSandbox'
  title: string
  href: string
  meta?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="not-prose my-8 block overflow-hidden rounded-[1.6rem] border border-border/60 bg-card/70 p-5 transition hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{provider}</p>
          <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
          {meta ? <p className="mt-2 text-sm text-muted-foreground">{meta}</p> : null}
        </div>
        <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          새 탭에서 열기
        </span>
      </div>
    </a>
  )
}

function SectionCards({
  section,
  docsBySection,
}: {
  section: string
  docsBySection: Record<string, DocPage[]>
}) {
  const docs = docsBySection[section] ?? []

  return (
    <div className="not-prose my-8 grid gap-4 md:grid-cols-2">
      {docs.map((doc) => (
        <Link
          key={doc.routePath}
          href={doc.routePath}
          className="rounded-[1.6rem] border border-border/60 bg-card/70 p-5 transition hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-foreground">{doc.title}</h3>
            {doc.visibilityBadge ? <VisibilityBadge variant={doc.visibilityBadge} /> : null}
          </div>
          {doc.description ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{doc.description}</p>
          ) : null}
        </Link>
      ))}
    </div>
  )
}

export function createMdxComponents(docsBySection: Record<string, DocPage[]>) {
  return {
    a: MdxLink,
    table: (props: ComponentPropsWithoutRef<'table'>) => (
      <div className="my-6 overflow-x-auto rounded-2xl border border-border/60">
        <table {...props} />
      </div>
    ),
    details: (props: ComponentPropsWithoutRef<'details'>) => (
      <details
        {...props}
        className={[
          'my-6 rounded-2xl border border-border/60 bg-card/60 p-4',
          props.className ?? '',
        ]
          .join(' ')
          .trim()}
      />
    ),
    summary: (props: ComponentPropsWithoutRef<'summary'>) => (
      <summary {...props} className="cursor-pointer font-semibold text-foreground" />
    ),
    TOC: ({ section }: { section: string }) => (
      <SectionCards section={section} docsBySection={docsBySection} />
    ),
    Stackblitz: ({ id, file }: { id: string; file?: string }) => (
      <ExampleCard
        provider="StackBlitz"
        title="예제 코드 열기"
        href={`https://stackblitz.com/edit/${id}${file ? `?file=${file}` : ''}`}
        meta={file ? `예제 파일: ${decodeURIComponent(file)}` : `예제 ID: ${id}`}
      />
    ),
    CodeSandbox: ({ id }: { id: string }) => (
      <ExampleCard
        provider="CodeSandbox"
        title="예제 샌드박스 열기"
        href={`https://codesandbox.io/s/${id}`}
        meta={`예제 ID: ${id}`}
      />
    ),
  }
}

