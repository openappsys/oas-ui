// 复核回归：高对比模式（forced-colors: active）兜底。
// 背景：Windows 高对比下 UA 强制覆盖 background、禁用 box-shadow——凡「只凭底色/阴影」
// 传达信息的元素（gantt 今日线/状态线/周末列、任务条/进度填充/基线/里程碑菱形/行选中态、
// scheduler 当前时刻线）必须有 forced-colors 媒体查询内的 outline/border 兜底，否则信息整体不可见。
// 断言口径（可计算前景）：兜底规则的 outline/border 计算宽度 > 0 且计算颜色非 transparent
// （强制色下 currentcolor 落到系统 CanvasText，可见）；像素级视觉核对仍属人工/截图审查范畴。
// 仅 chromium：page.emulateMedia 的 forcedColors 模拟在 Chromium 受支持，其余项目跳过。

import { test, expect, type Page } from '@playwright/test'
import { up } from './helpers'

test.skip(({ browserName }) => browserName !== 'chromium', 'forcedColors 模拟仅 Chromium 支持')

/** 读取 shadow 内元素的计算盒边信息（outline + 四向 border），hidden 元素返回 null */
interface EdgeInfo {
  outlineWidth: string
  outlineStyle: string
  outlineColor: string
  borderTopWidth: string
  borderInlineEndWidth: string
  borderColor: string
}

async function shadowEdge(page: Page, hostSel: string, innerSel: string): Promise<EdgeInfo | null> {
  return page.evaluate(
    ({ hostSel, innerSel }) => {
      const host = document.querySelector(hostSel)
      const el = host?.shadowRoot?.querySelector<HTMLElement>(innerSel)
      if (!host || !el || el.hidden) return null
      const cs = getComputedStyle(el)
      return {
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        borderTopWidth: cs.borderTopWidth,
        borderInlineEndWidth: cs.borderInlineEndWidth,
        borderColor: cs.borderTopColor,
      }
    },
    { hostSel, innerSel },
  )
}

function expectVisibleEdge(
  edge: { outlineWidth: string; outlineStyle: string; outlineColor: string } | null,
  label: string,
): void {
  const px = Number.parseFloat(edge!.outlineWidth)
  // forced-colors 下 UA 强制边框宽度只有 1px / 2px 两档
  expect([1, 2], `${label}：outline 宽度为 UA 强制档位（got ${edge!.outlineWidth}）`).toContain(px)
  expect(edge!.outlineStyle, `${label}：outline 线型非 none`).not.toBe('none')
  expect(edge!.outlineColor, `${label}：outline 颜色非 transparent`).not.toContain('rgba(0, 0, 0, 0)')
}

test('gantt：today-line / status-line / 周末列在强制色下有可计算的非透明前景兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#gantt-today')
  // 今日线演示区间动态覆盖今天（today-4 → today+10）：today-line / 周末列必然在范围内
  await page.waitForFunction(() => {
    const el = document.querySelector('#gantt-today')
    const line = el?.shadowRoot?.querySelector<HTMLElement>('.today-line')
    return !!line && !line.hidden
  })
  expectVisibleEdge(await shadowEdge(page, '#gantt-today', '.today-line'), 'gantt today-line')
  // 周末列高亮（weekends 默认开，day 档生效）：任取一个非隐藏 .cell 断言 inset outline
  const cellEdge = await page.evaluate(() => {
    const el = document.querySelector('#gantt-today')
    const cells = [...(el?.shadowRoot?.querySelectorAll<HTMLElement>('.grid-canvas .cell') ?? [])]
    const cs = cells.length ? getComputedStyle(cells[0]!) : null
    return cs ? { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor } : null
  })
  expectVisibleEdge(cellEdge, 'gantt weekend cell')

  // 状态线为 opt-in（show-status-line），页上无默认实例：经属性开启（status-date=今天，必在范围内）
  await page.evaluate(() => {
    const el = document.querySelector('#gantt-today')!
    const iso = (() => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })()
    el.setAttribute('show-status-line', '')
    el.setAttribute('status-date', iso)
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#gantt-today')
    const line = el?.shadowRoot?.querySelector<HTMLElement>('.status-line')
    return !!line && !line.hidden
  })
  expectVisibleEdge(await shadowEdge(page, '#gantt-today', '.status-line'), 'gantt status-line')
})

test('gantt：任务条 / 进度填充 / 基线 / 里程碑菱形在强制色下有可计算的前景兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#gantt-basic')
  // 任务条本体 border 兜底（basic 首条为普通条，带进度 → bar-progress 同验）
  const barEdge = await page.evaluate(() => {
    const el = document.querySelector('#gantt-basic')
    const bar = el?.shadowRoot?.querySelector<HTMLElement>('.bars .bar:not(.milestone)')
    if (!bar) return null
    const cs = getComputedStyle(bar)
    return {
      borderTopWidth: cs.borderTopWidth,
      borderStyle: cs.borderTopStyle,
      borderColor: cs.borderTopColor,
    }
  })
  expect(Number.parseFloat(barEdge!.borderTopWidth), '任务条 border 宽度').toBe(1)
  expect(barEdge!.borderStyle).not.toBe('none')
  expect(barEdge!.borderColor).not.toContain('rgba(0, 0, 0, 0)')
  // 进度填充前沿兜底：basic 首条 progress 40 → 存在 .bar-progress
  const progEdge = await page.evaluate(() => {
    const el = document.querySelector('#gantt-basic')
    const prog = el?.shadowRoot?.querySelector<HTMLElement>('.bar-progress')
    if (!prog) return null
    const cs = getComputedStyle(prog)
    return { width: cs.borderInlineEndWidth, color: cs.borderInlineEndColor }
  })
  expect(Number.parseFloat(progEdge!.width), '进度前沿 border-inline-end 宽度').toBe(2)
  expect(progEdge!.color).not.toContain('rgba(0, 0, 0, 0)')
  // 基线条 outline 兜底（show-baseline 演示实例）
  expectVisibleEdge(await shadowEdge(page, 'oas-gantt[show-baseline]', '.baseline'), 'gantt baseline')
  // 里程碑菱形 outline 兜底（拖拽演示含里程碑 dg2）
  expectVisibleEdge(await shadowEdge(page, '#gantt-drag', '.bar.milestone .dia'), 'gantt milestone dia')
})

test('gantt：行选中态在强制色下不消失（底色 + inset 阴影双双失效 → outline 兜底）', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/gantt.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#gantt-select')
  await page.evaluate(() => {
    const el = document.querySelector('#gantt-select') as HTMLElement & { selection: string[] }
    el.selection = ['s1']
  })
  await page.waitForFunction(
    () => !!document.querySelector('#gantt-select')?.shadowRoot?.querySelector('.row-name.selected'),
  )
  expectVisibleEdge(await shadowEdge(page, '#gantt-select', '.row-name.selected'), 'gantt selected row')
})

test('scheduler：当前时刻线在强制色下有 outline 兜底（线体 + 起点圆点）', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#scheduler-day')
  // 时刻线只在「视图日 = 今天」且 now 落在 start-hour..end-hour 内渲染：
  // 把页固定位到今天并放开 0..24 全天，任何运行时刻都能渲染
  await page.evaluate(() => {
    const el = document.querySelector('#scheduler-day')!
    const d = new Date()
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    el.setAttribute('page-show-date', iso)
    el.setAttribute('start-hour', '0')
    el.setAttribute('end-hour', '24')
  })
  await page.waitForFunction(() => !!document.querySelector('#scheduler-day')?.shadowRoot?.querySelector('.nowline'))
  expectVisibleEdge(await shadowEdge(page, '#scheduler-day', '.nowline'), 'scheduler nowline')
  // 起点圆点（::before）同样兜底
  const dotEdge = await page.evaluate(() => {
    const el = document.querySelector('#scheduler-day')
    const line = el?.shadowRoot?.querySelector<HTMLElement>('.nowline')
    if (!line) return null
    const cs = getComputedStyle(line, '::before')
    return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }
  })
  expectVisibleEdge(dotEdge, 'scheduler nowline::before')
})

test('badge / progress：dot 徽标与进度轨道在强制色下有可计算的前景兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/badge.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-badge[dot]')
  expectVisibleEdge(await shadowEdge(page, 'oas-badge[dot]', '.badge.dot'), 'badge dot')

  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress')
  // 轨道：border 兜底（默认 line 形态首个实例）
  const trackEdge = await page.evaluate(() => {
    const el = document.querySelector('oas-progress')
    const track = el?.shadowRoot?.querySelector<HTMLElement>('.track')
    if (!track || track.hidden) return null
    const cs = getComputedStyle(track)
    return { borderTopWidth: cs.borderTopWidth, borderStyle: cs.borderTopStyle, borderColor: cs.borderTopColor }
  })
  expect(Number.parseFloat(trackEdge!.borderTopWidth), 'track border 宽度').toBe(1)
  expect(trackEdge!.borderStyle).not.toBe('none')
})
