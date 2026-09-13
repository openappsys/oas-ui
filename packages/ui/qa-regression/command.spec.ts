// 复核回归：command——历史缺陷固化断言（2026-09-02 补缺复核时补建；此前行为断言仅靠单测与 demo-coverage）

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('command 基础回归：open 打开、过滤驱动可见行、方向键高亮、Enter 选中回调', async ({ page }) => {
  await page.goto('/components/command.html', { waitUntil: 'domcontentloaded' })
  // command 关闭态 host 高度为 0（overlay 隐藏），up() 的 visible 等待会超时——改等 attached + shadow 就绪
  await page.waitForSelector('#command-basic', { state: 'attached', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('#command-basic')?.shadowRoot != null, null, {
    timeout: 15000,
  })
  // 打开（受控 open；demo 用 ⌘J 或外部按钮，这里直接设属性等价）
  await page.evaluate(() => document.querySelector('#command-basic')?.setAttribute('open', ''))
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('#command-basic')?.shadowRoot?.querySelector('.overlay')
      return overlay && getComputedStyle(overlay).display !== 'none'
    },
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(async () => {
    const cmd = document.querySelector('#command-basic')!
    const root = cmd.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('input.search')!
    input.focus()
    // 过滤：输入关键词后可见 .option 行减少
    const count = () => root.querySelectorAll('.option').length
    const before = count()
    input.value = '文件'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r2) => setTimeout(r2, 200))
    const after = count()
    // 方向键高亮
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await new Promise((r2) => setTimeout(r2, 100))
    const active = root.querySelectorAll('.option.active').length
    // Enter 选中 → oas-select 派发（detail { value }）
    let selected = ''
    cmd.addEventListener(
      'oas-select',
      (e) => {
        selected = (e as CustomEvent).detail?.value ?? ''
      },
      { once: true },
    )
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await new Promise((r2) => setTimeout(r2, 200))
    return { before, after, filtered: after > 0 && after < before, active, selected }
  })
  expect(r.filtered, `输入过滤词后可见行应减少（before=${r.before} after=${r.after}）`).toBe(true)
  expect(r.active, '方向键后应有 .active 高亮行').toBeGreaterThan(0)
  expect(r.selected, 'Enter 应派发 oas-select 并携带选中 value').toBeTruthy()
})

// 移动端专项：coarse 下选项行最小高度 ≥44px（触控目标抬升）
test('command 移动端：coarse 下选项行最小高度 ≥44px（--oas-touch-target-min）', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/command.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-command')
    const r = await page.evaluate(async () => {
      const el = document.querySelector('oas-command')!
      el.setAttribute('open', '')
      await new Promise((res) => setTimeout(res, 300))
      const root = el.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const opt = root.querySelector<HTMLElement>('.option')!
      return {
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        optMin: parseFloat(getComputedStyle(opt).minHeight),
      }
    })
    expect(r.coarseRule, '样式表应有 coarse 触摸目标规则').toBe(true)
    expect(r.optMin, '选项行 coarse 下最小高度 ≥44px').toBeGreaterThanOrEqual(44)
  } finally {
    await ctx.close()
  }
})
