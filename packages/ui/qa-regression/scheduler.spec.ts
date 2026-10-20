import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// scheduler 浏览器回归：视图渲染/切换/芯片/全天行/重复展开/agenda/console 零告警
test('scheduler 浏览器回归：月/周/agenda 视图渲染与切换 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  // 月视图：芯片 + +N
  const basic = page.locator('#scheduler-basic')
  await expect(basic.locator('.day[data-date="2026-08-08"] .chip').first()).toContainText('发布 v2.6')
  await expect(basic.locator('.day[data-date="2026-08-22"] .more')).toHaveText('+1 条')

  // 周视图：时刻表 + 定时块 + band 全天行（band 结构与 gutter 对齐）
  const week = page.locator('#scheduler-week')
  await expect(week.locator('.timeview .col')).toHaveCount(7)
  await expect(week.locator('.col[data-date="2026-08-10"] .event')).toHaveCount(2)
  await expect(week.locator('.band-col[data-date="2026-08-11"] .allday .chip')).toContainText('全天活动')
  // gutter 首标签与首行网格线对齐（band 修正后）：gutter 首个 span 与 track 顶部同线
  const aligned = await week.evaluate(() => {
    const el = document.getElementById('scheduler-week')!
    const gutterFirst = el.shadowRoot!.querySelector('.gutter span') as HTMLElement
    const track = el.shadowRoot!.querySelector('.track') as HTMLElement
    const g = gutterFirst.getBoundingClientRect()
    const t = track.getBoundingClientRect()
    return Math.abs(g.top + g.height / 2 - t.top) < 30
  })
  expect(aligned, 'gutter 首刻度应与 track 首网格线对齐（band 修正）').toBe(true)

  // 日视图切换（oas-view-change）
  await week.locator('[part="views"] button[data-view="day"]').click()
  await expect(week.locator('.timeview .col')).toHaveCount(1)

  // 重复 demo：daily 展开多日芯片
  const repeat = page.locator('#scheduler-repeat')
  await expect(repeat.locator('.day[data-date="2026-08-04"] .chip')).toContainText('每日站会')

  // 跨日全天：周视图渲染连续长条，不再逐日重复芯片
  const span = page.locator('#scheduler-span')
  await expect(span.locator('.band-span')).toHaveCount(2)
  await expect(span.locator('.band-span', { hasText: '设计冻结' })).toBeVisible()
  await expect(span.locator('.band-col .chip')).toHaveCount(0)

  // 跨日连续条拖动：按列宽吸附平移日期并回写 events
  const bar = span.locator('.band-span', { hasText: '设计冻结' })
  await bar.scrollIntoViewIfNeeded()
  const bandBox = await span.locator('.band').boundingBox()
  const barBox = await bar.boundingBox()
  if (!bandBox || !barBox) throw new Error('band/bar bounding box missing')
  const colW = bandBox.width / 7
  await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(barBox.x + barBox.width / 2 + colW, barBox.y + barBox.height / 2, { steps: 4 })
  await page.mouse.up()
  await expect
    .poll(() =>
      span.evaluate((el) => (el as unknown as { events: Array<{ date: string; endDate?: string }> }).events[0]),
    )
    .toMatchObject({ date: '2026-08-11', endDate: '2026-08-13' })

  // agenda 视图：分组 + 行
  const agenda = page.locator('#scheduler-agenda')
  await expect(agenda.locator('.ag-row', { hasText: '晨会' }).first()).toBeVisible()

  // agenda 行不被 flex 压缩：内容超 max-height 应滚动溢出而非压扁行（实抓：行被压到 13px 裁掉文本上半）
  const agendaMetrics = await agenda.evaluate((host) => {
    const s = (host as HTMLElement).shadowRoot!
    const row = s.querySelector('.ag-row') as HTMLElement
    const box = s.querySelector('.agenda') as HTMLElement
    return { rowH: row.getBoundingClientRect().height, scrollable: box.scrollHeight > box.clientHeight + 1 }
  })
  expect(agendaMetrics.rowH, 'agenda 行应保持自然高度（flex-shrink:0），不被压扁').toBeGreaterThanOrEqual(24)
  expect(agendaMetrics.scrollable, 'agenda 内容超高应出现纵向滚动').toBe(true)

  // 暗色：各视图仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(basic.locator('.day[data-date="2026-08-08"] .chip').first()).toBeVisible()
  await expect(week.locator('.col[data-date="2026-08-10"] .event').first()).toBeVisible()

  expect(errors).toEqual([])
})

// 资源视图（单日 + 周 × 资源）+ 拖拽创建 + now 线
test('scheduler 资源视图 + 拖拽创建 + now 线 浏览器回归', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-res-day', { timeout: 15000 })

  // 单日资源视图：行 = 资源；定时事件渲染横条、全天事件渲染芯片
  const resDay = page.locator('#scheduler-res-day')
  await expect(resDay.locator('.res-row')).toHaveCount(3)
  await expect(resDay.locator('.res-row[data-resource="a"] .res-bar')).toContainText('晨会')
  await expect(resDay.locator('.res-row[data-resource="c"] .res-allDayChip')).toContainText('维护')

  // 周 × 资源矩阵：7 列日头 + 格内事件
  const resWeek = page.locator('#scheduler-res-week')
  await expect(resWeek.locator('.res-dayhead')).toHaveCount(7)
  await expect(resWeek.locator('.res-cell[data-date="2026-08-12"][data-resource="a"] .chip')).toContainText('全天巡检')

  // 拖拽创建：日视图时间格空白处拖出区间 → oas-create → 宿主 addEvent
  const create = page.locator('#scheduler-create')
  const track = create.locator('.timeview .col .track')
  await track.scrollIntoViewIfNeeded()
  const box = (await track.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 8)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + 104, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('#scheduler-create-output')).toContainText('oas-create')
  await expect(create.locator('.event', { hasText: '新建（拖拽）' })).toHaveCount(1)

  // now 线：含今天的时间视图渲染 nowline，show-now=false 不渲染
  const now = await page.evaluate(() => {
    const on = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    on.setAttribute('view', 'day')
    on.setAttribute('start-hour', '0')
    on.setAttribute('end-hour', '24')
    on.setAttribute('show-now', 'true')
    document.body.appendChild(on)
    const hasOn = on.shadowRoot.querySelector('.nowline') !== null
    const off = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    off.setAttribute('view', 'day')
    off.setAttribute('start-hour', '0')
    off.setAttribute('end-hour', '24')
    off.setAttribute('show-now', 'false')
    document.body.appendChild(off)
    const hasOff = off.shadowRoot.querySelector('.nowline') !== null
    on.remove()
    off.remove()
    return { hasOn, hasOff }
  })
  expect(now.hasOn, '默认显示 now 线').toBe(true)
  expect(now.hasOff, 'show-now=false 不渲染 now 线').toBe(false)

  // RTL：资源视图容器 direction=rtl
  const rtl = await page.evaluate(() => {
    const el = document.createElement('oas-scheduler') as HTMLElement & { shadowRoot: ShadowRoot }
    el.setAttribute('dir', 'rtl')
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('resources', '[{"id":"a","title":"A"}]')
    document.body.appendChild(el)
    const res = el.shadowRoot.querySelector('[part="resource"]') as HTMLElement
    const out = { hasRtl: res.hasAttribute('data-rtl'), dir: getComputedStyle(res).direction }
    el.remove()
    return out
  })
  expect(rtl.hasRtl, 'RTL 下资源视图带 data-rtl').toBe(true)
  expect(rtl.dir, 'RTL 下资源视图 direction=rtl').toBe('rtl')

  // 暗色：资源视图仍可见
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  await expect(resDay.locator('.res-row[data-resource="a"] .res-bar')).toBeVisible()

  expect(errors).toEqual([])
})

// 虚拟化回归（机制与量界；视觉/交互态需浏览器人工复核）：
// - 资源行窗口：500 资源渲染行数上界 + spacer 守恒总高 + 中部滚动覆盖
// - 时间轴（小时轴）窗口：24h 刻度 DOM 上界 + gutter/track 总高守恒 + 中部滚动覆盖
// - 拖拽创建在虚拟化路径下仍派发 oas-create
test('scheduler 虚拟化：资源行/时间轴窗口量界 + 滚动覆盖 + 拖拽创建回归', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  // —— 资源行虚拟化：500 资源（宿主限高 600px 模拟滚动视口）——
  await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-virtual-res'
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))),
    )
    document.body.appendChild(el)
    const view = el.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.style.maxHeight = '600px' // shadow 内元素只能内联限高（外部样式穿不进 shadow DOM）
    ;(el as unknown as { requestUpdate(): void }).requestUpdate()
  })
  const virtualRes = page.locator('#scheduler-virtual-res')
  const rowCount = await virtualRes.locator('.res-row').count()
  expect(rowCount, '500 资源渲染行数有上界（可视行 ±buffer，非全量 500）').toBeLessThanOrEqual(24)
  expect(rowCount, '窗口渲染非空').toBeGreaterThan(0)
  await expect(virtualRes.locator('.res-row[data-resource="r0"]').first()).toBeVisible()

  // 总高守恒：pad-top + 渲染行 × 37 + pad-bottom === 500 × 37
  const totalH = await virtualRes.evaluate((host) => {
    const s = host.shadowRoot!
    const padTop = s.querySelector<HTMLElement>('.res-pad-top')
    const padBottom = s.querySelector<HTMLElement>('.res-pad-bottom')
    const rows = s.querySelectorAll('.res-row').length
    return parseFloat(padTop?.style.height ?? '0') + rows * 37 + parseFloat(padBottom?.style.height ?? '0')
  })
  expect(totalH, 'spacer + 渲染行守恒总高 500×37').toBe(500 * 37)

  // 中部滚动覆盖：滚到第 250 行 → 中部行渲染、顶部行移出
  await virtualRes.evaluate((host) => {
    const view = host.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.scrollTop = 250 * 37
    view.dispatchEvent(new Event('scroll'))
  })
  await expect(virtualRes.locator('.res-row[data-resource="r250"]')).toHaveCount(1)
  await expect(virtualRes.locator('.res-row[data-resource="r0"]')).toHaveCount(0)
  // 回归：窗口平移重建不得把 scrollTop 钳回 0（清 DOM 后读 scrollTop 会强制同步布局、
  // scrollHeight 塌陷触发浏览器钳制 → 窗口永远算回首屏、用户滚动跳回顶部）
  const st = await virtualRes.evaluate(
    (host) => (host.shadowRoot!.querySelector('[part="resource"]') as HTMLElement).scrollTop,
  )
  expect(st, '窗口平移重建后 scrollTop 应保持（视图不跳回顶部）').toBe(250 * 37)

  // —— 时间轴（小时轴）虚拟化：day 视图 0-24 时（timeview 自带 max-height 640）——
  await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-virtual-day'
    el.setAttribute('view', 'day')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('start-hour', '0')
    el.setAttribute('end-hour', '24')
    document.body.appendChild(el)
  })
  const virtualDay = page.locator('#scheduler-virtual-day')
  const spanCount = await virtualDay.locator('.gutter span').count()
  expect(spanCount, '24 小时刻度按窗口渲染（DOM 上界，非全量 24）').toBeLessThanOrEqual(18)
  expect(spanCount).toBeGreaterThan(0)

  // 总高守恒：gutter 与 track 均保持 24 × 48（滚动范围不变）
  const axisH = await virtualDay.evaluate((host) => {
    const s = host.shadowRoot!
    return {
      gutter: parseFloat(s.querySelector<HTMLElement>('.gutter')!.style.height),
      track: parseFloat(s.querySelector<HTMLElement>('.track')!.style.height),
    }
  })
  expect(axisH.gutter, 'gutter 总高守恒 24×48').toBe(24 * 48)
  expect(axisH.track, 'track 总高守恒 24×48').toBe(24 * 48)

  // 中部滚动覆盖：滚到 12:00 → 中部刻度渲染
  await virtualDay.evaluate((host) => {
    const tv = host.shadowRoot!.querySelector('[part="timeview"]') as HTMLElement
    tv.scrollTop = 12 * 48
    tv.dispatchEvent(new Event('scroll'))
  })
  await expect(virtualDay.locator('.gutter span', { hasText: '12:00' })).toHaveCount(1)

  // —— 拖拽创建在虚拟化路径下仍派发 oas-create ——
  await virtualDay.evaluate((host) => {
    ;(window as unknown as Record<string, unknown>).__schedCreateFired = false
    host.addEventListener('oas-create', () => {
      ;(window as unknown as Record<string, unknown>).__schedCreateFired = true
    })
  })
  // 宿主先滚入视口（组件位于长页底部，物理鼠标事件只落在视口内）；滚到 12:00 后
  // track（1152px）顶端在 timeview 视口上方，拖拽点取 track ∩ timeview ∩ 浏览器视口
  // 三者交集的顶部 +8px——等同真实用户在可视区内拖拽
  await virtualDay.scrollIntoViewIfNeeded()
  const geo = await virtualDay.evaluate((host) => {
    const tv = host.shadowRoot!.querySelector('[part="timeview"]') as HTMLElement
    const track = host.shadowRoot!.querySelector('.col .track') as HTMLElement
    const t = track.getBoundingClientRect()
    const v = tv.getBoundingClientRect()
    // 文档站顶栏是 fixed 覆盖层；1440×720 等较矮视口滚到底时宿主顶部会落到顶栏下方，
    // 拖拽起点必须再让开顶栏底边，否则物理鼠标实际命中 NAV（组件收不到 pointerdown）。
    const headerBottom = Math.max(
      document.querySelector('.VPNav')?.getBoundingClientRect().bottom ?? 0,
      document.querySelector('.VPNavBar')?.getBoundingClientRect().bottom ?? 0,
      // 顶栏菜单盒比 header 更高（向下溢出 16px），也要纳入命中禁区。
      document.querySelector('.VPNavMenu')?.getBoundingClientRect().bottom ?? 0,
    )
    return {
      x: t.left,
      w: t.width,
      top: Math.max(t.top, v.top, headerBottom, 0),
      bottom: Math.min(t.bottom, v.bottom, window.innerHeight),
    }
  })
  const dragY = geo.top + 8
  await page.mouse.move(geo.x + geo.w / 2, dragY)
  await page.mouse.down()
  await page.mouse.move(geo.x + geo.w / 2, dragY + 96, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).__schedCreateFired))
    .toBe(true)

  await page.evaluate(() => {
    document.getElementById('scheduler-virtual-res')?.remove()
    document.getElementById('scheduler-virtual-day')?.remove()
  })

  expect(errors, 'console 零告警').toEqual([])
})

// 虚拟化复审回归：
// - F1 时间轴窗口原点扣 band 高：band（列头+全天行）随全天事件数增长，scrollTop 必须先扣 band
//   再算窗口，否则滚动中部时窗口整体错位——顶部约 1 小时的刻度/事件被裁（窗口起于更晚小时）
// - F2 窗口重建回焦：滚动触发窗口平移重建后 shadow.activeElement 仍为同一事件 id
test('scheduler 虚拟化复审：band 高度偏移（多全天事件滚到中部顶部刻度/事件在）+ 重建回焦', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-virtual-band'
    el.setAttribute('view', 'day')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('start-hour', '0')
    el.setAttribute('end-hour', '24')
    const allDay: Array<{ date: string; title: string; start?: string; end?: string }> = Array.from(
      { length: 30 },
      (_, i) => ({ date: '2026-08-10', title: `全天事项占用行高-${i}` }),
    )
    allDay.push({ date: '2026-08-10', title: '早班检查', start: '08:00', end: '09:00' })
    el.setAttribute('events', JSON.stringify(allDay))
    document.body.appendChild(el)
  })
  const band = page.locator('#scheduler-virtual-band')

  // 前提成立：30 个全天事件换行 ≥3 行芯片（band 明显高于单行 ~33px 的基准）
  const bandH = await band.evaluate(
    (host) => (host.shadowRoot!.querySelector('.band') as HTMLElement).getBoundingClientRect().height,
  )
  expect(bandH, '30 个全天事件应撑起 band ≥90px（≥3 行芯片）').toBeGreaterThanOrEqual(90)

  // 滚到 12:00：窗口原点扣 band 后起于更早小时 → 顶部附近刻度（08:00）与事件（早班检查）必须渲染
  // （不扣 band 时窗口起于 10:00 → 08:00 刻度与 08:00-09:00 事件都被裁掉）
  await band.evaluate(() => {
    const el = document.getElementById('scheduler-virtual-band')!
    const tv = el.shadowRoot!.querySelector('[part="timeview"]') as HTMLElement
    tv.scrollTop = 12 * 48
    tv.dispatchEvent(new Event('scroll'))
  })
  await expect(band.locator('.gutter span', { hasText: '08:00' })).toHaveCount(1)
  await expect(band.locator('.col .event', { hasText: '早班检查' })).toHaveCount(1)

  // F2：聚焦事件条 → 再滚动触发窗口平移重建 → shadow.activeElement 仍为同一事件 id
  const focusId = await band.evaluate(() => {
    const el = document.getElementById('scheduler-virtual-band')!
    const s = el.shadowRoot!
    const ev = s.querySelector('.col .event') as HTMLElement
    ev.focus()
    return (s.activeElement as HTMLElement | null)?.getAttribute('data-id') ?? null
  })
  expect(focusId, '前置：聚焦事件条取得 data-id').toBeTruthy()
  await band.evaluate(() => {
    const el = document.getElementById('scheduler-virtual-band')!
    const tv = el.shadowRoot!.querySelector('[part="timeview"]') as HTMLElement
    tv.scrollTop = 6 * 48
    tv.dispatchEvent(new Event('scroll'))
  })
  await expect
    .poll(() =>
      band.evaluate(
        () =>
          (
            (document.getElementById('scheduler-virtual-band')!.shadowRoot!.activeElement as HTMLElement | null) ??
            undefined
          )?.getAttribute('data-id') ?? null,
      ),
    )
    .toBe(focusId)

  await page.evaluate(() => document.getElementById('scheduler-virtual-band')?.remove())
  expect(errors, 'console 零告警').toEqual([])
})

// 虚拟化终审 F1 回归：资源视图大数据量滚动帧按资源索引取数（O(窗口行 × 该行事件数)，
// 不随「窗口行数 × 事件总量」线性增长——性能量界由单测诊断计数断言，此处固化 DOM 机制面）：
// - 500 资源 × 5000+ 事件：渲染行数上界 + aria-rowcount 含「未分配」行
// - 中部滚动覆盖：r250 的 10 个事件条渲染、顶部行移出
// - 未分配归行：无 resource 与未知 resource 事件都归末行「未分配」（定时条 + 全天芯片并存）
test('scheduler 虚拟化终审：500 资源 × 5000+ 事件滚动覆盖 + 未分配归行 + console 零告警', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-virtual-index'
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    const events: Array<{ date: string; title: string; start?: string; end?: string; resource?: string }> = []
    for (let i = 0; i < 500; i++) {
      for (let j = 0; j < 10; j++) {
        const h = String(8 + j).padStart(2, '0')
        events.push({
          date: '2026-08-10',
          title: `R${i}-E${j}`,
          start: `${h}:00`,
          end: `${h}:30`,
          resource: `r${i}`,
        })
      }
    }
    for (let i = 0; i < 5; i++)
      events.push({ date: '2026-08-10', title: `未分配定时${i}`, start: '09:00', end: '09:30' })
    for (let i = 0; i < 5; i++) events.push({ date: '2026-08-10', title: `未分配全天${i}` })
    for (let i = 0; i < 5; i++)
      events.push({ date: '2026-08-10', title: `幽灵定时${i}`, start: '10:00', end: '10:30', resource: 'ghost' })
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))),
    )
    el.setAttribute('events', JSON.stringify(events))
    document.body.appendChild(el)
    const view = el.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.style.maxHeight = '600px' // shadow 内元素只能内联限高（外部样式穿不进 shadow DOM）
    ;(el as unknown as { requestUpdate(): void }).requestUpdate()
  })
  const idx = page.locator('#scheduler-virtual-index')

  // 渲染行数上界：501 行只渲染可视窗口（600px 限高 → 可视行 ±buffer）
  const rowCount = await idx.locator('.res-row').count()
  expect(rowCount, '501 行只渲染窗口行').toBeLessThanOrEqual(24)
  expect(rowCount, '窗口渲染非空').toBeGreaterThan(0)

  // aria-rowcount = 500 资源 + 1 未分配（存在无 resource / 未知 resource 事件）
  await expect(idx.locator('[role="grid"]')).toHaveAttribute('aria-rowcount', '501')

  // 中部滚动覆盖：r250 的 10 个事件条按索引渲染（滚动帧路径），顶部行移出
  await idx.evaluate((host) => {
    const view = host.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.scrollTop = 250 * 37
    view.dispatchEvent(new Event('scroll'))
  })
  await expect(idx.locator('.res-row[data-resource="r250"] .res-bar')).toHaveCount(10)
  await expect(idx.locator('.res-row[data-resource="r0"]')).toHaveCount(0)

  // 未分配归行：滚到末行，无 resource（定时 5 + 全天 5）与未知 resource（定时 5）都归「未分配」
  await idx.evaluate((host) => {
    const view = host.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.scrollTop = 500 * 37
    view.dispatchEvent(new Event('scroll'))
  })
  const unassigned = idx.locator('.res-row[data-resource=""]')
  await expect(unassigned).toHaveCount(1)
  await expect(unassigned.locator('.res-bar')).toHaveCount(10)
  await expect(unassigned.locator('.res-allDayChip')).toHaveCount(5)
  await expect(unassigned).toHaveAttribute('aria-rowindex', '501')

  await page.evaluate(() => document.getElementById('scheduler-virtual-index')?.remove())
  expect(errors, 'console 零告警').toEqual([])
})

// I2 资源视图默认限高：宿主只给 height=600px、不内联改 shadow 内 max-height 时，
// `.resourceview` 自身按默认 640px 形成滚动视口 → 纵向窗口化生效（渲染行有界、总高守恒）。
test('scheduler 资源视图默认限高：宿主 height=600px + 500 资源内部滚动并窗口化', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-res-height'
    el.style.height = '600px'
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ id: `r${i}`, title: `资源 ${i}` }))),
    )
    document.body.appendChild(el)
  })
  const host = page.locator('#scheduler-res-height')
  await expect(host.locator('.res-row').first()).toBeVisible()

  const read = () =>
    host.evaluate((h) => {
      const view = h.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
      return {
        hostH: h.getBoundingClientRect().height,
        maxH: getComputedStyle(view).maxHeight,
        clientH: view.clientHeight,
        scrollH: view.scrollHeight,
        scrollTop: view.scrollTop,
        rows: h.shadowRoot!.querySelectorAll('.res-row').length,
      }
    })
  const before = await read()
  expect(before.hostH, '宿主 height=600px 生效').toBeCloseTo(600, 0)
  expect(before.maxH, '资源视图默认限高 640px（与 timeview 一致）').toBe('640px')
  expect(before.clientH, '资源视图形成滚动视口').toBeGreaterThan(0)
  expect(before.scrollH, '500 行内容超过视口：内部产生滚动').toBeGreaterThan(before.clientH + 1)
  // 窗口行数上界 = ceil(640/37)=18 可视行 + 上下预渲染 buffer 各 4（RES_ROW_BUFFER）。
  // 首屏顶部 buffer 被 clamp 到 0 时为 22；滚动到中部上下 buffer 均满 → 26 为精确上界
  expect(before.rows, '500 行只渲染可视窗口（非全量）').toBeLessThanOrEqual(26)
  expect(before.rows, '窗口渲染非空').toBeGreaterThan(0)

  // 中部滚动：行窗口平移覆盖可视区；spacer 守恒总高（scrollHeight 不随窗口重建缩水）
  await host.evaluate((h) => {
    const view = h.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    view.scrollTop = 250 * 37
    view.dispatchEvent(new Event('scroll'))
  })
  await expect(host.locator('.res-row[data-resource="r250"]')).toHaveCount(1)
  await expect(host.locator('.res-row[data-resource="r0"]')).toHaveCount(0)
  const after = await read()
  expect(after.scrollTop, '窗口平移重建后 scrollTop 保持（不跳回顶部）').toBe(250 * 37)
  expect(Math.abs(after.scrollH - before.scrollH), 'scrollHeight 守恒（spacer 撑起全量总高）').toBeLessThanOrEqual(1)
  // 同上：滚动中部上下 buffer 均不被裁剪，26 为精确上界（实测 26，原 ≤24 未算双 buffer）
  expect(after.rows, '窗口行数仍有界').toBeLessThanOrEqual(26)

  // 宿主可覆盖 token：自定义属性穿透 shadow 生效
  const overridden = await host.evaluate((h) => {
    h.style.setProperty('--oas-scheduler-resource-max-height', '300px')
    const view = h.shadowRoot!.querySelector('[part="resource"]') as HTMLElement
    return getComputedStyle(view).maxHeight
  })
  expect(overridden, '--oas-scheduler-resource-max-height 可覆盖默认限高').toBe('300px')

  await page.evaluate(() => document.getElementById('scheduler-res-height')?.remove())
  expect(errors, 'console 零告警').toEqual([])
})

// I4 滚动容器键盘可达（axe: scrollable-region-focusable）：
// - day 视图无事件：timeview 可滚动且无可聚焦子元素
// - resource-week 空事件：resourceview 可滚动且行头为 div（无可聚焦子元素）
test('scheduler 滚动容器键盘可达：day 无事件 / resource-week 空事件 axe 零违规', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })

  await page.evaluate(() => {
    const day = document.createElement('oas-scheduler')
    day.id = 'scheduler-axe-day'
    day.style.cssText = 'display:block;width:800px;margin:12px'
    day.setAttribute('view', 'day')
    day.setAttribute('page-show-date', '2026-08-10')
    day.setAttribute('start-hour', '0')
    day.setAttribute('end-hour', '24')
    document.body.appendChild(day)

    const wk = document.createElement('oas-scheduler')
    wk.id = 'scheduler-axe-resweek'
    wk.style.cssText = 'display:block;width:900px;margin:12px'
    wk.setAttribute('view', 'resource-week')
    wk.setAttribute('page-show-date', '2026-08-10')
    wk.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ id: `w${i}`, title: `资源 ${i}` }))),
    )
    document.body.appendChild(wk)
  })
  await page.waitForFunction(
    () => {
      const day = document.getElementById('scheduler-axe-day') as (HTMLElement & { shadowRoot?: ShadowRoot }) | null
      const wk = document.getElementById('scheduler-axe-resweek') as (HTMLElement & { shadowRoot?: ShadowRoot }) | null
      return (
        !!day?.shadowRoot?.querySelector('[part="timeview"] .gutter span') &&
        !!wk?.shadowRoot?.querySelector('[part="resource"] .res-row')
      )
    },
    undefined,
    { timeout: 15000 },
  )

  const probe = await page.evaluate(() => {
    const day = document.getElementById('scheduler-axe-day') as HTMLElement & { shadowRoot: ShadowRoot }
    const wk = document.getElementById('scheduler-axe-resweek') as HTMLElement & { shadowRoot: ShadowRoot }
    const tv = day.shadowRoot.querySelector('[part="timeview"]') as HTMLElement
    const rv = wk.shadowRoot.querySelector('[part="resource"]') as HTMLElement
    return {
      tvTab: tv.getAttribute('tabindex'),
      tvScrollH: tv.scrollHeight,
      tvClientH: tv.clientHeight,
      rvTab: rv.getAttribute('tabindex'),
      rvScrollH: rv.scrollHeight,
      rvClientH: rv.clientHeight,
    }
  })
  expect(probe.tvScrollH, 'day 无事件时 timeview 确实可滚动').toBeGreaterThan(probe.tvClientH + 1)
  expect(probe.tvTab, 'timeview 可滚动 → tabindex=0（键盘可达）').toBe('0')
  expect(probe.rvScrollH, 'resource-week 空事件时 resourceview 确实可滚动').toBeGreaterThan(probe.rvClientH + 1)
  expect(probe.rvTab, 'resourceview 可滚动 → tabindex=0（键盘可达）').toBe('0')

  const results = await new AxeBuilder({ page })
    .include('#scheduler-axe-day')
    .include('#scheduler-axe-resweek')
    .withRules(['scrollable-region-focusable'])
    .analyze()
  expect(
    results.violations.filter((v) => v.id === 'scrollable-region-focusable'),
    'axe scrollable-region-focusable 零违规',
  ).toEqual([])

  // 临时探针删除（不留 DOM）
  await page.evaluate(() => {
    document.getElementById('scheduler-axe-day')?.remove()
    document.getElementById('scheduler-axe-resweek')?.remove()
  })
  expect(errors, 'console 零告警').toEqual([])
})

test('scheduler windowed 资源切片 + 打印样式：绝对行号、窗口请求、@media print', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-scheduler')
    el.id = 'scheduler-windowed-qa'
    el.setAttribute('view', 'resource')
    el.setAttribute('page-show-date', '2026-08-10')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '40')
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ id: `r${40 + i}`, title: `R${40 + i}` }))),
    )
    let req: { start: number; end: number } | null = null
    el.addEventListener('oas-window-request', (e) => {
      req = (e as CustomEvent).detail
    })
    document.body.appendChild(el)
    return new Promise<{
      rowCount: string | null
      firstIndex: string | null
      req: unknown
      printCss: boolean
      scrollTop: number
    }>((resolve) => {
      setTimeout(() => {
        const root = el.shadowRoot!
        resolve({
          rowCount: root.querySelector('[role="grid"]')?.getAttribute('aria-rowcount') ?? null,
          firstIndex: root.querySelector('.res-row[data-resource="r40"]')?.getAttribute('aria-rowindex') ?? null,
          req,
          printCss: (root.querySelector('style')?.textContent ?? '').includes('@media print'),
          scrollTop: root.querySelector('[part="resource"]')?.scrollTop ?? 0,
        })
      }, 400)
    })
  })
  expect(r.rowCount).toBe('100')
  expect(r.scrollTop, '首屏应锚定到切片首行（37px/行 × 40）').toBeGreaterThanOrEqual(40 * 37)
  expect(r.firstIndex).toBe('41')
  expect(r.req, '应派发 oas-window-request').not.toBeNull()
  expect(r.printCss, '应包含 @media print').toBe(true)
  expect(errors).toEqual([])
})

// 月历窄容器：长 nowrap 标题不得撑爆 repeat(7,1fr) 轨道（.day 缺 min-width:0 的回归）。
test('scheduler 月历窄容器：长标题不撑爆 7 列、末列不越界、芯片省略', async ({ page }) => {
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-basic', { timeout: 15000 })
  const r = await page.evaluate(async () => {
    const el = document.getElementById('scheduler-basic') as HTMLElement & { events: unknown[] }
    el.style.width = '700px'
    el.events = [
      { date: '2026-08-01', title: '这是一个非常非常长的事件标题用于制造最小内容宽度溢出' },
      { date: '2026-08-02', title: '另一个同样很长很长的事件标题用于制造最小内容宽度溢出' },
    ]
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
    const sr = el.shadowRoot!
    const grid = sr.querySelector('.grid') as HTMLElement
    const days = [...sr.querySelectorAll('.day')] as HTMLElement[]
    const g = grid.getBoundingClientRect()
    const widths = days.map((d) => Math.round(d.getBoundingClientRect().width))
    const lastRow = days.slice(-7)
    return {
      gridScroll: grid.scrollWidth,
      gridClient: grid.clientWidth,
      hostScroll: el.scrollWidth,
      hostClient: el.clientWidth,
      widths,
      lastRowRight: Math.round(Math.max(...lastRow.map((d) => d.getBoundingClientRect().right))),
      gridRight: Math.round(g.right),
      chipsInCell: [...sr.querySelectorAll('.chip')].every((c) => {
        const day = c.closest('.day')!
        return c.getBoundingClientRect().right <= day.getBoundingClientRect().right + 1
      }),
      longChipsTruncated: [...sr.querySelectorAll('.chip')]
        .filter((c) => (c.textContent ?? '').includes('非常非常长') || (c.textContent ?? '').includes('同样很长'))
        .every((c) => c.scrollWidth > c.clientWidth + 1),
    }
  })
  expect(new Set(r.widths).size, '7 列等宽').toBe(1)
  expect(r.gridScroll, '网格无横向溢出').toBeLessThanOrEqual(r.gridClient + 1)
  expect(r.hostScroll, '宿主无横向溢出').toBeLessThanOrEqual(r.hostClient + 1)
  expect(r.lastRowRight, '末列不越出网格').toBeLessThanOrEqual(r.gridRight + 1)
  expect(r.chipsInCell, '芯片外框在格内').toBe(true)
  expect(r.longChipsTruncated, '长标题被省略号截断而非撑开').toBe(true)
})

test('scheduler 打印预览：agenda 取消限高 + Chromium PDF 可生成', async ({ page, browserName }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/scheduler.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('#scheduler-print', { timeout: 15000 })
  await page.emulateMedia({ media: 'print' })
  const style = await page.evaluate(() => {
    const el = document.getElementById('scheduler-print') as HTMLElement & {
      shadowRoot?: ShadowRoot | null
    }
    const agenda = el.shadowRoot?.querySelector('.agenda') as HTMLElement | null
    const cs = agenda ? getComputedStyle(agenda) : null
    return { maxHeight: cs?.maxHeight ?? '', overflow: cs?.overflowY ?? '' }
  })
  expect(style.maxHeight, 'print 下 agenda 不应再限高 640px').toBe('none')
  expect(style.overflow, 'print 下 agenda 应可见溢出').toBe('visible')
  if (browserName === 'chromium') {
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    expect(pdf.length, '打印预览应能生成 PDF').toBeGreaterThan(1000)
  }
  expect(errors).toEqual([])
})
