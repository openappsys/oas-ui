import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

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
  const res = await page.evaluate(() => {
    const sr = (document.getElementById('res-wide') as HTMLElement).shadowRoot!
    const sc = sr.querySelector('.scroller') as HTMLElement
    const maxScroll = sc.scrollWidth - sc.clientWidth
    sc.scrollLeft = Math.floor(maxScroll / 2)
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
  expect(res.badVar, 'height="bad" 回落 320 写自定义属性').toBe('320px')
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
