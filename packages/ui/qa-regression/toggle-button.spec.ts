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

// ---- variant 形态批次：三形态真点切换 + demo 反馈可见（对齐 button variant 体系）----

test('toggle-button variant：outlined/filled/text 真点切换 + 反馈文本可见（disabled 不切换）', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-variant-outlined')
  await page.locator('#tb-variant-outlined').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300) // 等 demo 宿主挂事件监听

  const pressedOf = (id: string) =>
    page.evaluate((sel) => document.querySelector(`#${sel}`)!.hasAttribute('pressed'), id)

  // outlined：点击 → pressed 翻转 + 反馈文本
  await page.locator('#tb-variant-outlined').click()
  await expect.poll(() => pressedOf('tb-variant-outlined')).toBe(true)
  await expect(page.locator('#tb-variant-out')).toContainText('value: mark')
  await expect(page.locator('#tb-variant-out')).toContainText('pressed: true')
  await page.locator('#tb-variant-outlined').click()
  await expect.poll(() => pressedOf('tb-variant-outlined')).toBe(false)
  await expect(page.locator('#tb-variant-out')).toContainText('pressed: false')

  // filled / text：同样真点切换
  await page.locator('#tb-variant-filled').click()
  await expect.poll(() => pressedOf('tb-variant-filled')).toBe(true)
  await page.locator('#tb-variant-text').click()
  await expect.poll(() => pressedOf('tb-variant-text')).toBe(true)
  await expect(page.locator('#tb-variant-out')).toContainText('value: pin')
})

test('toggle-button variant 形态静态断言：data-variant 镜像 + 按下态 aria（对照 demo 块）', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toggle-button[variant="outlined"][pressed]')
  const r = await page.evaluate(() => {
    const grab = (sel: string) => {
      const el = document.querySelector(sel)!
      return {
        variant: el.getAttribute('data-variant'),
        ariaPressed: el.shadowRoot!.querySelector('button')!.getAttribute('aria-pressed'),
      }
    }
    return {
      outlinedPressed: grab('oas-toggle-button[variant="outlined"][value="v-outlined-on"]'),
      filledPressed: grab('oas-toggle-button[variant="filled"][value="v-filled-on"]'),
      textPressed: grab('oas-toggle-button[variant="text"][value="v-text-on"]'),
      solidDefault: grab('oas-toggle-button[value="v-solid"]'),
    }
  })
  expect(r.outlinedPressed).toEqual({ variant: 'outlined', ariaPressed: 'true' })
  expect(r.filledPressed).toEqual({ variant: 'filled', ariaPressed: 'true' })
  expect(r.textPressed).toEqual({ variant: 'text', ariaPressed: 'true' })
  expect(r.solidDefault).toEqual({ variant: 'solid', ariaPressed: 'false' })
})

// 回归（二轮 review）：config-provider 全局禁用注入——与 toggle-group/oas-button 同通道，
// 修复前只读自身 disabled 属性，provider 注入失效（同批组件行为漂移）。
test('toggle-button 全局禁用注入：provider disabled 继承禁用 + disabled-skip 逃逸 + 移除恢复', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toggle-button')
  const r = await page.evaluate(() => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const mk = (skip: boolean) => {
      const el = document.createElement('oas-toggle-button')
      el.textContent = '注入按钮'
      if (skip) el.setAttribute('disabled-skip', '')
      cp.appendChild(el)
      return el
    }
    const plain = mk(false)
    const escaped = mk(true)
    document.body.appendChild(cp)
    return new Promise<{ before: [boolean, boolean]; after: boolean; clicked: boolean }>((resolve) => {
      requestAnimationFrame(() => {
        const btnOf = (el: Element) => el.shadowRoot!.querySelector('button') as HTMLButtonElement
        const before = [btnOf(plain).disabled, btnOf(escaped).disabled] as [boolean, boolean]
        let clicked = false
        plain.addEventListener('oas-change', () => (clicked = true))
        btnOf(plain).click()
        cp.removeAttribute('disabled')
        requestAnimationFrame(() => resolve({ before, after: btnOf(plain).disabled, clicked }))
      })
    })
  })
  expect(r.before[0], 'provider disabled → 继承禁用').toBe(true)
  expect(r.before[1], 'provider disabled + disabled-skip → 逃逸保持可用').toBe(false)
  expect(r.clicked, 'provider disabled 时点击不派发 oas-change').toBe(false)
  expect(r.after, 'provider 移除 disabled → 恢复可用').toBe(false)
})

// ---- 双态图标（icon-toggled）批次：真点切换时按下态图标真切换（可见反馈 = 图标字形变化）----

test('toggle-button icon-toggled：真点按下渲染 toggled 图标、抬起回落 icon（aria 随行）', async ({ page }) => {
  await page.goto('/components/toggle-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-icon-toggled')
  await page.locator('#tb-icon-toggled').scrollIntoViewIfNeeded()
  const state = () =>
    page.evaluate(() => {
      const host = document.querySelector('#tb-icon-toggled') as HTMLElement
      const d = host.shadowRoot!.querySelector('.icon svg path')?.getAttribute('d') ?? null
      const btn = host.shadowRoot!.querySelector('button')!
      return { d, pressed: host.hasAttribute('pressed'), ariaPressed: btn.getAttribute('aria-pressed') }
    })
  const s0 = await state()
  expect(s0.pressed, '初始未按下').toBe(false)
  expect(s0.d, '未按下渲染 icon 图标').toBeTruthy()

  await page.locator('#tb-icon-toggled').click()
  const s1 = await state()
  expect(s1.pressed, '点击后按下').toBe(true)
  expect(s1.ariaPressed, 'aria-pressed 同步').toBe('true')
  expect(s1.d, '按下后图标字形真切换（≠ 未按下图标）').not.toBe(s0.d)

  await page.locator('#tb-icon-toggled').click()
  const s2 = await state()
  expect(s2.pressed, '再点抬起').toBe(false)
  expect(s2.d, '抬起回落 icon 图标').toBe(s0.d)
})
