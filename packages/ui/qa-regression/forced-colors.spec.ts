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

test('splitter：拖拽手柄在强制色下有 outline 兜底，且面板几何与常态一致', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/splitter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-splitter')
  expectVisibleEdge(await shadowEdge(page, 'oas-splitter', '.splitter'), 'splitter handle')

  // 兜底只用 outline（不参与布局）：强制色态与常态下的手柄带宽 / 面板宽必须逐项一致
  const geom = (): Promise<{ hostWidth: number; sepWidth: number; panes: number[] }> =>
    page.evaluate(() => {
      const host = document.querySelector('oas-splitter')!
      const root = host.shadowRoot!
      const r2 = (n: number): number => Math.round(n * 100) / 100
      const sep = root.querySelector<HTMLElement>('.sep')!
      return {
        hostWidth: r2(host.getBoundingClientRect().width),
        sepWidth: r2(sep.getBoundingClientRect().width),
        panes: [...root.querySelectorAll<HTMLElement>('.pane')].map((p) => r2(p.getBoundingClientRect().width)),
      }
    })
  const forced = await geom()
  expect(forced.sepWidth, '手柄带宽度未被兜底改变（6px）').toBe(6)
  expect(forced.panes.length, 'legacy 两面板').toBe(2)
  const panesSum = forced.panes.reduce((a, b) => a + b, 0)
  expect(Math.abs(panesSum + forced.sepWidth - forced.hostWidth), '面板 + 手柄 = 容器宽').toBeLessThanOrEqual(0.5)

  await page.emulateMedia({ forcedColors: 'none' })
  // 等一帧让常态样式重新计算后再量
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
  expect(await geom(), '兜底后手柄与面板几何与常态一致').toEqual(forced)
})

test('sidebar / drawer：resize 拖拽指示条（rail::after）在强制色下有 outline 兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  // rail::after 的拖拽指示靠 background: var(--oas-color-primary)；强制色下 background 被 UA 剥掉
  // （实测透明）→ 指示条完全不可见。兜底用系统色实线 outline（不参与布局）。
  const edgeOf = (hostSel: string) =>
    page.evaluate((sel) => {
      const rail = document.querySelector(sel)?.shadowRoot?.querySelector<HTMLElement>('[part="rail"]')
      if (!rail) return null
      const cs = getComputedStyle(rail, '::after')
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor }
    }, hostSel)

  await page.goto('/components/sidebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sidebar-resizable')
  expectVisibleEdge(await edgeOf('#sidebar-resizable'), 'sidebar rail::after')

  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#drawer-resize')
  // 打开抽屉（rail 在面板内；关闭态 [hidden] 下伪元素不参与渲染）
  await page.evaluate(() => document.querySelector('#drawer-resize')!.setAttribute('visible', ''))
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !document.querySelector('#drawer-resize')!.shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!.hidden,
      ),
    )
    .toBe(true)
  expectVisibleEdge(await edgeOf('#drawer-resize'), 'drawer rail::after')
})

test('avatar：dot 角标在强制色下有可计算的前景兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[badge-dot]')
  expectVisibleEdge(await shadowEdge(page, 'oas-avatar[badge-dot]', '.badge.dot'), 'avatar badge dot')
})

test('calendar / tool-call：日程点与状态点在强制色下有可计算的前景兜底', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#calendar-events')
  // events 通道的排期点（声明式属性，首渲染即存在）
  await page.waitForFunction(() => !!document.querySelector('#calendar-events')?.shadowRoot?.querySelector('.ev-dot'))
  expectVisibleEdge(await shadowEdge(page, '#calendar-events', '[part="grid"] .ev-dot'), 'calendar ev-dot')

  // cell-dot 由宿主在 oas-cell-render 里追加（demo 的监听挂在 mounted 之后，首渲染可能已过）：
  // 按文档契约直接补一个标记点，断言组件自有样式对该宿主标记生效
  await up(page, '#calendar-cell-render')
  await page.evaluate(() => {
    const root = document.querySelector('#calendar-cell-render')?.shadowRoot
    if (!root || root.querySelector('.cell-dot')) return
    const day = root.querySelector<HTMLElement>('[part="grid"] .day:not(.outside)')
    if (!day) return
    const dot = document.createElement('span')
    dot.className = 'cell-dot'
    day.appendChild(dot)
  })
  expectVisibleEdge(await shadowEdge(page, '#calendar-cell-render', '[part="grid"] .cell-dot'), 'calendar cell-dot')

  await page.goto('/components/tool-call.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tool-call-running')
  expectVisibleEdge(await shadowEdge(page, '#tool-call-running', '.status'), 'tool-call status dot')
})

// ===== 焦点环（focus-ring）兜底 =====
// 全库焦点环统一为 `outline: none` + `box-shadow: var(--oas-focus-ring)`；强制色模式下 UA
// 会弃用 box-shadow，焦点指示随之完全消失（键盘用户失去可见焦点，WCAG 2.4.7）。
// 各组件样式末尾的 `@media (forced-colors: active)` 块把原焦点选择器复用为
// `outline: 1px solid CanvasText`（系统色，必有对比）+ `box-shadow: none`。
// 断言口径：强制色下计算 outline 宽度 > 0、线型非 none、颜色非 transparent；
// 反向断言：非强制色下同一选择器 outline 仍为 none（媒体查询未外溢，box-shadow 环保持原样）。

interface FocusRingSample {
  label: string
  url: string
  host: string
  /** 聚焦落点（shadow 内选择器）；null = 聚焦宿主自身（宿主可聚焦组件） */
  focus: string | null
  /** 焦点环绘制元素（shadow 内选择器） */
  probe: string
}

const FOCUS_RING_SAMPLES: FocusRingSample[] = [
  {
    label: 'button',
    url: '/components/button.html',
    host: '#btn-active-toggle',
    focus: 'button[part="button"]',
    probe: 'button[part="button"]',
  },
  { label: 'input', url: '/components/input.html', host: '#input-label', focus: 'input', probe: 'input' },
  {
    label: 'select',
    url: '/components/select.html',
    host: '#select-label-fallback',
    focus: '[part="trigger"]',
    probe: '[part="trigger"]',
  },
  { label: 'tag', url: '/components/tag.html', host: 'oas-tag[clickable]', focus: null, probe: '.tag' },
  { label: 'card', url: '/components/card.html', host: 'oas-card[clickable]', focus: null, probe: '.card' },
  { label: 'upload', url: '/components/upload.html', host: '#upload-drag', focus: '.zone', probe: '.zone' },
  {
    label: 'menubar',
    url: '/components/menubar.html',
    host: '#menubar-groups',
    focus: '.top-item',
    probe: '.top-item',
  },
  // 索引栏字母钮：曾经把 box-shadow 值写进 outline（非法声明被 UA 丢弃）→ 常规模式无焦点环
  { label: 'index-bar', url: '/components/index-bar.html', host: '#ib-basic', focus: '.letter', probe: '.letter' },
]

interface FocusRingState {
  focusVisible: boolean
  outlineWidth: string
  outlineStyle: string
  outlineColor: string
  boxShadow: string
  probeWidth: number
  probeHeight: number
}

/** 打开样本页并把焦点移到样本元素，返回绘制焦点环元素的计算样式与尺寸 */
async function focusRingState(page: Page, sample: FocusRingSample): Promise<FocusRingState> {
  await page.goto(sample.url, { waitUntil: 'domcontentloaded' })
  await up(page, sample.host)
  return page.evaluate(
    ({ host, focus, probe }) => {
      const hostEl = document.querySelector<HTMLElement>(host)!
      const root = hostEl.shadowRoot!
      const target = (focus ? root.querySelector<HTMLElement>(focus) : hostEl)!
      const ringEl = root.querySelector<HTMLElement>(probe)!
      target.focus()
      const cs = getComputedStyle(ringEl)
      const rect = ringEl.getBoundingClientRect()
      return {
        focusVisible: target.matches(':focus-visible'),
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
        probeWidth: rect.width,
        probeHeight: rect.height,
      }
    },
    { host: sample.host, focus: sample.focus, probe: sample.probe },
  )
}

/** outlineColor 是否透明（transparent / alpha 0；强制色下落到系统色，应不透明） */
function isTransparentColor(color: string): boolean {
  if (color === 'transparent') return true
  const rgba = color.match(/rgba?\(([^)]+)\)/)
  if (rgba) {
    const parts = rgba[1]!.split(/[ ,/]+/).filter(Boolean)
    if (parts.length === 4) return Number(parts[3]) === 0
    return false
  }
  // 现代色彩函数（oklab/color(...)）：无斜杠即不透明
  return /\/\s*0(?:\.0+)?\s*\)/.test(color)
}

test('强制色：代表性组件的焦点环回退为系统色实线 outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  for (const sample of FOCUS_RING_SAMPLES) {
    const state = await focusRingState(page, sample)
    expect(state.focusVisible, `${sample.label}：焦点态为 :focus-visible（键盘可见）`).toBe(true)
    // 兜底规则固定 1px 实线（强制色下 UA 也把 outline 宽度归一为 1/2px 两档）
    expect(state.outlineWidth, `${sample.label}：outline 宽度为 1px`).toBe('1px')
    expect(state.outlineStyle, `${sample.label}：outline 线型非 none`).not.toBe('none')
    expect(isTransparentColor(state.outlineColor), `${sample.label}：outline 颜色非透明`).toBe(false)
    // 被 UA 弃用的 box-shadow 显式清零：焦点指示只依赖 outline，避免半残余阴影干扰
    expect(state.boxShadow, `${sample.label}：强制色下 box-shadow 被弃用`).toBe('none')
  }
})

test('非强制色：forced-colors 兜底不外溢（outline 仍为 none，box-shadow 焦点环保持）', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'none' })
  for (const sample of FOCUS_RING_SAMPLES) {
    const state = await focusRingState(page, sample)
    // 常态下 outline 线型必须是 none（宽度是 UA 默认值的占位，不构成可见环）
    expect(state.outlineStyle, `${sample.label}：非强制色 outline 仍为 none`).toBe('none')
    // 焦点环仍由 box-shadow 绘制：等过渡收敛后应为非零 spread 的 --oas-focus-ring
    await expect
      .poll(
        async () =>
          page.evaluate(
            ({ host, probe }) => {
              const root = document.querySelector(host)?.shadowRoot
              return root ? getComputedStyle(root.querySelector(probe)!).boxShadow : ''
            },
            { host: sample.host, probe: sample.probe },
          ),
        { message: `${sample.label}：box-shadow 焦点环保持`, timeout: 3000 },
      )
      .toMatch(/0px 0px 0px [1-9]/)
  }
})

test('强制色：box-shadow 被弃用后组件仍可键盘操作（存在性 + Enter 触发）', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#btn-active-toggle')
  const state = await page.evaluate(() => {
    const hostEl = document.querySelector<HTMLElement>('#btn-active-toggle')!
    const btn = hostEl.shadowRoot!.querySelector<HTMLButtonElement>('button[part="button"]')!
    btn.focus()
    const cs = getComputedStyle(btn)
    const rect = btn.getBoundingClientRect()
    return {
      boxShadow: cs.boxShadow,
      outlineWidth: cs.outlineWidth,
      disabled: btn.disabled,
      width: rect.width,
      height: rect.height,
    }
  })
  expect(state.boxShadow, '强制色下阴影被弃用').toBe('none')
  expect(state.outlineWidth, '焦点仍可见（outline 兜底为 1px）').toBe('1px')
  expect(state.disabled, '按钮未被禁用').toBe(false)
  // 存在性：按钮仍占据可点击尺寸（不只 0×0 的幽灵节点）
  expect(state.width, '按钮宽仍为可点击尺寸').toBeGreaterThan(20)
  expect(state.height, '按钮高仍为可点击尺寸').toBeGreaterThan(20)
  // 键盘 Enter 仍触发 oas-click（demo 回写 active 状态）——强制色不影响可操作性
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.querySelector('#btn-active-out')?.textContent === 'active: true',
    undefined,
    { timeout: 5000 },
  )
})
