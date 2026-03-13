'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import type { SectionGroup } from '@/lib/docs'
import { cn, normalizePathname } from '@/lib/utils'

import { VisibilityBadge } from '@/components/visibility-badge'

type DocsNavProps = {
  groups: SectionGroup[]
  className?: string
  onNavigate?: () => void
}

export function DocsNav({ groups, className, onNavigate }: DocsNavProps) {
  const pathname = normalizePathname(usePathname())

  return (
    <nav className={cn('space-y-8', className)} aria-label="문서 네비게이션">
      <div className="space-y-2">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            'flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
            pathname === '/'
              ? 'border-primary/30 bg-primary/10 text-primary shadow-glow'
              : 'border-border/60 bg-card/65 text-foreground/80',
          )}
        >
          문서 홈
        </Link>
      </div>

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
            {group.label}
          </h2>
          <ul className="space-y-1">
            {group.docs.map((doc) => {
              const active = pathname === doc.routePath

              return (
                <li key={doc.routePath}>
                  <Link
                    href={doc.routePath}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-start justify-between gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-medium">{doc.title}</span>
                      {doc.description ? (
                        <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                          {doc.description}
                        </span>
                      ) : null}
                    </span>
                    {doc.visibilityBadge ? (
                      <VisibilityBadge variant={doc.visibilityBadge} className="shrink-0" />
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </nav>
  )
}

