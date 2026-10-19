import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// 冷启动去竞态：等 oas-resource 升级 + 首帧泳道条渲染
async function waitResource(page: Page, id: string): Promise<void> {
  await page.waitForFunction(
    (target) => {
      const el = document.getElementById(target) as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el && !!el.shadowRoot && !!el.shadowRoot.querySelector('.row.lane .bar')
    },
    id,
    { timeout: 30000 },
  )
}

/**
 * 解析 computed box-shadow 为层数组（Chromium 序列化：`<color> <x> <y> <blur> <spread>[ inset], …`）。
 * 颜色可能是 rgb() 含逗号，故不能裸 split(',')——按「逗号 + 颜色起始」切层。列表**前者绘制在上**，
 * 层序即可见层带顺序（本题焦点环靠这一顺序表达 primary 贴条缘、bg 分隔带在其内侧）。
 */
function shadowLayers(boxShadow: string): Array<{ color: string; spread: number; inset: boolean }> {
  return boxShadow
    .split(/,\s*(?=rgb|rgba|#|color\(|hsl|oklch)/i)
    .map((s) => s.trim())
    .filter((s) => s !== '')
    .map((s) => {
      const geom = s.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(\s+inset)?/)
      return {
        color: geom ? s.slice(0, geom.index).trim() : s,
        spread: geom ? Number(geom[4]) : Number.NaN,
        inset: !!geom?.[5],
      }
    })
}

test('resource 浏览器回归：泳道 + 负载超载 + 一键平衡（回写后超载消失）+ console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-level')

  const host = page.locator('#res-level')
  // 3 资源泳道
  await expect(host.locator('.row.lane')).toHaveCount(3)
  // 初始存在超载柱
  await expect(host.locator('.pillar.over').first()).toBeVisible()
  const before = await host.locator('.pillar.over').count()
  expect(before, '初始应有超载').toBeGreaterThan(0)

  // 一键平衡 → 宿主回写 tasks → 超载清零
  await page.locator('#res-level-btn').click()
  await expect(page.locator('#res-level-output')).toContainText('平衡完成')
  await expect.poll(async () => host.locator('.pillar.over').count(), { timeout: 5000 }).toBe(0)

  // 点击任务条 → oas-task-click 反馈
  await host.locator('.row.lane .bar').first().click()
  await expect(page.locator('#res-level-output')).toContainText('点击任务')

  expect(errors).toEqual([])
})

test('resource 暗色：超载高亮与泳道可见、console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  const host = page.locator('#res-basic')
  await expect(host.locator('.row.lane')).toHaveCount(3)
  await expect(host.locator('.pillar.over').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('resource demo 初始反馈：挂载后立即反映超载态（不依赖后挂 listener 收到挂载期事件）', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  await expect(page.locator('#res-basic-output')).toContainText('检测到超载档')
  await waitResource(page, 'res-level')
  await expect(page.locator('#res-level-output')).toContainText('检测到超载')
})

// 表头/刻度容器与泳道列对齐（C1）：容器宽 = canvasW，RTL 镜像下同左缘同宽
async function geometry(page: Page, id: string) {
  return await page.evaluate((target) => {
    const el = document.getElementById(target) as (HTMLElement & { shadowRoot: ShadowRoot }) | null
    const sr = el!.shadowRoot
    const rect = (sel: string) => {
      const e = sr.querySelector(sel)
      if (!e) return null
      const b = e.getBoundingClientRect()
      return { left: b.left, right: b.right, width: b.width }
    }
    return {
      ticks: rect('.ticks'),
      laneTrack: rect('.lane .track'),
      histPad: rect('.hist-pad'),
      firstTick: rect('.ticks .tick'),
      firstCol: rect('.load .col'),
    }
  }, id)
}

function expectAligned(g: Awaited<ReturnType<typeof geometry>>): void {
  const { ticks, laneTrack, histPad, firstTick, firstCol } = g
  expect(ticks, '存在 .ticks').not.toBeNull()
  expect(laneTrack, '存在 .lane .track').not.toBeNull()
  expect(histPad, '存在 .hist-pad').not.toBeNull()
  // 刻度容器与泳道轨、直方图表头同左缘同宽（RTL 镜像定位前提：容器宽 = canvasW）
  expect(Math.abs(ticks!.left - laneTrack!.left), '刻度左缘 == 泳道左缘').toBeLessThan(1)
  expect(Math.abs(ticks!.width - laneTrack!.width), '刻度宽 == 泳道宽').toBeLessThan(1)
  expect(Math.abs(histPad!.left - laneTrack!.left), '直方图表头左缘 == 泳道左缘').toBeLessThan(1)
  expect(Math.abs(histPad!.width - laneTrack!.width), '直方图表头宽 == 泳道宽').toBeLessThan(1)
  // 首个刻度 == 首个直方图列（同一 colW 定位，含 RTL 镜像）
  expect(Math.abs(firstTick!.left - firstCol!.left), '首刻度 == 首列').toBeLessThan(1)
}

test('resource LTR 对齐：刻度 / 泳道列 / 直方图列同左缘同宽', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  expectAligned(await geometry(page, 'res-basic'))
})

test('resource RTL 对齐：刻度 / 泳道列 / 直方图列同左缘同宽（镜像不整体偏移）', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  const host = page.locator('#res-basic')
  // 注入 RTL：给组件宿主设 dir=rtl（就近祖先 [dir] 生效）→ requestUpdate 重算镜像布局
  await host.evaluate((el) => {
    el.setAttribute('dir', 'rtl')
    ;(el as HTMLElement & { requestUpdate(): void }).requestUpdate()
  })
  await expect(host).toHaveAttribute('data-rtl', '')
  expectAligned(await geometry(page, 'res-basic'))
})

test('resource 横向溢出：滚到中部表头行仍覆盖可视区', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  await page.evaluate(() => {
    const el = document.createElement('oas-resource') as HTMLElement
    el.id = 'res-wide'
    el.style.width = '480px'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'w1', name: '长', start: '2026-01-01', end: '2026-06-30', resources: ['r1'] }]),
    )
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () => !!document.getElementById('res-wide')?.shadowRoot?.querySelector('.row.lane .bar'),
    undefined,
    { timeout: 10000 },
  )
  const res = await page.evaluate(async () => {
    const sr = (document.getElementById('res-wide') as HTMLElement).shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    const maxScroll = sc.scrollWidth - sc.clientWidth
    sc.scrollLeft = Math.floor(maxScroll / 2)
    // 横向虚拟化：刻度按列窗口渲染，窗口重算在 scroll 事件的 rAF 帧执行——等帧后再量可视区覆盖
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    const scRect = sc.getBoundingClientRect()
    const headRect = sr.querySelector('.row.head')!.getBoundingClientRect()
    const centerX = scRect.left + scRect.width / 2
    let tickAtCenter = false
    for (const t of sr.querySelectorAll('.ticks .tick')) {
      const b = t.getBoundingClientRect()
      if (b.left <= centerX && b.right >= centerX) tickAtCenter = true
    }
    return {
      maxScroll,
      scWidth: scRect.width,
      scRight: scRect.right,
      headWidth: headRect.width,
      headRight: headRect.right,
      tickAtCenter,
    }
  })
  expect(res.maxScroll, '存在横向溢出').toBeGreaterThan(100)
  expect(res.headWidth, '表头行宽覆盖画布').toBeGreaterThanOrEqual(res.scWidth - 2)
  expect(res.headRight, '滚动到中部后表头右缘仍覆盖可视区右缘').toBeGreaterThanOrEqual(res.scRight - 2)
  expect(res.tickAtCenter, '中部可视区有刻度').toBe(true)
  await page.evaluate(() => document.getElementById('res-wide')?.remove())
})

test('resource 重叠任务条：点第一条中心命中第一条（oas-task-click id 正确）', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  await page.evaluate(() => {
    // 固定顶层容器：隔离页面浮层/侧栏遮挡，使「点第一条条心」的命中判定只反映泳道内条间遮挡
    const wrap = document.createElement('div')
    wrap.id = 'res-overlap-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff)'
    const el = document.createElement('oas-resource') as HTMLElement
    el.id = 'res-overlap'
    el.style.cssText = 'display:block;width:600px;margin:48px'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 'x1', name: 'first', start: '2026-03-02', end: '2026-03-05', resources: ['r1'] },
        { id: 'x2', name: 'second', start: '2026-03-03', end: '2026-03-06', resources: ['r1'] },
      ]),
    )
    ;(window as unknown as { __hit: string | null }).__hit = null
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string }>) => {
      ;(window as unknown as { __hit: string | null }).__hit = e.detail.id
    }) as EventListener)
    wrap.appendChild(el)
    document.body.appendChild(wrap)
  })
  await page.waitForFunction(
    () => !!document.getElementById('res-overlap')?.shadowRoot?.querySelector('.bar[data-task-id="x1"]'),
    undefined,
    { timeout: 10000 },
  )
  const box = await page.evaluate(() => {
    const sr = (document.getElementById('res-overlap') as HTMLElement).shadowRoot!
    const b = sr.querySelector('.bar[data-task-id="x1"]')!.getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height }
  })
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  // 前置：该点最顶层命中组件本体（无页面浮层遮挡）
  const topId = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id ?? null, { x: cx, y: cy })
  expect(topId, '点击点位于组件之上（无遮挡）').toBe('res-overlap')
  await page.mouse.click(cx, cy)
  const hit = await page.evaluate(() => (window as unknown as { __hit: string | null }).__hit)
  expect(hit, '点第一条条心命中第一条').toBe('x1')
  await page.evaluate(() => document.getElementById('res-overlap-wrap')?.remove())
})

// ===== 第二轮复审收口回归（height token / 段堆叠几何 / tasks-change / RTL sticky / scrollToDate / month 月末） =====

function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

/** 等待实例 shadow 渲染出泳道条（自建实例通用） */
async function waitShadowReady(page: Page, id: string): Promise<void> {
  await page.waitForFunction(
    (target) => {
      const el = document.getElementById(target) as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return !!el?.shadowRoot?.querySelector('.row.lane .bar')
    },
    id,
    { timeout: 15000 },
  )
}

test('resource height 三通道：token 500 / height 属性 480 / 宿主 CSS 400（真浏览器几何）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const data = {
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }]),
    }
    const mk = (id: string, apply: (el: HTMLElement) => void): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1'
      apply(el)
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', data.resources)
      el.setAttribute('tasks', data.tasks)
      document.body.appendChild(el)
    }
    // ① token 通道：--oas-resource-height:500px（无 height 属性）
    mk('res-h-token', (el) => el.style.setProperty('--oas-resource-height', '500px'))
    // ② 属性通道：height="480"
    mk('res-h-attr', (el) => el.setAttribute('height', '480'))
    // ③ 宿主内联通道：el.style.height = 400px（无 height 属性，对齐复审场景「宿主内联」）
    mk('res-h-css', (el) => {
      el.style.height = '400px'
    })
  })
  await waitShadowReady(page, 'res-h-token')
  await waitShadowReady(page, 'res-h-attr')
  await waitShadowReady(page, 'res-h-css')
  const heights = await page.evaluate(() => {
    const measure = (id: string) => {
      const el = document.getElementById(id) as HTMLElement
      const sr = el.shadowRoot!
      return {
        host: el.getBoundingClientRect().height,
        wrap: (sr.querySelector('.wrap') as HTMLElement).getBoundingClientRect().height,
        wrapInline: (sr.querySelector('.wrap') as HTMLElement).style.height,
      }
    }
    return { token: measure('res-h-token'), attr: measure('res-h-attr'), css: measure('res-h-css') }
  })
  // ① token：.wrap 高 500（此前内联 320 恒压死 token → 死 token）
  expect(heights.token.host, 'token 通道宿主高 500').toBeCloseTo(500, 0)
  expect(heights.token.wrap, 'token 通道 .wrap 高 500').toBeCloseTo(500, 0)
  expect(heights.token.wrapInline, 'token 通道 .wrap 无内联高度').toBe('')
  // ② 属性：显式 height 属性生效
  expect(heights.attr.host, '属性通道宿主高 480').toBeCloseTo(480, 0)
  expect(heights.attr.wrap, '属性通道 .wrap 高 480').toBeCloseTo(480, 0)
  // ③ 宿主 CSS：无属性时页面样式可接管高度
  expect(heights.css.host, '宿主 CSS 通道高 400').toBeCloseTo(400, 0)
  expect(heights.css.wrap, '宿主 CSS 通道 .wrap 高 400').toBeCloseTo(400, 0)
  await page.evaluate(() => {
    document.getElementById('res-h-token')?.remove()
    document.getElementById('res-h-attr')?.remove()
    document.getElementById('res-h-css')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource 段堆叠几何：3 重叠 → 轨道高 == segs*barH+(segs+1)*gap，各条在轨道内', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.id = 'res-stack-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff)'
    const el = document.createElement('oas-resource')
    el.id = 'res-stack'
    el.style.cssText = 'display:block;width:600px;margin:24px'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 's1', name: '一', start: '2026-03-02', end: '2026-03-08', resources: ['r1'] },
        { id: 's2', name: '二', start: '2026-03-03', end: '2026-03-09', resources: ['r1'] },
        { id: 's3', name: '三', start: '2026-03-04', end: '2026-03-10', resources: ['r1'] },
      ]),
    )
    wrap.appendChild(el)
    document.body.appendChild(wrap)
  })
  await waitShadowReady(page, 'res-stack')
  const geo = await page.evaluate(() => {
    const sr = (document.getElementById('res-stack') as HTMLElement).shadowRoot!
    const track = sr.querySelector('.lane .track') as HTMLElement
    const tr = track.getBoundingClientRect()
    const bars = [...sr.querySelectorAll<HTMLElement>('.lane .bar')].map((b) => {
      const r = b.getBoundingClientRect()
      return { top: r.top - tr.top, bottom: r.bottom - tr.top }
    })
    return { trackH: tr.height, bars }
  })
  // 默认 token：barH=20、rowH=36 → gap=8；3 段轨道高 = 3*20 + 4*8 = 92
  expect(geo.trackH, '3 段轨道高 = 3*20 + 4*8 = 92').toBeCloseTo(92, 1)
  expect(geo.bars, '三条全部就位').toHaveLength(3)
  for (const b of geo.bars) {
    expect(b.top, '条 top ≥ 0（负 gap 不再外溢）').toBeGreaterThanOrEqual(-0.5)
    expect(b.bottom, '条 bottom ≤ 轨道高（不越界）').toBeLessThanOrEqual(geo.trackH + 0.5)
  }
  await page.evaluate(() => document.getElementById('res-stack-wrap')?.remove())
  expect(errors).toEqual([])
})

test('resource 自定义 bar-height/row-height：单段轨道高 == row-height；负 gap 钳 0 不外溢', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const data = {
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }]),
    }
    const mk = (id: string, vars: string): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = `display:block;width:600px;margin:12px;position:relative;z-index:1;${vars}`
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', data.resources)
      el.setAttribute('tasks', data.tasks)
      document.body.appendChild(el)
    }
    // 自定义组合：barH=12 / rowH=40 → gap=14，单段轨道高 = 12 + 2*14 = 40（= row-height）
    mk('res-tok-a', '--oas-resource-bar-height:12px;--oas-resource-row-height:40px')
    // 负 gap 组合：barH=50 > rowH=36 → gap 钳 0，单段轨道高 = 50（不得为负/溢出）
    mk('res-tok-b', '--oas-resource-bar-height:50px;--oas-resource-row-height:36px')
  })
  await waitShadowReady(page, 'res-tok-a')
  await waitShadowReady(page, 'res-tok-b')
  const geo = await page.evaluate(() => {
    const measure = (id: string) => {
      const sr = (document.getElementById(id) as HTMLElement).shadowRoot!
      const track = sr.querySelector('.lane .track') as HTMLElement
      const tr = track.getBoundingClientRect()
      const bar = sr.querySelector('.lane .bar') as HTMLElement
      const br = bar.getBoundingClientRect()
      return { trackH: tr.height, barTop: br.top - tr.top, barH: br.height }
    }
    return { a: measure('res-tok-a'), b: measure('res-tok-b') }
  })
  expect(geo.a.trackH, 'barH12/rowH40：单段轨道高 = 40').toBeCloseTo(40, 1)
  expect(geo.a.barH, '条高 = 12').toBeCloseTo(12, 1)
  expect(geo.b.trackH, 'barH50>rowH36：gap 钳 0 → 轨道高 = 50').toBeCloseTo(50, 1)
  expect(geo.b.barTop, '负 gap 钳 0：条不越出轨道顶').toBeGreaterThanOrEqual(-0.5)
  expect(geo.b.barH, '条高 = 50').toBeCloseTo(50, 1)
  await page.evaluate(() => {
    document.getElementById('res-tok-a')?.remove()
    document.getElementById('res-tok-b')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource oas-tasks-change：程序写 tasks 派发一次，detail.tasks 为公开拷贝', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-tc'
    el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1'
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    const w = window as unknown as { __tc: Array<{ count: number; firstId: string | undefined }> }
    w.__tc = []
    el.addEventListener('oas-tasks-change', ((e: CustomEvent<{ tasks: Array<{ id: string }> }>) => {
      w.__tc.push({ count: e.detail.tasks.length, firstId: e.detail.tasks[0]?.id })
    }) as EventListener)
    document.body.appendChild(el)
  })
  // 等元素升级完成再走 property 写通道：未升级时 el.tasks 只是普通 JS 属性，不触发 setter
  await page.waitForFunction(() => !!document.getElementById('res-tc')?.shadowRoot, undefined, { timeout: 15000 })
  await page.evaluate(() => {
    const el = document.getElementById('res-tc') as HTMLElement & { tasks: unknown }
    el.tasks = [{ id: 'tc1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }]
  })
  await waitShadowReady(page, 'res-tc')
  const fired = await page.evaluate(
    () => (window as unknown as { __tc: Array<{ count: number; firstId: string | undefined }> }).__tc,
  )
  expect(fired, '恰好派发一次且 detail 携带任务').toEqual([{ count: 1, firstId: 'tc1' }])
  await page.evaluate(() => document.getElementById('res-tc')?.remove())
  expect(errors).toEqual([])
})

test('resource RTL sticky 名列贴右 / LTR 贴左（横向滚动到中部）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const data = {
      resources: JSON.stringify([{ id: 'r1', name: '资源甲' }]),
      tasks: JSON.stringify([{ id: 't1', name: '长', start: '2026-01-01', end: '2026-06-30', resources: ['r1'] }]),
    }
    const mk = (id: string, rtl: boolean): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'display:block;width:520px;margin:12px;position:relative;z-index:1'
      if (rtl) el.setAttribute('dir', 'rtl')
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', data.resources)
      el.setAttribute('tasks', data.tasks)
      document.body.appendChild(el)
    }
    mk('res-sticky-ltr', false)
    mk('res-sticky-rtl', true)
  })
  await waitShadowReady(page, 'res-sticky-ltr')
  await waitShadowReady(page, 'res-sticky-rtl')
  const geo = await page.evaluate(() => {
    const measure = (id: string) => {
      const el = document.getElementById(id) as HTMLElement
      const sr = el.shadowRoot!
      const sc = sr.querySelector('.scroller') as HTMLElement
      const maxScroll = sc.scrollWidth - sc.clientWidth
      sc.scrollLeft = el.getAttribute('dir') === 'rtl' ? -Math.floor(maxScroll / 2) : Math.floor(maxScroll / 2)
      const scr = sc.getBoundingClientRect()
      const name = (sr.querySelector('.lane .name') as HTMLElement).getBoundingClientRect()
      return {
        dir: el.getAttribute('dir'),
        scLeft: scr.left,
        scRight: scr.right,
        nameLeft: name.left,
        nameRight: name.right,
      }
    }
    return { ltr: measure('res-sticky-ltr'), rtl: measure('res-sticky-rtl') }
  })
  expect(geo.ltr.nameLeft, 'LTR：名列贴可视区左缘').toBeLessThanOrEqual(geo.ltr.scLeft + 1.5)
  expect(geo.rtl.nameRight, 'RTL：名列贴可视区右缘').toBeGreaterThanOrEqual(geo.rtl.scRight - 1.5)
  await page.evaluate(() => {
    document.getElementById('res-sticky-ltr')?.remove()
    document.getElementById('res-sticky-rtl')?.remove()
    document.getElementById('res-sticky-off')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource scrollToDate 端到端：调用后目标条滚入可视区且按剩余区居中', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-scrollto'
    el.style.cssText = 'display:block;width:520px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 'head', name: '头', start: '2026-01-01', end: '2026-01-05', resources: ['r1'] },
        { id: 'mid', name: '中', start: '2026-04-01', end: '2026-04-05', resources: ['r1'] },
      ]),
    )
    document.body.appendChild(el)
  })
  await waitShadowReady(page, 'res-scrollto')
  const res = await page.evaluate(() => {
    const el = document.getElementById('res-scrollto') as HTMLElement & { scrollToDate(d: string): void }
    const sr = el.shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    el.scrollToDate('2026-04-01')
    const scr = sc.getBoundingClientRect()
    const mid = (sr.querySelector('.bar[data-task-id="mid"]') as HTMLElement).getBoundingClientRect()
    // 期望值：x(04-01) = 90 天 × 36px；居中于扣除名列后的剩余区
    const colW = 36
    const days = Math.round((Date.UTC(2026, 3, 1) - Date.UTC(2026, 0, 1)) / 86_400_000)
    const nameW = (sr.querySelector('.name') as HTMLElement).offsetWidth
    const expected = Math.max(0, days * colW - Math.max(0, sc.clientWidth - nameW) / 2)
    return { sl: sc.scrollLeft, expected, inView: mid.left >= scr.left - 1 && mid.right <= scr.right + 1 }
  })
  expect(Math.abs(res.sl - res.expected), 'scrollLeft 等于居中期望值').toBeLessThanOrEqual(1)
  expect(res.inView, '目标任务条滚入可视区').toBe(true)
  await page.evaluate(() => document.getElementById('res-scrollto')?.remove())
  expect(errors).toEqual([])
})

test('resource month 档月末步进：01-31 后移 → 02-28（真浏览器 levelResources）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => typeof (window as unknown as { levelResources?: unknown }).levelResources === 'function',
    undefined,
    {
      timeout: 15000,
    },
  )
  const moved = await page.evaluate(() => {
    const levelResources = (
      window as unknown as {
        levelResources: (
          r: unknown[],
          t: unknown[],
          o: { scale: string },
        ) => Array<{ id: string; start: string; end: string }>
      }
    ).levelResources
    return levelResources(
      [{ id: 'r1', name: 'A', capacity: 1 }],
      [
        { id: 'e1', name: '锚', start: '2026-01-31', end: '2026-01-31', resources: ['r1'] },
        { id: 'e2', name: '受害', start: '2026-01-31', end: '2026-01-31', resources: ['r1'] },
      ],
      { scale: 'month' },
    )
  })
  expect(moved.map((t) => t.id)).toEqual(['e2'])
  expect(moved[0]!.start, '月末钳制（旧实现溢出成 03-03）').toBe('2026-02-28')
  expect(moved[0]!.end, '工期保持 1 天').toBe('2026-02-28')
  expect(errors).toEqual([])
})

// ===== 第三轮复审收口回归（lane-gap 宿主可覆盖 / 轨道不裁剪 / en-US demo 可见行为） =====

test('resource lane-gap 宿主可覆盖：内联 / 宿主元素级 class 规则设置 --oas-resource-lane-gap:4px 均生效（单段轨道高 28 ≠ 默认 36）', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  // 宿主元素级 class 规则（文档样式表命中宿主）：验证「元素级 class 亦可覆盖 :host 声明」
  await page.addStyleTag({ content: '.res-gap-cls { --oas-resource-lane-gap: 4px }' })
  await page.evaluate(() => {
    const resources = JSON.stringify([{ id: 'r1', name: 'A' }])
    const tasks = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }])
    const mk = (id: string, extra: string, cls: string | null): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      if (cls) el.classList.add(cls)
      el.style.cssText = `display:block;width:600px;margin:12px;position:relative;z-index:1${extra}`
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', resources)
      el.setAttribute('tasks', tasks)
      document.body.appendChild(el)
    }
    mk('res-gap-def', '', null)
    mk('res-gap-over', ';--oas-resource-lane-gap:4px', null)
    mk('res-gap-cls', '', 'res-gap-cls')
  })
  await waitShadowReady(page, 'res-gap-def')
  await waitShadowReady(page, 'res-gap-over')
  await waitShadowReady(page, 'res-gap-cls')
  const geo = await page.evaluate(() => {
    const measure = (id: string) => {
      const sr = (document.getElementById(id) as HTMLElement).shadowRoot!
      const track = sr.querySelector('.lane .track') as HTMLElement
      return {
        trackH: track.getBoundingClientRect().height,
        gap: getComputedStyle(track).getPropertyValue('--oas-resource-lane-gap').trim(),
      }
    }
    return { def: measure('res-gap-def'), over: measure('res-gap-over'), cls: measure('res-gap-cls') }
  })
  // 默认：barH=20/rowH=36 → gap=8 → 单段轨道高 = 20 + 2*8 = 36
  // （自定义属性计算值保留未求值的 max() token 流，故只断言它是派生式而非字面量）
  expect(geo.def.gap, '默认 gap 为派生 max(…) 表达式').toContain('max(')
  expect(geo.def.trackH, '默认单段轨道高 = 36').toBeCloseTo(36, 1)
  // 宿主内联覆盖：gap=4 → 单段轨道高 = 20 + 2*4 = 28（旧实现声明在 .lane .track 上，内联覆盖无效）
  expect(geo.over.gap, '宿主内联 gap 覆盖派生值').toBe('4px')
  expect(geo.over.trackH, '宿主 gap=4 → 单段轨道高 = 28（覆盖生效）').toBeCloseTo(28, 1)
  // 宿主元素级 class 规则覆盖：同内联口径（文档样式表命中宿主元素，优先于 shadow :host 声明）
  expect(geo.cls.gap, '宿主元素级 class 规则 gap 覆盖派生值').toBe('4px')
  expect(geo.cls.trackH, '宿主 class gap=4 → 单段轨道高 = 28（覆盖生效）').toBeCloseTo(28, 1)
  await page.evaluate(() => {
    document.getElementById('res-gap-def')?.remove()
    document.getElementById('res-gap-over')?.remove()
    document.getElementById('res-gap-cls')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource 轨道不裁剪：.lane .track 计算 overflow=visible，贴边（left=0）最早条可聚焦', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-edge'
    el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'edge', name: '最早', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] }]),
    )
    document.body.appendChild(el)
  })
  await waitShadowReady(page, 'res-edge')
  const res = await page.evaluate(() => {
    const sr = (document.getElementById('res-edge') as HTMLElement).shadowRoot!
    const track = sr.querySelector('.lane .track') as HTMLElement
    const bar = sr.querySelector('.bar[data-task-id="edge"]') as HTMLElement
    const tr = track.getBoundingClientRect()
    const br = bar.getBoundingClientRect()
    bar.focus()
    return {
      overflow: getComputedStyle(track).overflow,
      trackLeft: tr.left,
      barLeft: br.left,
      focused: sr.activeElement === bar,
    }
  })
  // 历史根因：overflow:hidden 会裁掉贴轨道左缘条 :focus-visible 的「外描边形态」焦点环；
  // 现环为纯 inset box-shadow（全在条内），此断言保留为「条几何不被裁剪」的不变量
  expect(res.overflow, '.lane .track 不裁剪（overflow visible）').toBe('visible')
  expect(Math.abs(res.barLeft - res.trackLeft), '最早条贴轨道左缘（left=0）').toBeLessThan(1.5)
  expect(res.focused, '条可聚焦').toBe(true)
  await page.evaluate(() => document.getElementById('res-edge')?.remove())
  expect(errors).toEqual([])
})

test('resource en-US demo：点击「滚动到 03-15」有可见反馈 + 周日起始刻度（MM-dd）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitShadowReady(page, 'res-locale')
  const btn = page.locator('#res-scroll-btn')
  await expect(btn).toBeVisible()
  await btn.click()
  // 可见反馈：demo 输出文案更新（不只看 console）
  await expect(page.locator('#res-locale-output')).toContainText('2026-03-15')
  // en-US 周日起始：2026-03-01 为周日 → 首个 week 刻度即为 03-01（MM-dd，非 ISO 周号）
  const firstTick = await page.evaluate(() => {
    const sr = (document.getElementById('res-locale') as HTMLElement).shadowRoot!
    return sr.querySelector('.ticks .tick')?.textContent ?? ''
  })
  expect(firstTick, '首个刻度 = 档起始日 03-01').toBe('03-01')
  expect(errors).toEqual([])
})

// ===== 终批复审收口回归（F1b 高度自定义属性 / F2 条最小宽并进几何 / F3 焦点环双色环） =====

test('resource F1b DSD 高度：组件自写自定义属性不被误当宿主内联，移除属性后回落 token（不残留 480）', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.evaluate(() => {
    const resources = JSON.stringify([{ id: 'r1', name: 'A' }])
    const tasks = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }])
    // 参考实例：取一份 shadow HTML 模拟 SSR 快照内容（同 renderToString 的序列化物）
    const ref = document.createElement('oas-resource')
    ref.setAttribute('scale', 'day')
    ref.setAttribute('resources', resources)
    ref.setAttribute('tasks', tasks)
    document.body.appendChild(ref)
    const shadowHtml = (ref.shadowRoot as ShadowRoot).innerHTML
    ref.remove()
    // 真实 DSD 态：height="480" 属性 + 组件自写自定义属性 --oas-resource-height:480px
    // （SSR update() 写下并被序列化进快照；组件从不写宿主 height 内联）。
    // DOMParser 走完整 HTML 解析器，会附加 template[shadowrootmode] 的 shadow root（innerHTML 不会）；
    // 指纹 meta 使 upgrade 后走真水合（tryHydrate → hydrate → update）
    const html =
      `<html><body><oas-resource id="res-dsd" scale="day" height="480"` +
      ` style="display:block;width:600px;margin:12px;position:relative;z-index:1;--oas-resource-height:480px"` +
      ` resources='${resources}' tasks='${tasks}'>` +
      `<template shadowrootmode="open"><meta data-oas-ssr="oas-resource" data-oas-ssr-v="1">${shadowHtml}</template>` +
      `</oas-resource></body></html>`
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const el = doc.getElementById('res-dsd') as HTMLElement
    document.adoptNode(el)
    document.body.appendChild(el)
  })
  await waitShadowReady(page, 'res-dsd')
  const res = await page.evaluate(() => {
    const el = document.getElementById('res-dsd') as HTMLElement & { requestUpdate(): void }
    const beforeVar = el.style.getPropertyValue('--oas-resource-height')
    const beforeH = el.getBoundingClientRect().height
    el.removeAttribute('height')
    el.requestUpdate()
    return {
      beforeVar,
      beforeH,
      afterVar: el.style.getPropertyValue('--oas-resource-height'),
      afterH: el.getBoundingClientRect().height,
      inlineHeight: el.style.height,
    }
  })
  expect(res.beforeVar, 'DSD 快照含组件自写自定义属性 480px').toBe('480px')
  expect(res.beforeH, 'DSD 态宿主高 480（属性映射生效）').toBeCloseTo(480, 0)
  // 反证旧实现：把快照内联误记为「组件自写」→ 移除属性还原成 480px（应回落 token 320）
  expect(res.afterVar, '移除属性后自定义属性归零').toBe('')
  expect(res.afterH, '移除属性后高度回落 token 默认 320（不残留 480）').toBeCloseTo(320, 0)
  expect(res.inlineHeight, '组件从不写宿主 height 内联').toBe('')
  await page.evaluate(() => document.getElementById('res-dsd')?.remove())
  expect(errors).toEqual([])
})

test('resource F1b CSR：宿主真内联 480px + height="480" → 移除属性后宿主内联 480px 不被吞', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.evaluate(() => {
    const resources = JSON.stringify([{ id: 'r1', name: 'A' }])
    const tasks = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }])
    const mk = (id: string): HTMLElement => {
      const el = document.createElement('oas-resource')
      el.id = id
      // 宿主真内联高度 480px（恰好等于属性将映射的值——DSD 与 CSR 无法凭值区分，旧实现会误判清除）
      el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1;height:480px'
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', resources)
      el.setAttribute('tasks', tasks)
      document.body.appendChild(el)
      return el
    }
    mk('res-csr-h')
    mk('res-csr-bad')
  })
  await waitShadowReady(page, 'res-csr-h')
  await waitShadowReady(page, 'res-csr-bad')
  const res = await page.evaluate(() => {
    const h = document.getElementById('res-csr-h') as HTMLElement & { requestUpdate(): void }
    h.setAttribute('height', '480')
    const hVar = h.style.getPropertyValue('--oas-resource-height')
    const hBefore = h.getBoundingClientRect().height
    h.removeAttribute('height')
    h.requestUpdate()

    const bad = document.getElementById('res-csr-bad') as HTMLElement & { requestUpdate(): void }
    bad.style.height = '320px'
    bad.setAttribute('height', 'bad')
    const badVar = bad.style.getPropertyValue('--oas-resource-height')
    bad.removeAttribute('height')
    bad.requestUpdate()
    return {
      hVar,
      hBefore,
      hInline: h.style.height,
      hAfter: h.getBoundingClientRect().height,
      badVar,
      badInline: bad.style.height,
      badAfter: bad.getBoundingClientRect().height,
    }
  })
  expect(res.hVar, 'height="480" 映射为自定义属性 480px').toBe('480px')
  expect(res.hBefore, '属性在：宿主高 480').toBeCloseTo(480, 0)
  // 反证旧实现：hostHeightBefore = existing === next ? '' : existing → 宿主真内联被清
  expect(res.hInline, '移除属性后宿主真内联 480px 仍在（不被吞）').toBe('480px')
  expect(res.hAfter, '移除属性后宿主高仍 480（由宿主内联接管）').toBeCloseTo(480, 0)
  // F1 语义：非法值不写变量（反证旧实现写 320px 覆盖宿主 token）；宿主真内联 320px 全程不受影响
  expect(res.badVar, 'height="bad" 不写自定义属性（不覆盖宿主 token）').toBe('')
  expect(res.badInline, 'height="bad" 移除后宿主真内联 320px 仍不被吞').toBe('320px')
  expect(res.badAfter, '宿主高仍 320').toBeCloseTo(320, 0)
  await page.evaluate(() => {
    document.getElementById('res-csr-h')?.remove()
    document.getElementById('res-csr-bad')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource F2 条不越界：month 档末档单日任务 bar 恒在轨道内（LTR+RTL 真几何）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const resources = JSON.stringify([{ id: 'r1', name: 'A' }])
    const tasks = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-31', end: '2026-03-31', resources: ['r1'] }])
    const mk = (id: string, rtl: boolean): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1'
      if (rtl) el.setAttribute('dir', 'rtl')
      el.setAttribute('scale', 'month')
      el.setAttribute('resources', resources)
      el.setAttribute('tasks', tasks)
      document.body.appendChild(el)
    }
    mk('res-edge-month', false)
    mk('res-edge-month-rtl', true)
  })
  await waitShadowReady(page, 'res-edge-month')
  await waitShadowReady(page, 'res-edge-month-rtl')
  const geo = await page.evaluate(() => {
    const measure = (id: string) => {
      const sr = (document.getElementById(id) as HTMLElement).shadowRoot!
      const tr = (sr.querySelector('.lane .track') as HTMLElement).getBoundingClientRect()
      const br = (sr.querySelector('.lane .bar') as HTMLElement).getBoundingClientRect()
      return { trackL: tr.left, trackR: tr.right, barL: br.left, barR: br.right, w: br.width }
    }
    return { ltr: measure('res-edge-month'), rtl: measure('res-edge-month-rtl') }
  })
  // 反证旧实现：比例内插 w≈3.55 被 CSS min-width:8 顶宽，右缘越出轨道 ~4.4px（RTL 对称）
  for (const g of [geo.ltr, geo.rtl]) {
    expect(g.w, '条宽 = 最小宽 8（JS 并进几何，CSS 不再二次放大）').toBeCloseTo(8, 1)
    expect(g.barL, '条左缘 ≥ 轨道左缘 − 0.5').toBeGreaterThanOrEqual(g.trackL - 0.5)
    expect(g.barR, '条右缘 ≤ 轨道右缘 + 0.5').toBeLessThanOrEqual(g.trackR + 0.5)
  }
  await page.evaluate(() => {
    document.getElementById('res-edge-month')?.remove()
    document.getElementById('res-edge-month-rtl')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource F3 贴边条焦点环：纯 inset 双层环（primary 2px 贴条缘 + bg 1px 分隔带），环带处命中 bar', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    // 固定顶层容器：隔离页面浮层/侧栏遮挡，使命中判定只反映组件内部层叠（同 res-overlap 用例模式）
    const wrap = document.createElement('div')
    wrap.id = 'res-focus-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff)'
    const el = document.createElement('oas-resource')
    el.id = 'res-focus'
    el.style.cssText = 'display:block;width:600px;margin:48px;position:relative'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'edge', name: '最早', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] }]),
    )
    wrap.appendChild(el)
    document.body.appendChild(wrap)
  })
  await waitShadowReady(page, 'res-focus')
  const res = await page.evaluate(() => {
    const sr = (document.getElementById('res-focus') as HTMLElement).shadowRoot!
    const bar = sr.querySelector('.bar[data-task-id="edge"]') as HTMLElement
    bar.focus()
    const barRect = bar.getBoundingClientRect()
    const trackRect = (sr.querySelector('.lane .track') as HTMLElement).getBoundingClientRect()
    const cy = barRect.top + barRect.height / 2
    // 环带（条内缘 1px 处）命中 bar 即该区域未被名列遮挡（环可见）
    const inside = sr.elementFromPoint(barRect.left + 1, cy)
    // 条外 1px 为 sticky 名列区（不透明、z-index 2）——证明外描边形态的环带必被遮
    const outside = sr.elementFromPoint(barRect.left - 1, cy)
    const desc = (e: Element | null): string => (e instanceof Element ? `${e.tagName}.${e.className}` : String(e))
    const cs = getComputedStyle(bar)
    // 取 token 的计算色（与环带层颜色比对，避免写死主题色值）
    const tokenColor = (expr: string): string => {
      const d = document.createElement('div')
      d.style.color = expr
      document.body.appendChild(d)
      const c = getComputedStyle(d).color
      d.remove()
      return c
    }
    return {
      focused: sr.activeElement === bar,
      edge: Math.abs(barRect.left - trackRect.left) < 1.5,
      insideDesc: desc(inside),
      insideIsBar: inside === bar,
      outsideDesc: desc(outside),
      focusVisible: bar.matches(':focus-visible'),
      boxShadow: cs.boxShadow,
      outlineStyle: cs.outlineStyle,
      primary: tokenColor('var(--oas-color-primary)'),
      bg: tokenColor('var(--oas-color-bg)'),
    }
  })
  expect(res.focused, '条可聚焦').toBe(true)
  expect(res.edge, '最早条贴轨道左缘（left=0）').toBe(true)
  expect(res.insideIsBar, `焦点环带处（条内缘）命中 bar——环不被名列层叠遮盖（实得 ${res.insideDesc}）`).toBe(true)
  expect(res.outsideDesc, '条外 1px 即 sticky 名列（外描边形态的环带会被遮，纯 inset 环不受影响）').toContain('name')
  expect(res.focusVisible, '程序聚焦命中 :focus-visible（环规则生效前提）').toBe(true)
  // 反证 H1 旧实现（outline 2px + inset bg 2px）：二者占同一 0–2px 环带，而 outline 绘制层序压过
  // box-shadow → bg 内描边是死声明，双色环退化为单色 primary（light hover 下与条底仅 ≈2.81:1 < 3:1）。
  // 现实现环全部来自 inset box-shadow，层序即层带顺序（列表前者绘在上）
  const layers = shadowLayers(res.boxShadow)
  expect(layers.length, '两层环（不再有 outline 层）').toBe(2)
  expect(
    layers.map((l) => l.inset),
    '两层均为 inset：环全部落在条内',
  ).toEqual([true, true])
  expect(
    layers.map((l) => l.spread),
    '层序：primary 2px 贴条缘 → bg 3px 分隔带（3px 层被 2px 层盖住外圈，可见分隔带 = 2–3px）',
  ).toEqual([2, 3])
  expect(layers[0]!.color, '第一层（贴条缘）为 primary 环带色').toBe(res.primary)
  expect(layers[1]!.color, '第二层为 bg 分隔带色（隔开 primary 与条填充）').toBe(res.bg)
  expect(res.outlineStyle, '不再依赖 outline（UA 默认焦点描边已压制）').toBe('none')
  await page.evaluate(() => document.getElementById('res-focus-wrap')?.remove())
  expect(errors).toEqual([])
})

// ===== G3/G4 收尾回归（8px 窄条聚焦填充可见 / height class 通道） =====

test('resource G3 8px 窄条聚焦：环带每侧 3px → 仍留 ≥2px 填充可见 + 环带处命中 bar', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    // 固定顶层容器隔离页面遮挡（同 res-focus 用例模式）
    const wrap = document.createElement('div')
    wrap.id = 'res-g3-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff)'
    const el = document.createElement('oas-resource')
    el.id = 'res-g3'
    el.style.cssText = 'display:block;width:600px;margin:48px;position:relative'
    el.setAttribute('scale', 'month')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'n8', name: '窄', start: '2026-03-31', end: '2026-03-31', resources: ['r1'] }]),
    )
    wrap.appendChild(el)
    document.body.appendChild(wrap)
  })
  await page.waitForFunction(
    () => !!document.getElementById('res-g3')?.shadowRoot?.querySelector('.bar[data-task-id="n8"]'),
    undefined,
    { timeout: 15000 },
  )
  const res = await page.evaluate(() => {
    const sr = (document.getElementById('res-g3') as HTMLElement).shadowRoot!
    const bar = sr.querySelector('.bar[data-task-id="n8"]') as HTMLElement
    bar.focus()
    const b = bar.getBoundingClientRect()
    const cs = getComputedStyle(bar)
    const cy = b.top + b.height / 2
    const hit = (x: number): string => {
      const e = sr.elementFromPoint(x, cy)
      return e === bar ? 'bar' : e instanceof Element ? `${e.tagName}.${e.className}` : String(e)
    }
    return {
      focused: sr.activeElement === bar,
      focusVisible: bar.matches(':focus-visible'),
      w: b.width,
      // 条内取样点（相对条左缘）：3px = 环带内缘/分隔带；6px = 4–8px 区间中心
      hit3: hit(b.left + 3),
      hit6: hit(b.left + 6),
      centerHit: sr.elementFromPoint(b.left + b.width / 2, cy) === bar,
      boxShadow: cs.boxShadow,
      outlineStyle: cs.outlineStyle,
    }
  })
  expect(res.focused, '条可聚焦').toBe(true)
  expect(res.focusVisible, '程序聚焦命中 :focus-visible').toBe(true)
  expect(res.w, 'month 档单日任务条 = 最小宽 8').toBeCloseTo(8, 1)
  const layers = shadowLayers(res.boxShadow)
  expect(layers.length, '两层环').toBe(2)
  expect(
    layers.map((l) => l.inset),
    '两层均为 inset（环全在条内，8px 条不溢出）',
  ).toEqual([true, true])
  // 反证旧候选（2px + 4px 双层）：8px 条左右各 4px → 环带把条填充完全覆盖（填充可见 0px）
  expect(
    layers.map((l) => l.spread),
    'spread 2px（primary 环）→ 3px（bg 分隔带）',
  ).toEqual([2, 3])
  expect(res.outlineStyle, '不依赖 outline').toBe('none')
  // 填充可见宽度 = 条宽 − 2×最大 spread（环带自左右两侧各侵入 spread）：8 − 2×3 = 2px ≥ 2
  const maxSpread = Math.max(...layers.map((l) => l.spread))
  expect(res.w - 2 * maxSpread, '8px 条聚焦仍留 ≥2px 填充可见').toBeGreaterThanOrEqual(2)
  // elementFromPoint 是命中测试（不含绘制层信息），只证明该处未被名列/邻条遮住；
  // 「填充是否被环带盖住」由上面的层带算术证明（真机像素量测见交付报告）
  expect(res.hit3, '条内 3px（环带内缘/分隔带）仍属该条').toBe('bar')
  expect(res.hit6, '条内 6px（4–8px 区间）命中 bar').toBe('bar')
  expect(res.centerHit, '8px 条中心点命中 bar').toBe(true)
  await page.evaluate(() => document.getElementById('res-g3-wrap')?.remove())
  expect(errors).toEqual([])
})

test('resource G4 height class 通道：class 规则 500px → height 属性接管 480 → 移除回落 500', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  // 宿主元素级 class 规则设置 --oas-resource-height（无 height 属性 → 组件不写该变量）
  await page.addStyleTag({ content: '.res-h-cls { --oas-resource-height: 500px }' })
  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-h-class'
    el.classList.add('res-h-cls')
    el.style.cssText = 'display:block;width:600px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }]),
    )
    document.body.appendChild(el)
  })
  await waitShadowReady(page, 'res-h-class')
  const host = page.locator('#res-h-class')
  const req = (): Promise<void> =>
    host.evaluate((el) => (el as HTMLElement & { requestUpdate(): void }).requestUpdate()) as Promise<void>
  const h = (): Promise<number> => host.evaluate((el) => el.getBoundingClientRect().height) as Promise<number>
  // ① class 规则通道：无 height 属性 → 组件不写该变量，class 的 500 生效
  expect(await h(), 'class 规则 --oas-resource-height:500px → 高 500').toBeCloseTo(500, 0)
  // ② height 属性在场：组件写内联变量接管（480 胜过 class 规则 500）
  await host.evaluate((el) => el.setAttribute('height', '480'))
  await req()
  expect(await h(), 'height="480" 接管 → 高 480').toBeCloseTo(480, 0)
  // ③ 移除属性：组件自写变量归零清除 → class 规则 500 重新接管（宿主 class 原值恢复）
  await host.evaluate((el) => el.removeAttribute('height'))
  await req()
  expect(await h(), '移除属性后回落 class 规则 500').toBeCloseTo(500, 0)
  await page.evaluate(() => document.getElementById('res-h-class')?.remove())
  expect(errors).toEqual([])
})

// ===== 横向虚拟化（时间轴 period 列窗口）收口回归 =====

test('resource 横向虚拟化：长跨度 day 档刻度数有上界、滚到中部可视区仍有刻度、滚动长度不变', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-virt'
    el.style.cssText = 'display:block;width:520px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] }]),
    )
    document.body.appendChild(el)
  })
  await waitShadowReady(page, 'res-virt')

  const measure = (): Promise<{ tickCount: number; scrollWidth: number; trackW: number; tickAtCenter: boolean }> =>
    page.evaluate(() => {
      const sr = (document.getElementById('res-virt') as HTMLElement).shadowRoot!
      const sc = sr.querySelector('.scroller') as HTMLElement
      const scRect = sc.getBoundingClientRect()
      const centerX = scRect.left + scRect.width / 2
      let tickAtCenter = false
      for (const t of sr.querySelectorAll('.ticks .tick')) {
        const b = t.getBoundingClientRect()
        if (b.left <= centerX && b.right >= centerX) tickAtCenter = true
      }
      return {
        tickCount: sr.querySelectorAll('.ticks .tick').length,
        scrollWidth: sc.scrollWidth,
        trackW: (sr.querySelector('.lane .track') as HTMLElement).getBoundingClientRect().width,
        tickAtCenter,
      }
    })

  const before = await measure()
  // 视口 520 → 窗口 + overscan 的刻度约 15+8=23，远小于 1096 个 day period
  expect(before.tickCount, '初始窗口刻度数有上界（虚拟化生效）').toBeLessThan(200)
  expect(before.trackW, '轨道宽仍 = 全量画布宽（1096 × 36），滚动条长度不变').toBeCloseTo(1096 * 36, 0)

  // 滚到中部 → 窗口随滚动重渲染（首刻度左缘显著右移）
  await page.evaluate(() => {
    const sr = (document.getElementById('res-virt') as HTMLElement).shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    sc.scrollLeft = Math.floor((sc.scrollWidth - sc.clientWidth) / 2)
  })
  await page.waitForFunction(
    () => {
      const sr = (document.getElementById('res-virt') as HTMLElement).shadowRoot!
      const first = sr.querySelector('.ticks .tick') as HTMLElement | null
      return !!first && Number.parseFloat(first.style.left) > 1000
    },
    undefined,
    { timeout: 5000 },
  )
  const after = await measure()
  expect(after.tickCount, '滚动后窗口刻度数仍有上界').toBeLessThan(200)
  expect(after.tickAtCenter, '滚到中部可视区仍有刻度覆盖').toBe(true)
  expect(Math.abs(after.scrollWidth - before.scrollWidth), '滚动长度（画布宽）不变').toBeLessThanOrEqual(2)
  await page.evaluate(() => document.getElementById('res-virt')?.remove())
  expect(errors).toEqual([])
})

// ===== 横向虚拟化复审修复回归（F1 容器尺寸变化 / F2 滚动复用条节点不丢焦点） =====

/** 长跨度 day 档任务 JSON（1096 period，锚点 2026-01-01，colW=36） */
const LONG_TASKS_JSON = JSON.stringify([
  { id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
])

test('resource F1 容器尺寸变化：ResizeObserver 重算列窗口，变宽后刻度覆盖新右缘（无 scroll/无数据变更）', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate((tasks) => {
    const el = document.createElement('oas-resource')
    el.id = 'res-resize'
    el.style.cssText = 'display:block;width:480px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute('tasks', tasks)
    document.body.appendChild(el)
  }, LONG_TASKS_JSON)
  await waitShadowReady(page, 'res-resize')
  const measure = (): Promise<{ ticks: number; covered: boolean; maxTickRight: number; scRight: number }> =>
    page.evaluate(() => {
      const sr = (document.getElementById('res-resize') as HTMLElement).shadowRoot!
      const sc = sr.querySelector('.scroller') as HTMLElement
      const scr = sc.getBoundingClientRect()
      let maxTickRight = -Infinity
      const ticks = sr.querySelectorAll('.ticks .tick')
      for (const t of ticks) {
        const b = t.getBoundingClientRect()
        if (b.right > maxTickRight) maxTickRight = b.right
      }
      return { ticks: ticks.length, covered: maxTickRight >= scr.right - 2, maxTickRight, scRight: scr.right }
    })
  const before = await measure()
  expect(before.ticks, '480px 视口下已窗口化（远少于 1096）').toBeLessThan(300)
  expect(before.covered, '初始刻度覆盖视口右缘').toBe(true)
  // 变宽到 900（不派发 scroll、不改数据）——只有 ResizeObserver 会触发窗口重算
  await page.evaluate(() => {
    ;(document.getElementById('res-resize') as HTMLElement).style.width = '900px'
  })
  await page.waitForFunction(
    (n) => {
      const sr = (document.getElementById('res-resize') as HTMLElement).shadowRoot!
      return sr.querySelectorAll('.ticks .tick').length > n
    },
    before.ticks,
    { timeout: 5000 },
  )
  const after = await measure()
  expect(after.ticks, '刻度数随视口变宽增加').toBeGreaterThan(before.ticks)
  // 反证「无 ResizeObserver」实现：窗口停在 480 下铺满的列，变宽后右侧露白（covered=false）
  expect(after.covered, '变宽后刻度仍覆盖视口右缘（无露白）').toBe(true)
  await page.evaluate(() => document.getElementById('res-resize')?.remove())
  expect(errors).toEqual([])
})

test('resource F1 隐藏挂载 → 显示：ResizeObserver 修正，刻度不再永久全量', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate((tasks) => {
    const box = document.createElement('div')
    box.id = 'res-hidden-box'
    box.style.cssText = 'display:none'
    const el = document.createElement('oas-resource')
    el.id = 'res-hidden'
    el.style.cssText = 'display:block;width:520px'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute('tasks', tasks)
    box.appendChild(el)
    document.body.appendChild(box)
  }, LONG_TASKS_JSON)
  await page.waitForFunction(
    () => !!document.getElementById('res-hidden')?.shadowRoot?.querySelector('.ticks .tick'),
    undefined,
    { timeout: 15000 },
  )
  const tickCount = (): Promise<number> =>
    page.evaluate(
      () => (document.getElementById('res-hidden') as HTMLElement).shadowRoot!.querySelectorAll('.ticks .tick').length,
    )
  expect(await tickCount(), '隐藏/0 宽挂载回落全量（1096 条）').toBe(1096)
  // 显示容器 → ResizeObserver 触发 → 切回窗口渲染（反证「无 RO」实现：永久停留 1096 条）
  await page.evaluate(() => {
    ;(document.getElementById('res-hidden-box') as HTMLElement).style.display = 'block'
  })
  await page.waitForFunction(
    () =>
      (document.getElementById('res-hidden') as HTMLElement).shadowRoot!.querySelectorAll('.ticks .tick').length < 300,
    undefined,
    { timeout: 5000 },
  )
  expect(await tickCount(), '显示后切回窗口（不再全量）').toBeLessThan(300)
  await page.evaluate(() => document.getElementById('res-hidden-box')?.remove())
  expect(errors).toEqual([])
})

test('resource F2 横向滚动复用条节点：聚焦条滚动后仍在 DOM、焦点保持（不因整段重建丢焦点）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    (tasks) => {
      const el = document.createElement('oas-resource')
      el.id = 'res-keepfocus'
      el.style.cssText = 'display:block;width:520px;margin:12px;position:relative;z-index:1'
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
      // long 撑起时间轴，mid 落在初始窗口内可聚焦；横向滚动后 mid 仍在窗口内（应被复用）
      el.setAttribute('tasks', tasks)
      document.body.appendChild(el)
    },
    JSON.stringify([
      { id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
      { id: 'mid', name: '中', start: '2026-01-11', end: '2026-01-11', resources: ['r1'] },
    ]),
  )
  await page.waitForFunction(
    () => !!document.getElementById('res-keepfocus')?.shadowRoot?.querySelector('.bar[data-task-id="mid"]'),
    undefined,
    { timeout: 15000 },
  )
  const res = await page.evaluate(async () => {
    const el = document.getElementById('res-keepfocus') as HTMLElement
    const sr = el.shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    const bar = sr.querySelector('.bar[data-task-id="mid"]') as HTMLElement
    bar.focus()
    const focusedBefore = sr.activeElement === bar
    const firstLeft0 = Number.parseFloat((sr.querySelector('.ticks .tick') as HTMLElement).style.left)
    sc.scrollLeft = 360
    // 等 scroll 的 rAF 窗口重渲染（双帧稳妥）
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    const firstLeft1 = Number.parseFloat((sr.querySelector('.ticks .tick') as HTMLElement).style.left)
    return {
      focusedBefore,
      focusedAfter: sr.activeElement === bar,
      sameNode: sr.querySelector('.bar[data-task-id="mid"]') === bar,
      connected: bar.isConnected,
      windowMoved: firstLeft0 !== firstLeft1,
    }
  })
  expect(res.focusedBefore, '前置：条已聚焦').toBe(true)
  expect(res.windowMoved, '横向滚动确实平移了列窗口').toBe(true)
  // 反证「scroll 整段重建泳道」实现：bar 节点被替换、activeElement 掉回 body
  expect(res.sameNode, '条节点被复用（未重建）').toBe(true)
  expect(res.connected, '条仍在 DOM').toBe(true)
  expect(res.focusedAfter, '焦点保持（activeElement 仍为该条）').toBe(true)
  await page.evaluate(() => document.getElementById('res-keepfocus')?.remove())
  expect(errors).toEqual([])
})

// ===== 纵向（行）虚拟化收口回归（泳道/负载两区独立窗口，spacer 撑起滚动总高） =====

/** 行虚拟化默认 token 模型行高（row-height 36 / load-height 64 + 1px 行框线） */
const ROW_MODEL_H = 37
const LOAD_MODEL_H = 65

test('resource 行虚拟化：500 资源行数有上界、滚动总高不变、滚到中部覆盖可视区、窗口内条可点、console 零告警', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.evaluate(() => {
    const N = 500
    const resources = Array.from({ length: N }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const el = document.createElement('oas-resource')
    el.id = 'res-rowvirt'
    el.style.cssText = 'display:block;width:600px;height:360px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify(resources))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 't0', name: 'T', start: '2026-03-02', end: '2026-03-02', resources: resources.map((r) => r.id) },
      ]),
    )
    ;(window as unknown as { __rowvirtHits: string[] }).__rowvirtHits = []
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string; resourceId: string }>) => {
      ;(window as unknown as { __rowvirtHits: string[] }).__rowvirtHits.push(e.detail.resourceId)
    }) as EventListener)
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () => {
      const sr = document.getElementById('res-rowvirt')?.shadowRoot
      if (!sr) return false
      const n = sr.querySelectorAll('.lanes .row.lane').length
      // 等「行窗口已生效且稳定」：仅 <500 会在首帧全量回落后立刻满足、造成后续测量抖动
      return n > 0 && n < 60
    },
    undefined,
    { timeout: 15000 },
  )
  const N = 500
  const measure = (): Promise<{
    lanes: number
    loads: number
    laneSum: number
    loadSum: number
    scrollHeight: number
    topSpacerH: number
  }> =>
    page.evaluate(
      ({ rowH, loadH }) => {
        const sr = (document.getElementById('res-rowvirt') as HTMLElement).shadowRoot!
        const spacerH = (zoneSel: string) => {
          const sps = [...sr.querySelectorAll<HTMLElement>(`${zoneSel} > .row-spacer`)]
          return sps.length === 2 ? sps.map((s) => Number.parseFloat(s.style.height)) : null
        }
        const lanes = sr.querySelectorAll('.lanes .row.lane').length
        const loads = sr.querySelectorAll('.loads .row.load').length
        const laneSp = spacerH('.lanes')
        const loadSp = spacerH('.loads')
        const sc = sr.querySelector('.scroller') as HTMLElement
        return {
          lanes,
          loads,
          // spacer 上 + 窗内行 × 行模型高 + spacer 下 === 全量 n 行模型高（滚动总高不变量）
          laneSum: laneSp ? Math.round((laneSp[0] ?? 0) + lanes * rowH + (laneSp[1] ?? 0)) : -1,
          loadSum: loadSp ? Math.round((loadSp[0] ?? 0) + loads * loadH + (loadSp[1] ?? 0)) : -1,
          scrollHeight: sc.scrollHeight,
          topSpacerH: laneSp ? (laneSp[0] ?? -1) : -1,
        }
      },
      { rowH: ROW_MODEL_H, loadH: LOAD_MODEL_H },
    )
  const before = await measure()
  expect(before.lanes, '泳道行数有上界（窗口 + 缓冲，远少于 500）').toBeLessThan(60)
  expect(before.lanes, '窗口内有行').toBeGreaterThan(0)
  expect(before.loads, '负载行同步窗口化').toBeLessThan(60)
  expect(before.laneSum, '泳道区总高 = 500 × 37（spacer + 窗内行盒守恒）').toBe(N * ROW_MODEL_H)
  expect(before.loadSum, '负载区总高 = 500 × 65').toBe(N * LOAD_MODEL_H)

  // 滚到中部：r250 行进入窗口且可视、spacer 顶占位 > 0、滚动总高不变（scrollHeight 稳定）
  await page.evaluate((rowH) => {
    const sr = (document.getElementById('res-rowvirt') as HTMLElement).shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    sc.scrollTop = 250 * rowH
  }, ROW_MODEL_H)
  await page.waitForFunction(
    () => {
      const sr = document.getElementById('res-rowvirt')!.shadowRoot!
      return !!sr.querySelector('.lane[data-resource-id="r250"]')
    },
    undefined,
    { timeout: 5000 },
  )
  const after = await measure()
  expect(after.topSpacerH, '滚到中部后顶部 spacer 占位 > 0').toBeGreaterThan(0)
  expect(after.lanes, '滚动后行数仍有上界').toBeLessThan(60)
  expect(after.laneSum, '滚动后泳道区总高仍守恒').toBe(N * ROW_MODEL_H)
  expect(Math.abs(after.scrollHeight - before.scrollHeight), '滚动总高（scroller scrollHeight）不变').toBeLessThan(2)
  // 可视区覆盖：r250 行盒与 scroller 可视区相交
  const visible = await page.evaluate(() => {
    const sr = (document.getElementById('res-rowvirt') as HTMLElement).shadowRoot!
    const scRect = (sr.querySelector('.scroller') as HTMLElement).getBoundingClientRect()
    const row = sr.querySelector('.lane[data-resource-id="r250"]')!.getBoundingClientRect()
    return row.top < scRect.bottom - 1 && row.bottom > scRect.top + 1
  })
  expect(visible, 'r250 行滚入可视区（窗口覆盖可视区）').toBe(true)

  // 窗口内条仍可点：真实点击 r250 行的条 → oas-task-click 派发
  // 注意：虚拟化下行窗口随滚动重算，Playwright 的「自动滚动进视口 + 可操作性重试」会与窗口重建互相拉扯
  //（元素每次尝试都被替换）→ 故在页面内直接对已解析节点派发 click（组件为事件委托，合成 click 同样冒泡命中）
  const clicked = await page.evaluate(() => {
    const sr = (document.getElementById('res-rowvirt') as HTMLElement).shadowRoot!
    const bar = sr.querySelector<HTMLElement>('.lane[data-resource-id="r250"] .bar')
    if (!bar) return false
    bar.click()
    return true
  })
  expect(clicked, 'r250 行窗口内存在可点条').toBe(true)
  const hits = await page.evaluate(() => (window as unknown as { __rowvirtHits: string[] }).__rowvirtHits)
  expect(hits, '窗口内条点击派发 oas-task-click（resourceId 定位正确）').toEqual(['r250'])
  await page.evaluate(() => document.getElementById('res-rowvirt')?.remove())
  expect(errors).toEqual([])
})

test('resource 行虚拟化资源 0 个零异常 + 行/列窗口正交（纵向滚动不变列窗口）+ console 零告警', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.evaluate(() => {
    // ① 资源 0 个：挂载 + requestUpdate 不抛、无行无 spacer
    const empty = document.createElement('oas-resource')
    empty.id = 'res-rowvirt-empty'
    empty.style.cssText = 'display:block;width:600px;height:360px;margin:12px;position:relative;z-index:1'
    empty.setAttribute('resources', '[]')
    empty.setAttribute('tasks', '[]')
    document.body.appendChild(empty)
    // ② 行/列正交：三年 day 档（1096 列）× 300 资源
    const M = 300
    const resources = Array.from({ length: M }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const el = document.createElement('oas-resource')
    el.id = 'res-rowvirt-ortho'
    el.style.cssText = 'display:block;width:520px;height:320px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify(resources))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        {
          id: 'long',
          name: '三年',
          start: '2026-01-01',
          end: '2028-12-31',
          resources: resources.map((r) => r.id),
        },
      ]),
    )
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () => {
      const sr = document.getElementById('res-rowvirt-ortho')?.shadowRoot
      if (!sr) return false
      const n = sr.querySelectorAll('.lanes .row.lane').length
      return n > 0 && n < 300
    },
    undefined,
    { timeout: 15000 },
  )
  const res = await page.evaluate(async () => {
    const emptySr = document.getElementById('res-rowvirt-empty')!.shadowRoot!
    const ortho = document.getElementById('res-rowvirt-ortho') as HTMLElement
    const sr = ortho.shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    const tickLefts = (): number[] =>
      [...sr.querySelectorAll<HTMLElement>('.ticks .tick')].map((t) => Number.parseFloat(t.style.left))
    const firstLeftBefore = tickLefts()[0] ?? 0
    sc.scrollTop = 150 * 37 // 纵向滚动（行高模型 37）
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    const firstLeftAfterV = tickLefts()[0] ?? 0
    const laneRowsAfterV = sr.querySelectorAll('.lanes .row.lane').length
    sc.scrollLeft = 3600 // 横向滚动
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    const firstLeftAfterH = tickLefts()[0] ?? 0
    return {
      emptyLanes: emptySr.querySelectorAll('.lanes .row.lane').length,
      emptySpacers: emptySr.querySelectorAll('.lanes > .row-spacer').length,
      firstLeftBefore,
      firstLeftAfterV,
      firstLeftAfterH,
      laneRowsAfterV,
    }
  })
  expect(res.emptyLanes, '资源 0 个：无泳道行').toBe(0)
  expect(res.emptySpacers, '资源 0 个：无 spacer').toBe(0)
  expect(res.firstLeftAfterV, '纵向滚动不改列窗口（首刻度不动 → 行/列正交）').toBeCloseTo(res.firstLeftBefore, 6)
  expect(res.firstLeftAfterH, '横向滚动平移列窗口').toBeGreaterThan(res.firstLeftAfterV)
  expect(res.laneRowsAfterV, '纵向滚动后行数仍有上界').toBeLessThan(60)
  await page.evaluate(() => {
    document.getElementById('res-rowvirt-empty')?.remove()
    document.getElementById('res-rowvirt-ortho')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource 行虚拟化焦点保持：纵向滚动窗口平移，窗口内存活行的聚焦条不丢焦点、节点不重建', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-resource'), undefined, { timeout: 15000 })
  await page.evaluate(() => {
    const M = 200
    const resources = Array.from({ length: M }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const el = document.createElement('oas-resource')
    el.id = 'res-rowfocus'
    el.style.cssText = 'display:block;width:600px;height:280px;margin:12px;position:relative;z-index:1'
    el.setAttribute('scale', 'day')
    el.setAttribute('resources', JSON.stringify(resources))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 't0', name: 'T', start: '2026-03-02', end: '2026-03-02', resources: resources.map((r) => r.id) },
      ]),
    )
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () => {
      const sr = document.getElementById('res-rowfocus')?.shadowRoot
      if (!sr) return false
      const n = sr.querySelectorAll('.lanes .row.lane').length
      return n > 0 && n < 200
    },
    undefined,
    { timeout: 15000 },
  )
  const res = await page.evaluate(async () => {
    const sr = (document.getElementById('res-rowfocus') as HTMLElement).shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    const bar = sr.querySelector('.lane[data-resource-id="r2"] .bar') as HTMLElement
    bar.focus()
    const focusedBefore = sr.activeElement === bar
    sc.scrollTop = 37 * 2 // 平移 2 行，r2 仍在窗口内（buffer 4 吸收）
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    const barAfter = sr.querySelector('.lane[data-resource-id="r2"] .bar')
    return {
      focusedBefore,
      connected: bar.isConnected,
      sameNode: barAfter === bar,
      focusedAfter: sr.activeElement === bar,
    }
  })
  expect(res.focusedBefore, '前置：条已聚焦').toBe(true)
  // 反证「行窗口平移整段重建行」实现：r2 行被重建 → bar 节点替换、焦点丢失
  expect(res.sameNode, '存活行的条节点被复用（未重建）').toBe(true)
  expect(res.connected, '条仍在 DOM').toBe(true)
  expect(res.focusedAfter, '焦点保持（activeElement 仍为该条）').toBe(true)
  await page.evaluate(() => document.getElementById('res-rowfocus')?.remove())
  expect(errors).toEqual([])
})

// ===== 服务端窗口（windowed 行窗口 + 宿主托管时间轴范围；契约见 src/shared/window-data.ts） =====

interface WinFixture {
  id: string
  total: number
  start: number
  loaded: number
  withTasks: boolean
  /** 宿主 dir="rtl"（RTL × windowed 无回归用） */
  rtl?: boolean
}

/**
 * 注入「windowed + 轴托管」fixture（组件由站点 bundle 全局注册）。
 * 固定 height=200 / width=600，并把行高/条高落成 40px/24px → 单段行模型高 = 24 + 2×8 + 1 = 41px
 * （gap = (row-height − bar-height)/2 = 8），使 spacer 高度与总高守恒可精确断言（不依赖主题 token）。
 * 时间轴由 range-start/range-end 托管：2 年 day 档（range-end 含当日）→ 730 列 × 36px = 26280px。
 * 全部属性在 appendChild 之前设置 → 首帧 update() 即拿到完整行窗口（windowed/window-start/total）与
 * 托管轴范围（range-start/range-end），避免「首帧轴由已装载任务 min/max 推导」的时序假象。
 */
async function injectWindowedFixture(page: Page, o: WinFixture): Promise<void> {
  await page.evaluate((opt) => {
    const el = document.createElement('oas-resource')
    el.id = opt.id
    el.style.cssText = 'display:block;width:600px;height:200px;margin:12px'
    el.style.setProperty('--oas-resource-row-height', '40px')
    el.style.setProperty('--oas-resource-bar-height', '24px')
    if (opt.rtl) el.setAttribute('dir', 'rtl')
    el.setAttribute('windowed', '')
    el.setAttribute('scale', 'day')
    el.setAttribute('total', String(opt.total))
    el.setAttribute('window-start', String(opt.start))
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2027-12-31')
    el.setAttribute(
      'resources',
      JSON.stringify(
        Array.from({ length: opt.loaded }, (_, i) => ({ id: `r${opt.start + i}`, name: `R${opt.start + i}` })),
      ),
    )
    el.setAttribute(
      'tasks',
      JSON.stringify(
        opt.withTasks
          ? Array.from({ length: opt.loaded }, (_, i) => ({
              id: `t${opt.start + i}`,
              name: `T${opt.start + i}`,
              start: '2026-03-02',
              end: '2026-03-04',
              resources: [`r${opt.start + i}`],
            }))
          : [],
      ),
    )
    const w = window as unknown as { __resRows: unknown[]; __resRanges: unknown[] }
    w.__resRows = []
    w.__resRanges = []
    el.addEventListener('oas-window-request', (e) => {
      w.__resRows.push((e as CustomEvent).detail)
    })
    el.addEventListener('oas-range-request', (e) => {
      w.__resRanges.push((e as CustomEvent).detail)
    })
    document.body.appendChild(el)
  }, o)
  // 等首帧泳道行渲染（同时意味 update()/行窗口已跑过）
  await page.waitForFunction(
    (id) => !!document.getElementById(id)?.shadowRoot?.querySelector('.lanes .row.lane'),
    o.id,
    { timeout: 15000 },
  )
}

test('resource windowed 行窗口：滚动派发 oas-window-request、宿主回填渲染绝对行、横向滚动范围与总高守恒', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await injectWindowedFixture(page, { id: 'res-win-abs', total: 500, start: 0, loaded: 5, withTasks: false })

  // 1) 首帧 init：已装载切片 [0,5) 不覆盖期望区间（可视行窗 ± margin 8）
  await page.waitForFunction(() => (window as unknown as { __resRows: unknown[] }).__resRows.length > 0)
  const init = await page.evaluate(
    () => (window as unknown as { __resRows: Array<Record<string, number | string>> }).__resRows[0]!,
  )
  expect(init['reason'], 'reason=init').toBe('init')
  expect(init['start'], '期望区间自绝对行 0 起').toBe(0)
  expect(init['end'], '期望区间超出已装载切片（未覆盖才派）').toBeGreaterThan(5)
  expect(init['end'], '期望区间夹在 total 内').toBeLessThanOrEqual(500)

  // 2) 宿主回填绝对行 [200,240) 并滚到该区（视口顶落在绝对行 200 附近）
  await page.evaluate(() => {
    const el = document.getElementById('res-win-abs')!
    const w = window as unknown as { __resRows: unknown[] }
    w.__resRows.length = 0
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: `r${200 + i}`, name: `R${200 + i}` }))),
    )
    el.setAttribute('window-start', '200')
    const sc = el.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc.scrollTop = 200 * 41 + 60
    sc.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(() =>
    (window as unknown as { __resRows: Array<{ reason: string }> }).__resRows.some((r) => r.reason === 'scroll'),
  )

  // 等稳定态再量几何：宿主切片换页（resources/window-start 变）会重跑 update() 重算轴与窗口，
  // 过渡帧里刻度/泳道轨宽度可能是旧值 → 直接量会时序假失败。此处等到「行窗口已渲染 + 轴已撑出
  // 横向滚动范围（刻度容器宽 > 视口宽，即列虚拟化生效的帧）」为止；具体轴宽由下方精确断言把关。
  await page.waitForFunction(
    (id) => {
      const sr = document.getElementById(id)?.shadowRoot
      const sc = sr?.querySelector('.scroller') as HTMLElement | null
      if (!sr || !sc) return false
      const rows = sr.querySelectorAll('.lanes .row.lane').length
      const ticksW = Number.parseFloat((sr.querySelector('.ticks') as HTMLElement | null)?.style.width ?? '')
      return rows > 0 && Number.isFinite(ticksW) && ticksW > sc.clientWidth && sc.scrollWidth > sc.clientWidth
    },
    'res-win-abs',
    { timeout: 15000 },
  )

  const geom = await page.evaluate(() => {
    const sr = document.getElementById('res-win-abs')!.shadowRoot!
    const spacers = [...sr.querySelectorAll('.lanes > .row-spacer')] as HTMLElement[]
    const rows = [...sr.querySelectorAll('.lanes .row.lane')] as HTMLElement[]
    const reqs = (window as unknown as { __resRows: Array<Record<string, number | string>> }).__resRows
    return {
      spacerCount: spacers.length,
      topH: Number.parseFloat(spacers[0]?.style.height ?? '0'),
      botH: Number.parseFloat(spacers[1]?.style.height ?? '0'),
      rowsH: rows.reduce((a, r) => a + r.getBoundingClientRect().height, 0),
      rowCount: rows.length,
      ids: rows.map((r) => r.dataset['resourceId'] ?? ''),
      ticksW: (sr.querySelector('.ticks') as HTMLElement).style.width,
      trackW: (sr.querySelector('.lane .track') as HTMLElement).style.width,
      // 横向滚动范围（内容溢出宽）。注意不可用 .canvas 的 getBoundingClientRect().width：
      // .canvas 是块级盒（父 .wrap 有 1px 边框 + overflow:hidden）→ border box 恒 = 视口宽（598px），
      // 不反映轴宽；「滚动范围覆盖全轴」须由内容溢出宽（scroller.scrollWidth）= 轴宽 + 名称列宽 证明。
      scrollW: (sr.querySelector('.scroller') as HTMLElement).scrollWidth,
      scrollStarts: reqs.filter((r) => r['reason'] === 'scroll').map((r) => Number(r['start'])),
    }
  })
  expect(geom.spacerCount, '泳道区上下各一 spacer（窗口化占位）').toBe(2)
  expect(geom.topH, '行 0..199 未装载 → 顶部占位 = 200 × 41').toBe(200 * 41)
  expect(geom.ids[0], '按绝对行号渲染：首行 = r200').toBe('r200')
  expect(geom.rowCount, '窗口内有行（非空）').toBeGreaterThan(0)
  expect(geom.rowCount, '窗口外行不进 DOM（远少于装载的 40 行）').toBeLessThan(40)
  expect(geom.scrollStarts.length, '确有 scroll 行请求').toBeGreaterThan(0)
  expect(
    geom.scrollStarts.every((s) => s > 100),
    'scroll 请求锚定可视行窗（离屏负载区不并入，否则起点会被拉回 0）',
  ).toBe(true)
  expect(
    geom.scrollW,
    '横向滚动范围 ≥ 轴宽（滚动范围覆盖全轴，不随窗口缩水；轴宽口径见下两条精确断言）',
  ).toBeGreaterThanOrEqual(730 * 36)
  expect(geom.ticksW, '轴宽守恒：刻度容器 = 730 × 36（宿主托管 2 年 day 档，range-end 含当日）').toBe(`${730 * 36}px`)
  expect(geom.trackW, '轴宽守恒：泳道轨 = 730 × 36').toBe(`${730 * 36}px`)
  expect(
    Math.abs(geom.topH + geom.rowsH + geom.botH - 500 * 41),
    '滚动总高守恒：spacer 上 + 窗内行 + spacer 下 = 500 × 41（±2px）',
  ).toBeLessThan(2)

  await page.evaluate(() => document.getElementById('res-win-abs')?.remove())
  expect(errors).toEqual([])
})

test('resource 轴托管 range-start/range-end：period 按轴生成、轴头/轴尾按需派发 oas-range-request、轴中部不派', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await injectWindowedFixture(page, { id: 'res-win-range', total: 500, start: 0, loaded: 30, withTasks: true })

  // 1) 轴托管：时间轴按 range-* 生成（2 年 day 档 = 730 列），而非按已装载任务推断
  const ticksW = await page.evaluate(
    () => (document.getElementById('res-win-range')!.shadowRoot!.querySelector('.ticks') as HTMLElement).style.width,
  )
  expect(ticksW, 'period 覆盖宿主给定轴（730 列）').toBe(`${730 * 36}px`)

  // 首帧 init 范围请求：need 前扩越出轴头（可视列窗 ±1 个视口宽）
  await page.waitForFunction(() => (window as unknown as { __resRanges: unknown[] }).__resRanges.length > 0)
  const init = await page.evaluate(
    () => (window as unknown as { __resRanges: Array<Record<string, number | string>> }).__resRanges[0]!,
  )
  const axis = await page.evaluate(() => ({
    start: new Date(2026, 0, 1).getTime(),
    end: new Date(2028, 0, 1).getTime(),
  }))
  expect(init['reason'], 'reason=init').toBe('init')
  expect(Number(init['startMs']), '轴头 need 起点越出轴起点').toBeLessThan(axis.start)
  expect(Number(init['endMs']), 'need 终点晚于轴起点（区间有意义）').toBeGreaterThan(axis.start)

  // 2) 滚到轴中部：need ⊆ 轴 → 不派新范围请求（反证：无条件派发的实现会在此多派）
  const mid = await page.evaluate(async () => {
    const w = window as unknown as { __resRanges: unknown[] }
    const before = w.__resRanges.length
    const sc = document.getElementById('res-win-range')!.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc.scrollLeft = 12000 // 总宽 730 × 36 = 26280 → 中部
    sc.dispatchEvent(new Event('scroll'))
    await new Promise((r) => {
      requestAnimationFrame(() => requestAnimationFrame(() => r(null)))
    })
    return { before, after: w.__resRanges.length }
  })
  expect(mid.after, '轴中部 need ⊆ 轴 → 无新请求').toBe(mid.before)

  // 3) 滚到轴尾：need 后扩越出轴尾 → 再派（宿主据此扩展 range-end）
  await page.evaluate(() => {
    const sc = document.getElementById('res-win-range')!.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc.scrollLeft = 999999 // 浏览器夹取到最大滚动位置（轴尾）
    sc.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    () => {
      const rs = (window as unknown as { __resRanges: Array<{ endMs: number }> }).__resRanges
      return rs.length > 1 && rs[rs.length - 1]!.endMs > new Date(2028, 0, 1).getTime()
    },
    undefined,
    { timeout: 15000 },
  )
  const last = await page.evaluate(
    () => (window as unknown as { __resRanges: Array<{ reason: string; endMs: number }> }).__resRanges.at(-1)!,
  )
  expect(last.reason, '轴尾请求 reason=scroll').toBe('scroll')
  expect(last.endMs, '轴尾 need 越过轴末（2028-01-01）').toBeGreaterThan(axis.end)

  await page.evaluate(() => document.getElementById('res-win-range')?.remove())
  expect(errors).toEqual([])
})

// ===== 复审收口回归：windowed 行网格 a11y（aria-rowcount / aria-rowindex）× RTL 无回归 =====

test('resource windowed × RTL：行网格角色/aria-rowcount=total/aria-rowindex 绝对行号 + 条镜像几何 + 负值滚动范围请求', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await injectWindowedFixture(page, { id: 'res-win-mir-ltr', total: 500, start: 0, loaded: 40, withTasks: true })
  await injectWindowedFixture(page, {
    id: 'res-win-mir-rtl',
    total: 500,
    start: 0,
    loaded: 40,
    withTasks: true,
    rtl: true,
  })

  // 横向滚到任务条所在列窗（fixture 任务在 2026-03-02，首帧列窗在轴头看不到它）。
  // LTR 正 scrollLeft / RTL 负 scrollLeft：同一「自初始端滚出距离」= 2100（|scrollLeft| 口径）
  await page.evaluate(() => {
    for (const id of ['res-win-mir-ltr', 'res-win-mir-rtl']) {
      const el = document.getElementById(id)!
      const sc = el.shadowRoot!.querySelector('.scroller') as HTMLElement
      sc.scrollLeft = el.getAttribute('dir') === 'rtl' ? -2100 : 2100
      sc.dispatchEvent(new Event('scroll'))
    }
  })
  await page.waitForFunction(
    () => {
      const l = document.getElementById('res-win-mir-ltr')?.shadowRoot?.querySelector('.lanes .row.lane .bar')
      const r = document.getElementById('res-win-mir-rtl')?.shadowRoot?.querySelector('.lanes .row.lane .bar')
      return !!l && !!r
    },
    undefined,
    { timeout: 15000 },
  )

  const geo = await page.evaluate(() => {
    const measure = (id: string) => {
      const el = document.getElementById(id) as HTMLElement
      const sr = el.shadowRoot!
      const track = sr.querySelector('.lane .track') as HTMLElement
      const bar = sr.querySelector('.lanes .row.lane .bar') as HTMLElement
      const row = sr.querySelector('.lanes .row.lane') as HTMLElement
      const lanes = sr.querySelector('.lanes') as HTMLElement
      const tr = track.getBoundingClientRect()
      const br = bar.getBoundingClientRect()
      return {
        rtl: el.hasAttribute('data-rtl'),
        left: br.left - tr.left,
        w: br.width,
        trackW: tr.width,
        lanesRole: lanes.getAttribute('role'),
        rowcount: lanes.getAttribute('aria-rowcount'),
        rowRole: row.getAttribute('role'),
        firstIdx: row.getAttribute('aria-rowindex'),
        firstId: row.dataset['resourceId'],
        nameRole: (row.querySelector('.name') as HTMLElement).getAttribute('role'),
        cellRole: (row.querySelector('.track') as HTMLElement).getAttribute('role'),
      }
    }
    return { ltr: measure('res-win-mir-ltr'), rtl: measure('res-win-mir-rtl') }
  })
  expect(geo.ltr.rtl).toBe(false)
  expect(geo.rtl.rtl, 'dir=rtl 生效（data-rtl）').toBe(true)
  // a11y 行网格：role 层级是 aria-rowcount/rowindex 的合法宿主（裸 div 挂属性会被 axe 判违规）
  for (const g of [geo.ltr, geo.rtl]) {
    expect(g.lanesRole, '泳道区 role=grid').toBe('grid')
    expect(g.rowcount, 'aria-rowcount = total（全量行空间）').toBe('500')
    expect(g.rowRole, '行 role=row').toBe('row')
    expect(g.nameRole, '资源名 role=rowheader').toBe('rowheader')
    expect(g.cellRole, '时间轴轨道 role=gridcell').toBe('gridcell')
    expect(g.firstIdx, '首行绝对行号 1 基（window-start=0）').toBe('1')
    expect(g.firstId, '按绝对行号渲染').toBe('r0')
  }
  // 横向镜像不变量：left_LTR = xStart、left_RTL = canvasW − xStart − w，故两者之和 + w = canvasW（track 宽）
  expect(geo.ltr.left, 'LTR 条 left = xStart（2026-03-02 距轴首 60 天 × 36）').toBeCloseTo(60 * 36, 1)
  expect(geo.ltr.w, '条宽 = 3 天 × 36').toBeCloseTo(3 * 36, 1)
  expect(geo.rtl.w, 'RTL 条宽与 LTR 同').toBeCloseTo(geo.ltr.w, 1)
  expect(
    geo.ltr.left + geo.rtl.left + geo.ltr.w,
    '镜像不变量 left_LTR + left_RTL + w = canvasW（RTL 不整体偏移）',
  ).toBeCloseTo(geo.ltr.trackW, 1)

  // 负值 scrollLeft（RTL 规范模型）下范围请求机制同 LTR：轴中 need ⊆ 轴不派、轴尾越界再派
  const ranges = await page.evaluate(async () => {
    const w = window as unknown as { __resRanges: Array<{ reason: string; startMs: number; endMs: number }> }
    const el = document.getElementById('res-win-mir-rtl')!
    const sc = el.shadowRoot!.querySelector('.scroller') as HTMLElement
    const before = w.__resRanges.length
    sc.scrollLeft = -12000 // 轴中部（2 年轴上 day ≈ 370）
    sc.dispatchEvent(new Event('scroll'))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
    const afterMid = w.__resRanges.length
    sc.scrollLeft = -999999 // 夹到最负 = 轴尾
    sc.dispatchEvent(new Event('scroll'))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
    return { before, afterMid, after: w.__resRanges.length, last: w.__resRanges.at(-1) ?? null }
  })
  expect(ranges.afterMid, '轴中部 need ⊆ 轴 → 不派范围请求').toBe(ranges.before)
  expect(ranges.after, '轴尾 need 越界 → 再派（去重复位）').toBeGreaterThan(ranges.afterMid)
  expect(ranges.last!.reason, '轴尾请求 reason=scroll').toBe('scroll')
  const axisEnd = await page.evaluate(() => new Date(2028, 0, 1).getTime())
  expect(ranges.last!.endMs, 'RTL 轴尾 need 越过轴末（2028-01-01）').toBeGreaterThan(axisEnd)

  await page.evaluate(() => {
    document.getElementById('res-win-mir-ltr')?.remove()
    document.getElementById('res-win-mir-rtl')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource windowed × RTL 绝对行号：window-start=100 回填后首行 aria-rowindex=101、spacer 总高守恒', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await injectWindowedFixture(page, {
    id: 'res-win-rtl-abs',
    total: 500,
    start: 0,
    loaded: 5,
    withTasks: false,
    rtl: true,
  })

  // 宿主回填绝对行 [100,140) 并滚到该区（与 LTR 窗口用例同机制）
  await page.evaluate(() => {
    const el = document.getElementById('res-win-rtl-abs')!
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: `r${100 + i}`, name: `R${100 + i}` }))),
    )
    el.setAttribute('window-start', '100')
    const sc = el.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc.scrollTop = 100 * 41 + 60
    sc.dispatchEvent(new Event('scroll'))
  })
  await page.waitForFunction(
    (id) => !!document.getElementById(id)?.shadowRoot?.querySelector('.lanes .row.lane[data-resource-id="r100"]'),
    'res-win-rtl-abs',
    { timeout: 15000 },
  )

  const info = await page.evaluate(() => {
    const el = document.getElementById('res-win-rtl-abs')!
    const sr = el.shadowRoot!
    const rows = [...sr.querySelectorAll<HTMLElement>('.lanes .row.lane')]
    const spacers = [...sr.querySelectorAll('.lanes > .row-spacer')] as HTMLElement[]
    const reqs = (window as unknown as { __resRows: Array<{ reason: string; start: number }> }).__resRows
    return {
      rtl: el.hasAttribute('data-rtl'),
      role: (sr.querySelector('.lanes') as HTMLElement).getAttribute('role'),
      rowcount: (sr.querySelector('.lanes') as HTMLElement).getAttribute('aria-rowcount'),
      firstId: rows[0]?.dataset['resourceId'] ?? '',
      firstIdx: rows[0]?.getAttribute('aria-rowindex') ?? '',
      lastIdx: rows.at(-1)?.getAttribute('aria-rowindex') ?? '',
      rowRoles: rows.every((r) => r.getAttribute('role') === 'row'),
      rowCount: rows.length,
      topH: Number.parseFloat(spacers[0]?.style.height ?? '0'),
      scrollStarts: reqs.filter((r) => r.reason === 'scroll').map((r) => r.start),
    }
  })
  expect(info.rtl, 'dir=rtl 生效').toBe(true)
  expect(info.role, '泳道区 role=grid').toBe('grid')
  expect(info.rowcount, 'aria-rowcount = total（非已装载 40）').toBe('500')
  expect(info.firstId, 'RTL 同按绝对行号渲染（首行 = r100）').toBe('r100')
  expect(info.firstIdx, '首行绝对行号经 window-start 换算 = 101').toBe('101')
  expect(info.rowRoles, '每行 role=row').toBe(true)
  expect(Number(info.lastIdx), '末行行号 = 首行 + 行数 − 1（连续绝对行号）').toBe(
    Number(info.firstIdx) + info.rowCount - 1,
  )
  expect(info.topH, '行 0..99 未装载 → 顶部占位 = 100 × 41（RTL 不影响纵向）').toBe(100 * 41)
  // 请求区间锚定可视行窗（行 ~96 ± buffer/margin → start ≈ 88）：若离屏负载区（视口上方的行 0..8）
  // 被并入，need 起点会被拉回 0——故断言落在可视行窗附近而非 0
  const lastScrollStart = info.scrollStarts.at(-1) ?? -1
  expect(info.scrollStarts.length, '确有 scroll 行请求').toBeGreaterThan(0)
  expect(lastScrollStart, 'scroll 请求锚定可视行窗（≈88），未被离屏负载区拉回 0').toBeGreaterThan(80)
  expect(lastScrollStart).toBeLessThanOrEqual(100)

  await page.evaluate(() => document.getElementById('res-win-rtl-abs')?.remove())
  expect(errors).toEqual([])
})

// ===== 可读性能力回归（opt-in：show-load-values / show-overload-badge / bar-label + 日刻度抽稀） =====

test('resource 可读性三开关：开启后渲染负载值数字/超载徽标/条内标签，默认关闭零新增节点，console 零告警', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    // r1 必超载（03-02 load 2 > cap 1）；r2 恒正常
    const resources = JSON.stringify([
      { id: 'r1', name: '资源甲', capacity: 1 },
      { id: 'r2', name: '资源乙', capacity: 5 },
    ])
    const tasks = JSON.stringify([
      { id: 'a', name: '任务A', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      { id: 'b', name: '任务B', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] },
      { id: 'c', name: '任务C', start: '2026-03-02', end: '2026-03-02', resources: ['r2'] },
    ])
    const wrap = document.createElement('div')
    wrap.id = 'res-readable-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff);padding:24px'
    const mk = (id: string, attrs: string): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'display:block;width:720px;margin:12px auto;position:relative;z-index:1'
      el.setAttribute('scale', 'day')
      el.setAttribute('resources', resources)
      el.setAttribute('tasks', tasks)
      if (attrs) el.setAttribute(attrs, '')
      wrap.appendChild(el)
    }
    mk('res-readable-off', '') // 默认全关（对照）
    mk('res-readable-on1', 'show-load-values')
    mk('res-readable-on2', 'show-overload-badge')
    mk('res-readable-on3', 'bar-label')
    document.body.appendChild(wrap)
  })
  await page.waitForFunction(
    () => !!document.getElementById('res-readable-on3')?.shadowRoot?.querySelector('.row.lane .bar'),
    undefined,
    { timeout: 15000 },
  )

  const res = await page.evaluate(() => {
    const count = (id: string, sel: string): number =>
      document.getElementById(id)!.shadowRoot!.querySelectorAll(sel).length
    const nameHtml = (id: string, rid: string): string =>
      (document.getElementById(id)!.shadowRoot!.querySelector(`.lane[data-resource-id="${rid}"] .name`) as HTMLElement)
        .innerHTML
    return {
      off: {
        values: count('res-readable-off', '.load-value'),
        badges: count('res-readable-off', '.over-badge'),
        labels: count('res-readable-off', '.bar-label'),
      },
      on: {
        values: count('res-readable-on1', '.load-value'),
        badges: count('res-readable-on2', '.over-badge'),
        labels: count('res-readable-on3', '.bar-label'),
        badgeText: document.getElementById('res-readable-on2')!.shadowRoot!.querySelector('.over-badge')?.textContent,
        labelText: document.getElementById('res-readable-on3')!.shadowRoot!.querySelector('.bar-label')?.textContent,
        valueHidden: [
          ...document.getElementById('res-readable-on1')!.shadowRoot!.querySelectorAll<HTMLElement>('.load-value'),
        ].every((v) => v.getAttribute('aria-hidden') === 'true'),
        overValueHasClass: !!document.getElementById('res-readable-on1')!.shadowRoot!.querySelector('.load-value.over'),
        r1NameHtml: nameHtml('res-readable-on2', 'r1'),
        r2NameText: (
          document
            .getElementById('res-readable-on2')!
            .shadowRoot!.querySelector('.lane[data-resource-id="r2"] .name') as HTMLElement
        ).textContent,
      },
    }
  })
  // 默认全关：零新增节点（反证：开关判断被去掉即红）
  expect(res.off.values, '默认无负载值数字').toBe(0)
  expect(res.off.badges, '默认无超载徽标').toBe(0)
  expect(res.off.labels, '默认无条内标签').toBe(0)
  // 开启后渲染（4 个 load>0 柱 / 1 个超载徽标 / 3 条任务条）
  expect(res.on.values, '开启后每个 load>0 柱都有数字').toBe(4)
  expect(res.on.badges, '仅超载资源有徽标').toBe(1)
  expect(res.on.labels, '每条任务条都有标签').toBe(3)
  // 文案与 a11y 机制
  expect(res.on.badgeText, '徽标文案（zh 默认 locale）').toBe('超载 1 档')
  expect(res.on.labelText, '条内标签为任务名').toBe('任务A')
  expect(res.on.valueHidden, '负载值数字全部 aria-hidden（列 aria-label 已描述负载）').toBe(true)
  expect(res.on.overValueHasClass, '超载档数字带 over 类（danger 色）').toBe(true)
  expect(res.on.r1NameHtml, '徽标路径：名字在 name-text 内 + 徽标可见').toContain('name-text')
  expect(res.on.r1NameHtml, '徽标是可见信息（不 aria-hidden）').not.toContain('aria-hidden')
  expect(res.on.r2NameText, '无超载资源名字保持纯文本').toBe('资源乙')

  // 视觉截图（light + dark）：数字位置/徽标形态/条内标签可读性留档供人工/识图复核
  const target = page.locator('#res-readable-wrap')
  await target.screenshot({ path: 'test-results/visual-review/resource-readable-light.png' })
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
  await target.screenshot({ path: 'test-results/visual-review/resource-readable-dark.png' })
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme')
    document.getElementById('res-readable-wrap')?.remove()
  })
  expect(errors).toEqual([])
})

test('resource 日刻度抽稀：day 档文案数有界（≈ceil(n/2)）、blank 刻度保留网格线、week/month 不抽稀、canvas 宽不变', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.id = 'res-thin-wrap'
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--oas-color-bg,#fff);padding:24px'
    const resources = JSON.stringify([{ id: 'r1', name: 'A' }])
    const tasks = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-01', end: '2026-03-14', resources: ['r1'] }])
    const mk = (id: string, scale: string): void => {
      const el = document.createElement('oas-resource')
      el.id = id
      el.style.cssText = 'display:block;width:720px;margin:12px auto;position:relative;z-index:1'
      el.setAttribute('scale', scale)
      el.setAttribute('resources', resources)
      el.setAttribute('tasks', tasks)
      wrap.appendChild(el)
    }
    mk('res-thin-day', 'day')
    mk('res-thin-week', 'week')
    document.body.appendChild(wrap)
  })
  await page.waitForFunction(
    () => !!document.getElementById('res-thin-week')?.shadowRoot?.querySelector('.row.lane .bar'),
    undefined,
    { timeout: 15000 },
  )
  const res = await page.evaluate(() => {
    const info = (id: string) => {
      const sr = document.getElementById(id)!.shadowRoot!
      const ticks = [...sr.querySelectorAll<HTMLElement>('.ticks .tick')]
      const track = sr.querySelector('.lane .track') as HTMLElement
      return {
        tickCount: ticks.length,
        textCount: ticks.filter((t) => (t.textContent ?? '') !== '').length,
        blankCount: ticks.filter((t) => t.classList.contains('blank')).length,
        ticksWidth: (sr.querySelector('.ticks') as HTMLElement).style.width,
        trackWidth: track.style.width,
        firstText: ticks[0]?.textContent ?? '',
      }
    }
    return { day: info('res-thin-day'), week: info('res-thin-week') }
  })
  // day 档 3/1..3/14 = 14 个 period，36px 列 → step 2：文案 ≈ ceil(14/2) = 7（有界），blank 7 个
  expect(res.day.tickCount, 'tick 元素数不变（抽稀只清文案，网格线不丢）').toBe(14)
  expect(res.day.textCount, 'day 文案数 = ceil(14/2) = 7').toBe(7)
  expect(res.day.blankCount, 'blank 刻度数 = 7').toBe(7)
  expect(res.day.firstText, '首刻度（全局索引 0）恒有文案').toBe('03-01')
  // 画布/刻度容器宽不变（对齐不破）
  expect(res.day.ticksWidth, '刻度容器宽仍 = canvasW').toBe(res.day.trackWidth)
  // week 档（90px 列）不抽稀：14 天 = 3 个周 period，全文案、无 blank
  expect(res.week.tickCount, 'week period 数').toBe(3)
  expect(res.week.textCount, 'week 全文案').toBe(3)
  expect(res.week.blankCount, 'week 无 blank').toBe(0)
  await page.evaluate(() => document.getElementById('res-thin-wrap')?.remove())
  expect(errors).toEqual([])
})

// 表头纵向吸顶：滚动泳道后周刻度仍贴在滚动容器顶部；角落名列在横向滚动后仍贴边（LTR/RTL）。
test('resource 表头吸顶：纵向滚动周刻度保持可见，横向滚动角落名列贴边（LTR/RTL）', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-basic')
  const out = await page.evaluate(async () => {
    const mount = async (rtl: boolean) => {
      const el = document.createElement('oas-resource')
      el.id = rtl ? 'res-sticky-rtl' : 'res-sticky-ltr'
      if (rtl) el.setAttribute('dir', 'rtl')
      el.setAttribute('scale', 'week')
      el.style.cssText = 'display:block;width:640px;height:240px;margin:12px'
      el.setAttribute(
        'resources',
        JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, name: `资源 ${i + 1}` }))),
      )
      el.setAttribute(
        'tasks',
        JSON.stringify(
          Array.from({ length: 40 }, (_, i) => ({
            id: `t${i}`,
            name: `任务 ${i + 1}`,
            start: '2026-02-02',
            end: '2026-02-06',
            resources: [`m${i}`],
          })),
        ),
      )
      document.body.appendChild(el)
      await new Promise((r) => setTimeout(r, 300))
      return el
    }
    const probe = (el: HTMLElement) => {
      const sr = el.shadowRoot!
      const sc = sr.querySelector('.scroller') as HTMLElement
      const head = sr.querySelector('.row.head') as HTMLElement
      const name = sr.querySelector('.head .name') as HTMLElement
      const scRect = sc.getBoundingClientRect()
      const hRect = head.getBoundingClientRect()
      const nRect = name.getBoundingClientRect()
      return {
        scTop: Math.round(scRect.top),
        scLeft: Math.round(scRect.left),
        scRight: Math.round(scRect.right),
        headTop: Math.round(hRect.top),
        headBottom: Math.round(hRect.bottom),
        nameLeft: Math.round(nRect.left),
        nameRight: Math.round(nRect.right),
        headZ: getComputedStyle(head).zIndex,
        nameZ: getComputedStyle(name).zIndex,
        scrollTop: sc.scrollTop,
        scrollLeft: sc.scrollLeft,
      }
    }
    const ltr = await mount(false)
    const sc = ltr.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc.scrollTop = 600
    sc.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 300))
    const ltr1 = probe(ltr)
    sc.scrollLeft = 240
    sc.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 300))
    const ltr2 = probe(ltr)

    const rtl = await mount(true)
    const sc2 = rtl.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc2.scrollTop = 600
    sc2.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 300))
    sc2.scrollLeft = -240
    sc2.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 300))
    const rtl1 = probe(rtl)

    // 关闭开关：header-sticky="false" → 表头回到普通流，随内容滚出容器顶
    const offEl = document.createElement('oas-resource')
    offEl.id = 'res-sticky-off'
    offEl.setAttribute('header-sticky', 'false')
    offEl.setAttribute('scale', 'week')
    offEl.style.cssText = 'display:block;width:640px;height:240px;margin:12px'
    offEl.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: `o${i}`, name: `资源 ${i + 1}` }))),
    )
    offEl.setAttribute(
      'tasks',
      JSON.stringify(
        Array.from({ length: 40 }, (_, i) => ({
          id: `ot${i}`,
          name: `任务 ${i + 1}`,
          start: '2026-02-02',
          end: '2026-02-06',
          resources: [`o${i}`],
        })),
      ),
    )
    document.body.appendChild(offEl)
    await new Promise((r) => setTimeout(r, 300))
    const sc3 = offEl.shadowRoot!.querySelector('.scroller') as HTMLElement
    sc3.scrollTop = 600
    sc3.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 300))
    const off = probe(offEl)
    return { ltr1, ltr2, rtl1, off }
  })
  // 纵向滚动后表头贴容器顶（允许 2px 边框误差）
  expect(Math.abs(out.ltr1.headTop - out.ltr1.scTop), 'LTR 纵向滚动后表头吸顶').toBeLessThanOrEqual(2)
  expect(out.ltr1.scrollTop, '确实发生了纵向滚动').toBeGreaterThan(0)
  // 横向滚动后角落名列贴左
  expect(Math.abs(out.ltr2.nameLeft - out.ltr2.scLeft), 'LTR 横向滚动后角落名列贴左').toBeLessThanOrEqual(2)
  // RTL：角落名列贴右
  expect(Math.abs(out.rtl1.nameRight - out.rtl1.scRight), 'RTL 横向滚动后角落名列贴右').toBeLessThanOrEqual(2)
  expect(Math.abs(out.rtl1.headTop - out.rtl1.scTop), 'RTL 纵向滚动后表头吸顶').toBeLessThanOrEqual(2)
  // 层级：表头高于泳道，角落高于刻度
  expect(Number(out.ltr1.headZ)).toBeGreaterThan(2)
  expect(Number(out.ltr1.nameZ)).toBeGreaterThan(Number(out.ltr1.headZ))
  // header-sticky="false"：表头随内容滚出容器顶
  expect(out.off.headTop, '关闭吸顶后表头滚出容器顶').toBeLessThan(out.off.scTop - 100)
  await page.evaluate(() => {
    document.getElementById('res-sticky-ltr')?.remove()
    document.getElementById('res-sticky-rtl')?.remove()
  })
  expect(errors).toEqual([])
})

// I4 滚动容器键盘可达（axe: scrollable-region-focusable）：
// windowed 行窗口 + 空视口（resources=[]、total=500）时 scroller 仍由 spacer 撑出滚动范围，
// 但窗口内没有任何可聚焦条 → 必须给 scroller 补 tabindex=0，否则 axe serious 违规。
test('resource 滚动容器键盘可达：windowed 空视口 scroller 可聚焦，axe scrollable-region-focusable 零违规', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  // 等组件 bundle 升级完成（借既有 demo 的泳道条）
  await waitResource(page, 'res-basic')

  await page.evaluate(() => {
    const el = document.createElement('oas-resource')
    el.id = 'res-axe-windowed'
    el.style.cssText = 'display:block;width:640px;height:320px;margin:12px'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0')
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2026-12-31')
    document.body.appendChild(el)
  })

  const probe = page.locator('#res-axe-windowed')
  await expect
    .poll(() =>
      probe.evaluate((host) => {
        const sc = host.shadowRoot!.querySelector('.scroller') as HTMLElement | null
        return sc ? sc.getAttribute('tabindex') : null
      }),
    )
    .toBe('0')
  const metrics = await probe.evaluate((host) => {
    const sc = host.shadowRoot!.querySelector('.scroller') as HTMLElement
    return { scrollH: sc.scrollHeight, clientH: sc.clientHeight, hidden: sc.hidden }
  })
  expect(metrics.hidden, 'windowed 空视口不显示空态覆盖层（scroller 可见）').toBe(false)
  expect(metrics.scrollH, 'spacer 撑起全量行高 → scroller 确实可滚动').toBeGreaterThan(metrics.clientH + 1)

  const results = await new AxeBuilder({ page })
    .include('#res-axe-windowed')
    .withRules(['scrollable-region-focusable'])
    .analyze()
  expect(
    results.violations.filter((v) => v.id === 'scrollable-region-focusable'),
    'axe scrollable-region-focusable 零违规',
  ).toEqual([])

  // 临时探针删除（不留 DOM）
  await page.evaluate(() => document.getElementById('res-axe-windowed')?.remove())
  expect(errors, 'console 零告警').toEqual([])
})

test('resource 资源名与任务条标签文字可选中复制', async ({ page }) => {
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await waitResource(page, 'res-readable')

  const r = await page.evaluate(() => {
    const host = document.getElementById('res-readable') as HTMLElement
    const name = host.shadowRoot!.querySelector('.row.lane .name') as HTMLElement
    const barLabel = host.shadowRoot!.querySelector('.bar-label') as HTMLElement
    const selectText = (el: HTMLElement): string => {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      return sel.toString()
    }
    return {
      nameUserSelect: getComputedStyle(name).userSelect,
      barUserSelect: getComputedStyle(barLabel).userSelect,
      nameText: selectText(name),
      barText: selectText(barLabel),
    }
  })
  expect(r.nameUserSelect, '资源名列应允许文本选择').toBe('text')
  expect(r.barUserSelect, '任务条标签应允许文本选择').toBe('text')
  expect(r.nameText.length).toBeGreaterThan(0)
  expect(r.barText.length).toBeGreaterThan(0)

  // 真实鼠标拖选（不是只读 computedStyle）：资源名文本可被用户划选复制
  const name = page.locator('#res-readable .row.lane .name').first()
  await name.scrollIntoViewIfNeeded()
  const box = await name.boundingBox()
  if (box) {
    await page.evaluate(() => window.getSelection()?.removeAllRanges())
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + Math.min(box.width - 2, 80), box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '')
    expect(selected.length, '真实拖选应产生文本选区').toBeGreaterThan(0)
  }
})
