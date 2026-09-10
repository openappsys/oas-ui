// 复核回归：ellipsis——多行方向截断 / suffix 保留 / 点文本展开 aria 态固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

// 注：page.evaluate 只序列化函数本体，辅助逻辑须内联在各自 evaluate 中。

test('ellipsis 多行 middle：首行保头、末行保尾，中部省略号衔接', async ({ page }) => {
  await page.goto('/components/ellipsis.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ellipsis[direction="middle"][rows="3"]')
  await page.waitForFunction(
    () => {
      const t = document
        .querySelector('oas-ellipsis[direction="middle"][rows="3"]')!
        .shadowRoot!.querySelector('[part="text"]')!.textContent!
      return t.includes('…')
    },
    null,
    { timeout: 10000 },
  )
  const text = await page.evaluate(
    () =>
      document
        .querySelector('oas-ellipsis[direction="middle"][rows="3"]')!
        .shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent!,
  )
  expect(text).toContain('…')
  // 首行保留开头、末行保留结尾（demo 文本首尾特征串）
  expect(text.startsWith('这是一段')).toBe(true)
  expect(text.endsWith('才能辨认的字符串。')).toBe(true)
  // 确实发生截断（内容短于 demo 全文）
  expect(text.length).toBeLessThan(160)
})

test('ellipsis 多行 start：省略头部、末尾路径完整保留', async ({ page }) => {
  await page.goto('/components/ellipsis.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ellipsis[direction="start"][rows="2"]')
  await page.waitForFunction(
    () => {
      const t = document
        .querySelector('oas-ellipsis[direction="start"][rows="2"]')!
        .shadowRoot!.querySelector('[part="text"]')!.textContent!
      return t.includes('…')
    },
    null,
    { timeout: 10000 },
  )
  const text = await page.evaluate(
    () =>
      document
        .querySelector('oas-ellipsis[direction="start"][rows="2"]')!
        .shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent!,
  )
  expect(text.startsWith('…')).toBe(true)
  expect(text.endsWith('宽度变化时自动重新测量。')).toBe(true)
})

test('ellipsis suffix：tail 截断保留扩展名', async ({ page }) => {
  await page.goto('/components/ellipsis.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ellipsis[suffix=".pdf"]')
  await page.waitForFunction(
    () => {
      const t = document
        .querySelector('oas-ellipsis[suffix=".pdf"]')!
        .shadowRoot!.querySelector('[part="text"]')!.textContent!
      return t.includes('…')
    },
    null,
    { timeout: 10000 },
  )
  const text = await page.evaluate(
    () =>
      document
        .querySelector('oas-ellipsis[suffix=".pdf"]')!
        .shadowRoot!.querySelector<HTMLElement>('[part="text"]')!.textContent!,
  )
  expect(text.endsWith('.pdf')).toBe(true)
  expect(text).toContain('…')
  expect(text.length).toBeLessThan(60)
})

test('ellipsis expand-trigger=click：点文本展开/收起，aria 态同步，无按钮形态', async ({
  page,
}) => {
  await page.goto('/components/ellipsis.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-ellipsis[expand-trigger="click"]')
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-ellipsis[expand-trigger="click"]')!
      const t = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
      return t.getAttribute('role') === 'button' && t.textContent!.includes('…')
    },
    null,
    { timeout: 10000 },
  )
  const before = await page.evaluate(() => {
    const el = document.querySelector('oas-ellipsis[expand-trigger="click"]')!
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
    const toggle = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle"]')!
    return {
      role: t.getAttribute('role'),
      tabindex: t.getAttribute('tabindex'),
      ariaExpanded: t.getAttribute('aria-expanded'),
      toggleHidden: toggle.hidden,
      truncated: t.textContent!.includes('…'),
    }
  })
  expect(before.role).toBe('button')
  expect(before.tabindex).toBe('0')
  expect(before.ariaExpanded).toBe('false')
  expect(before.toggleHidden, 'click 模式无独立按钮形态').toBe(true)
  expect(before.truncated).toBe(true)

  // 点击文本展开：aria-expanded=true、全文恢复（无省略号）
  await page.evaluate(() => {
    document
      .querySelector('oas-ellipsis[expand-trigger="click"]')!
      .shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
      .click()
  })
  const expanded = await page.evaluate(() => {
    const el = document.querySelector('oas-ellipsis[expand-trigger="click"]')!
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
    return { ariaExpanded: t.getAttribute('aria-expanded'), full: !t.textContent!.includes('…') }
  })
  expect(expanded.ariaExpanded).toBe('true')
  expect(expanded.full).toBe(true)

  // 再点收起：aria 态回落、恢复省略
  await page.evaluate(() => {
    document
      .querySelector('oas-ellipsis[expand-trigger="click"]')!
      .shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
      .click()
  })
  const collapsed = await page.evaluate(() => {
    const el = document.querySelector('oas-ellipsis[expand-trigger="click"]')!
    const t = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
    return { ariaExpanded: t.getAttribute('aria-expanded'), truncated: t.textContent!.includes('…') }
  })
  expect(collapsed.ariaExpanded).toBe('false')
  expect(collapsed.truncated).toBe(true)
})
