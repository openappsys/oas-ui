// 复核回归：workbench 悬浮面板 oas-floating-panel。
// 固化点：真实拖拽/八向缩放/受控回写、两面板置前与 z 恒定（不随 open 次数增长）、
// 子浮层 Esc 优先级、受控开合与 before-close 拦截、键盘等价路径（含 RTL）、边界夹取、
// initial-focus、coarse 44px 热区、dark、reduced-motion、axe、console 零告警。
//
// 文档页所有 demo 默认打开；Esc 由「最前」面板消费，故每个用例先关掉与本次无关的面板，
// 避免别的前景面板抢走 Esc（这是正确语义，非缺陷）。

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { up } from './helpers'

type ConsolePage = import('@playwright/test').Page & { __oasConsole: string[] }
type PanelEl = HTMLElement & { show(): void; close(): boolean; bringToFront(): void }

test.beforeEach(async ({ page }) => {
  const p = page as ConsolePage
  p.__oasConsole = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error' && msg.type() !== 'warning') return
    if (/_ga_RXS142HBXF|Google Analytics|gtag/.test(msg.text())) return
    p.__oasConsole.push(`${msg.type()}: ${msg.text()}`)
  })
})

/** 打开页面并只保留指定面板（其余 demo 面板关闭，避免抢 Esc / 焦点） */
async function gotoPage(page: import('@playwright/test').Page, keep: string | string[] = '#fp-basic') {
  const keepIds = Array.isArray(keep) ? keep : [keep]
  await page.goto('/components/floating-panel.html', { waitUntil: 'domcontentloaded' })
  await up(page, keepIds[0]!)
  await page.evaluate((ids) => {
    for (const el of document.querySelectorAll<PanelEl>('oas-floating-panel')) {
      if (el.id && ids.includes(`#${el.id}`)) continue
      if (el.hasAttribute('open')) el.close()
    }
  }, keepIds)
}

/** 读取面板框体几何（视口坐标） */
function frameBox(page: import('@playwright/test').Page, id: string) {
  return page.evaluate((panelId) => {
    const host = document.getElementById(panelId)!
    const frame = host.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const r = frame.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }, id)
}

/** 在 shadow 内目标中心发起真实指针拖拽（先滚入视口中央） */
async function dragShadow(
  page: import('@playwright/test').Page,
  id: string,
  target: { part: 'titlebar' } | { part: 'handle'; edge: string },
  dx: number,
  dy: number,
): Promise<void> {
  const point = await page.evaluate(
    ({ panelId, target }) => {
      const host = document.getElementById(panelId)!
      const root = host.shadowRoot!
      const el =
        target.part === 'titlebar'
          ? root.querySelector<HTMLElement>('[part="titlebar"]')
          : root.querySelector<HTMLElement>(`[part="handle"][data-edge="${target.edge}"]`)
      el!.scrollIntoView({ block: 'center' })
      const r = el!.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    },
    { panelId: id, target },
  )
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 8 })
  await page.mouse.up()
}

const rectAttr = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((panelId) => document.getElementById(panelId)!.getAttribute('rect'), id)

const panelOpen = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((panelId) => document.getElementById(panelId)!.hasAttribute('open'), id)

test('基础渲染与语义：标题/位置/关闭钮/dialog 语义', async ({ page }) => {
  await gotoPage(page)
  const state = await page.evaluate(() => {
    const host = document.getElementById('fp-basic')!
    const root = host.shadowRoot!
    const frame = root.querySelector<HTMLElement>('[part="frame"]')!
    return {
      role: frame.getAttribute('role'),
      ariaModal: frame.getAttribute('aria-modal'),
      labelledby: frame.getAttribute('aria-labelledby'),
      title: root.querySelector('[part="title"]')!.textContent?.trim(),
      closeLabel: root.querySelector('[part="close"]')!.getAttribute('aria-label'),
      handles: root.querySelectorAll('[part="handle"]').length,
      display: getComputedStyle(host).display,
    }
  })
  expect(state.role).toBe('dialog')
  expect(state.ariaModal).toBe('false')
  expect(state.title).toBe('图层')
  expect(state.labelledby, 'aria-labelledby 指向标题元素').toBeTruthy()
  expect(state.closeLabel, '关闭钮有可访问名称').toBe('关闭面板')
  expect(state.handles).toBe(8)
  expect(state.display).not.toBe('none')
  const box = await frameBox(page, 'fp-basic')
  expect(box.width).toBeCloseTo(380, 0)
  expect(box.height).toBeCloseTo(230, 0)

  // 关闭钮：真实点击 → 宿主 hidden（display:none 零几何）
  await page.evaluate(() =>
    (document.getElementById('fp-basic')!.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click(),
  )
  await expect.poll(() => panelOpen(page, 'fp-basic')).toBe(false)
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('fp-basic')!).display)).toBe('none')
})

test('真实拖拽标题移动：rect 提交 + oas-move 可见反馈', async ({ page }) => {
  await gotoPage(page)
  expect(await rectAttr(page, 'fp-basic')).toBe('0,0,380,230')
  await dragShadow(page, 'fp-basic', { part: 'titlebar' }, 60, 40)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('60,40,380,230')
  await expect(page.locator('#fp-basic-out')).toContainText('oas-move')
  await expect(page.locator('#fp-basic-out')).toContainText('60,40,380,230')
  const box = await frameBox(page, 'fp-basic')
  expect(box.width).toBeCloseTo(380, 0)
})

test('四边 / 四角缩放：se 放大、w 左扩、n 上扩', async ({ page }) => {
  await gotoPage(page)
  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'se' }, 40, 30)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('0,0,420,260')
  await expect(page.locator('#fp-basic-out')).toContainText('oas-resize')
  await expect(page.locator('#fp-basic-out')).toContainText('edge=se')

  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'w' }, -30, 0)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('-30,0,450,260')

  await dragShadow(page, 'fp-basic', { part: 'handle', edge: 'n' }, 0, -20)
  await expect.poll(() => rectAttr(page, 'fp-basic')).toBe('-30,-20,450,280')
})

test('受控回写：拖拽事件后宿主把 rect 吸附到 10px 网格', async ({ page }) => {
  await gotoPage(page, '#fp-drag')
  await dragShadow(page, 'fp-drag', { part: 'titlebar' }, 13, 17)
  await expect.poll(() => rectAttr(page, 'fp-drag')).toBe('10,20,320,190')
  await expect(page.locator('#fp-drag-out')).toContainText('宿主回写 rect="10,20,320,190"')
})

test('受控开合与 before-close 拦截：show/close/关闭钮/Esc', async ({ page }) => {
  await gotoPage(page, '#fp-ctrl')

  // close() 放行 → 关闭 + open-change 反馈
  await page.locator('#fp-close').click()
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(false)
  await expect(page.locator('#fp-ctrl-out')).toContainText('oas-open-change')
  await expect(page.locator('#fp-ctrl-out')).toContainText('open=false')

  // show() → 重新打开（open-change 可见反馈）
  await page.locator('#fp-open').click()
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(true)
  await expect(page.locator('#fp-ctrl-out')).toContainText('open=true')

  // 拦截关闭：关闭钮不发 open-change、保持打开
  await page.locator('#fp-veto').check()
  await page.evaluate(() =>
    (document.getElementById('fp-ctrl')!.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click(),
  )
  await expect(page.locator('#fp-ctrl-out')).toContainText('preventDefault')
  expect(await panelOpen(page, 'fp-ctrl'), 'before-close 否决后保持打开').toBe(true)

  // 取消拦截后 Esc 关闭
  await page.locator('#fp-veto').uncheck()
  await page.mouse.click(5, 5)
  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-ctrl')).toBe(false)
  await expect(page.locator('#fp-ctrl-out')).toContainText('reason=esc')
})

test('两面板置前 + z-index 不随 open 次数增长（恒定两档）', async ({ page }) => {
  await gotoPage(page, ['#fp-a', '#fp-b'])
  const zOf = (id: string) =>
    page.evaluate((panelId) => {
      const frame = document.getElementById(panelId)!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
      return Number(getComputedStyle(frame).zIndex)
    }, id)

  // 点击 A → A 置前 + 可见反馈
  await page.evaluate(() => document.getElementById('fp-a')!.scrollIntoView({ block: 'center' }))
  const a = await frameBox(page, 'fp-a')
  await page.mouse.click(a.x + 20, a.y + 12)
  await expect(page.locator('#fp-front-out')).toContainText('fp-a 置前')
  expect(await zOf('fp-a')).toBeGreaterThan(await zOf('fp-b'))

  // 点击 B 未被 A 遮挡的区域 → B 置前
  const b = await frameBox(page, 'fp-b')
  await page.mouse.click(b.x + b.width - 20, b.y + b.height - 12)
  await expect(page.locator('#fp-front-out')).toContainText('fp-b 置前')
  expect(await zOf('fp-b')).toBeGreaterThan(await zOf('fp-a'))

  // open/close 反复 10 轮：z 只出现两个值（不增长）
  const seen = await page.evaluate(() => {
    const el = document.getElementById('fp-a') as PanelEl
    const frame = el.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
    const values = new Set<string>()
    for (let i = 0; i < 10; i++) {
      el.show()
      values.add(getComputedStyle(frame).zIndex)
      el.close()
      values.add(getComputedStyle(frame).zIndex)
    }
    return [...values]
  })
  expect(seen).toHaveLength(2)
})

test('子浮层 Esc 优先级：先关 dropdown、再关面板', async ({ page }) => {
  await gotoPage(page, '#fp-nest')
  const dropdownOpen = () => page.evaluate(() => document.getElementById('fp-nest-dd')!.hasAttribute('open'))

  await page.locator('#fp-nest oas-dropdown oas-button').click()
  await expect.poll(dropdownOpen).toBe(true)
  await expect(page.locator('#fp-nest-out')).toContainText('dropdown open=true')

  await page.keyboard.press('Escape')
  await expect.poll(dropdownOpen).toBe(false)
  expect(await panelOpen(page, 'fp-nest'), '第一次 Esc 只关子浮层').toBe(true)
  await expect(page.locator('#fp-nest-out')).toContainText('dropdown open=false')

  await page.keyboard.press('Escape')
  await expect.poll(() => panelOpen(page, 'fp-nest')).toBe(false)
})

test('键盘等价路径：方向键移动 / Shift+方向键缩放 / RTL 镜像', async ({ page }) => {
  await gotoPage(page, ['#fp-key', '#fp-rtl'])
  // 首帧即打开不抢焦点；关闭后 show 走 opened 边沿 → initial-focus 生效
  await page.evaluate(() => {
    const el = document.getElementById('fp-key') as PanelEl
    el.close()
    el.show()
  })
  await expect.poll(() => page.evaluate(() => document.activeElement?.id ?? '')).toBe('fp-key-target')

  // 聚焦面板框体后方向键移动
  await page.evaluate(() =>
    (document.getElementById('fp-key')!.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus(),
  )
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => rectAttr(page, 'fp-key')).toBe('8,0,340,190')
  await expect(page.locator('#fp-key-out')).toContainText('oas-move（keyboard）')
  await page.keyboard.press('Shift+ArrowDown')
  await expect.poll(() => rectAttr(page, 'fp-key')).toBe('8,0,340,198')

  // RTL：ArrowRight 朝书写前进方向（x 减小）
  await page.evaluate(() =>
    (document.getElementById('fp-rtl')!.shadowRoot!.querySelector('[part="frame"]') as HTMLElement).focus(),
  )
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => rectAttr(page, 'fp-rtl')).toBe('-8,0,320,170')
})

test('边界夹取：拖出虚线框仍停在边界内（boundary + padding）', async ({ page }) => {
  await gotoPage(page, '#fp-bound')
  const bounds = await page.evaluate(() => {
    const el = document.getElementById('fp-bounds')!
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  expect(bounds.width, '演示边界容器有真实宽度').toBeGreaterThan(300)
  await dragShadow(page, 'fp-bound', { part: 'titlebar' }, 500, 300)
  const rect = (await rectAttr(page, 'fp-bound'))!.split(',').map(Number)
  expect(rect[0], '确实发生了拖动（未被夹在起点）').toBeGreaterThan(16)
  expect(rect[1]).toBeGreaterThan(16)
  expect(rect[0]).toBeGreaterThanOrEqual(8)
  expect(rect[1]).toBeGreaterThanOrEqual(8)
  expect(rect[0], 'X 被夹在边界内（左边 + padding）').toBeLessThanOrEqual(bounds.width - 260 - 8)
  expect(rect[1], 'Y 被夹在边界内（上边 + padding）').toBeLessThanOrEqual(bounds.height - 180 - 8)
  await expect(page.locator('#fp-bound-out')).toContainText('oas-move')
})

test('dark 主题 + reduced-motion + console 零告警', async ({ page }) => {
  await gotoPage(page)
  const bgOf = () =>
    page.evaluate(() => {
      const frame = document.getElementById('fp-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
      return getComputedStyle(frame).backgroundColor
    })
  const lightBg = await bgOf()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(150)
  const darkBg = await bgOf()
  expect(darkBg, '暗色下表面色随 token 变化').not.toBe(lightBg)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const transition = await page.evaluate(() => {
    const close = document.getElementById('fp-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!
    return getComputedStyle(close).transitionDuration
  })
  expect(parseFloat(transition), `reduced-motion 下过渡降级（实测 ${transition}）`).toBeLessThan(0.001)

  expect((page as ConsolePage).__oasConsole).toEqual([])
})

test('axe：面板无 critical/serious 违规', async ({ page }) => {
  await gotoPage(page, ['#fp-basic', '#fp-ctrl', '#fp-nest'])
  const results = await new AxeBuilder({ page }).include('#fp-basic').include('#fp-ctrl').include('#fp-nest').analyze()
  const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

test.describe('coarse 指针热区', () => {
  test.use({ hasTouch: true, isMobile: true })
  test.skip(({ browserName }) => browserName !== 'chromium', 'pointer: coarse 仅在 Chromium 移动仿真下可验证')

  test('手柄与关闭钮 44px 触控热区', async ({ page }) => {
    await gotoPage(page)
    const sizes = await page.evaluate(() => {
      const root = document.getElementById('fp-basic')!.shadowRoot!
      const handle = root.querySelector<HTMLElement>('[part="handle"][data-edge="se"]')!
      const close = root.querySelector<HTMLElement>('[part="close"]')!
      const hr = handle.getBoundingClientRect()
      const cr = close.getBoundingClientRect()
      return { handle: { w: hr.width, h: hr.height }, close: { w: cr.width, h: cr.height } }
    })
    expect(sizes.handle.w).toBeGreaterThanOrEqual(44)
    expect(sizes.handle.h).toBeGreaterThanOrEqual(44)
    expect(sizes.close.w).toBeGreaterThanOrEqual(44)
    expect(sizes.close.h).toBeGreaterThanOrEqual(44)
  })
})
