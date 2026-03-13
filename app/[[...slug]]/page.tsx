import type { Metadata } from 'next'

import { DocPage } from '@/components/doc-page'
import { getAllDocs, getDocBySlug, resolveCanonicalUrl } from '@/lib/docs'

type PageProps = {
  params: Promise<{ slug?: string[] }>
}

export const dynamicParams = false

export async function generateStaticParams() {
  const docs = await getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slugSegments,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug = [] } = await params
  const doc = await getDocBySlug(slug)

  if (!doc) {
    return {}
  }

  return {
    title: doc.title,
    description: doc.description,
    keywords: doc.keywords,
    alternates: {
      canonical: resolveCanonicalUrl(doc.routePath),
    },
  }
}

export default async function RoutePage({ params }: PageProps) {
  const { slug = [] } = await params
  return <DocPage slugSegments={slug} />
}

