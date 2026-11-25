// commerce invoice 用户视角回归：已保存抬头弹层可见、选择后表单与页面反馈生效。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('invoice 已保存抬头：弹层打开、选择回填、页面反馈更新', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-saved-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    el.shadowRoot!.querySelector<HTMLButtonElement>('.saved-trigger')!.click()
  })
  const opened = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    return {
      visible: !el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden,
      expanded: el.shadowRoot!.querySelector('.saved-trigger')!.getAttribute('aria-expanded'),
      options: el.shadowRoot!.querySelectorAll('[role="option"]').length,
    }
  })
  expect(opened.visible).toBe(true)
  expect(opened.expanded).toBe('true')
  expect(opened.options).toBe(3)

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    el.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')[0]!.click()
  })
  const picked = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-saved-demo')!
    return {
      hidden: el.shadowRoot!.querySelector<HTMLElement>('.picker')!.hidden,
      type: el.getAttribute('type'),
      title: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="title"]')!.value,
      taxId: el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!.value,
      feedback: document.getElementById('invoice-saved-info')!.textContent,
    }
  })
  expect(picked.hidden).toBe(true)
  expect(picked.type).toBe('company')
  expect(picked.title).toBe('杭州示例科技有限公司')
  expect(picked.taxId).toBe('91330100MA2AB1234X')
  expect(picked.feedback).toContain('杭州示例科技有限公司')
})

test('invoice 企业抬头：税号非法时错误可见，修正后提交成功', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-company-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    const tax = el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!
    tax.value = '123'
    el.shadowRoot!.querySelector<HTMLButtonElement>('.submit')!.click()
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    const error = el.shadowRoot!.querySelector<HTMLElement>('.tax-field .error')!
    return {
      visible: !error.hidden && error.textContent!.length > 0,
      feedback: document.getElementById('invoice-company-info')!.textContent,
    }
  })
  expect(invalid.visible).toBe(true)
  expect(invalid.feedback).toContain('taxId')

  await page.evaluate(() => {
    const el = document.querySelector('oas-invoice#invoice-company-demo')!
    el.shadowRoot!.querySelector<HTMLInputElement>('input[name="taxId"]')!.value = '91330100MA2AB1234X'
    el.shadowRoot!.querySelector<HTMLButtonElement>('.submit')!.click()
  })
  const submitted = await page.evaluate(() => document.getElementById('invoice-company-info')!.textContent)
  expect(submitted).toContain('已提交')
})

// 复用基建配套批（2026-11-25）：内容下拉的 chevron path 与 icons 包同源（几何唯一来源，
// 消除内联副本与 icons 包的漂移失同步）。本断言锁定迁移后渲染产物：路径 / viewBox /
// 尺寸 / 主题色接线 / 定位在 select 内不漂移。
test('invoice 内容下拉 chevron：规范 V 形 + currentColor 主题色 + 定位在 select 内', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-company-demo')
  const chevron = await page.locator('oas-invoice#invoice-company-demo').evaluate((el) => {
    const svg = el.shadowRoot!.querySelector<SVGElement>('.select-wrap .chevron')
    const path = svg?.querySelector('path')
    const select = el.shadowRoot!.querySelector<HTMLElement>('.select-wrap .select')
    const box = svg!.getBoundingClientRect()
    const sBox = select!.getBoundingClientRect()
    return {
      exists: !!svg,
      d: path?.getAttribute('d') ?? null,
      stroke: path?.getAttribute('stroke') ?? null,
      strokeWidth: path?.getAttribute('stroke-width') ?? null,
      viewBox: svg?.getAttribute('viewBox') ?? null,
      insideWrap: box.left >= sBox.left && box.right <= sBox.right && box.top >= sBox.top && box.bottom <= sBox.bottom,
      visibleSize: box.width > 0 && box.height > 0,
      // 主题色接线：stroke=currentColor → 计算描边色 = svg 自身 color（.select-wrap .chevron
      // 的 text-secondary 档；迁移前内联 path 同规则，行为不变）
      strokeColor: path ? getComputedStyle(path).stroke : null,
      wrapColor: svg ? getComputedStyle(svg).color : null,
    }
  })
  expect(chevron.exists, '.select-wrap 内应含 .chevron 图标').toBe(true)
  expect(chevron.d, 'chevron 应为规范 V 形路径（icons chevronDownPath 同源）').toBe('M4 6 L8 10 L12 6')
  expect(chevron.viewBox, 'viewBox 16 网格不变').toBe('0 0 16 16')
  expect(chevron.stroke, '主题色接线：stroke=currentColor（走 .chevron 自身色档）').toBe('currentColor')
  expect(chevron.strokeWidth, '笔画 1.5 不变').toBe('1.5')
  expect(chevron.insideWrap, '箭头渲染在下拉框内且不越界').toBe(true)
  expect(chevron.visibleSize, '箭头有可见渲染尺寸').toBe(true)
  expect(chevron.strokeColor, 'currentColor 解析到 svg 自身主题色档（迁移前后同规则）').toBe(chevron.wrapColor)
})

// 修复回归：弹层曾固定向下展开——触发器贴近视口下缘时弹层被裁出屏幕，选项不可见不可点
test('invoice 已保存抬头弹层：视口下缘空间不足时向上翻转', async ({ page }) => {
  await page.goto('/components/invoice.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-invoice#invoice-saved-demo')

  const state = await page.evaluate(async () => {
    const el = document.querySelector<HTMLElement>('oas-invoice#invoice-saved-demo')!
    // 把整个组件固定到视口底部：触发器随之贴底，下方放不下 18rem 高的弹层
    el.style.position = 'fixed'
    el.style.insetInlineStart = '0'
    el.style.insetBlockEnd = '0'
    el.style.zIndex = '1'
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const trigger = el.shadowRoot!.querySelector<HTMLButtonElement>('.saved-trigger')!
    trigger.click()
    const picker = el.shadowRoot!.querySelector<HTMLElement>('.picker')!
    const box = picker.getBoundingClientRect()
    const tBox = trigger.getBoundingClientRect()
    return {
      placement: picker.getAttribute('data-placement'),
      pickerAboveTrigger: box.bottom <= tBox.top + 2,
      triggerNearBottom: window.innerHeight - tBox.bottom < 80,
      inViewport: box.bottom <= window.innerHeight + 1 && box.top >= 0,
    }
  })
  expect(state.triggerNearBottom, '前置条件：触发器应贴近视口下缘').toBe(true)
  expect(state.placement, '空间不足时必须向上翻转').toBe('up')
  expect(state.pickerAboveTrigger, '弹层应渲染在触发器上方').toBe(true)
  expect(state.inViewport, '弹层不得溢出视口').toBe(true)
})
