#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const manifestPath = path.join(cwd, 'translation-manifest.json')

if (!fs.existsSync(manifestPath)) {
  console.error('translation-manifest.json not found')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const expectedFiles = [...manifest.files].sort()
const docsDir = path.join(cwd, 'docs')
const sourceArgIndex = process.argv.indexOf('--source')
const sourceDocsDir =
  sourceArgIndex >= 0 ? path.resolve(process.argv[sourceArgIndex + 1]) : null

const listRelativeFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return []
  }
  const results = []
  const walk = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!/\.(md|mdx)$/.test(entry.name)) {
        continue
      }
      results.push(path.relative(cwd, fullPath).split(path.sep).join('/'))
    }
  }
  walk(dir)
  return results.sort()
}

const diffSets = (expected, actual) => {
  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  const missing = expected.filter((file) => !actualSet.has(file))
  const extra = actual.filter((file) => !expectedSet.has(file))
  return { missing, extra }
}

const collectMetrics = (content) => {
  const headingCount = (content.match(/^#{1,6}\s/mg) || []).length
  const codeFenceCount = (content.match(/^```/mg) || []).length
  const componentTags = [...content.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map(
    (match) => match[1],
  )
  const relativeLinks = [...content.matchAll(/\]\(((?:\.\.\/|\.\/|\/docs)[^)#\s]+(?:#[^)]+)?)\)/g)].map(
    (match) => match[1],
  )

  return {
    headingCount,
    codeFenceCount,
    componentTagCount: componentTags.length,
    componentTags,
    relativeLinks,
  }
}

const actualFiles = listRelativeFiles(docsDir)
const { missing, extra } = diffSets(expectedFiles, actualFiles)

let hasFailure = false

if (missing.length || extra.length) {
  hasFailure = true
  if (missing.length) {
    console.error('Missing files:')
    missing.forEach((file) => console.error(`  - ${file}`))
  }
  if (extra.length) {
    console.error('Unexpected files:')
    extra.forEach((file) => console.error(`  - ${file}`))
  }
}

if (sourceDocsDir) {
  for (const relativeFile of expectedFiles) {
    const localPath = path.join(cwd, relativeFile)
    const sourcePath = path.join(
      sourceDocsDir,
      relativeFile.replace(/^docs\//, ''),
    )

    if (!fs.existsSync(localPath) || !fs.existsSync(sourcePath)) {
      hasFailure = true
      console.error(`Unable to compare ${relativeFile}: file missing`)
      continue
    }

    const localMetrics = collectMetrics(fs.readFileSync(localPath, 'utf8'))
    const sourceMetrics = collectMetrics(fs.readFileSync(sourcePath, 'utf8'))

    const mismatch =
      localMetrics.headingCount !== sourceMetrics.headingCount ||
      localMetrics.codeFenceCount !== sourceMetrics.codeFenceCount ||
      localMetrics.componentTagCount !== sourceMetrics.componentTagCount ||
      JSON.stringify(localMetrics.relativeLinks) !==
        JSON.stringify(sourceMetrics.relativeLinks)

    if (mismatch) {
      hasFailure = true
      console.error(`Structural mismatch: ${relativeFile}`)
      console.error(
        `  headings local/source: ${localMetrics.headingCount}/${sourceMetrics.headingCount}`,
      )
      console.error(
        `  code fences local/source: ${localMetrics.codeFenceCount}/${sourceMetrics.codeFenceCount}`,
      )
      console.error(
        `  component tags local/source: ${localMetrics.componentTagCount}/${sourceMetrics.componentTagCount}`,
      )
      console.error(
        `  relative links local/source: ${localMetrics.relativeLinks.length}/${sourceMetrics.relativeLinks.length}`,
      )
    }
  }
}

if (hasFailure) {
  process.exit(1)
}

console.log(
  `Docs completeness check passed for ${actualFiles.length} files${sourceDocsDir ? ' with structural comparison' : ''}.`,
)
