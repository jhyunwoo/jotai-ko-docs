import fs from 'node:fs/promises'
import path from 'node:path'

import matter from 'gray-matter'
import { toString } from 'mdast-util-to-string'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'

const docsDir = path.join(process.cwd(), 'docs')
const outputPath = path.join(process.cwd(), 'public', 'search-index.json')

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return walk(entryPath)
      }
      if (entry.isFile() && entry.name.endsWith('.mdx')) {
        return [entryPath]
      }
      return []
    }),
  )

  return files.flat().sort()
}

function normalizeKeywords(keywords) {
  if (!keywords) {
    return []
  }

  if (Array.isArray(keywords)) {
    return keywords.map((keyword) => keyword.trim()).filter(Boolean)
  }

  return String(keywords)
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function createTree(body) {
  return unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(body)
}

function getHeadings(body) {
  const tree = createTree(body)
  const headings = []

  visit(tree, 'heading', (node) => {
    if (!('depth' in node) || node.depth < 2 || node.depth > 3) {
      return
    }

    const text = toString(node).trim()
    if (text) {
      headings.push(text)
    }
  })

  return headings
}

function getPlainText(body) {
  return toString(createTree(body)).replace(/\s+/g, ' ').trim()
}

function getRoutePath(relativePath) {
  if (relativePath === 'index.mdx') {
    return '/'
  }

  return `/${relativePath.replace(/\.mdx$/, '')}`
}

function getSection(relativePath) {
  if (relativePath === 'index.mdx') {
    return 'root'
  }

  return relativePath.split('/')[0]
}

function getVisibilityBadge(data) {
  if (String(data.status || '').toLowerCase() === 'draft') {
    return 'draft'
  }

  if (data.published === false) {
    return 'unpublished'
  }

  return null
}

async function buildSearchIndex() {
  const files = await walk(docsDir)
  const records = await Promise.all(
    files.map(async (filePath) => {
      const source = await fs.readFile(filePath, 'utf8')
      const { data, content } = matter(source)
      const relativePath = path.relative(docsDir, filePath).replaceAll(path.sep, '/')

      return {
        routePath: getRoutePath(relativePath),
        title: data.title,
        description: data.description,
        headings: getHeadings(content),
        keywords: normalizeKeywords(data.keywords),
        body: getPlainText(content),
        section: getSection(relativePath),
        visibilityBadge: getVisibilityBadge(data),
      }
    }),
  )

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, JSON.stringify(records, null, 2))

  console.log(`search index written: ${records.length} docs`)
}

buildSearchIndex().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
