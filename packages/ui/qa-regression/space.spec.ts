// 复核回归：space / compact——布局基元首份回归固化。
// 覆盖：方向切换真实落点（flex-direction + 子项几何同行/同列）、间距档位 gap 像素随 size 变化、
// 分隔符注入数量与文本、方向响应式断点（窄屏 column / 桌面 row）、compact 贴合重叠与禁用透传。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('space 方向与间距：vertical 切 flex-direction 且子项由同行变同列，gap 像素随 size 档位变化', async ({ page }) => {
  await page.goto('/components/space.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-space[direction="vertical"]')
  const r = await page.evaluate(() => {
    const read = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement
      const items = [...el.querySelectorAll<HTMLElement>(':scope > *:not(.oas-space-separator)')]
      const rects = items.map((i) => i.getBoundingClientRect())
      return { dir: getComputedStyle(el).flexDirection, rects }
    }
    // 水平 demo（含 danger 按钮的那个块）与垂直 demo
    const h = read('oas-space:has(> oas-button[type="danger"])')
    const v = read('oas-space[direction="vertical"]')
    const sameLine = (rects: DOMRect[]) => rects.every((r) => Math.abs(r.top - rects[0]!.top) < 0.5)
    const sameColumn = (rects: DOMRect[]) => rects.every((r) => Math.abs(r.left - rects[0]!.left) < 0.5)
    const gapOf = (sel: string) => getComputedStyle(document.querySelector(sel) as HTMLElement).columnGap
    return {
      hDir: h.dir,
      hSameLine: sameLine(h.rects),
      vDir: v.dir,
      vSameColumn: sameColumn(v.rects),
      vStacked: v.rects.length >= 2 && v.rects[1]!.top >= v.rects[0]!.bottom - 0.5,
      gapXs: gapOf('oas-space[size="xs"]'),
      gapLarge: gapOf('oas-space[size="large"]'),
    }
  })
  expect(r.hDir, '默认水平 → flex-direction: row').toBe('row')
  expect(r.hSameLine, '水平 demo 子项应同行').toBe(true)
  expect(r.vDir, 'direction="vertical" → flex-direction: column').toBe('column')
  expect(r.vSameColumn, '垂直 demo 子项应同列（左缘对齐）').toBe(true)
  expect(r.vStacked, '垂直 demo 子项应纵向堆叠（第二项在第一项下方）').toBe(true)
  expect(r.gapXs, 'size="xs" → gap 4px（--oas-space-1）').toBe('4px')
  expect(r.gapLarge, 'size="large" → gap 24px（--oas-space-5）').toBe('24px')
})

test('space 分隔符：字符串 separator 在子项间注入对应数量的分隔元素且参与布局', async ({ page }) => {
  await page.goto('/components/space.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-space[separator="|"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-space[separator="|"]') as HTMLElement
    const seps = [...el.querySelectorAll<HTMLElement>(':scope > .oas-space-separator')]
    return {
      count: seps.length,
      texts: seps.map((s) => s.textContent),
      inFlow: seps.every((s) => getComputedStyle(s).display !== 'none'),
    }
  })
  expect(r.count, '3 个子项应注入 2 个分隔元素').toBe(2)
  expect(r.texts, '分隔元素文本应为 separator 字符').toEqual(['|', '|'])
  expect(r.inFlow, '分隔元素应参与布局（非 display:none）').toBe(true)
})

test('space 断点简写：direction="column md:row" 窄屏竖排、桌面横排（@media 规则真实生效）', async ({ page }) => {
  await page.goto('/components/space.html', { waitUntil: 'domcontentloaded' })
  const sel = 'oas-space[direction="column md:row"]'
  await up(page, sel)
  const readDir = () =>
    page.evaluate((s) => getComputedStyle(document.querySelector(s) as HTMLElement).flexDirection, sel)
  // 桌面视口（≥ md 768px）→ row
  expect(await readDir(), '桌面视口应按 md:row 横排').toBe('row')
  // 窄屏（< sm）→ 基础值 column
  await page.setViewportSize({ width: 480, height: 800 })
  expect(await readDir(), '窄屏应回落基础值 column 竖排').toBe('column')
  await page.setViewportSize({ width: 1280, height: 720 })
  expect(await readDir(), '恢复桌面视口应回到 row').toBe('row')
})

test('compact 贴合：相邻控件 -1px 重叠、首尾圆角协议注入、disabled 一键透传全组', async ({ page }) => {
  await page.goto('/components/space.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-compact')
  const r = await page.evaluate(() => {
    const group = document.querySelector('oas-compact') as HTMLElement
    const input = group.querySelector('oas-input') as HTMLElement
    const btn = group.querySelector('oas-button') as HTMLElement
    return {
      inputMargin: input.style.marginInlineStart,
      btnMargin: btn.style.marginInlineStart,
      btnRadiusVar: btn.style.getPropertyValue('--oas-button-group-radius'),
    }
  })
  expect(r.inputMargin, '首项不重叠').toBe('')
  expect(r.btnMargin, '后项沿主轴 -1px 重叠压前项边框').toBe('-1px')
  expect(r.btnRadiusVar, '尾部圆角协议变量应注入（尾项右圆角）').toContain('var(--oas-radius-md)')

  // disabled 透传：设组属性 → 相邻控件联动禁用（各控件 observedAttributes 含 disabled）
  await page.evaluate(() => (document.querySelector('oas-compact') as HTMLElement).setAttribute('disabled', ''))
  await page.waitForFunction(() => {
    const btn = document.querySelector('oas-compact oas-button') as HTMLElement
    return btn?.hasAttribute('disabled') === true
  })
  const innerDisabled = await page.evaluate(() => {
    const btn = document.querySelector('oas-compact oas-button') as HTMLElement
    return (btn.shadowRoot!.querySelector('button') as HTMLButtonElement).disabled
  })
  expect(innerDisabled, '透传后内部原生 button 应为禁用态').toBe(true)
})
