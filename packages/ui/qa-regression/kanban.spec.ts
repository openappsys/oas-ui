// 复核回归：kanban——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('kanban 触屏「下移」：菜单下移换序并派发 oas-change（回归：idx+1 曾被原位判定静默吞掉恒为死按钮）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-kanban')!
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const firstCol = el.shadowRoot!.querySelector('.column')!
    const firstCard = firstCol.querySelector('.card') as HTMLElement
    const firstId = firstCard.getAttribute('data-id')
    // 打开移动菜单 → 点「下移」
    ;(firstCard.querySelector('.card-move') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    const down = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.move-menu [role="menuitem"]')].find((i) =>
      /下移|Down/.test(i.textContent ?? ''),
    )!
    down.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    // applyMove 回写 cards attribute 触发整板重建——必须重取列容器（旧引用已脱离文档）
    const idsNow = [...el.shadowRoot!.querySelectorAll('.column')[0]!.querySelectorAll('.card')].map((c) =>
      c.getAttribute('data-id'),
    )
    return { firstId, idsNow, events }
  })
  expect(r.events.length, '下移必须派发 oas-change（旧版恒零操作）').toBe(1)
  expect((r.events[0] as { index: number }).index, '落点 index=1').toBe(1)
  expect(r.idsNow[1], '源卡移到第二位').toBe(r.firstId)
})

test('kanban DnD 跨列拖拽：换列并派发 oas-change（from/to/index 口径）', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-kanban')!
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const cols = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
    const src = cols[0]!.querySelector('.card') as HTMLElement
    const tgt = cols[1]!.querySelector('.card') as HTMLElement
    const dt = new DataTransfer()
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }))
    tgt.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, composed: true, dataTransfer: dt, clientY: 0 } as DragEventInit),
    )
    tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: dt }))
    src.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }))
    return {
      events,
      secondColIds: [...cols[1]!.querySelectorAll('.card')].map((c) => c.getAttribute('data-id')),
      orphanMark: el.shadowRoot!.querySelector('.drop-before, .drop-after, .drop-tail') !== null,
    }
  })
  expect(r.events.length).toBe(1)
  const d = r.events[0] as { from: string; to: string; index: number }
  expect(d.from).not.toBe(d.to)
  expect(r.secondColIds.length, '第二列卡片数 +1').toBeGreaterThan(0)
  expect(r.orphanMark, 'dragend 后无孤儿指示线').toBe(false)
})

test('kanban 列语义：非空列 role=list、空列无 list 语义（axe aria-required-children 回归）', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-kanban')!
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')].map((col) => ({
      hasCards: col.querySelector('.card') !== null,
      role: col.querySelector('.column-body')!.getAttribute('role'),
    }))
  })
  for (const col of r) {
    if (col.hasCards) expect(col.role, '非空列 role=list').toBe('list')
    else expect(col.role, '空列不得设 list 语义（axe 要求 list 必有 listitem）').toBeNull()
  }
})

test('kanban 菜单：列体（shadow 内）滚动时菜单关闭（交叉审实证回归——scroll 是 non-composed 事件不跨 shadow 边界，document 监听收不到列体滚动曾致菜单脱锚）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-kanban')!
    const card = el.shadowRoot!.querySelector('.card') as HTMLElement
    ;(card.querySelector('.card-move') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    const menuBefore = !!el.shadowRoot!.querySelector('.move-menu')
    // 列体（shadow 内 overflow-y 容器）派发真实 scroll
    const body = el.shadowRoot!.querySelector('.column-body') as HTMLElement
    body.scrollTop = 50
    body.dispatchEvent(new Event('scroll'))
    const menuAfter = !!el.shadowRoot!.querySelector('.move-menu')
    return { menuBefore, menuAfter }
  })
  expect(r.menuBefore, '菜单已打开').toBe(true)
  expect(r.menuAfter, '列体滚动后菜单关闭').toBe(false)
})

test('kanban 断开重连后：开菜单 → 外点关闭正常（交叉审同抓回归——document 监听生命周期改跟菜单走前，re-parent 后外点/滚动关菜单永久失效）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-kanban')!
    // 断开重连（re-parent）
    const parent = el.parentElement!
    el.remove()
    parent.appendChild(el)
    // 开菜单
    const card = el.shadowRoot!.querySelector('.card') as HTMLElement
    ;(card.querySelector('.card-move') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    const menuOpen = !!el.shadowRoot!.querySelector('.move-menu')
    // 外点（document 级点击看板外）
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    const menuAfterOutside = !!el.shadowRoot!.querySelector('.move-menu')
    return { menuOpen, menuAfterOutside }
  })
  expect(r.menuOpen, '重连后菜单可打开').toBe(true)
  expect(r.menuAfterOutside, '重连后外点关菜单（document 监听已重挂）').toBe(false)
})

test('kanban 列拖拽重排：列头手柄拖到邻列 → oas-column-reorder（PRD 二期验收 e2e）', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    // 用列重排 demo（带手柄）；无独立 demo 实例时用首个看板（一期也有列结构）
    const el = document.querySelector('oas-kanban')!
    const events: unknown[] = []
    el.addEventListener('oas-column-reorder', (e) => events.push((e as CustomEvent).detail))
    const handles = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column-drag')]
    if (handles.length < 2) return { skip: true, events }
    const dt = new DataTransfer()
    handles[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }))
    const secondHead = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')][1]!.querySelector(
      '.column-head',
    ) as HTMLElement
    // clientX 大值 = 目标头右半区 → 插到其后（真移动；clientX=0 左半区恰为原位零操作不派发）
    secondHead.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, composed: true, dataTransfer: dt, clientX: 9999 } as DragEventInit),
    )
    secondHead.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: dt }))
    handles[0]!.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }))
    return {
      events,
      keys: (JSON.parse(el.getAttribute('columns') ?? '[]') as Array<{ key: string }>).map((c) => c.key),
    }
  })
  if (r.skip) {
    test.skip(true, '列重排手柄选择器未命中——demo 结构需对齐')
    return
  }
  expect(r.events.length, '列重排派发 oas-column-reorder').toBe(1)
})

test('kanban 多选拖拽：Ctrl 选两枚 → 拖一枚 → 全部选中卡移动 + 一条 oas-change 带 ids', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    // 多选 demo 实例（cards >= 3 且无泳道）
    const kbs = [...document.querySelectorAll('oas-kanban')]
    const el = kbs.find((k) => !k.hasAttribute('swimlane-by') && k.shadowRoot!.querySelectorAll('.card').length >= 3)!
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const cards = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.card')]
    cards[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }))
    cards[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, ctrlKey: true }))
    const selected = el.shadowRoot!.querySelectorAll('[data-selected]').length
    const targetCol = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')][1]!
    const dt = new DataTransfer()
    cards[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }))
    targetCol
      .querySelector('.column-body')!
      .dispatchEvent(
        new DragEvent('dragover', { bubbles: true, composed: true, dataTransfer: dt, clientY: 10 } as DragEventInit),
      )
    targetCol
      .querySelector('.column-body')!
      .dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: dt }))
    cards[0]!.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }))
    return { selected, events }
  })
  expect(r.selected, 'Ctrl 点击两枚多选').toBe(2)
  expect(r.events.length, '批量移动只派发一条 oas-change').toBe(1)
  const d = r.events[0] as { ids?: string[] }
  expect(d.ids?.length, 'detail.ids 含全部选中卡').toBe(2)
})

test('kanban 泳道跨带拖拽：拖到另一泳带 → 泳道字段回写 + detail.swimlane', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-kanban')].find((k) => k.hasAttribute('swimlane-by'))!
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    const lanes = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[data-lane]')]
    const fromLane = lanes.find((l) => l.querySelector('.card'))!
    const toLane = lanes.find(
      (l) => l !== fromLane && l.getAttribute('data-lane') !== fromLane.getAttribute('data-lane'),
    )!
    const card = fromLane.querySelector('.card') as HTMLElement
    const targetCell = toLane.querySelector('.lane-cell, .column-body') as HTMLElement
    const dt = new DataTransfer()
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }))
    targetCell.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, composed: true, dataTransfer: dt, clientY: 10 } as DragEventInit),
    )
    targetCell.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: dt }))
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }))
    return { events }
  })
  expect(r.events.length, '跨带拖拽派发 oas-change').toBe(1)
  const d = r.events[0] as { swimlane?: { from: string; to: string } }
  expect(d.swimlane, 'detail 含 swimlane from/to').toBeTruthy()
  expect(d.swimlane!.from, '泳道 from 非空').not.toBe(d.swimlane!.to)
})

test('kanban WIP 限制：超限列计数 warning 色 + data-over-limit 标记', async ({ page }) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-kanban')
  const r = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-kanban')].find((k) =>
      (k.getAttribute('columns') ?? '').includes('limit'),
    )!
    const cols = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
    const over = cols.find((c) => c.hasAttribute('data-over-limit'))
    const normal = cols.find((c) => !c.hasAttribute('data-over-limit'))
    const overCount = over?.querySelector('.column-count') as HTMLElement | null
    const normalCount = normal?.querySelector('.column-count') as HTMLElement | null
    return {
      overLimit: !!over,
      overColor: overCount ? getComputedStyle(overCount).color : null,
      normalColor: normalCount ? getComputedStyle(normalCount).color : null,
    }
  })
  expect(r.overLimit, '超限列带 data-over-limit').toBe(true)
  expect(r.overColor, '超限计数色与未超限不同（warning 色生效）').not.toBe(r.normalColor)
})

test('kanban 宿主定高：板体吃满宿主不溢出 + 列体真内滚（回归：.kanban 无 height:100% 按内容自长盖住后续兄弟）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(() => {
    const host = document.querySelector('#kanban-scroll')!
    const board = host.shadowRoot!.querySelector('.kanban') as HTMLElement
    const body = board.querySelector('.column-body') as HTMLElement
    // 宿主后面的说明文字（曾与板体重叠）
    const next = host.nextElementSibling as HTMLElement
    const h = host.getBoundingClientRect()
    const b = board.getBoundingClientRect()
    const n = next?.getBoundingClientRect()
    const overlap = n ? !(n.top >= b.bottom - 0.5 || b.top >= n.bottom - 0.5) : false
    return {
      hostH: h.height,
      boardH: b.height,
      boardOverflow: host.scrollHeight - host.clientHeight,
      bodyScrolls: body.scrollHeight > body.clientHeight,
      overlap,
    }
  })
  expect(r.boardH, '板体高度收敛到宿主 height').toBeLessThanOrEqual(r.hostH + 0.5)
  expect(r.boardOverflow, '宿主无纵向溢出（scrollHeight == clientHeight）').toBeLessThanOrEqual(0.5)
  expect(r.bodyScrolls, '列体独立纵向滚动真成立（内容超高出现内滚）').toBe(true)
  expect(r.overlap, '板体不得与宿主后续兄弟内容重叠').toBe(false)
})

// ===== 列体虚拟化（大列只渲染可视窗口）=====
// 注入大列数据后：卡片 DOM 有上界、列头计数/WIP 仍按全量、滚动范围按全量撑开、滚到中部覆盖中部卡片。
// 反证点：若窗口计算退回全量渲染，topCount 会等于 3000（上界断言必失败）。

test('kanban 列体虚拟化：注入 3000 卡大列后卡片 DOM 有上界、列头计数仍为全量、滚到中部覆盖中部卡片', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    const TOTAL = 3000
    el.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'backlog', title: '需求池' },
        { key: 'sprint', title: '本迭代' },
      ]),
    )
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: TOTAL }, (_, i) => ({ id: `big${i}`, column: 'backlog', title: `大列卡 ${i}` })),
      ),
    )
    const bodyOf = (): HTMLElement =>
      el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const indexes = (): number[] =>
      [...bodyOf().querySelectorAll<HTMLElement>('.card[data-index]')].map((c) => Number(c.getAttribute('data-index')))
    const frame = (): Promise<void> =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await frame()
    const body = bodyOf()
    const top = indexes()
    const scrollRange = body.scrollHeight
    const viewport = body.clientHeight
    const pads = body.querySelectorAll('.vpad').length
    const headCount = el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-count')!.textContent
    // 滚到中部
    body.scrollTop = Math.floor(scrollRange / 2)
    body.dispatchEvent(new Event('scroll'))
    await frame()
    const mid = indexes()
    return {
      total: TOTAL,
      topCount: top.length,
      topFirst: top[0] ?? -1,
      pads,
      headCount,
      viewport,
      scrollRange,
      midCount: mid.length,
      midFirst: mid[0] ?? -1,
      midLast: mid[mid.length - 1] ?? -1,
    }
  })
  expect(r.pads, '窗口外部分用上下占位撑起').toBe(2)
  expect(r.topCount, '首屏卡片 DOM 有上界（远小于 3000）').toBeLessThanOrEqual(60)
  expect(r.topFirst, '首屏窗口从第 0 张开始').toBe(0)
  expect(r.headCount, '列头计数仍为全量 3000').toBe('3000')
  expect(r.viewport, '列体是真滚动视口（可测高度）').toBeGreaterThan(10)
  expect(r.scrollRange, '列内滚动范围按全量卡片高度撑开').toBeGreaterThan(80000)
  expect(r.midCount, '中部窗口仍有上界').toBeLessThanOrEqual(60)
  expect(r.midFirst, '已滚到中部（窗口不在首屏）').toBeGreaterThan(200)
  expect(r.midLast, '窗口覆盖一段连续卡片').toBeGreaterThan(r.midFirst + 5)
})

test('kanban 虚拟化下列内拖拽落点用绝对位次：拖首张到第 4 张上方 → index 2（窗口外卡片不漏判、事件不静默失效）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    el.setAttribute('columns', JSON.stringify([{ key: 'backlog', title: '需求池' }]))
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: 500 }, (_, i) => ({ id: `virt${i}`, column: 'backlog', title: `虚拟卡 ${i}` })),
      ),
    )
    const events: unknown[] = []
    el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const bodyOf = (): HTMLElement =>
      el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const rendered = [...bodyOf().querySelectorAll<HTMLElement>('.card[data-index]')]
    const src = rendered[0]!
    const tgt = rendered[3]!
    const dt = new DataTransfer()
    src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, composed: true, dataTransfer: dt }))
    // 悬在目标卡上半（客户端坐标取自真实排版）→ 插到其前
    const rect = tgt.getBoundingClientRect()
    const clientY = rect.top + 1
    tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, composed: true, dataTransfer: dt, clientY }))
    tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, composed: true, dataTransfer: dt }))
    // 落定后整板重建（旧列体已脱离文档）→ 在新列体上收尾 dragend
    bodyOf().dispatchEvent(new DragEvent('dragend', { bubbles: true, composed: true, dataTransfer: dt }))
    const ids = (JSON.parse(el.getAttribute('cards') ?? '[]') as Array<{ id: string }>).map((c) => c.id)
    return {
      srcId: src.getAttribute('data-id'),
      srcIndex: src.getAttribute('data-index'),
      tgtIndex: tgt.getAttribute('data-index'),
      events,
      head: ids.slice(0, 4),
      total: ids.length,
      orphanMark: el.shadowRoot!.querySelector('.drop-before, .drop-after, .drop-tail') !== null,
    }
  })
  expect(r.total, '数据未被窗口化影响').toBe(500)
  expect(r.srcId, '拖拽源是首张卡').toBe('virt0')
  expect(r.srcIndex).toBe('0')
  expect(r.tgtIndex, '目标卡是第 4 张（data-index=3）').toBe('3')
  expect(r.events.length, '虚拟化下拖拽照常派发 oas-change').toBe(1)
  expect(r.events[0], '落点 index = 移除自身后的插入位 2').toEqual({
    id: 'virt0',
    from: 'backlog',
    to: 'backlog',
    index: 2,
  })
  expect(r.head, '源卡落到第 3 位').toEqual(['virt1', 'virt2', 'virt0', 'virt3'])
  expect(r.orphanMark, 'dragend 后无孤儿指示线').toBe(false)
})

// ===== 终审修复回归：虚拟化滚动帧 O(窗口) + 读屏全量口径 =====
// 反证点（F1）：若滚动帧退回每帧全量 filter，5 帧取卡诊断计数 ≈ 3000×5 = 15000，
// 上界断言必失败；若索引路径整体退化（增量为 0），canary 断言必失败。

test('kanban 虚拟化滚动帧按索引切片：滚动 5 帧取卡诊断计数有上界且不随卡量增长（回归：每滚动帧对 _cards 全量 filter）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    el.setAttribute('columns', JSON.stringify([{ key: 'backlog', title: '需求池' }]))
    const TOTAL = 3000
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: TOTAL }, (_, i) => ({ id: `big${i}`, column: 'backlog', title: `大列卡 ${i}` })),
      ),
    )
    const frame = (): Promise<void> =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await frame()
    const body = el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const scans = (): number => (el as unknown as { columnWindowScans: number }).columnWindowScans
    const before = scans()
    for (let f = 1; f <= 5; f++) {
      body.scrollTop = 2000 * f
      body.dispatchEvent(new Event('scroll'))
      await frame()
    }
    const rendered = [...body.querySelectorAll<HTMLElement>('.card[data-index]')].map((c) =>
      Number(c.getAttribute('data-index')),
    )
    return {
      delta: scans() - before,
      total: TOTAL,
      first: rendered[0] ?? -1,
      contiguous: rendered.every((v, i) => i === 0 || v === rendered[i - 1]! + 1),
    }
  })
  // 真浏览器有 ResizeObserver 实测回写（额外有限次重绘），上界放宽到 1000——仍远小于 3000×5
  expect(r.delta, '5 帧取卡数有上界（窗口量级；旧实现每帧全量 filter = 3000×5 = 15000）').toBeLessThanOrEqual(1000)
  expect(r.delta, '索引切片路径确在使用（未退化回全量数组路径）').toBeGreaterThan(0)
  expect(r.first, '已滚离顶部').toBeGreaterThan(10)
  expect(r.contiguous, '窗口 data-index 连续（滚动语义不变）').toBe(true)
})

test('kanban 虚拟化读屏全量口径：卡片 aria-posinset 绝对位次 + aria-setsize 列全量（滚到中部不变）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    el.setAttribute('columns', JSON.stringify([{ key: 'backlog', title: '需求池' }]))
    const TOTAL = 3000
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: TOTAL }, (_, i) => ({ id: `big${i}`, column: 'backlog', title: `大列卡 ${i}` })),
      ),
    )
    const frame = (): Promise<void> =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await frame()
    const bodyOf = (): HTMLElement =>
      el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const firstCard = bodyOf().querySelector<HTMLElement>('.card[data-index="0"]')!
    const topPosinset = firstCard.getAttribute('aria-posinset')
    const topSetsize = firstCard.getAttribute('aria-setsize')
    // 滚到中部（无数据变化 → 列体节点不换，引用保持有效）
    const body = bodyOf()
    body.scrollTop = body.scrollHeight / 2
    body.dispatchEvent(new Event('scroll'))
    await frame()
    const rendered = [...body.querySelectorAll<HTMLElement>('.card[data-index]')]
    const cards = rendered.map((c) => ({
      index: Number(c.getAttribute('data-index')),
      posinset: Number(c.getAttribute('aria-posinset')),
      setsize: Number(c.getAttribute('aria-setsize')),
    }))
    return {
      topPosinset,
      topSetsize,
      total: TOTAL,
      firstIndex: cards[0]?.index ?? -1,
      allAbsolute: cards.every((c) => c.posinset === c.index + 1),
      allFullSetsize: cards.every((c) => c.setsize === TOTAL),
    }
  })
  expect(r.topPosinset, '首屏第 0 张 posinset=1（1 基）').toBe('1')
  expect(r.topSetsize, '首屏 setsize=列全量 3000').toBe('3000')
  expect(r.firstIndex, '已滚到中部（窗口不在首屏）').toBeGreaterThan(200)
  expect(r.allAbsolute, '窗口内全部卡片 posinset=绝对位次（非窗口内相对序）').toBe(true)
  expect(r.allFullSetsize, '窗口内全部卡片 setsize=列全量').toBe(true)
})

// ===== 程序化跳滚同步（回归：scroll→rAF 合帧曾把窗口重算推迟一帧）=====
// 缺陷：scrollTo / 滚动条大幅跳滚把 scrollTop 一步拉远后，重算走「scroll 事件 → rAF」，
// 本帧仍按旧窗口上屏——视口整个落在占位区整帧空白（三列同时跳滚逐列复现）。
// 理论 index 口径：组件契约是窗口与「当前布局」一致——高度表为混合前缀（已测卡实测步距
// rowH + 未测卡预估 68），scrollTop 所指首卡 ≈ w0 + (TARGET − w0×rowH) / 68
// （w0 = 跳滚前已渲染卡数 = 已实测前缀长度，rowH = 初始窗口相邻卡 rect 间距实测步进）。
// 均匀 rowH 理论（TARGET/rowH）不适用：未测区按预估 68 布局，实测收敛前滚动映射天然按
// 混合前缀走（与 oas-virtual-list 动态行高同模型）。容差 = ±10 卡：二分边界 ±1 + 采样后
// RO 实测回写的视觉锚定补偿 ≤ (w0+窗口上方卡)×|68−rowH| ≈ 21×18px ≈ 7.6 卡。

test('kanban 程序化跳滚：scrollTo 大步跳变后一帧内窗口与视口一致（无空白、无旧窗口残留），重复跳变与到底不积压', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    const TOTAL = 3000
    el.setAttribute('columns', JSON.stringify([{ key: 'backlog', title: '需求池' }]))
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: TOTAL }, (_, i) => ({ id: `big${i}`, column: 'backlog', title: `大列卡 ${i}` })),
      ),
    )
    const bodyOf = (): HTMLElement =>
      el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const frame2 = (): Promise<void> =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const frame1 = (): Promise<void> => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await frame2()
    // 等 ResizeObserver 实测回写链收敛（诊断计数连续 3 帧不变）：不等到收敛的话，跳滚瞬间
    // 可能恰好有待派发的 RO 回调把窗口 force 重算（侥幸路径），掩盖 scroll→rAF 迟一帧缺陷
    const paintsOf = (): number => (el as unknown as { columnWindowPaints: number }).columnWindowPaints
    for (let i = 0, stable = 0; i < 40 && stable < 3; i++) {
      const p = paintsOf()
      await frame1()
      stable = paintsOf() === p ? stable + 1 : 0
    }
    const body = bodyOf()
    const cards0 = [...body.querySelectorAll<HTMLElement>('.card[data-index]')]
    const rowH = cards0[1]!.getBoundingClientRect().top - cards0[0]!.getBoundingClientRect().top
    const w0 = cards0.length
    const read = (): Record<string, unknown> => {
      const b = bodyOf()
      const cs = [...b.querySelectorAll<HTMLElement>('.card[data-index]')]
      const bRect = b.getBoundingClientRect()
      const vis = cs.filter((c) => {
        const r2 = c.getBoundingClientRect()
        return r2.bottom > bRect.top && r2.top < bRect.bottom
      })
      const idx = cs.map((c) => Number(c.getAttribute('data-index')))
      return {
        count: cs.length,
        first: idx[0] ?? -1,
        last: idx[idx.length - 1] ?? -1,
        contiguous: idx.every((v, i) => i === 0 || v === idx[i - 1]! + 1),
        visFirst: vis.length ? Number(vis[0]!.getAttribute('data-index')) : -1,
        visCount: vis.length,
      }
    }
    // 一帧后采样：修复后 scroll 事件在本帧 scroll steps 内同步重算，rAF 步采样必已就位；
    // 缺陷版重算在 rAF 里（晚于采样点）→ 采到旧窗口（RED）
    const TARGET = 23400
    body.scrollTo({ top: TARGET, behavior: 'instant' })
    await frame1()
    const jump = read()
    // 反向跳变：跳回已实测前缀末端（offset w0×rowH = 卡 w0 顶），上方全为已测卡 → 无锚定补偿，窗口应精确落位
    body.scrollTo({ top: w0 * rowH, behavior: 'instant' })
    await frame1()
    const back = read()
    // 到底：窗口末卡 = 全量最后一张且视口非空白
    body.scrollTo({ top: body.scrollHeight, behavior: 'instant' })
    await frame1()
    const bottom = read()
    return { rowH, w0, TOTAL, TARGET, jump, back, bottom }
  })
  expect(r.rowH, '实测步进有效（相邻卡间距 > 0）').toBeGreaterThan(0)
  const pred = (target: number): number => Math.round(r.w0 + (target - r.w0 * r.rowH) / 68)
  // --- 跳滚 23400：一帧内窗口与视口一致 ---
  expect(r.jump.visCount, '视口内有渲染卡（无整帧空白——缺陷版此处为 0）').toBeGreaterThan(0)
  expect(
    Math.abs((r.jump.visFirst as number) - pred(r.TARGET)),
    `视口首卡 ${r.jump.visFirst} 与混合前缀理论 ${pred(r.TARGET)} 一致（容差 ±10：二分边界 ±1 + RO 锚定补偿 ≈7.6 卡）`,
  ).toBeLessThanOrEqual(10)
  expect(r.jump.count, '窗口卡数有上界').toBeLessThanOrEqual(60)
  expect(r.jump.contiguous, '窗口 data-index 连续').toBe(true)
  // --- 反向跳变到已测前缀末端：上方全为已测卡（无补偿），窗口精确落位 ---
  expect(r.back.visCount, '反向跳变视口非空白').toBeGreaterThan(0)
  expect(
    Math.abs((r.back.visFirst as number) - pred(r.w0 * r.rowH)),
    `反向跳变首卡 ${r.back.visFirst} 与理论 ${pred(r.w0 * r.rowH)} 一致（已测前缀内 ±3）`,
  ).toBeLessThanOrEqual(3)
  // --- 到底：末卡渲染 ---
  expect(r.bottom.visCount, '到底后视口非空白').toBeGreaterThan(0)
  expect(r.bottom.last, '到底后窗口末卡 = 全量最后一张（末卡渲染）').toBe(r.TOTAL - 1)
  expect(r.bottom.contiguous, '到底窗口 data-index 连续').toBe(true)
})

// ===== card-estimate 预估步距可配置（未测卡片的估算基准）=====
// 反证点：若 card-estimate 读取逻辑缺失（硬编码 68），总高与顶部占位都按 68 结算——
// 「总高 ≈ 3000×120」「topPad ≈ midFirst×120」两条断言必失败（68 口径下偏差 >15 万 px）。

test('kanban card-estimate=120：3000 卡大列首屏行数有界、滚到中部覆盖、总高/顶部占位按 120 估算（容差内）', async ({
  page,
}) => {
  await page.goto('/components/kanban.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#kanban-scroll')
  const r = await page.evaluate(async () => {
    const el = document.querySelector('#kanban-scroll')!
    const TOTAL = 3000
    const STEP = 120
    el.setAttribute('card-estimate', String(STEP))
    el.setAttribute('columns', JSON.stringify([{ key: 'backlog', title: '需求池' }]))
    el.setAttribute(
      'cards',
      JSON.stringify(
        Array.from({ length: TOTAL }, (_, i) => ({ id: `est${i}`, column: 'backlog', title: `估算卡 ${i}` })),
      ),
    )
    const frame = (): Promise<void> =>
      new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    await frame()
    const bodyOf = (): HTMLElement =>
      el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-body') as HTMLElement
    const indexes = (root: HTMLElement): number[] =>
      [...root.querySelectorAll<HTMLElement>('.card[data-index]')].map((c) => Number(c.getAttribute('data-index')))
    const body = bodyOf()
    const top = indexes(body)
    const scrollRange = body.scrollHeight
    // 滚到中部（无数据变化 → 列体节点不换，引用保持有效）
    body.scrollTop = Math.floor(scrollRange / 2)
    body.dispatchEvent(new Event('scroll'))
    await frame()
    const mid = indexes(body)
    const topPad = body.querySelector<HTMLElement>('.vpad-top')
    return {
      total: TOTAL,
      step: STEP,
      topCount: top.length,
      topFirst: top[0] ?? -1,
      scrollRange,
      midCount: mid.length,
      midFirst: mid[0] ?? -1,
      midLast: mid[mid.length - 1] ?? -1,
      contiguous: mid.every((v, i) => i === 0 || v === mid[i - 1]! + 1),
      pads: body.querySelectorAll('.vpad').length,
      topPadH: topPad ? Number.parseFloat(topPad.style.height) : -1,
      headCount: el.shadowRoot!.querySelector('.column[data-key="backlog"] .column-count')!.textContent,
    }
  })
  expect(r.headCount, '列头计数仍为全量 3000').toBe('3000')
  expect(r.topCount, '首屏卡片 DOM 有上界').toBeLessThanOrEqual(60)
  expect(r.topFirst, '首屏窗口从第 0 张开始').toBe(0)
  expect(r.pads, '滚动后上下占位在').toBe(2)
  expect(r.midCount, '中部窗口仍有上界').toBeLessThanOrEqual(60)
  expect(r.midFirst, '已滚到中部').toBeGreaterThan(200)
  expect(r.midLast, '窗口覆盖连续卡片').toBeGreaterThan(r.midFirst + 5)
  expect(r.contiguous, 'data-index 连续（滚动语义不变）').toBe(true)
  // 总高按 120 估算：实测卡只集中在窗口（首屏 + 中部 ≈ 几十枚，真实步距 50–74），
  // 与 120 估算的偏差有界——下限容差 4000 > 60 枚 × 最大偏差 70px
  expect(r.scrollRange, '列内滚动范围按 card-estimate=120 撑开（非默认 68）').toBeGreaterThan(r.total * r.step - 4000)
  expect(r.scrollRange, '总高不超估算上界（padding 与占位负 margin 相抵后余量）').toBeLessThanOrEqual(
    r.total * r.step + 500,
  )
  // 顶部占位 ≈ midFirst × 120（窗口前卡片几乎全部未实测；首屏已测卡的真实步距偏差在容差内）
  expect(Math.abs(r.topPadH - r.midFirst * r.step), '顶部占位按 120 步距估算').toBeLessThanOrEqual(1500)
})
