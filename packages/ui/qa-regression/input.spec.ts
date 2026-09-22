// 复核回归：input——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('input addon 属性在 Vue demo 中存活并渲染', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input[addon-before]')
  const attrs = await page.evaluate(() =>
    [...document.querySelectorAll('oas-input')].map((el) => el.getAttribute('addon-before')),
  )
  expect(attrs.some((v) => v !== null)).toBe(true)
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-input[addon-before]')!
    return el.shadowRoot?.querySelector('[part="prepend"]')?.textContent ?? null
  })
  expect(r).toBe('http://')
})

test('input 内嵌前后缀 slot：空 slot 无 data-slot-*、动态增删同步（flatten fallback 恒真 bug 回归）', async ({
  page,
}) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')
  const r = await page.evaluate(async () => {
    const el = document.createElement('oas-input')
    el.setAttribute('placeholder', 'reg-slot')
    document.body.appendChild(el)
    await new Promise((res) => setTimeout(res, 200))
    const shadow = el.shadowRoot!
    const basePadding = getComputedStyle(shadow.querySelector('input')!).paddingRight
    const q = (sel: string) => shadow.querySelector<HTMLElement>(sel)!
    const empty = {
      dataSlotPrefix: el.hasAttribute('data-slot-prefix'),
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      prefixHidden: q('[part="prefix"]').hidden,
      suffixHidden: q('[part="suffix"]').hidden,
    }
    const sp = document.createElement('span')
    sp.textContent = 'S'
    sp.setAttribute('slot', 'suffix')
    el.appendChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const withSuffix = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.removeChild(sp)
    await new Promise((res) => setTimeout(res, 200))
    const afterRemove = {
      dataSlotSuffix: el.hasAttribute('data-slot-suffix'),
      suffixHidden: q('[part="suffix"]').hidden,
      paddingRight: getComputedStyle(q('input')).paddingRight,
    }
    el.remove()
    return { basePadding, empty, withSuffix, afterRemove }
  })
  expect(r.empty.dataSlotPrefix).toBe(false)
  expect(r.empty.dataSlotSuffix).toBe(false)
  expect(r.empty.prefixHidden).toBe(true)
  expect(r.empty.suffixHidden).toBe(true)
  expect(r.withSuffix.dataSlotSuffix).toBe(true)
  expect(r.withSuffix.suffixHidden).toBe(false)
  expect(r.withSuffix.paddingRight).not.toBe(r.basePadding)
  expect(r.afterRemove.dataSlotSuffix).toBe(false)
  expect(r.afterRemove.suffixHidden).toBe(true)
  expect(r.afterRemove.paddingRight).toBe(r.basePadding)
})

test('input prefix-text 属性在 Vue demo 中存活并渲染（覆盖 DOM 内建 prefix 冲突回归）', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input[prefix-text]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-input[prefix-text]')!
    return {
      prefixTextAttr: el.getAttribute('prefix-text'),
      affixText: el.shadowRoot?.querySelector('[part="prefix"]')?.textContent?.trim() ?? '',
      affixHidden: el.shadowRoot?.querySelector('[part="prefix"]')?.hasAttribute('hidden') ?? null,
    }
  })
  expect(r.prefixTextAttr).toBe('$')
  expect(r.affixText).toBe('$')
  expect(r.affixHidden).toBe(false)
})

test('input addon 分发自包含控件（oas-button）：托盘退化为贴合容器 + 外角合并（真机量测回归）', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')
  await up(page, '#input-search-btn')
  const m = await page.evaluate(async () => {
    const btn = document.querySelector('#input-search-btn') as HTMLElement & { shadowRoot: ShadowRoot }
    const host = btn.closest('oas-input') as HTMLElement & { shadowRoot: ShadowRoot }
    // 等 slot 分发 + slotchange 后的 syncAddons 打下标记
    for (
      let i = 0;
      i < 60 && !host.shadowRoot.querySelector('[part="append"]')?.hasAttribute('data-addon-control');
      i++
    ) {
      await new Promise((r) => setTimeout(r, 50))
    }
    const root = host.shadowRoot
    const tray = root.querySelector('[part="append"]') as HTMLElement
    const inner = root.querySelector('input')!
    const innerBtn = btn.shadowRoot.querySelector('button') as HTMLElement
    const tcs = getComputedStyle(tray)
    const bcs = getComputedStyle(innerBtn)
    const tr = tray.getBoundingClientRect()
    const ir = inner.getBoundingClientRect()
    const br = innerBtn.getBoundingClientRect()
    return {
      control: tray.hasAttribute('data-addon-control'),
      padding: `${tcs.paddingLeft}/${tcs.paddingRight}`,
      bg: tcs.backgroundColor,
      border: `${tcs.borderTopWidth}/${tcs.borderRightWidth}/${tcs.borderBottomWidth}/${tcs.borderLeftWidth}`,
      trayW: +tr.width.toFixed(1),
      trayH: +tr.height.toFixed(1),
      btnW: +br.width.toFixed(1),
      inputH: +ir.height.toFixed(1),
      dy: +(tr.top - ir.top).toFixed(1),
      seam: +(ir.right - tr.left).toFixed(1),
      radius: `${bcs.borderTopLeftRadius} ${bcs.borderTopRightRadius} ${bcs.borderBottomRightRadius} ${bcs.borderBottomLeftRadius}`,
    }
  })
  expect(m.control, '托盘应识别自包含控件').toBe(true)
  expect(m.padding, '文本 addon 的内边距归零（消除 12px 灰带）').toBe('0px/0px')
  expect(m.bg, '灰底去除').toBe('rgba(0, 0, 0, 0)')
  expect(m.border, '托盘自身描边去除（避免灰框与双线）').toBe('0px/0px/0px/0px')
  expect(m.trayW, '托盘宽度等于按钮宽度').toBe(m.btnW)
  expect(m.trayH, '托盘高度与输入框同高').toBe(m.inputH)
  expect(m.dy, '托盘与输入框上下对齐（无 1px 台阶）').toBe(0)
  expect(m.seam, '相邻边 -1px 重叠合并为单线').toBe(1)
  expect(m.radius, '按钮外角与托盘合并（0 6px 6px 0）').toBe('0px 6px 6px 0px')

  // 贴合形态不改交互：真实点击 addon 内按钮，demo 输出区出现可见反馈
  await page.locator('#input-search-btn').click()
  await expect(page.locator('#input-search-output')).toHaveText('触发搜索')
})
