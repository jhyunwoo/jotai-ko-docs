import Link from 'next/link'

import type { SectionGroup } from '@/lib/docs'

import { MobileNav } from '@/components/mobile-nav'
import { SearchDialog } from '@/components/search-dialog'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader({ groups }: { groups: SectionGroup[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav groups={groups} />
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-400 text-lg font-black text-slate-950 shadow-glow">
              J
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Jotai 한국어 문서</span>
              <span className="block text-xs text-muted-foreground">
                정적 MDX 문서 사이트
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <SearchDialog />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

