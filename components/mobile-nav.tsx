'use client'

import { useState } from 'react'

import { Menu, X } from 'lucide-react'

import type { SectionGroup } from '@/lib/docs'

import { DocsNav } from '@/components/docs-nav'

export function MobileNav({ groups }: { groups: SectionGroup[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-foreground transition hover:border-primary/40 hover:text-primary lg:hidden"
        aria-label="문서 메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            aria-label="문서 메뉴 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(88vw,24rem)] overflow-y-auto border-r border-border/70 bg-background/95 px-5 py-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">문서 탐색</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-card/60"
                aria-label="문서 메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DocsNav groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}

