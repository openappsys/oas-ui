// 复核回归：swatch——色板独立件固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/swatch.html'

test('swatch：点选选中环 + 组 oas-change + ARIA 语义 + 键盘漫游（RTL 镜像）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#sw-single')

  // 点选第二色块（绿）：组 value 同步 + 选中态 + 组级事件 + 子件 oas-click 不外泄
  await page.evaluate(() => {
    const w = window as unknown as { __leaks: number }
    w.__leaks = 0
    document.addEventListener('oas-click', () => w.__leaks++)
  })
  await page.locator('#sw-single oas-swatch').nth(1).locator('[part="swatch"]').click()
  const r = await page.evaluate(() => {
    const g = document.getElementById('sw-single')!
    const sw = [...g.querySelectorAll('oas-swatch')]
    const btn = sw[1]!.shadowRoot!.querySelector('[part="swatch"]')!
    return {
      value: g.getAttribute('value'),
      selected: sw[1]!.hasAttribute('selected'),
      firstSelected: sw[0]!.hasAttribute('selected'),
      role: btn.getAttribute('role'),
      ariaChecked: btn.getAttribute('aria-checked'),
      outText: document.getElementById('sw-single-out')!.textContent,
      leaks: (window as unknown as { __leaks: number }).__leaks,
    }
  })
  expect(r.value).toBe('green')
  expect(r.selected).toBe(true)
  expect(r.firstSelected).toBe(false)
  expect(r.role, '组内单选语义为 radio').toBe('radio')
  expect(r.ariaChecked).toBe('true')
  expect(r.outText, 'demo 反馈文本更新').toContain('green')
  expect(r.leaks, '子件 oas-click 不外泄').toBe(0)

  // 键盘：roving 漫游 + Enter 选中（当前选中 green(1)；从首件漫游两次到 orange(2)）
  await page.locator('#sw-single oas-swatch').first().locator('[part="swatch"]').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  const afterKey = await page.evaluate(() => document.getElementById('sw-single')!.getAttribute('value'))
  expect(afterKey, '方向键漫游 + Enter 选中生效').toBe('orange')

  // 选中环视觉存在（box-shadow 双层）
  const ring = await page.evaluate(() => {
    const sw = document.getElementById('sw-single')!.querySelectorAll('oas-swatch')[2]!
    return getComputedStyle(sw.shadowRoot!.querySelector('[part="swatch"]')!).boxShadow
  })
  expect(ring, '选中态应有外环描边（box-shadow）').not.toBe('none')
})
