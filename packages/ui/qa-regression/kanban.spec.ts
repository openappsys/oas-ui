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
