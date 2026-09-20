// 复核回归：toggle-button——二态切换按钮首份回归固化。
// 覆盖：点击切换 aria-pressed + oas-change demo 可见反馈（按下/抬起双向）、
// disabled 点击不切换、选中色亮度自适应文字色（亮底自动深字）、尺寸档控高落点。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('toggle-button 点击切换：aria-pressed 双向翻转 + oas-change 明细在 demo 可见', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-event')
  const state = () =>
    page.evaluate(() => {
      const host = document.querySelector('#tb-event') as HTMLElement
      const btn = host.shadowRoot!.querySelector('button')!
      return {
        pressed: host.hasAttribute('pressed'),
        ariaPressed: btn.getAttribute('aria-pressed'),
        out: (document.querySelector('#tb-output') as HTMLElement)?.textContent,
      }
    })
  expect((await state()).pressed, '初始未按下').toBe(false)

  await page.locator('#tb-event').click()
  let s = await state()
  expect(s.pressed, '点击后按下').toBe(true)
  expect(s.ariaPressed).toBe('true')
  expect(s.out, 'demo 反馈显示按下明细').toContain('pressed: true')

  await page.locator('#tb-event').click()
  s = await state()
  expect(s.pressed, '再点抬起').toBe(false)
  expect(s.ariaPressed).toBe('false')
  expect(s.out, 'demo 反馈显示抬起明细').toContain('pressed: false')
})

test('toggle-button 禁用：内部按钮原生 disabled，点击不切换不派发', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toggle-button[value="strike"][pressed][disabled]')
  const state = () =>
    page.evaluate(() => {
      const host = document.querySelector('oas-toggle-button[value="strike"][pressed][disabled]') as HTMLElement
      const btn = host.shadowRoot!.querySelector('button') as HTMLButtonElement
      btn.click()
      return { disabled: btn.disabled, pressed: host.hasAttribute('pressed') }
    })
  const s = await state()
  expect(s.disabled, '内部按钮原生禁用').toBe(true)
  expect(s.pressed, '禁用态点击 pressed 不变').toBe(true)
})

test('toggle-button 亮度自适应文字色与尺寸档：亮底自动深字、选中色预设落点、size 控高', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toggle-button[color="#e5e7eb"][pressed]')
  const r = await page.evaluate(() => {
    const csOf = (sel: string) => {
      const host = document.querySelector(sel) as HTMLElement
      const btn = host.shadowRoot!.querySelector('button')!
      const cs = getComputedStyle(btn)
      return { bg: cs.backgroundColor, color: cs.color }
    }
    const height = (sel: string) => {
      const host = document.querySelector(sel) as HTMLElement
      return getComputedStyle(host.shadowRoot!.querySelector('button')!).minHeight
    }
    return {
      light: csOf('oas-toggle-button[color="#e5e7eb"][pressed]'),
      purple: csOf('oas-toggle-button[color="purple"][pressed]'),
      small: height('oas-toggle-button[size="small"]'),
      large: height('oas-toggle-button[size="large"]'),
    }
  })
  expect(r.light.bg, '亮色选中底 #e5e7eb').toBe('rgb(229, 231, 235)')
  expect(r.light.color, '亮底应按亮度自动取深字 #18181b（对比可读）').toBe('rgb(24, 24, 27)')
  expect(r.purple.bg, 'purple 预设 → --oas-preset-purple 落点').toBe('rgb(114, 46, 209)')
  expect(r.small, 'size="small" 控高 24px（--oas-control-height-sm）').toBe('24px')
  expect(r.large, 'size="large" 控高 40px（--oas-control-height-lg）').toBe('40px')
})
