// 复核回归：stepper——历史缺陷固化断言（移动端窄屏横向溢出滚动，不再硬压缩省略）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('stepper 移动端：coarse 下步骤头横向可滚、tab 最小触控高 ≥44px', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/stepper.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-stepper')
    const r = await page.evaluate(() => {
      const root = document.querySelector('oas-stepper')!.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const tablist = root.querySelector<HTMLElement>('.tablist')!
      const tab = root.querySelector<HTMLElement>('[role="tab"]')!
      return {
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        tablistOverflowX: getComputedStyle(tablist).overflowX,
        tabMin: parseFloat(getComputedStyle(tab).minHeight),
      }
    })
    expect(r.coarseRule, '样式表应有 coarse 窄屏规则').toBe(true)
    expect(r.tablistOverflowX, '步骤头 coarse 下应横向可滚（auto/scroll）').toMatch(/auto|scroll/)
    expect(r.tabMin, 'tab coarse 下最小触控高 ≥44px').toBeGreaterThanOrEqual(44)
  } finally {
    await ctx.close()
  }
})

test('stepper：每个 tab 的 aria-controls 指向真实存在的 panel id（跨 shadow 引用兜底断言）', async ({ page }) => {
  await page.goto('/components/stepper.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-stepper')
  const r = await page.evaluate(() => {
    const missing: string[] = []
    let checked = 0
    for (const host of Array.from(document.querySelectorAll('oas-stepper'))) {
      const root = (host as HTMLElement).shadowRoot!
      for (const tab of Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'))) {
        const id = tab.getAttribute('aria-controls')
        if (!id) continue
        checked++
        const found = document.getElementById(id) ?? root.querySelector(`#${CSS.escape(id)}`)
        if (!found) missing.push(id)
      }
    }
    return { checked, missing }
  })
  expect(r.checked, '页面应有带 aria-controls 的 tab').toBeGreaterThan(0)
  expect(r.missing, 'aria-controls 指向的 panel id 必须真实存在（axe 静态分析够不到，由此断言兜底）').toEqual([])
})

test('stepper：demo 全量 aria-* 取值合法性（页级豁免 aria-valid-attr-value 的等价强度兜底）', async ({ page }) => {
  // 背景：a11y.spec 对 stepper.html 整规则豁免 aria-valid-attr-value（axe 的 disableRules
  // 只能整规则禁）——该页其它「ARIA 取值非法」也会被放行。本断言遍历 demo 区全部元素
  // （含 shadow root）逐个 aria-* 校验取值，补上等价强度的兜底；豁免设计取舍见 a11y.spec 头注。
  await page.goto('/components/stepper.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-stepper')
  const r = await page.evaluate(() => {
    // 已知 token 属性的允许值集合（值允许首尾空白；'undefined' 是合法显式值）
    const TOKENS: Record<string, string[]> = {
      'aria-selected': ['true', 'false', 'undefined'],
      'aria-disabled': ['true', 'false', 'undefined'],
      'aria-expanded': ['true', 'false', 'undefined'],
      'aria-orientation': ['horizontal', 'vertical'],
      'aria-current': ['true', 'false', 'page', 'step', 'location', 'date', 'time'],
    }
    // IDREF(S) 引用类属性：断言目标存在（flat tree 等价：收集遍历范围内全部 shadow root 的 id）
    const REF_ATTRS = new Set(['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns', 'aria-flowto'])
    const errors: string[] = []
    const ids = new Set<string>()
    let checked = 0
    const pendingRefs: Array<{ el: Element; attr: string; value: string }> = []
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}`

    // 遍历根：demo 区（.demo-block）——与 a11y.spec axe 审计的 .include('.demo-block') 同范围，
    // 等价强度指「axe 扫到的取值这里全覆盖」；文档站自身 chrome（VitePress 主题）不在豁免范围内
    const roots: Array<Document | ShadowRoot | Element> = Array.from(document.querySelectorAll('.demo-block'))

    // 第一遍：收集范围内全部 id（含 shadow root，跨 shadow 引用可解析）
    const collectIds = (root: Document | ShadowRoot | Element) => {
      for (const el of Array.from(root.querySelectorAll('*'))) {
        for (const id of el.id.split(/\s+/)) if (id) ids.add(id)
        if (el.shadowRoot) collectIds(el.shadowRoot)
      }
    }
    // 第二遍：逐 aria-* 校验取值
    const validate = (root: Document | ShadowRoot | Element) => {
      for (const el of Array.from(root.querySelectorAll('*'))) {
        for (const attr of Array.from(el.attributes)) {
          if (!attr.name.startsWith('aria-')) continue
          checked++
          const value = attr.value.trim()
          const allowed = TOKENS[attr.name]
          if (allowed) {
            if (!allowed.includes(value)) errors.push(`${describe(el)} ${attr.name}="${attr.value}"（非法取值）`)
          } else if (REF_ATTRS.has(attr.name)) {
            if (value === '') errors.push(`${describe(el)} ${attr.name} 空串（引用类属性不得为空）`)
            else pendingRefs.push({ el, attr: attr.name, value })
          } else if (value === '') {
            // 未知属性名：按「非空且非空串」放行（token/IDREF 语义未知，不过度断言）
            errors.push(`${describe(el)} ${attr.name} 空串（未知 aria 属性取空值）`)
          }
        }
        if (el.shadowRoot) validate(el.shadowRoot)
      }
    }
    for (const root of roots) {
      collectIds(root)
    }
    for (const root of roots) {
      validate(root)
    }
    for (const { el, attr, value } of pendingRefs) {
      for (const id of value.split(/\s+/)) {
        if (id && !ids.has(id)) errors.push(`${describe(el)} ${attr}="${value}"（引用目标 #${id} 不存在）`)
      }
    }
    return { checked, errors }
  })
  expect(r.checked, 'demo 区应存在 aria-* 属性').toBeGreaterThan(0)
  expect(r.errors, '全部 aria-* 取值必须合法（token 值集合 / 引用目标存在 / 未知名非空）').toEqual([])
})
