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
  // 客服钮初始贴在演示区右下角：向右已贴边（会被钳制），向左上拖才能自由移动
  await dragBy(page, '#dg-button', -60, -40)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#dg-button') as HTMLElement & { position: { x: number; y: number } }
    return {
      position: { ...el.position },
      transform: el.style.transform,
      stored: window.localStorage.getItem('oas-drag-demo-button'),
      feedback: document.querySelector('#dg-button-out')!.textContent ?? '',
    }
  })
  expect(after.position.x, '横向位移应跟手').toBeLessThan(before.x - 30)
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

test('drag：越过阈值拖完后，紧随的 click 被吞掉（落在子按钮的情形），下一次照常到达', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-button')
  // 说明：Chromium 在指针捕获后会把 click 派到最近公共祖先（oas-drag）而非子按钮；
  // 其他引擎 / 捕获失败时 click 会落到子按钮上（历史误触来源）。这里在真实浏览器里
  // 显式把 click 派到子按钮，验证「拖拽后那一次点击被拦下、下一次照常」的机制。
  const result = await page.evaluate(() => {
    const host = document.querySelector('#dg-button') as HTMLElement & { position: { x: number; y: number } }
    const button = document.querySelector('#dg-button oas-button') as HTMLElement
    const w = window as unknown as { __clicks: number }
    w.__clicks = 0
    button.addEventListener('click', () => {
      w.__clicks += 1
    })
    const box = host.getBoundingClientRect()
    const send = (type: string, x: number, y: number): void => {
      host.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 21,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      )
    }
    // 同一任务内完成一次完整拖拽（引擎在 pointerup 之后补发 click）
    send('pointerdown', box.left + 40, box.top + 20)
    send('pointermove', box.left + 40 - 50, box.top + 20 - 30)
    send('pointerup', box.left - 10, box.top - 10)
    const movedX = host.position.x
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    const afterDrag = w.__clicks
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    return { movedX, afterDrag, afterAll: w.__clicks }
  })
  expect(result.movedX, '拖拽本身要生效').toBeLessThan(-20)
  expect(result.afterDrag, '拖拽结束的 click 不得误触子按钮').toBe(0)
  expect(result.afterAll, '之后的正常点击不得被吞掉').toBe(1)
})

test('drag：真实鼠标拖拽后的 click 抑制不泄漏到下一次真实点击', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-button')
  await page.evaluate(() => {
    const w = window as unknown as { __clicks: number }
    w.__clicks = 0
    document.querySelector('#dg-button oas-button')!.addEventListener('click', () => {
      w.__clicks += 1
    })
  })
  const box = await page.locator('#dg-button').boundingBox()
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX - 30, startY - 20, { steps: 4 })
  await page.mouse.move(startX - 50, startY - 30, { steps: 4 })
  await page.mouse.up()
  const movedX = await page.evaluate(
    () => (document.querySelector('#dg-button') as HTMLElement & { position: { x: number } }).position.x,
  )
  expect(movedX, '真实拖拽要生效').toBeLessThan(-20)
  // 真实拖拽后的下一次真实点击（不移动）必须照常到达子元素
  await page.mouse.click(startX - 50, startY - 30)
  const clicks = await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)
  expect(clicks, '拖拽后的正常点击不得被吞掉').toBe(1)
})

// ---------------------------------------------------------------------------
// 惯性（inertia）：真实浏览器里松手续行 / axis 约束 / 边界钳停 / reduced-motion 瞬停
// ---------------------------------------------------------------------------

/** 真实鼠标快速甩动：先滚进视口，再中速跟手、少步数快速位移后松手（最后一步的采样速度决定惯性初速） */
async function flickBy(page: import('@playwright/test').Page, host: string, dx: number): Promise<void> {
  // chip 在页面下方第三个 demo 块：必须先滚进视口，否则鼠标坐标落在元素之外、拖拽静默丢失
  await page.evaluate((sel) => {
    ;(document.querySelector(sel) as HTMLElement).scrollIntoView({ block: 'center', behavior: 'instant' })
  }, host)
  const box = await page.locator(host).boundingBox()
  if (!box) throw new Error(`${host} 无可见矩形`)
  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx / 2, startY, { steps: 4 })
  await page.mouse.move(startX + dx, startY, { steps: 2 })
  await page.mouse.up()
}

/** 部署 data-coasting 生命周期观察：宿主该属性的出现/移除各记一条（ MutationObserver 异步记录不丢帧） */
async function watchCoasting(page: import('@playwright/test').Page, host: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return
    const w = window as unknown as { __coastEvents: string[] }
    w.__coastEvents = []
    new MutationObserver((records) => {
      for (const r of records) w.__coastEvents.push(r.attributeName ?? '')
    }).observe(el, { attributes: true, attributeFilter: ['data-coasting'] })
  }, host)
}

test('drag：inertia 松手后惯性续行，axis="x" 全程 y=0，滑行撞右缘钳停并收尾', async ({ page }) => {
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-chip')
  // 舞台缩到 300px：无论甩动速度高低，滑行都在短距离内撞到右缘 → 几何终值确定（贴缘）
  await page.evaluate(() => {
    ;(document.querySelector('#dg-stage-axis') as HTMLElement).style.width = '300px'
  })
  await watchCoasting(page, '#dg-chip')
  await flickBy(page, '#dg-chip', 120)

  // 等滑行收尾：data-coasting 移除且位置连续两轮轮询一致（不再有任何位移驱动）
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __coastX?: number }
      const el = document.querySelector('#dg-chip') as (HTMLElement & { position: { x: number; y: number } }) | null
      if (!el || el.hasAttribute('data-coasting')) return false
      if (w.__coastX !== el.position.x) {
        w.__coastX = el.position.x
        return false
      }
      return true
    },
    undefined,
    { timeout: 5000, polling: 100 },
  )
  const settled = await page.evaluate(
    () => (document.querySelector('#dg-chip') as HTMLElement & { position: { x: number; y: number } }).position,
  )
  const final = await page.evaluate(() => {
    const el = document.querySelector('#dg-chip') as HTMLElement & { position: { x: number; y: number } }
    const chip = el.getBoundingClientRect()
    const stage = document.querySelector('#dg-stage-axis')!.getBoundingClientRect()
    return {
      position: { ...el.position },
      chipRight: chip.right,
      stageRight: stage.right,
      coastEvents: (window as unknown as { __coastEvents: string[] }).__coastEvents,
      feedback: document.querySelector('#dg-chip-out')!.textContent ?? '',
    }
  })
  expect(final.position, '收尾后位置稳定：不再有任何滑行').toEqual(settled)
  expect(final.position.y, 'axis="x" 惯性只沿横向，y 全程 0').toBe(0)
  expect(final.position.x, '惯性应松手续行（终值明显超过 120px 的跟手位移）').toBeGreaterThan(140)
  expect(final.chipRight, '滑行撞右缘钳停：宿主右缘贴合边界右缘（几何终值）').toBeCloseTo(final.stageRight, 1)
  expect(final.coastEvents, '滑行期间挂 data-coasting（样式据此禁用过渡）且收尾后恰好移除一次').toEqual([
    'data-coasting',
    'data-coasting',
  ])
  expect(final.feedback, '滑行收尾的 oas-drag-end 需要可见的 demo 反馈').toContain('结束')
})

test('drag：prefers-reduced-motion 下 inertia 瞬停（松手跟手位置即终值，不滑行）', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/components/drag.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#dg-chip')
  await watchCoasting(page, '#dg-chip')
  await flickBy(page, '#dg-chip', 80)
  // 瞬停同步收尾：直接等 demo 反馈出现（不固定等待）
  await page.waitForFunction(
    () => (document.querySelector('#dg-chip-out')?.textContent ?? '').includes('结束'),
    undefined,
    { timeout: 5000 },
  )
  const final = await page.evaluate(() => {
    const el = document.querySelector('#dg-chip') as HTMLElement & { position: { x: number; y: number } }
    return {
      position: { ...el.position },
      coastEvents: (window as unknown as { __coastEvents: string[] }).__coastEvents,
      feedback: document.querySelector('#dg-chip-out')!.textContent ?? '',
    }
  })
  expect(final.position, '瞬停：松手跟手位置即终值，不得续行').toEqual({ x: 80, y: 0 })
  expect(final.coastEvents, '瞬停不出现滑行标记').toEqual([])
  expect(final.feedback, '结束事件仍要派发（demo 反馈可见）').toContain('结束')
})
