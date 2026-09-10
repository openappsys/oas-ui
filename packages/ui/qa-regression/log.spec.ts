// 复核回归：log——搜索过滤能力（keyword / oas-search）固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('log 搜索过滤：keyword 过滤行数正确、mark 高亮存在、oas-search detail 正确、清空恢复', async ({
  page,
}) => {
  await page.goto('/components/log.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#log-search')
  // demo 数据为 12 行（3 行 ERROR），等异步填充完成
  await page.waitForFunction(
    () => document.querySelector('#log-search')!.shadowRoot!.querySelectorAll('.row').length === 12,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('#log-search')!
    const rows = () => el.shadowRoot!.querySelectorAll('.row').length
    const marks = () => el.shadowRoot!.querySelectorAll('.mark').length
    const events: unknown[] = []
    el.addEventListener('oas-search', (e) => events.push((e as CustomEvent).detail))
    const before = { rows: rows(), marks: marks() }
    el.setAttribute('keyword', 'ERROR')
    const filtered = {
      rows: rows(),
      marks: marks(),
      firstMark: el.shadowRoot!.querySelector('.mark')!.textContent,
      countText: document.querySelector('#log-search-count')!.textContent,
      linesSnapshot: (el as unknown as { lines: string[] }).lines.length,
    }
    el.removeAttribute('keyword')
    const restored = { rows: rows(), marks: marks() }
    return { before, filtered, restored, events }
  })
  expect(r.before.rows).toBe(12)
  // 过滤后只显示 3 行 ERROR，且命中片段包 mark
  expect(r.filtered.rows).toBe(3)
  expect(r.filtered.marks).toBeGreaterThanOrEqual(3)
  expect(r.filtered.firstMark).toBe('ERROR')
  // demo 事件反馈可见：计数文案展示命中数
  expect(r.filtered.countText).toBe('命中 3/12 行')
  // 过滤不改宿主数据
  expect(r.filtered.linesSnapshot).toBe(12)
  expect(r.restored.rows).toBe(12)
  expect(r.restored.marks).toBe(0)
  // oas-search：keyword 变化与清空各派发一次，detail 完整
  expect(r.events).toEqual([
    { keyword: 'ERROR', matched: 3, total: 12 },
    { keyword: '', matched: 12, total: 12 },
  ])
})

test('log 搜索过滤：无命中显示「无匹配」空态（locale），暗色下 mark 底色换 token 仍可读', async ({
  page,
}) => {
  await page.goto('/components/log.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#log-search')
  await page.waitForFunction(
    () => document.querySelector('#log-search')!.shadowRoot!.querySelectorAll('.row').length === 12,
    { timeout: 10000 },
  )
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('#log-search')!
      el.setAttribute('keyword', 'ERROR')
      const mark = el.shadowRoot!.querySelector('.mark')!
      const cs = getComputedStyle(mark)
      return { bg: cs.backgroundColor, color: cs.color }
    })
  const light = await read()
  expect(light.bg, 'light 下 mark 有 warning 语义底色（非透明）').not.toBe('rgba(0, 0, 0, 0)')
  expect(light.color, 'light 下 mark 文字色可读').not.toBe('rgba(0, 0, 0, 0)')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const dark = await read()
  expect(dark.bg, 'dark 下 mark 底色跟随暗色 token 换色').not.toBe(light.bg)
  expect(dark.bg, 'dark 下 mark 仍有底色（非透明）').not.toBe('rgba(0, 0, 0, 0)')
  // 无命中 → 空态占位显示 locale「无匹配日志」
  const emptyText = await page.evaluate(() => {
    const el = document.querySelector('#log-search')!
    el.setAttribute('keyword', 'zzz-no-such-keyword')
    const empty = el.shadowRoot!.querySelector('[part="empty"]')! as HTMLElement
    return { hidden: empty.hidden, text: empty.textContent }
  })
  expect(emptyText.hidden).toBe(false)
  expect(emptyText.text).toContain('无匹配日志')
})
