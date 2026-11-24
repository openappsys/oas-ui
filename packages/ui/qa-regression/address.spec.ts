// commerce address 用户视角回归：选择地址 / 表单校验必须有可见反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('address 列表选择：选中态迁移 + 页面反馈文案更新', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address#address-list-demo')

  const before = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    return cards.map((c) => c.hasAttribute('data-selected'))
  })
  expect(before).toEqual([true, false])

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    cards[1]!.querySelector<HTMLInputElement>('input')!.click()
  })

  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-list-demo')!
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    return {
      selected: cards.map((c) => c.hasAttribute('data-selected')),
      checked: cards.map((c) => c.querySelector<HTMLInputElement>('input')!.checked),
      feedback: document.getElementById('address-list-info')!.textContent,
    }
  })
  expect(after.selected).toEqual([false, true])
  expect(after.checked).toEqual([false, true])
  expect(after.feedback).toContain('a2')
})

test('address 表单校验：失败时错误可见、成功时提交反馈可见', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address#address-validate-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.contact-group .error')!
    return {
      visible: !error.hidden && error.textContent!.length > 0,
      ariaInvalid: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="name"]')!.getAttribute('aria-invalid'),
      feedback: document.getElementById('address-validate-info')!.textContent,
    }
  })
  expect(invalid.visible).toBe(true)
  expect(invalid.ariaInvalid).toBe('true')
  expect(invalid.feedback).toContain('name')

  await page.evaluate(() => {
    const el = document.querySelector('oas-address#address-validate-demo')!
    const root = el.shadowRoot!
    root.querySelector<HTMLInputElement>('input[name="name"]')!.value = '张三'
    const phone = root.querySelector<HTMLInputElement>('input[name="phone"]')!
    phone.value = '13800000000'
    phone.dispatchEvent(new Event('input', { bubbles: true }))
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
  })
  const submitted = await page.evaluate(() => document.getElementById('address-validate-info')!.textContent)
  expect(submitted).toContain('校验通过')
})

// 修复回归：地区必填曾因 fieldOf('region') 返回 null 而静默——错误文案与 aria 标记都不可见，
// 用户只看到「点了保存没反应」
test('address 地区必填：错误文案与 aria-invalid 可见（注入 regions 时）', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  const result = await page.evaluate(() => {
    const el = document.createElement('oas-address')
    el.id = 'address-region-probe'
    el.setAttribute('regions', '[{"name":"浙江省","children":[{"name":"杭州市","children":[{"name":"西湖区"}]}]}]')
    document.getElementById('address-validate-demo')!.parentElement!.appendChild(el)
    const root = el.shadowRoot!
    root.querySelector<HTMLInputElement>('input[name="name"]')!.value = '张三'
    root.querySelector<HTMLInputElement>('input[name="phone"]')!.value = '13800000000'
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
    const error = root.querySelector<HTMLElement>('.region-group > .field > .error')!
    const province = root.querySelector<HTMLSelectElement>('.province')!
    return {
      fieldInvalid: root.querySelector<HTMLElement>('.region-group > .field')!.hasAttribute('data-invalid'),
      errorVisible: !error.hidden && error.textContent.length > 0,
      ariaInvalid: province.getAttribute('aria-invalid'),
      describedBy: province.getAttribute('aria-describedby') === error.id && error.id !== '',
      focused: root.activeElement === province,
    }
  })
  expect(result.fieldInvalid).toBe(true)
  expect(result.errorVisible, '地区必填错误必须可见（曾静默）').toBe(true)
  expect(result.ariaInvalid).toBe('true')
  expect(result.describedBy, 'aria-describedby 必须指向错误文案').toBe(true)
  expect(result.focused, '首个错误字段应获得焦点').toBe(true)
})

test('address 只读态：字段禁编辑但仍可聚焦复制，提交按钮禁用', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  const state = await page.evaluate(() => {
    const els = [...document.querySelectorAll<HTMLElement>('oas-address')]
    const ro = els.find((el) => el.hasAttribute('readonly'))!
    const root = ro.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('input[name="name"]')!
    input.focus()
    return {
      disabled: input.disabled,
      focused: root.activeElement === input,
      submitDisabled: root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled,
      value: input.value.length > 0,
    }
  })
  expect(state.disabled, 'readonly 不置 disabled（仍可聚焦复制）').toBe(false)
  expect(state.focused).toBe(true)
  expect(state.submitDisabled).toBe(true)
  expect(state.value, '只读态应按 value 预填').toBe(true)
})

// C2 回归：`.button` 无 flex 布局时保存钮 spinner（inline span）1em 尺寸失效 → 4px 竖线
// 几何用 offsetWidth/offsetHeight（layout 盒）：boundingBox() 是 rotate 动画的 AABB，
// 恒方形膨胀，坏态竖线在特定相位也能伪装通过
test('address：saving 态保存钮 spinner 是 1em 圆环（真实几何）', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  const geo = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-address')]
      .map((n) => n.shadowRoot!.querySelector<HTMLElement>('[part="save-spinner"]:not([hidden])'))
      .find(Boolean)!
    return { w: el.offsetWidth, h: el.offsetHeight, radius: getComputedStyle(el).borderRadius }
  })
  expect(geo.w, 'spinner offsetWidth 应 ≈1em 而非 4px').toBeGreaterThan(8)
  expect(geo.h, 'spinner offsetHeight 应 ≈1em 而非拉伸').toBeGreaterThan(8)
  expect(geo.w, 'spinner layout 盒应为正方形（宽=高）').toBe(geo.h)
  expect(geo.radius, 'border-radius 50% 出圆环').toBe('50%')
})

// I2 回归：deleting 曾挂重建签名——运行时切档整列表重建（丢焦点/滚动），且重建出的
// 卡片 spinner 硬编码 hidden、不写 aria-busy → 动态加 deleting 时删除钮无转圈
test('address：运行时切 deleting 不重建列表，删除钮忙态（spinner + aria-busy）真实可见', async ({ page }) => {
  await page.goto('/components/address.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-address')

  // 动态建一个 list 卡（无 deleting）→ 运行时加 deleting
  const result = await page.evaluate(() => {
    const el = document.createElement('oas-address')
    el.id = 'address-deleting-probe'
    el.setAttribute('mode', 'list')
    el.setAttribute('show-delete', '')
    el.setAttribute(
      'items',
      '[{"id":"a1","name":"张三","phone":"13800000000","detail":"文三路 100 号","isDefault":true},{"id":"a2","name":"李四","phone":"13900000000","detail":"文二路 200 号"}]',
    )
    document.getElementById('address-list-demo')!.parentElement!.appendChild(el)
    const before = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    el.setAttribute('deleting', '')
    const after = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="card-delete"]')]
    const firstSpinner = after[0]!.querySelector<HTMLElement>('[part="card-delete-spinner"]')!
    return {
      identityKept: after[0] === before[0] && after[1] === before[1],
      disabled: after[0]!.disabled,
      ariaBusy: after[0]!.getAttribute('aria-busy'),
      spinnerVisible: !firstSpinner.hidden,
    }
  })
  expect(result.identityKept, '切 deleting 不应重建卡片（DOM 引用不变，保焦点/滚动）').toBe(true)
  expect(result.disabled).toBe(true)
  expect(result.ariaBusy, 'aria-busy 应被写上').toBe('true')
  expect(result.spinnerVisible, '运行时切 deleting 删除钮应转圈').toBe(true)

  // 真实几何：删除钮 spinner 非 4px 竖线——同样用 offsetWidth/offsetHeight
  //（boundingBox() 的 AABB 会被 rotate 动画膨胀，坏态可伪装）
  const box = await page
    .locator('#address-deleting-probe [part="card-delete-spinner"]:not([hidden])')
    .first()
    .evaluate((el) => ({
      w: (el as HTMLElement).offsetWidth,
      h: (el as HTMLElement).offsetHeight,
      radius: getComputedStyle(el).borderRadius,
    }))
  expect(box.w, '删除钮 spinner offsetWidth 应 ≈1em').toBeGreaterThan(8)
  expect(box.h, '删除钮 spinner offsetHeight 应 ≈1em').toBeGreaterThan(8)
  expect(box.w, 'spinner layout 盒应为正方形（宽=高）').toBe(box.h)
  expect(box.radius, 'border-radius 50% 出圆环').toBe('50%')

  await page.evaluate(() => document.getElementById('address-deleting-probe')?.remove())
})
