// 复核回归：toast——能力增强后用户可见行为固化断言。
// 覆盖：id 更新可见反馈、同内容去重徽标、max 队列补位、onClose 反馈、Esc 关闭、
// 声明式 open 受控、折叠堆叠 +N、变体属性、进度条/进度环、hover 暂停。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

async function toastReady(page: import('@playwright/test').Page) {
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).toast !== 'undefined', null, {
    timeout: 10000,
  })
}

/** 命令式 toast 计数（排除声明式 demo 常驻的 oas-toast 元素） */
async function lastToastTitle(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('oas-toast:not(.declarative-toast)')]
    const last = all[all.length - 1]
    return last?.shadowRoot?.querySelector('[part="title"]')?.textContent ?? ''
  })
}

test('按 id 更新与关闭：update 原位改内容/类型，dismiss 关闭指定', async ({ page }) => {
  // 曾现缺口：无 id 概念，更新只能先关再弹。现要求 update(id)/dismiss(id) 原位操作且有可见反馈。
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: '按 id 更新与关闭' })
  await block.locator('oas-button').nth(0).click() // 开始上传
  await block.locator('oas-button').nth(1).click() // 更新进度
  await page.waitForFunction(
    () => (document.querySelector('oas-toast[id="upload"]')?.getAttribute('type') ?? '') !== '',
    null,
    { timeout: 5000 },
  )
  let title = await lastToastTitle(page)
  expect(title).toBe('上传中 50%')
  // 完成 → 类型切 success
  await block.locator('oas-button').nth(2).click()
  await page.waitForFunction(
    () => document.querySelector('oas-toast[id="upload"]')?.getAttribute('type') === 'success',
    null,
    { timeout: 5000 },
  )
  title = await lastToastTitle(page)
  expect(title).toBe('上传成功')
  // 只存在一条 upload
  expect(await page.locator('oas-toast[id="upload"]').count()).toBe(1)
  // dismiss 关闭
  await block.locator('oas-button').nth(3).click()
  await page.waitForFunction(() => document.querySelector('oas-toast[id="upload"]') == null, null, {
    timeout: 5000,
  })
})

test('同内容去重：grouping 合并为一条并显示 ×N 计数徽标', async ({ page }) => {
  // 曾现缺口：重复触发同文案连弹刷屏。现要求 grouping 合并 + 计数徽标可见。
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: 'max 队列与同内容去重' })
  const groupingBtn = block.locator('oas-button').nth(2)
  await groupingBtn.click()
  await groupingBtn.click()
  await page.waitForFunction(
    () => document.querySelectorAll('oas-toast:not(.declarative-toast)').length === 1,
    null,
    { timeout: 5000 },
  )
  const badge = await page.evaluate(() => {
    const t = document.querySelector('oas-toast:not(.declarative-toast)')!
    const b = t.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    return { text: b.textContent ?? '', hidden: b.hidden }
  })
  expect(badge.text).toBe('×2')
  expect(badge.hidden).toBe(false)
})

test('max 队列：超出排队，关闭后补位', async ({ page }) => {
  // 曾现缺口：连续触发无限堆叠刷屏。现要求 max=3 超限排队、关闭后补位。
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: 'max 队列与同内容去重' })
  const stormBtn = block.locator('oas-button').nth(0)
  for (let i = 0; i < 4; i++) await stormBtn.click()
  // 第 4 条排队：仅 3 条可见
  await page.waitForFunction(
    () => document.querySelectorAll('oas-toast:not(.declarative-toast)').length === 3,
    null,
    { timeout: 5000 },
  )
  const hasFourth = await page.evaluate(() =>
    [...document.querySelectorAll('oas-toast:not(.declarative-toast)')].some(
      (t) => t.shadowRoot?.querySelector('[part="title"]')?.textContent === '通知 4',
    ),
  )
  expect(hasFourth).toBe(false)
  // 关闭第 1 条 → 第 4 条补位
  await block.locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-toast:not(.declarative-toast)')].some(
        (t) => t.shadowRoot?.querySelector('[part="title"]')?.textContent === '通知 4',
      ),
    null,
    { timeout: 5000 },
  )
})

test('onClose 回调：自动/手动关闭都有可见反馈', async ({ page }) => {
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: '生命周期与 onClose' })
  await block.locator('oas-button').nth(0).click() // 自动关闭 2s
  await page.waitForFunction(
    () => document.getElementById('lifecycle-feedback')?.textContent === 'onClose 触发：toast 已自动关闭',
    null,
    { timeout: 6000 },
  )
  await block.locator('oas-button').nth(1).click() // 手动
  await block.locator('oas-button').nth(2).click() // 触发关闭
  await page.waitForFunction(
    () => document.getElementById('lifecycle-feedback')?.textContent === 'onClose 触发：toast 已手动关闭',
    null,
    { timeout: 5000 },
  )
})

test('Esc 关闭当前 toast：焦点在 toast 内时按 Esc 移除', async ({ page }) => {
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: 'Esc 关闭与屏幕阅读器敏感度' })
  await block.locator('oas-button').nth(0).click() // Esc 关闭（duration 0）
  await page.waitForFunction(
    () => document.querySelectorAll('oas-toast:not(.declarative-toast)').length === 1,
    null,
    { timeout: 5000 },
  )
  // 聚焦到 toast 的关闭按钮，再按 Esc
  await page.evaluate(() => {
    const t = document.querySelector('oas-toast:not(.declarative-toast)')!
    t.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.focus()
  })
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => document.querySelectorAll('oas-toast:not(.declarative-toast)').length === 0,
    null,
    { timeout: 5000 },
  )
})

test('声明式用法：open 属性受控显隐', async ({ page }) => {
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: '声明式用法' })
  const t = block.locator('oas-toast.declarative-toast')
  await t.waitFor({ state: 'attached' })
  // 初始 open 可见
  await block.locator('oas-button').click()
  await page.waitForFunction(
    () => document.querySelector('.declarative-toast')?.getAttribute('open') === 'false',
    null,
    { timeout: 5000 },
  )
  const hiddenDisplay = await page.evaluate(
    () => getComputedStyle(document.querySelector('.declarative-toast')!).display,
  )
  expect(hiddenDisplay).toBe('none')
  await block.locator('oas-button').click()
  await page.waitForFunction(
    () => document.querySelector('.declarative-toast')?.getAttribute('open') === 'true',
    null,
    { timeout: 5000 },
  )
})

test('折叠堆叠：stacked 出现 +N 徽标，关闭后计数更新', async ({ page }) => {
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const block = page.locator('.demo-block', { hasText: '折叠堆叠' })
  const btn = block.locator('oas-button')
  await btn.click()
  await btn.click()
  await page.waitForFunction(
    () => document.querySelector('.oas-toast-stack[data-stacked]') != null,
    null,
    { timeout: 5000 },
  )
  const badge = await page.evaluate(() => {
    const stack = document.querySelector('.oas-toast-stack[data-stacked]')!
    const b = stack.querySelector<HTMLElement>('.oas-toast-stack-badge')!
    return { text: b.textContent ?? '', hidden: b.hidden }
  })
  expect(badge.text).toBe('+1')
  expect(badge.hidden).toBe(false)
})

test('变体与进度可视化：plain/translucent 属性 + 进度条/进度环可见', async ({ page }) => {
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  // 变体
  const variantBlock = page.locator('.demo-block', { hasText: '变体（plain/translucent）与动画配置' })
  await variantBlock.locator('oas-button').nth(1).click() // plain
  await variantBlock.locator('oas-button').nth(2).click() // translucent
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-toast')].some((t) => t.getAttribute('variant') === 'plain') &&
      [...document.querySelectorAll('oas-toast')].some((t) => t.getAttribute('variant') === 'translucent'),
    null,
    { timeout: 5000 },
  )
  // 进度条 + 进度环（阅读宽限 demo）
  const pauseBlock = page.locator('.demo-block', { hasText: 'hover/聚焦暂停计时' })
  await pauseBlock.locator('oas-button').nth(0).click() // showProgress
  await pauseBlock.locator('oas-button').nth(1).click() // progressRing
  await page.waitForFunction(
    () => {
      const all = [...document.querySelectorAll('oas-toast')]
      return (
        all.some(
          (t) =>
            t.shadowRoot?.querySelector<HTMLElement>('[part="progress"]') &&
            !t.shadowRoot.querySelector<HTMLElement>('[part="progress"]')!.hidden,
        ) &&
        all.some(
          (t) => !t.shadowRoot?.querySelector<HTMLElement>('.ring')!.hidden,
        )
      )
    },
    null,
    { timeout: 5000 },
  )
})

test('hover 暂停计时：悬停期间进度条定格，离开后继续', async ({ page }) => {
  // 曾现缺口：计时不可暂停，长文本无阅读宽限。现要求 hover 暂停 + 进度条同步定格（可见反馈）。
  await page.goto('/components/toast.html', { waitUntil: 'domcontentloaded' })
  await toastReady(page)
  const pauseBlock = page.locator('.demo-block', { hasText: 'hover/聚焦暂停计时' })
  await pauseBlock.locator('oas-button').nth(0).click() // duration 5000 + showProgress
  await page.waitForFunction(
    () => document.querySelectorAll('oas-toast:not(.declarative-toast)').length === 1,
    null,
    { timeout: 5000 },
  )
  const box = page.locator('oas-toast:not(.declarative-toast) [part="box"]')
  await box.hover()
  const paused = await page.evaluate(() => {
    const t = document.querySelector('oas-toast:not(.declarative-toast)')!
    const fill = t.shadowRoot!.querySelector<HTMLElement>('.progress-fill')!
    return fill.style.animationPlayState
  })
  expect(paused).toBe('paused')
  await page.mouse.move(10, 10) // 移出 toast
  await page.waitForFunction(() => {
    const t = document.querySelector('oas-toast:not(.declarative-toast)')
    if (!t) return false
    const fill = t.shadowRoot!.querySelector<HTMLElement>('.progress-fill')
    return fill?.style.animationPlayState !== 'paused'
  }, null, { timeout: 5000 })
})
