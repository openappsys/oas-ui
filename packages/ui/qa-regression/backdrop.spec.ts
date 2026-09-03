// 复核回归：backdrop——能力增强缺陷固化（内容插槽点击判定 / persistent shake 反馈 /
// 淡入淡出生命周期事件 / 颜色浓度模糊属性注入）。
// 注：oas-backdrop 宿主零尺寸（display:block 但视觉全屏由内部 fixed .mask 承担），
// Playwright「visible」判定对宿主恒不成立——所有宿主存在性检查用 attached/data-shown。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** demo onMounted 动态 import 就绪后宿主才挂函数，点击前必须等（按钮常驻但回调未注入会静默失败） */
async function waitDemo(page: import('@playwright/test').Page, fn: string) {
  await page.waitForFunction((f) => typeof (window as any)[f] === 'function', fn, {
    timeout: 15000,
  })
}

/** 等 #id 宿主 attached（宿主零尺寸，不可用 visible 判定） */
async function waitHost(page: import('@playwright/test').Page, id: string) {
  await page.waitForSelector(`#${id}`, { state: 'attached', timeout: 8000 })
}

/** 打开「全屏 loading」遮罩（P1 内容插槽 demo） */
test('backdrop 内容插槽：点击内容区不关闭、点击遮罩本体关闭（P1+P5 点击判定）', async ({
  page,
}) => {
  await page.goto('/components/backdrop.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitDemo(page, 'openLoadingBackdrop')
  await page.locator('oas-button', { hasText: '全屏 loading' }).click()
  await waitHost(page, 'backdrop-loading')
  await page.waitForFunction(
    () =>
      document
        .querySelector('#backdrop-loading')
        ?.shadowRoot?.querySelector('[part="content"]') != null,
    null,
    { timeout: 5000 },
  )
  // 点击内容区（slot 内的 oas-spin）：不关闭
  await page.locator('#backdrop-loading oas-spin').click({ force: true })
  await expect(page.locator('#backdrop-loading')).toBeAttached()
  // 点击遮罩本体（角落空白区）：关闭
  await page.mouse.click(30, 30)
  await page.waitForFunction(() => !document.querySelector('#backdrop-loading'), null, {
    timeout: 5000,
  })
})

/** persistent：点遮罩不关闭 + 内容 shake 反馈 + 内容区按钮可关闭 */
test('backdrop persistent：点击遮罩不关闭、内容 shake 反馈、内容区按钮关闭', async ({ page }) => {
  await page.goto('/components/backdrop.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitDemo(page, 'openPersistentBackdrop')
  await page.locator('oas-button', { hasText: '打开持久遮罩' }).click()
  await waitHost(page, 'backdrop-persistent')
  await page.waitForFunction(
    () =>
      document
        .querySelector('#backdrop-persistent')
        ?.shadowRoot?.querySelector('[part="content"]') != null,
    null,
    { timeout: 5000 },
  )
  // 点击遮罩本体（角落）：仍保持打开 + 内容出现 shake 反馈
  await page.mouse.click(30, 30)
  await expect(page.locator('#backdrop-persistent')).toBeAttached()
  await page.waitForFunction(
    () =>
      document
        .querySelector('#backdrop-persistent')
        ?.shadowRoot?.querySelector('[part="content"]')
        ?.classList.contains('oas-shake') === true,
    null,
    { timeout: 5000 },
  )
  // shake 动画结束后 class 移除（可重播）
  await page.waitForFunction(
    () =>
      document
        .querySelector('#backdrop-persistent')
        ?.shadowRoot?.querySelector('[part="content"]')
        ?.classList.contains('oas-shake') === false,
    null,
    { timeout: 5000 },
  )
  // 内容区按钮关闭
  await page.locator('#backdrop-persistent oas-button', { hasText: '我知道了' }).click()
  await page.waitForFunction(() => !document.querySelector('#backdrop-persistent'), null, {
    timeout: 5000,
  })
})

/** 生命周期：oas-after-show / oas-after-close 事件 + 退场后卸载 */
test('backdrop 淡入淡出生命周期：after-show / after-close 事件与卸载', async ({ page }) => {
  await page.goto('/components/backdrop.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.evaluate(() => {
    const el = document.createElement('oas-backdrop')
    el.id = 'backdrop-ev'
    const events: string[] = []
    ;(window as any).__bdEvents = events
    el.addEventListener('oas-after-show', () => events.push('show'))
    el.addEventListener('oas-after-close', () => events.push('close'))
    el.setAttribute('open', '')
    document.body.appendChild(el)
  })
  // 淡入结束后派发 after-show（遮罩进入可见态 data-shown）
  await page.waitForFunction(
    () => (window as any).__bdEvents?.includes('show'),
    null,
    { timeout: 5000 },
  )
  await page.waitForFunction(
    () => document.querySelector('#backdrop-ev')?.hasAttribute('data-shown') === true,
    null,
    { timeout: 5000 },
  )
  // 关闭：退场动画结束后派发 after-close 并卸载节点（无孤儿 DOM）
  await page.evaluate(() => document.getElementById('backdrop-ev')?.removeAttribute('open'))
  await page.waitForFunction(
    () => (window as any).__bdEvents?.includes('close'),
    null,
    { timeout: 5000 },
  )
  await page.waitForFunction(() => !document.querySelector('#backdrop-ev'), null, {
    timeout: 5000,
  })
})

/** 颜色 / 浓度 / 模糊属性注入 scrim（demo 属性存活） */
test('backdrop 颜色/浓度/模糊属性注入 scrim（demo 属性存活）', async ({ page }) => {
  await page.goto('/components/backdrop.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await waitDemo(page, 'openBackdrop')
  // 深色遮罩：color + opacity=thick（color 走 inline background，读 computed 色）
  await page.locator('oas-button', { hasText: '深色遮罩' }).click()
  await waitHost(page, 'backdrop-thick')
  await page.waitForFunction(
    () => {
      const scrim = document
        .querySelector('#backdrop-thick')
        ?.shadowRoot?.querySelector<HTMLElement>('[part="scrim"]')
      return (
        scrim?.style.opacity === '0.75' &&
        getComputedStyle(scrim).backgroundColor === 'rgb(24, 24, 27)'
      )
    },
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => document.getElementById('backdrop-thick')?.removeAttribute('open'))
  await page.waitForFunction(() => !document.querySelector('#backdrop-thick'), null, {
    timeout: 5000,
  })
  // 强模糊 + 饱和：blur 全值
  await page.locator('oas-button', { hasText: '强模糊 + 饱和' }).click()
  await waitHost(page, 'backdrop-blur-strong')
  await page.waitForFunction(
    () => {
      const scrim = document
        .querySelector('#backdrop-blur-strong')
        ?.shadowRoot?.querySelector<HTMLElement>('[part="scrim"]')
      return scrim?.style.backdropFilter === 'blur(8px) saturate(180%)'
    },
    null,
    { timeout: 5000 },
  )
})
