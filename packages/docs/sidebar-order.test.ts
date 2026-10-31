import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { componentSidebar, enComponentSidebar } from './docs/.vitepress/sidebar.js'
import type { DefaultTheme } from 'vitepress'

/** 组件查找口径：统一用 URL slug（英文组件名），不随中文 label 改写 */
function slug(item: DefaultTheme.SidebarItem): string {
  const link = item.link ?? ''
  const match = link.match(/\/components\/([^/#?]+)/)
  if (!match) throw new Error(`组件 sidebar 缺少 /components/<slug> 链接: ${link}`)
  return match[1]!
}

describe('docs 组件导航排序', () => {
  it('中文 sidebar 保留分组，且每组内按组件 slug 字母排序', () => {
    expect(componentSidebar.length).toBeGreaterThan(1)
    for (const group of componentSidebar) {
      const slugs = (group.items ?? []).map(slug)
      expect(slugs, `分组「${group.text}」应组内字母排序`).toEqual([...slugs].sort((a, b) => a.localeCompare(b, 'en')))
    }
  })

  it('英文 sidebar 与中文 sidebar 保持同一组件顺序', () => {
    expect(enComponentSidebar.map((g) => (g.items ?? []).map(slug))).toEqual(
      componentSidebar.map((g) => (g.items ?? []).map(slug)),
    )
  })

  it('中英总览页每个分组内的组件链接也按 slug 字母排序', () => {
    for (const [file, prefix] of [
      ['./docs/components/index.md', '/components'],
      ['./docs/en/components/index.md', '/en/components'],
    ] as const) {
      const content = readFileSync(new URL(file, import.meta.url), 'utf8')
      const sections = content.split(/^## .+$/m).slice(1)
      expect(sections.length, `${file} 应有组件分组标题`).toBeGreaterThan(1)
      for (const section of sections) {
        const slugs = [
          ...new Set([...section.matchAll(new RegExp(`\\]\\(${prefix}/([^)#?\\s]+)`, 'g'))].map((m) => m[1]!)),
        ]
        if (slugs.length < 2) continue
        expect(slugs, `${file} 分组内列表应按 slug 字母排序`).toEqual(
          [...slugs].sort((a, b) => a.localeCompare(b, 'en')),
        )
      }
    }
  })
})
