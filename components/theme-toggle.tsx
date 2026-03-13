'use client'

import { useSyncExternalStore } from 'react'

import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from 'next-themes'

const emptySubscribe = () => () => {}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
      aria-label="테마 전환"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      <span className="hidden sm:inline">{isDark ? '라이트' : '다크'}</span>
    </button>
  )
}
