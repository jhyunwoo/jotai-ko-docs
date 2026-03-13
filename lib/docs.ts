import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'

import matter from 'gray-matter'
import GithubSlugger from 'github-slugger'
import { toString } from 'mdast-util-to-string'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'

export const DOCS_DIR = path.join(process.cwd(), 'docs')
export const SECTION_ORDER = [
  'core',
  'utilities',
  'extensions',
  'third-party',
  'tools',
  'basics',
  'guides',
  'recipes',
] as const

export type DocSection = (typeof SECTION_ORDER)[number] | 'root'

export interface DocFrontmatter {
  title: string
  description?: string
  nav?: number
  keywords?: string | string[]
  published?: boolean
  status?: string
}

export interface DocHeading {
  depth: number
  text: string
  slug: string
}

export interface DocPage {
  slugSegments: string[]
  routePath: string
  aliasPath: string
  section: DocSection
  title: string
  description?: string
  body: string
  headings: DocHeading[]
  keywords: string[]
  nav: number | null
  published: boolean
  status?: string
  visibilityBadge: 'draft' | 'unpublished' | null
  filePath: string
  relativePath: string
  plainText: string
}

export interface NavDoc {
  routePath: string
  title: string
  description?: string
  visibilityBadge: DocPage['visibilityBadge']
}

export interface SectionGroup {
  id: Exclude<DocSection, 'root'>
  label: string
  docs: NavDoc[]
}

export interface SearchRecord {
  routePath: string
  title: string
  description?: string
  headings: string[]
  keywords: string[]
  body: string
  section: DocSection
  visibilityBadge: DocPage['visibilityBadge']
}

const SECTION_LABELS: Record<Exclude<DocSection, 'root'>, string> = {
  core: '코어',
  utilities: '유틸리티',
  extensions: '확장',
  'third-party': '서드파티',
  tools: '도구',
  basics: '기본',
  guides: '가이드',
  recipes: '레시피',
}

let docsCache: DocPage[] | null = null

async function walkDocs(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return walkDocs(entryPath)
      }
      if (entry.isFile() && entry.name.endsWith('.mdx')) {
        return [entryPath]
      }
      return []
    }),
  )

  return files.flat().sort()
}

function getRelativeDocPath(filePath: string) {
  return path.relative(DOCS_DIR, filePath).replaceAll(path.sep, '/')
}

function getSlugSegments(relativePath: string) {
  if (relativePath === 'index.mdx') {
    return []
  }

  return relativePath.replace(/\.mdx$/, '').split('/')
}

function getSection(slugSegments: string[]): DocSection {
  return slugSegments.length === 0 ? 'root' : (slugSegments[0] as Exclude<DocSection, 'root'>)
}

function getRoutePath(slugSegments: string[]) {
  return slugSegments.length === 0 ? '/' : `/${slugSegments.join('/')}`
}

function getAliasPath(routePath: string) {
  return routePath === '/' ? '/docs' : `/docs${routePath}`
}

function normalizeKeywords(keywords: DocFrontmatter['keywords']) {
  if (!keywords) {
    return []
  }

  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => keyword.trim()).filter(Boolean)
  }

  return keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function getVisibilityBadge(frontmatter: DocFrontmatter): DocPage['visibilityBadge'] {
  if (frontmatter.status?.toLowerCase() === 'draft') {
    return 'draft'
  }

  if (frontmatter.published === false) {
    return 'unpublished'
  }

  return null
}

function createRemarkTree(body: string) {
  return unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .parse(body)
}

function extractHeadings(body: string) {
  const tree = createRemarkTree(body)
  const slugger = new GithubSlugger()
  const headings: DocHeading[] = []

  visit(tree, 'heading', (node) => {
    if (!('depth' in node) || node.depth < 2 || node.depth > 3) {
      return
    }

    const text = toString(node).trim()
    if (!text) {
      return
    }

    headings.push({
      depth: node.depth,
      text,
      slug: slugger.slug(text),
    })
  })

  return headings
}

function extractPlainText(body: string) {
  const tree = createRemarkTree(body)

  return toString(tree)
    .replace(/\s+/g, ' ')
    .trim()
}

async function parseDoc(filePath: string): Promise<DocPage> {
  const source = await fs.readFile(filePath, 'utf8')
  const { content, data } = matter(source)
  const relativePath = getRelativeDocPath(filePath)
  const slugSegments = getSlugSegments(relativePath)
  const routePath = getRoutePath(slugSegments)
  const frontmatter = data as DocFrontmatter

  return {
    slugSegments,
    routePath,
    aliasPath: getAliasPath(routePath),
    section: getSection(slugSegments),
    title: frontmatter.title,
    description: frontmatter.description,
    body: content,
    headings: extractHeadings(content),
    keywords: normalizeKeywords(frontmatter.keywords),
    nav: typeof frontmatter.nav === 'number' ? frontmatter.nav : null,
    published: frontmatter.published !== false,
    status: frontmatter.status,
    visibilityBadge: getVisibilityBadge(frontmatter),
    filePath,
    relativePath,
    plainText: extractPlainText(content),
  }
}

function compareDocs(a: DocPage, b: DocPage) {
  if (a.section === 'root' || b.section === 'root') {
    return a.section === 'root' ? -1 : 1
  }

  const sectionDelta = SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
  if (sectionDelta !== 0) {
    return sectionDelta
  }

  const aNav = a.nav ?? Number.POSITIVE_INFINITY
  const bNav = b.nav ?? Number.POSITIVE_INFINITY
  if (aNav !== bNav) {
    return aNav - bNav
  }

  return a.relativePath.localeCompare(b.relativePath)
}

export async function getAllDocs() {
  if (docsCache) {
    return docsCache
  }

  const docPaths = await walkDocs(DOCS_DIR)
  const docs = await Promise.all(docPaths.map(parseDoc))
  docs.sort(compareDocs)
  docsCache = docs
  return docsCache
}

export async function getDocBySlug(slugSegments: string[]) {
  const docs = await getAllDocs()
  return docs.find((doc) => doc.routePath === getRoutePath(slugSegments)) ?? null
}

export async function getSectionGroups(): Promise<SectionGroup[]> {
  const docs = await getAllDocs()

  return SECTION_ORDER.map((section) => ({
    id: section,
    label: SECTION_LABELS[section],
    docs: docs
      .filter((doc) => doc.section === section)
      .map((doc) => ({
        routePath: doc.routePath,
        title: doc.title,
        description: doc.description,
        visibilityBadge: doc.visibilityBadge,
      })),
  }))
}

export async function getDocsForSection(section: Exclude<DocSection, 'root'>) {
  const docs = await getAllDocs()
  return docs.filter((doc) => doc.section === section)
}

export async function getPrevNextDocs(routePath: string) {
  const docs = await getAllDocs()
  const index = docs.findIndex((doc) => doc.routePath === routePath)
  if (index === -1) {
    return { previous: null, next: null }
  }

  return {
    previous: docs[index - 1] ?? null,
    next: docs[index + 1] ?? null,
  }
}

export async function getSearchRecords(): Promise<SearchRecord[]> {
  const docs = await getAllDocs()
  return docs.map((doc) => ({
    routePath: doc.routePath,
    title: doc.title,
    description: doc.description,
    headings: doc.headings.map((heading) => heading.text),
    keywords: doc.keywords,
    body: doc.plainText,
    section: doc.section,
    visibilityBadge: doc.visibilityBadge,
  }))
}

export function getSectionLabel(section: Exclude<DocSection, 'root'>) {
  return SECTION_LABELS[section]
}

export function resolveCanonicalUrl(routePath: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return new URL(routePath, siteUrl).toString()
}
