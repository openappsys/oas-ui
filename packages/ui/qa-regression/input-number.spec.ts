// 复核回归：input-number——历史缺陷固化断言。
// 曾现 bug：clearable + controls 并存时步进钮锚定 .inner 右缘而非 input 右缘，
// inner 被 suffix/clear 撑宽后 up 按钮右缘溢出输入框 16px；suffix/clear 本身
// 也被 width:100% 的 input 顶出输入框边框外（渲染在框外、与步进钮互相挤压）。

import { test, expect } from '@playwright/test'
import { up, defocus } from './helpers'

/** 读取 shadow 内 input 与叠加元素的相对几何（controls/clear/suffix 以 input 右缘为 0 点，prefix 以 input 左缘为 0 点） */
async function rightStack(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate((sel) => {
    const n = document.querySelector(sel) as HTMLElement
    const sr = n.shadowRoot!
    const ir = sr.querySelector<HTMLElement>('input')!.getBoundingClientRect()
    const rel = (el: HTMLElement | null) => {
      if (!el || el.hidden) return null
      const r = el.getBoundingClientRect()
      return { left: r.left - ir.right, right: r.right - ir.right, top: r.top - ir.top }
    }
    const prefixEl = sr.querySelector<HTMLElement>('[part="prefix"]')
    const pr = prefixEl && !prefixEl.hidden ? prefixEl.getBoundingClientRect() : null
    return {
      inputRight: ir.right,
      inputLeft: ir.left,
      innerRightDelta: sr.querySelector<HTMLElement>('[part="inner"]')!.getBoundingClientRect().right - ir.right,
      controls: rel(sr.querySelector<HTMLElement>('[part="controls"]')),
      clear: rel(sr.querySelector<HTMLElement>('[part="clear"]')),
      suffix: rel(sr.querySelector<HTMLElement>('[part="suffix"]')),
      prefix: pr ? { left: pr.left - ir.left, right: pr.right - ir.right } : null,
    }
  }, selector)
}

test('input-number clearable+controls：步进钮完整内嵌（upOverflow ≤ 0）且 inner 与 input 同宽', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-event')
  const r = await rightStack(page, '#num-event')
  // 步进钮右缘不得超出 input 右缘（历史溢出 16px）
  expect(r.controls!.right, '步进钮右缘应 ≤ input 右缘').toBeLessThanOrEqual(0)
  expect(r.controls!.left, '步进钮应整体在 input 内').toBeGreaterThan(-1000)
  // 清除钮内嵌且在步进钮左侧
  expect(r.clear!.right, '清除钮右缘应在 input 内').toBeLessThanOrEqual(0)
  expect(r.clear!.right, '清除钮应在步进钮左侧').toBeLessThanOrEqual(r.controls!.left)
  // inner 宽度 == input 宽度（根因：流内后缀曾把 inner 撑得比 input 宽）
  expect(r.innerRightDelta, 'inner 右缘应与 input 右缘齐平').toBeCloseTo(0, 0)
})

test('input-number suffix+controls：后缀内嵌、与步进钮不重叠', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[suffix-text]')
  const r = await rightStack(page, 'oas-input-number[suffix-text]')
  expect(r.suffix!.right, '后缀右缘应在 input 内（历史渲染在框外）').toBeLessThanOrEqual(0)
  expect(r.suffix!.right, '后缀应完全位于步进钮左侧，不重叠').toBeLessThanOrEqual(r.controls!.left)
  expect(r.controls!.right, '步进钮右缘应 ≤ input 右缘').toBeLessThanOrEqual(0)
})

test('input-number clearable+suffix+controls 叠加：序排列 步进钮→清除→后缀 全内嵌', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[suffix-text="元"]')
  const r = await rightStack(page, 'oas-input-number[suffix-text="元"]')
  expect(r.controls!.right).toBeLessThanOrEqual(0)
  expect(r.clear!.right).toBeLessThanOrEqual(r.controls!.left)
  expect(r.suffix!.right).toBeLessThanOrEqual(r.clear!.left)
  expect(r.suffix!.left, '后缀整体在 input 内').toBeGreaterThan(-1000)
})

test('input-number both 形态 + clearable：清除钮内嵌且让开右侧 + 钮', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[controls-position="both"][clearable]')
  const r = await rightStack(page, 'oas-input-number[controls-position="both"][clearable]')
  // [+] 钮在 input 右缘外（both 形态），清除钮必须在 input 内
  expect(r.clear!.right, '清除钮右缘应在 input 内').toBeLessThanOrEqual(0)
  expect(r.clear!.right, '清除钮不得探入 [+] 钮区域').toBeLessThanOrEqual(-4)
  expect(r.prefix!.left, '内嵌 prefix 应位于 input 内').toBeGreaterThanOrEqual(0)
})

test('input-number prefix：内嵌在输入框内（非框外贴边）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number[prefix-text]')
  const r = await rightStack(page, 'oas-input-number[prefix-text]')
  expect(r.prefix!.left, 'prefix 左缘应在 input 左缘之内').toBeGreaterThanOrEqual(0)
  expect(r.prefix!.right, 'prefix 右缘应在 input 内').toBeLessThanOrEqual(0)
})

// ---- 能力缺口 P1：oas-focus / oas-blur / oas-input 事件组 ----

test('input-number 事件组：focus/blur/input 在 demo 输出区有可见反馈（提交制语义正确）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-event')
  // 真实点击聚焦 → oas-focus（携带已提交值 5）
  await page.locator('#num-event').click()
  await expect(page.locator('#num-output')).toHaveText('oas-focus: 5')
  // 键入 → oas-input 实时携带显示文本（未提交）
  await page.keyboard.type('7')
  await expect(page.locator('#num-output')).toHaveText('oas-input: "57"（未提交）')
  // 点击输出区让输入框失焦 → change 先提交（57 → 钳制 max 10），oas-blur 携带提交后的值
  await page.locator('#num-output').click()
  await expect(page.locator('#num-output')).toHaveText('oas-blur: 10（提交后）')
})

// ---- 能力缺口 P2：decimal-separator / variant / align / autofocus ----

test('input-number decimal-separator：真实键入逗号 → 提交 2.5 并回显 2,5', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-sep-comma')
  const inner = page.locator('#num-sep-comma input')
  await inner.scrollIntoViewIfNeeded()
  await inner.click()
  await inner.fill('2,5') // 真实 input 事件链路（非 dispatch 自定义事件）
  await inner.blur()
  await expect(page.locator('#num-sep-comma')).toHaveAttribute('value', '2.5')
  await expect(inner).toHaveValue('2,5')
  await expect(page.locator('#num-sep-output')).toHaveText('显示「2,5」→ 提交 2.5')
})

test('input-number variant：filled/borderless 视觉态生效（背景/边框 token 与 outlined 区分）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-variant-filled')
  const read = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement & { shadowRoot: ShadowRoot }
      const inner = el.shadowRoot.querySelector<HTMLInputElement>('input')!
      const cs = getComputedStyle(inner)
      return {
        dataVariant: el.getAttribute('data-variant'),
        borderColor: cs.borderTopColor,
        background: cs.backgroundColor,
        borderWidth: cs.borderTopWidth,
      }
    }, sel)
  const outlined = await read('#num-variant-outlined')
  const filled = await read('#num-variant-filled')
  const borderless = await read('#num-variant-borderless')
  expect(filled.dataVariant).toBe('filled')
  expect(borderless.dataVariant).toBe('borderless')
  expect(filled.background, 'filled 有填充底色、与 outlined 不同').not.toBe(outlined.background)
  expect(borderless.background, 'borderless 无底色（透明）').toBe('rgba(0, 0, 0, 0)')
  expect(borderless.borderColor, 'borderless 边框透明').toBe('rgba(0, 0, 0, 0)')
})

test('input-number align：left/center/right 映射逻辑 text-align（RTL 安全）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-align-center')
  const alignOf = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement & { shadowRoot: ShadowRoot }
      return getComputedStyle(el.shadowRoot.querySelector<HTMLInputElement>('input')!).textAlign
    }, sel)
  expect(['start', 'left']).toContain(await alignOf('#num-align-left'))
  expect(await alignOf('#num-align-center')).toBe('center')
  expect(['end', 'right']).toContain(await alignOf('#num-align-right'))
})

test('input-number autofocus：动态挂载后聚焦内层输入（queueMicrotask 转发）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#btn-num-autofocus')
  await page.locator('#btn-num-autofocus').scrollIntoViewIfNeeded()
  await page.locator('#btn-num-autofocus').click()
  await expect(page.locator('#num-autofocus-output')).toHaveText('已聚焦内层输入')
  const focused = await page.evaluate(() => {
    const el = document.querySelector('#num-autofocus-host oas-input-number') as HTMLElement & {
      shadowRoot: ShadowRoot
    }
    return el?.shadowRoot?.activeElement === el?.shadowRoot?.querySelector('input')
  })
  expect(focused, 'shadow activeElement 为内层 input').toBe(true)
})

test('input-number scrub：真拖数字区按 4px 计步 + 松手提交写回（可见反馈）', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#innum-scrub')
  // 清除页面初始焦点滚动（autofocus demo 等）并把目标滚进视口中央，坐标读取与鼠标操作间布局静止
  await defocus(page)
  await page.locator('#innum-scrub').evaluate((node) => node.scrollIntoView({ block: 'center' }))
  const el = page.locator('#innum-scrub')
  const box = await el.evaluate((node) => {
    const input = node.shadowRoot!.querySelector<HTMLInputElement>('input')!
    const r = input.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, v0: Number(node.getAttribute('value')) }
  })
  // 真拖 +16px = +4 步（step=1）
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.mouse.move(box.x + 16, box.y, { steps: 4 })
  await page.mouse.up()
  await expect.poll(() => el.evaluate((node) => Number(node.getAttribute('value'))), { timeout: 3000 }).toBe(box.v0 + 4)
  // demo 反馈行显示已提交值
  await expect(page.locator('#innum-scrub-out')).toContainText(String(box.v0 + 4))
})
