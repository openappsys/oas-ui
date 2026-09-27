// 复核回归：highlight——文本命中高亮固化断言。
// 覆盖：mark 结构与命中正确性、oas-count demo 可见反馈、token 配色 light/dark 均生效（浏览器
// 真实解析 color-mix+var，happy-dom 只能锁表达式形态）、原文按纯文本渲染（XSS 注入面为零）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('highlight 基础渲染：mark[part=highlight] 命中正确 + oas-count demo 有可见反馈', async ({ page }) => {
  await page.goto('/components/highlight.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-highlight')

  const r = await page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll<HTMLElement>('oas-highlight'))
    const read = (el: HTMLElement) => {
      const root = el.shadowRoot!
      const marks = Array.from(root.querySelectorAll<HTMLElement>('mark'))
      return {
        marks: marks.map((m) => ({ part: m.getAttribute('part'), text: m.textContent })),
        plainText: (root.querySelector('[part="root"]') as HTMLElement).textContent,
      }
    }
    return {
      total: hosts.length,
      single: read(hosts.find((el) => el.getAttribute('highlight') === 'quick')!),
      json: read(hosts.find((el) => (el.getAttribute('highlight') ?? '').startsWith('["')!)!),
      wholeWord: read(hosts.find((el) => el.hasAttribute('whole-word'))!),
    }
  })

  // 单关键词：quick 命中一处
  expect(r.single.marks).toEqual([{ part: 'highlight', text: 'quick' }])
  // JSON 数组：fox/dog 各命中一处
  expect(r.json.marks.map((m) => m.text)).toEqual(['fox', 'dog'])
  // 整词：cat 命中但 category 不命中（仅 1 处）
  expect(r.wholeWord.marks.map((m) => m.text)).toEqual(['cat'])

  // oas-count demo：点击切换关键词组 → 事件重派发 → 反馈文本实时更新（可见反馈，非 console）
  // 点击「不存在」关键词组：count=0 也派发，matches 为空
  await page.click('#highlight-count-none')
  await expect(page.locator('#highlight-count-output')).toHaveText(/命中 0 处/, { timeout: 5000 })
  // 点击第二组：框架/平台 各命中 1 处，matches 带关键词
  await page.click('#highlight-count-b')
  await expect(page.locator('#highlight-count-output')).toHaveText(/命中 2 处/, { timeout: 5000 })
  await expect(page.locator('#highlight-count-output')).toHaveText(/框架/, { timeout: 5000 })
})

test('highlight 配色：mark 底色 light/dark 均真实解析生效（非 transparent、随主题变化）', async ({ page }) => {
  await page.goto('/components/highlight.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-highlight')

  const readBg = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-highlight[highlight="quick"]')!
      const mark = el.shadowRoot!.querySelector('mark')!
      const s = getComputedStyle(mark)
      return { bg: s.backgroundColor, color: s.color }
    })

  const light = await readBg()
  // 浏览器真实解析 color-mix(var(--oas-preset-gold) …) —— 非透明才说明 token 通道通
  expect(light.bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(light.bg).not.toBe('transparent')
  // 文字色为主文字 token（light 下深色）
  expect(light.color).not.toBe(light.bg)

  // 切暗色：底色应随 token 变化（dark 变体），仍非透明
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(100)
  const dark = await readBg()
  expect(dark.bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(dark.bg).not.toBe(light.bg)
})

test('highlight 安全：HTML 字符串按纯文本渲染（动态挂载注入样本）', async ({ page }) => {
  await page.goto('/components/highlight.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-highlight')

  const r = await page.evaluate(() => {
    const el = document.createElement('oas-highlight')
    el.setAttribute('text', 'before <img src=x onerror="window.__xss=1"> after')
    el.setAttribute('highlight', '<img')
    document.body.appendChild(el)
    const root = el.shadowRoot!.querySelector('[part="root"]') as HTMLElement
    const res = {
      imgs: el.shadowRoot!.querySelectorAll('img').length,
      markText: el.shadowRoot!.querySelector('mark')?.textContent,
      plain: root.textContent,
    }
    el.remove()
    return res
  })
  expect(r.imgs).toBe(0)
  expect(r.markText).toBe('<img')
  expect(r.plain).toContain('<img src=x onerror="window.__xss=1">')
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined()
})
