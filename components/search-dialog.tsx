'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'
import { Command, Search, X } from 'lucide-react'

import { splitQuery } from '@/lib/utils'

import { VisibilityBadge } from '@/components/visibility-badge'

type SearchRecord = {
  routePath: string
  title: string
  description?: string
  headings: string[]
  keywords: string[]
  body: string
  section: string
  visibilityBadge: 'draft' | 'unpublished' | null
}

const SECTION_LABELS: Record<string, string> = {
  root: '홈',
  core: '코어',
  utilities: '유틸리티',
  extensions: '확장',
  'third-party': '서드파티',
  tools: '도구',
  basics: '기본',
  guides: '가이드',
  recipes: '레시피',
}

function normalizeText(text: string) {
  return text.toLowerCase()
}

function buildExcerpt(record: SearchRecord, normalizedQuery: string) {
  const source = record.description || record.body
  if (!source) {
    return `${SECTION_LABELS[record.section] ?? record.section} 문서`
  }

  const normalizedSource = normalizeText(source)
  const matchIndex = normalizedSource.indexOf(normalizedQuery)
  if (matchIndex === -1) {
    return source.slice(0, 120).trim()
  }

  const start = Math.max(0, matchIndex - 48)
  const end = Math.min(source.length, matchIndex + 96)
  return `${start > 0 ? '…' : ''}${source.slice(start, end).trim()}${end < source.length ? '…' : ''}`
}

function scoreRecord(record: SearchRecord, terms: string[]) {
  const title = normalizeText(record.title)
  const description = normalizeText(record.description ?? '')
  const headings = record.headings.map(normalizeText)
  const keywords = record.keywords.map(normalizeText)
  const body = normalizeText(record.body)
  const section = normalizeText(SECTION_LABELS[record.section] ?? record.section)

  let score = 0
  for (const term of terms) {
    if (title.includes(term)) score += 12
    if (description.includes(term)) score += 6
    if (keywords.some((keyword) => keyword.includes(term))) score += 8
    if (headings.some((heading) => heading.includes(term))) score += 7
    if (section.includes(term)) score += 4
    if (body.includes(term)) score += 2
  }

  return score
}

export function SearchDialog() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<SearchRecord[] | null>(null)

  const deferredQuery = useDeferredValue(query)
  const isLoading = open && index === null

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }

      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open || index) {
      return
    }

    let cancelled = false

    fetch('/search-index.json')
      .then((response) => response.json() as Promise<SearchRecord[]>)
      .then((records) => {
        if (!cancelled) {
          setIndex(records)
        }
      })

    return () => {
      cancelled = true
    }
  }, [index, open])

  const results = useMemo(() => {
    if (!index) {
      return []
    }

    const terms = splitQuery(deferredQuery)
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (terms.length === 0) {
      return index.slice(0, 10).map((record) => ({
        record,
        score: 0,
        excerpt: record.description ?? `${SECTION_LABELS[record.section] ?? record.section} 문서`,
      }))
    }

    return index
      .map((record) => ({
        record,
        score: scoreRecord(record, terms),
        excerpt: buildExcerpt(record, normalizedQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title))
      .slice(0, 12)
  }, [deferredQuery, index])

  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">문서 검색</span>
        <span className="hidden items-center gap-1 rounded-lg border border-border/80 px-2 py-1 text-[11px] sm:inline-flex">
          <Command className="h-3 w-3" />K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 pt-[12vh] backdrop-blur-md">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="검색 닫기"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border/70 bg-background/95 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4">
              <Search className="h-5 w-5 text-primary" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목, 본문, 키워드로 검색하세요"
                className="h-11 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-card/70"
                aria-label="검색 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3">
              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
                  검색 인덱스를 불러오는 중입니다.
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <ul className="space-y-2">
                  {results.map(({ record, excerpt }) => (
                    <li key={record.routePath}>
                      <button
                        type="button"
                        onClick={() => handleSelect(record.routePath)}
                        className="flex w-full items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card/55 px-4 py-4 text-left transition hover:border-primary/35 hover:bg-primary/5"
                      >
                        <span className="min-w-0">
                          <span className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                            {SECTION_LABELS[record.section] ?? record.section}
                          </span>
                          <span className="line-clamp-2 block text-base font-semibold text-foreground">
                            {record.title}
                          </span>
                          <span className="mt-2 line-clamp-3 block text-sm text-muted-foreground">
                            {excerpt}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {record.visibilityBadge ? (
                            <VisibilityBadge variant={record.visibilityBadge} />
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
