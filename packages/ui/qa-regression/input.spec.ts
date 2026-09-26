// 复核回归：input——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

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

// ---- 能力缺口 P1：loading 加载态 ----

test('input loading：spinner 显示 + 清除按钮让位 + 输入不禁用，退出后恢复', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#input-loading')
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('#input-loading') as HTMLElement
      const root = el.shadowRoot!
      const spinner = root.querySelector<HTMLElement>('.spinner')!
      const clear = root.querySelector<HTMLButtonElement>('.clear-btn')!
      const input = root.querySelector<HTMLInputElement>('input')!
      return {
        busy: el.getAttribute('aria-busy'),
        spinnerHidden: spinner.hidden,
        clearHidden: clear.hidden,
        disabled: input.disabled,
        value: input.value,
      }
    })
  // 初始 loading：spinner 在、clear 让位、aria-busy、输入不禁用
  const initial = await read()
  expect(initial.busy).toBe('true')
  expect(initial.spinnerHidden).toBe(false)
  expect(initial.clearHidden).toBe(true)
  expect(initial.disabled).toBe(false)
  // loading 期间仍可输入（不禁用）
  await page.evaluate(() => {
    const el = document.querySelector('#input-loading') as HTMLElement
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input')!
    input.value = 'abc'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  // 切换按钮退出 loading：clear 恢复、spinner 隐藏、aria-busy 移除（宿主属性零残留）
  await page.locator('#btn-input-loading').click()
  await expect.poll(read).toStrictEqual({
    busy: null,
    spinnerHidden: true,
    clearHidden: false,
    disabled: false,
    value: 'abc',
  })
})

// ---- 能力缺口 P2：hint 提示文案 / clear-icon 插槽 / min-max-step 透传 ----

test('input hint：常驻提示 + aria-describedby 关联内层 input + 与校验错误独立', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#input-hint-error')
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('#input-hint-error') as HTMLElement
      const root = el.shadowRoot!
      const hint = root.querySelector<HTMLElement>('[part="hint"]')!
      const inner = root.querySelector<HTMLInputElement>('input')!
      return {
        text: hint.textContent,
        hidden: hint.hidden,
        id: hint.id,
        describedBy: inner.getAttribute('aria-describedby'),
        invalid: inner.getAttribute('aria-invalid'),
      }
    })
  const before = await read()
  expect(before.text, 'hint 文案渲染').toBe('格式：YYYY-MM-DD')
  expect(before.hidden, 'hint 可见').toBe(false)
  expect(before.id, 'hint 元素有 id').not.toBe('')
  expect(before.describedBy, 'aria-describedby 关联 hint').toBe(before.id)
  expect(before.invalid, '正常态无 aria-invalid').toBeNull()

  // 真实点击切换校验错误：错误边框出现（aria-invalid），hint 与其关联独立保留
  await page.locator('#btn-input-hint-error').scrollIntoViewIfNeeded()
  await page.locator('#btn-input-hint-error').click()
  await expect.poll(read).toMatchObject({ hidden: false, invalid: 'true' })
  const after = await read()
  expect(after.text, '错误态下 hint 文案保留').toBe('格式：YYYY-MM-DD')
  expect(after.describedBy, '错误态下 aria-describedby 仍指向 hint').toBe(after.id)
  await expect(page.locator('#input-hint-output')).toHaveText('校验错误态；aria-describedby=oas-input-hint')
})

test('input clear-icon 插槽：自定义图标分发替换内置 fallback + 真实点击清空', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#input-clear-icon-custom')
  const r = await page.evaluate(() => {
    const custom = document.querySelector('#input-clear-icon-custom') as HTMLElement
    const dflt = document.querySelector('#input-clear-icon-default') as HTMLElement
    const cslot = custom.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="clear-icon"]')!
    const dslot = dflt.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="clear-icon"]')!
    return {
      assigned: cslot.assignedElements().map((n) => n.tagName),
      defaultHasFallbackSvg: dslot.querySelector('svg') !== null,
    }
  })
  expect(r.assigned, '自定义图标经 slot 分发').toEqual(['OAS-ICON'])
  expect(r.defaultHasFallbackSvg, '默认输入框保留内置 fallback 图标').toBe(true)

  // 真实鼠标点击清除钮 → 值清空（自定义图标不影响清除链路）
  await realClick(page, '#input-clear-icon-custom', '.clear-btn')
  await expect(page.locator('#input-clear-icon-custom input')).toHaveValue('')
})

test('input min/max/step（number 类型）透传内层原生 input', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#input-number-range')
  const r = await page.evaluate(() => {
    const inner = (
      document.querySelector('#input-number-range') as HTMLElement & { shadowRoot: ShadowRoot }
    ).shadowRoot.querySelector<HTMLInputElement>('input')!
    return {
      type: inner.type,
      min: inner.getAttribute('min'),
      max: inner.getAttribute('max'),
      step: inner.getAttribute('step'),
    }
  })
  expect(r).toEqual({ type: 'number', min: '0', max: '10', step: '2' })
  await expect(page.locator('#input-number-range-output')).toHaveText('原生透传：min=0 max=10 step=2')
})
