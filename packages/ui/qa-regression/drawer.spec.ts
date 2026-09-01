// 复核回归：drawer——能力增强（P1-P18）用户视角断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('drawer 四向 placement：top/bottom 抽屉贴视口边缘、size 纵向生效', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.evaluate(() => {
    document.querySelector('#drawer-top')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#drawer-top')
      return el?.shadowRoot?.querySelector('[part="panel"]')?.getAttribute('data-open') === ''
    },
    null,
    { timeout: 5000 },
  )
  const top = await page.evaluate(() => {
    const el = document.querySelector('#drawer-top')!
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const r = panel.getBoundingClientRect()
    return {
      placement: panel.getAttribute('data-placement'),
      top: r.top,
      height: panel.style.height,
      vh: window.innerHeight,
    }
  })
  expect(top.placement).toBe('top')
  expect(top.top).toBeLessThanOrEqual(1)
  expect(top.height).toBe('256px') // size=small 纵向映射高度

  await page.evaluate(() => {
    document.querySelector('#drawer-bottom')?.setAttribute('visible', '')
  })
  const bottom = await page.evaluate(() => {
    const el = document.querySelector('#drawer-bottom')!
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="panel"]')!
    const r = panel.getBoundingClientRect()
    return { bottom: r.bottom, vh: window.innerHeight, height: panel.style.height }
  })
  expect(bottom.bottom).toBeGreaterThanOrEqual(bottom.vh - 1)
  expect(bottom.height).toBe('360px') // width=360px 纵向映射高度
})

test('drawer 生命周期事件：open/opened/close(source)/closed 依次派发', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.evaluate(() => {
    const el = document.querySelector('#drawer-life')!
    const events: string[] = []
    ;(window as any).__drawerEvents = events
    for (const name of ['open', 'opened', 'close', 'closed']) {
      el.addEventListener(`oas-${name}`, (e: Event) => {
        events.push(`${name}:${(e as CustomEvent).detail?.source ?? ''}`)
      })
    }
    el.setAttribute('visible', '')
  })
  await page.waitForFunction(() => (window as any).__drawerEvents.includes('opened:'), null, {
    timeout: 5000,
  })
  await page.evaluate(() => {
    const el = document.querySelector('#drawer-life')!
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => (window as any).__drawerEvents.includes('closed:'), null, {
    timeout: 5000,
  })
  const events: string[] = await page.evaluate(() => (window as any).__drawerEvents)
  expect(events[0]).toBe('open:')
  expect(events[1]).toBe('opened:')
  expect(events).toContain('close:close') // ✕ 关闭来源
  expect(events[events.length - 1]).toBe('closed:')
})

test('drawer 关闭拦截：before-close preventDefault 保持打开并弹提示，确定放行', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    document.querySelector('#drawer-guard')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => document.querySelector('#drawer-guard')?.hasAttribute('visible') === true,
    null,
    { timeout: 5000 },
  )
  // 点取消 → 被拦截：保持打开 + warning 消息
  await page.evaluate(() => {
    const el = document.querySelector('#drawer-guard')!
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
  })
  expect(
    await page.evaluate(() => document.querySelector('#drawer-guard')?.hasAttribute('visible')),
  ).toBe(true)
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  // 点确定 → 放行关闭
  await page.evaluate(() => {
    const el = document.querySelector('#drawer-guard')!
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => !document.querySelector('#drawer-guard')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
})

test('drawer 嵌套层级：后开者盖先开者，Esc 逐层关闭', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.evaluate(() => {
    document.querySelector('#drawer-outer')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => document.querySelector('#drawer-outer')?.hasAttribute('visible') === true,
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    document.querySelector('#drawer-inner')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => document.querySelector('#drawer-inner')?.hasAttribute('visible') === true,
    null,
    { timeout: 5000 },
  )
  const zs = await page.evaluate(() => {
    const z = (el: Element | null): string | null =>
      el?.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.style.zIndex ?? null
    return {
      outer: z(document.querySelector('#drawer-outer')),
      inner: z(document.querySelector('#drawer-inner')),
    }
  })
  // 内层（后开）偏移更高
  const outerZ = Number(zs.outer?.match(/\+ (\d+)\)$/)?.[1] ?? 0)
  const innerZ = Number(zs.inner?.match(/\+ (\d+)\)$/)?.[1] ?? 0)
  expect(innerZ).toBeGreaterThan(outerZ)
  // Esc 先关内层
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !document.querySelector('#drawer-inner')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
  expect(
    await page.evaluate(() => document.querySelector('#drawer-outer')?.hasAttribute('visible')),
  ).toBe(true)
  // 再 Esc 关外层
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => !document.querySelector('#drawer-outer')?.hasAttribute('visible'),
    null,
    { timeout: 5000 },
  )
})

test('drawer resizable：拖拽调宽生效并弹出 oas-resize 提示', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    document.querySelector('#drawer-resize')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => {
    const rail = document
      .querySelector('#drawer-resize')
      ?.shadowRoot?.querySelector<HTMLElement>('[part="rail"]')
    return rail != null && !rail.hasAttribute('hidden')
  })
  const railBox = await page.evaluate(() => {
    const rail = document
      .querySelector('#drawer-resize')!
      .shadowRoot!.querySelector<HTMLElement>('[part="rail"]')!
    const r = rail.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  // 拖拽调宽（右抽屉：向左拖变宽）
  await page.mouse.move(railBox.x, railBox.y)
  await page.mouse.down()
  await page.mouse.move(railBox.x - 120, railBox.y, { steps: 5 })
  await page.mouse.up()
  const width = await page.evaluate(
    () => document.querySelector('#drawer-resize')?.getAttribute('width'),
  )
  expect(width).toMatch(/^6\d\dpx$/) // 480 + 120 ≈ 600
  await page.waitForFunction(
    () => document.querySelectorAll('oas-message').length > 0,
    null,
    { timeout: 5000 },
  )
})

test('drawer 命令式 API：drawer() 打开、handle.close 播放动画后销毁', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).openImperative === 'function', null, {
    timeout: 10000,
  })
  await page.evaluate(() => {
    ;(window as any).openImperative()
  })
  await page.waitForFunction(() => document.querySelector('oas-drawer[visible]') != null, null, {
    timeout: 5000,
  })
  // 命令式抽屉自动 5s 后 handle.close（close 事件携带 api 来源、动画后销毁）
  await page.waitForFunction(() => document.querySelectorAll('oas-drawer').length === 0, null, {
    timeout: 10000,
  })
})

test('drawer 初始焦点：initial-focus 打开即聚焦指定输入框', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.evaluate(() => {
    document.querySelector('#drawer-focus')?.setAttribute('visible', '')
  })
  await page.waitForFunction(() => {
    const el = document.querySelector('#drawer-focus')
    return el?.shadowRoot?.querySelector('[part="panel"]')?.getAttribute('data-open') === ''
  })
  const active = await page.evaluate(() => {
    const ae = document.activeElement
    return ae?.id ?? (ae as HTMLElement | null)?.tagName ?? ''
  })
  expect(active).toBe('task-name') // oas-input 内部 input 的 id 透传
})

test('drawer destroy-on-close：关闭动画结束后内容清空', async ({ page }) => {
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  await page.evaluate(() => {
    document.querySelector('#drawer-destroy')?.setAttribute('visible', '')
  })
  await page.waitForFunction(
    () => document.querySelector('#drawer-destroy')?.hasAttribute('visible') === true,
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#drawer-destroy')!
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#drawer-destroy')?.children.length === 0,
    null,
    { timeout: 5000 },
  )
})

test('drawer 面板打开后可视位置在视口内（CSS 顺序回归：placement 关闭位 transform 不得覆盖 data-open 打开位）', async ({ page }) => {
  // 曾漏检：placement 规则后置覆盖 .panel[data-open] { transform: none }，面板 data-open 在、
  // 机制断言全绿，但视觉上永远停在屏幕外（left:-360 / right:1280）。本断言锚定可视位置。
  await page.goto('/components/drawer.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-drawer')
  const open = (label: string) => ({
    label,
    act: async () => {
      await page.evaluate((l) => {
        const btn = [...document.querySelectorAll('oas-button')].find(
          (x): x is HTMLElement => (x.textContent || '').includes(l),
        )
        btn?.click()
      }, label)
      await page.waitForTimeout(900)
    },
  })
  for (const { label, act } of [open('左侧抽屉'), open('右侧抽屉'), open('顶部抽屉'), open('底部抽屉')]) {
    await act()
    const r = await page.evaluate(() => {
      const panel = [...document.querySelectorAll('oas-drawer')]
        .map((d) => d.shadowRoot!.querySelector<HTMLElement>('[part="panel"]'))
        .find((p) => p?.hasAttribute('data-open'))
      if (!panel) return null
      const b = panel.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      return { x: b.x, y: b.y, w: b.width, h: b.height, vw, vh }
    })
    expect(r, label + '：应有一个 data-open 面板').not.toBeNull()
    expect(
      r!.x >= 0 && r!.x + r!.w <= r!.vw + 1 && r!.y >= 0 && r!.y + r!.h <= r!.vh + 1,
      label + '：面板应完整落在视口内（实测 ' + JSON.stringify(r) + '）',
    ).toBe(true)
    // 关闭当前，避免影响下一个 placement 的查找
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
  }
})
