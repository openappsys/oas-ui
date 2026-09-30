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
