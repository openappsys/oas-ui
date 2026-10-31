import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

  it('中文总览页每个分组与 sidebar 完整同源同序（含 FormItem/FormList 锚点补充）', () => {
    const content = readFileSync(resolve(import.meta.dirname, './docs/components/index.md'), 'utf8')
    const sections = content.split(/^## .+$/m).slice(1)
    expect(sections.length).toBe(componentSidebar.length)
    const formExtras = ['/components/form#栅格表单布局', '/components/form#动态字段组-form-list']
    const omitted = new Set(['/components/message-actions', '/components/prompt-input', '/components/tool-call'])
    sections.forEach((section, index) => {
      const actual = [...section.matchAll(/\]\((\/components\/[^)\s]+)\)/g)].map((m) => m[1])
      const expected = (componentSidebar[index]!.items ?? [])
        .filter((item) => !omitted.has(item.link!))
        .flatMap((item) => (item.link === '/components/form' ? [item.link!, ...formExtras] : [item.link!]))
      expect(actual, `中文总览「${componentSidebar[index]!.text}」应与 sidebar 完整同源同序`).toEqual(expected)
    })
  })

  it('英文总览页每个分组与英文 sidebar 完整同源同序（含 FormItem/FormList 锚点补充）', () => {
    const content = readFileSync(resolve(import.meta.dirname, './docs/en/components/index.md'), 'utf8')
    const sections = content.split(/^## .+$/m).slice(1)
    expect(sections.length).toBe(enComponentSidebar.length)
    const formExtras = ['/en/components/form#grid-form-layout', '/en/components/form#dynamic-field-group-form-list']
    const omitted = new Set([
      '/en/components/message-actions',
      '/en/components/prompt-input',
      '/en/components/tool-call',
    ])
    sections.forEach((section, index) => {
      const actual = [...section.matchAll(/\]\((\/en\/components\/[^)\s]+)\)/g)].map((m) => m[1])
      const expected = (enComponentSidebar[index]!.items ?? [])
        .filter((item) => !omitted.has(item.link!))
        .flatMap((item) => (item.link === '/en/components/form' ? [item.link!, ...formExtras] : [item.link!]))
      expect(actual, `英文总览「${enComponentSidebar[index]!.text}」应与 sidebar 完整同源同序`).toEqual(expected)
    })
  })

  it('llms.txt 组件分组与 sidebar 精确同序（防止生成器解析源码字面量产生漂移）', () => {
    const content = readFileSync(resolve(import.meta.dirname, './docs/public/llms.txt'), 'utf8')
    const sections = new Map(
      content
        .split(/^## /m)
        .slice(1)
        .map((section) => [section.split('\n', 1)[0]!, section]),
    )
    for (const group of componentSidebar) {
      const section = sections.get(group.text!)
      if (!section) throw new Error(`llms.txt 缺少组件分组「${group.text}」`)
      const actual = [...section.matchAll(/\]\(https:\/\/oas-ui\.dev(\/components\/[^)\s]+)\)/g)].map((m) => m[1])
      const expected = (group.items ?? []).map((item) => item.link!)
      expect(actual, `llms.txt「${group.text}」应与 sidebar 精确同序`).toEqual(expected)
    }
  })
})
