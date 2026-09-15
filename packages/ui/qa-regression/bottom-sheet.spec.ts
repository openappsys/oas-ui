// 复核回归：bottom-sheet——打开贴底、遮罩/Esc 关闭手势（oas-close reason 区分 + 宿主移除 open）、max-height 限高。
// 注意：demo 的抽屉由按钮动态创建（openBs 每次先移除同 id 旧实例再新建），断言前须等动态实例挂载。

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { up } from './helpers'

// 点 demo 按钮动态创建抽屉，等实例挂载 + shadow 就绪 + open 在场
async function openByButton(page: Page, buttonId: string, sheetId: string) {
  await page.evaluate((id) => {
    ;(document.getElementById(id) as HTMLElement | null)?.click()
  }, buttonId)
  await page.waitForFunction(
    (sid) => {
      const el = document.getElementById(sid)
      return el != null && el.shadowRoot != null && el.hasAttribute('open')
    },
    sheetId,
    { timeout: 5000 },
  )
}

test('bottom-sheet 打开：面板可见且贴视口底边、全宽', async ({ page }) => {
  await page.goto('/components/bottom-sheet.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-bottom-sheet')
  await openByButton(page, 'bs-open', 'bs-basic')
  // 打开动画（translateY 100% → 0）结束后量几何：面板贴底、在视口内可见
  await page.waitForFunction(
    () => {
      const sheet = document.getElementById('bs-basic')?.shadowRoot?.querySelector('[part="sheet"]')
      return sheet != null && sheet.getBoundingClientRect().bottom >= window.innerHeight - 1
    },
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const sheet = document.getElementById('bs-basic')!.shadowRoot!.querySelector<HTMLElement>('[part="sheet"]')!
    const b = sheet.getBoundingClientRect()
    return {
      top: b.top,
      bottom: b.bottom,
      height: b.height,
      left: b.left,
      right: b.right,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }
  })
  expect(r.height).toBeGreaterThan(0)
  expect(r.top, '面板应可见（不整块停在屏幕外）').toBeLessThan(r.vh)
  expect(r.bottom, '面板应贴视口底边').toBeGreaterThanOrEqual(r.vh - 1)
  expect(r.left, '面板应贴左缘（全宽）').toBeLessThanOrEqual(1)
  expect(r.right, '面板应贴右缘（全宽）').toBeGreaterThanOrEqual(r.vw - 1)
})

test('bottom-sheet 点遮罩请求关闭：oas-close reason=backdrop、宿主移除 open、toast 反馈', async ({ page }) => {
  await page.goto('/components/bottom-sheet.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-bottom-sheet')
  await openByButton(page, 'bs-open', 'bs-basic')
  await page.evaluate(() => {
    ;(window as any).__closeDetail = null
    const el = document.getElementById('bs-basic')!
    el.addEventListener('oas-close', (e: Event) => {
      ;(window as any).__closeDetail = (e as CustomEvent).detail
    })
    ;(el.shadowRoot!.querySelector('[part="backdrop"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => (window as any).__closeDetail != null, null, { timeout: 5000 })
  expect(await page.evaluate(() => (window as any).__closeDetail)).toEqual({ reason: 'backdrop' })
  // 受控契约：组件只派发请求，收起由宿主（demo 监听器）移除 open 完成
  await page.waitForFunction(() => !document.getElementById('bs-basic')?.hasAttribute('open'), null, {
    timeout: 5000,
  })
  // demo 用户可见反馈：toast 提示关闭来源（oas-toast 为 shadow 组件，title 在 shadow 内 [part="title"]）
  await page.waitForFunction(
    () => {
      const t = document.querySelector('oas-toast')
      const title = t?.shadowRoot?.querySelector('[part="title"]')?.textContent ?? ''
      return title.includes('点击遮罩')
    },
    null,
    { timeout: 5000 },
  )
})

test('bottom-sheet Esc 关闭：oas-close reason=esc、宿主移除 open', async ({ page }) => {
  await page.goto('/components/bottom-sheet.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-bottom-sheet')
  await openByButton(page, 'bs-open', 'bs-basic')
  // 把焦点放进面板内首个 oas-button 的原生 button（真实焦点位置），Esc 走真实键盘
  await page.evaluate(() => {
    const first = document.getElementById('bs-basic')!.querySelector('oas-button')!
    const native = first.shadowRoot!.querySelector('button')
    ;(native as HTMLElement).focus()
  })
  await page.evaluate(() => {
    ;(window as any).__closeDetail = null
    const el = document.getElementById('bs-basic')!
    el.addEventListener('oas-close', (e: Event) => {
      ;(window as any).__closeDetail = (e as CustomEvent).detail
    })
  })
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => (window as any).__closeDetail != null, null, { timeout: 5000 })
  expect(await page.evaluate(() => (window as any).__closeDetail)).toEqual({ reason: 'esc' })
  await page.waitForFunction(() => !document.getElementById('bs-basic')?.hasAttribute('open'), null, {
    timeout: 5000,
  })
})

test('bottom-sheet max-height 限高：50vh 封顶写入手柄且面板不超限', async ({ page }) => {
  await page.goto('/components/bottom-sheet.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-bottom-sheet')
  await openByButton(page, 'bs-open-capped', 'bs-capped')
  const r = await page.evaluate(() => {
    const sheet = document.getElementById('bs-capped')!.shadowRoot!.querySelector<HTMLElement>('[part="sheet"]')!
    return { maxHeight: sheet.style.maxHeight, height: sheet.getBoundingClientRect().height, vh: window.innerHeight }
  })
  expect(r.maxHeight, 'max-height 值应原样写入面板内联样式').toBe('50vh')
  expect(r.height).toBeGreaterThan(0)
  expect(r.height, '面板实际高度不得超过 50vh').toBeLessThanOrEqual(r.vh * 0.5 + 1)
})
