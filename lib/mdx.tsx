import type { ComponentType, ReactNode } from 'react'

import { compileMDX } from 'next-mdx-remote/rsc'
import { h } from 'hastscript'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

import type { DocPage } from '@/lib/docs'

function toCamelCase(property: string) {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function normalizeInlineDetailStyles(source: string) {
  return source.replace(/<details\s+style="([^"]+)"/g, (_match, styleValue: string) => {
    const styleObject = styleValue
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const [property, ...valueParts] = declaration.split(':')
        const value = valueParts.join(':').trim()
        return `${toCamelCase(property.trim())}: "${value}"`
      })
      .join(', ')

    return `<details style={{ ${styleObject} }}`
  })
}

export async function renderDocBody(doc: DocPage, components: Record<string, ComponentType<any>>) {
  const { content } = await compileMDX<{
    children?: ReactNode
  }>({
    source: normalizeInlineDetailStyles(doc.body),
    components,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: {
                className: ['heading-anchor'],
                ariaLabel: '섹션 링크',
              },
              content: [
                h(
                  'span',
                  {
                    className: 'heading-anchor-icon',
                    ariaHidden: 'true',
                  },
                  '#',
                ),
              ],
            },
          ],
          [
            rehypePrettyCode,
            {
              theme: {
                dark: 'github-dark-dimmed',
                light: 'github-light',
              },
              keepBackground: false,
            },
          ],
        ],
      },
    },
  })

  return content
}
