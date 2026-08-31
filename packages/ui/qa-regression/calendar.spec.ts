// 复核回归：calendar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('calendar 自定义单元格：cell-render 标记的节假日点可见', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar#calendar-cell-render')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-cell-render')!
    const dots = [...el.shadowRoot!.querySelectorAll('.day .cell-dot')].map((d) => {
      const btn = d.closest('.day')
      return { iso: btn?.getAttribute('data-date'), cls: btn?.className }
    })
    return { dots, text: el.shadowRoot!.querySelector('[part="title"]')?.textContent ?? '' }
  })
  expect(r.text).toContain('2026')
  // 至少两个节假日点（建军节 8-01、8-15），且标记落在本日单元格上
  expect(r.dots.length).toBeGreaterThanOrEqual(2)
  expect(r.dots.some((d) => d.iso === '2026-08-01' && d.cls?.includes('holiday'))).toBe(true)
})

test('calendar 模式切换：year 选中月份后自动切回月视图（value 双向同步）', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-calendar#calendar-mode')
  // 切到年视图
  await page.locator('#calendar-mode-year').click()
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return (
      el.getAttribute('mode') === 'year' &&
      el.shadowRoot!.querySelectorAll('.month-cell').length === 12
    )
  })
  // 年视图下点 2026 年 7 月 → value 更新 + 自动切回月视图
  await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    const months = el.shadowRoot!.querySelectorAll('.month-cell')
    ;(months[6] as HTMLElement).click()
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return (
      el.getAttribute('value') === '2026-07' &&
      el.getAttribute('mode') === 'month' &&
      el.shadowRoot!.querySelectorAll('.day').length > 0
    )
  })
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-calendar#calendar-mode')!
    return {
      mode: el.getAttribute('mode'),
      value: el.getAttribute('value'),
      title: el.shadowRoot!.querySelector('[part="title"]')!.textContent,
      output: document.querySelector('#calendar-mode-output')?.textContent ?? '',
    }
  })
  expect(r.mode).toBe('month')
  expect(r.value).toBe('2026-07')
  expect(r.title).toContain('2026年7月')
  expect(r.output).toContain('oas-mode-change')
})

// —— slider P1 补缺：show-input 联动 + 自定义滑块 + reverse ——
// 曾现缺口：滑块无数值输入联动（精确取值只能靠猜）、滑块外观不可定制、方向不可反转。
// 本次补 show-input（双向同步 + 防抖 + 夹取）、range（双滑块区间）、custom-thumb（模板/插槽）、reverse。
