import type { MetadataRoute } from 'next'

import { getAllDocs, resolveCanonicalUrl } from '@/lib/docs'

export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getAllDocs()
  return docs.map((doc) => ({
    url: resolveCanonicalUrl(doc.routePath),
  }))
}
