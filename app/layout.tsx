import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JetBrains_Mono, Manrope } from 'next/font/google'

import { getSectionGroups } from '@/lib/docs'

import { SidebarNav } from '@/components/sidebar-nav'
import { SiteHeader } from '@/components/site-header'
import { ThemeProvider } from '@/components/theme-provider'

import '@/app/globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Jotai 한국어 문서',
    template: '%s | Jotai 한국어 문서',
  },
  description: 'Jotai 전체 한국어 번역 문서를 제공하는 정적 MDX 문서 사이트입니다.',
  openGraph: {
    title: 'Jotai 한국어 문서',
    description: 'Jotai 전체 한국어 번역 문서를 제공하는 정적 MDX 문서 사이트입니다.',
    url: siteUrl,
    siteName: 'Jotai 한국어 문서',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jotai 한국어 문서',
    description: 'Jotai 전체 한국어 번역 문서를 제공하는 정적 MDX 문서 사이트입니다.',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const groups = await getSectionGroups()

  return (
    <html lang="ko" suppressHydrationWarning className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-[var(--font-sans)] antialiased">
        <ThemeProvider>
          <div className="relative min-h-screen">
            <SiteHeader groups={groups} />
            <div className="mx-auto grid max-w-[1600px] gap-8 px-4 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
              <SidebarNav groups={groups} />
              <main className="min-w-0">{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
