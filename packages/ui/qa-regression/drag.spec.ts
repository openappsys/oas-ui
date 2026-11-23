// 用户回归：drag 的真实鼠标拖拽 / 点击阈值 / 手柄形态 / 键盘微调
// 只验证"机制"不够：这里断言真实指针移动后的位移、阈值内的点击、手柄区互斥与键盘可达。

import { expect, test } from '@playwright/test'
import { up } from './helpers'

/** 真实鼠标拖拽：从宿主中心按下并移动 */
async function dragBy(page: import('@playwright/test').Page, host: string, dx: number, dy: number): Promise<void> {
  const box = await page.locator(host).boundingBox()
  if (!box) throw new Error(`${host} 无可见矩形`)
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 })
  await page.mouse.move(startX + dx, startY + dy, { steps: 4 })
  await page.mouse.up()
}

test('drag：真实鼠标拖动客服钮，位移生效、位置记忆落盘、demo 反馈可见', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-button')
  const before = await page.evaluate(() => {
    const el = document.querySelector('#dg-button') as HTMLElement & { position: { x: number; y: number } }
    return { ...el.position, transform: el.style.transform }
  })
  await dragBy(page, '#dg-button', 60, -40)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#dg-button') as HTMLElement & { position: { x: number; y: number } }
    return {
      position: { ...el.position },
      transform: el.style.transform,
      stored: window.localStorage.getItem('oas-drag-demo-button'),
      feedback: document.querySelector('#dg-button-out')!.textContent ?? '',
    }
  })
  expect(after.position.x, '横向位移应跟手').toBeGreaterThan(before.x + 30)
  expect(after.position.y, '纵向位移应跟手').toBeLessThan(before.y - 15)
  expect(after.transform, '位移必须体现在 transform 上（用户可见）').toContain('translate3d')
  expect(JSON.parse(after.stored ?? '{}'), 'remember 开启时应写入 localStorage').toMatchObject({
    x: expect.any(Number),
    y: expect.any(Number),
  })
  expect(after.feedback, 'demo 需要显示拖拽结束后的位置').toContain('客服钮位置结束')
})

test('drag：位移未达 4px 阈值时视为点击，宿主内按钮照常收到 click', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-button')
  await page.evaluate(() => {
    const button = document.querySelector('#dg-button oas-button')!
    ;(window as unknown as { __clicks: number }).__clicks = 0
    button.addEventListener('click', () => {
      ;(window as unknown as { __clicks: number }).__clicks += 1
    })
  })
  const box = await page.locator('#dg-button').boundingBox()
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 2, startY + 1)
  await page.mouse.up()

  const result = await page.evaluate(() => {
    const el = document.querySelector('#dg-button') as HTMLElement & { position: { x: number; y: number } }
    return { position: { ...el.position }, clicks: (window as unknown as { __clicks: number }).__clicks }
  })
  expect(result.position, '阈值内不得产生位移').toEqual({ x: 0, y: 0 })
  expect(result.clicks, '阈值内点击必须传到子元素').toBe(1)
})

test('drag：手柄形态只有手柄区起拖，面板内容区拖动无效', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-panel')
  // 从面板内容区（非手柄）拖动：不应移动
  await page.evaluate(() => {
    const panel = document.querySelector('#dg-panel') as HTMLElement
    const content = panel.querySelector('div:not([slot="handle"])') as HTMLElement
    const box = content.getBoundingClientRect()
    const send = (type: string, x: number, y: number) =>
      content.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 9,
          clientX: x,
          clientY: y,
        }),
      )
    send('pointerdown', box.left + 10, box.top + 10)
    send('pointermove', box.left + 90, box.top + 10)
    send('pointerup', box.left + 90, box.top + 10)
  })
  const untouched = await page.evaluate(
    () => (document.querySelector('#dg-panel') as HTMLElement & { position: { x: number } }).position.x,
  )
  expect(untouched, '内容区不得起拖').toBe(0)

  // 从手柄拖动：应移动
  await page.evaluate(() => {
    const panel = document.querySelector('#dg-panel') as HTMLElement
    const handle = panel.querySelector('[slot="handle"]') as HTMLElement
    const box = handle.getBoundingClientRect()
    const send = (type: string, x: number, y: number) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 9,
          clientX: x,
          clientY: y,
        }),
      )
    send('pointerdown', box.left + 10, box.top + 10)
    send('pointermove', box.left + 70, box.top + 30)
    send('pointerup', box.left + 70, box.top + 30)
  })
  const moved = await page.evaluate(
    () => (document.querySelector('#dg-panel') as HTMLElement & { position: { x: number; y: number } }).position,
  )
  expect(moved.x).toBe(60)
  expect(moved.y).toBe(20)
})

test('drag：键盘方向键微调可聚焦生效，Shift 加速 10px，announce 有 aria-live 播报', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-chip')
  await page.evaluate(() => {
    const el = document.querySelector('#dg-chip') as HTMLElement
    el.focus()
  })
  await page.keyboard.press('ArrowRight')
  const afterOne = await page.evaluate(
    () => (document.querySelector('#dg-chip') as HTMLElement & { position: { x: number } }).position.x,
  )
  expect(afterOne, '单步应为 1px').toBe(1)

  await page.keyboard.down('Shift')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.up('Shift')
  const afterShift = await page.evaluate(() => {
    const el = document.querySelector('#dg-chip') as HTMLElement & { position: { x: number } }
    return {
      x: el.position.x,
      live: el.shadowRoot!.querySelector('[part="live"]')!.textContent ?? '',
      feedback: document.querySelector('#dg-chip-out')!.textContent ?? '',
    }
  })
  expect(afterShift.x, 'Shift 单步应为 10px').toBe(11)
  expect(afterShift.live, 'announce 开启时应有位置播报').not.toBe('')
  expect(afterShift.feedback).toContain('键盘')
})
