// 复核回归：loading-bar——本批能力固化断言（会话计数/局部容器/增量控制/生命周期事件/error 兜底/位置）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 文档页上的加载条元素列表（含 local 容器内的） */
async function bars(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('oas-loading-bar')].map((el) => ({
      status: el.getAttribute('status'),
      ariaBusy: el.getAttribute('aria-busy'),
      local: el.hasAttribute('local'),
      rect: el.getBoundingClientRect(),
    })),
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/components/loading-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).lbLog === 'function', null, {
    timeout: 10000,
  })
})

test('基础：开始出现加载条（aria-busy），立即完成淡出移除', async ({ page }) => {
  await page.getByRole('button', { name: '开始加载' }).click()
  await page.waitForFunction(
    () => document.querySelector('oas-loading-bar')?.getAttribute('aria-busy') === 'true',
    null,
    { timeout: 5000 },
  )
  await page.getByRole('button', { name: '立即完成' }).click()
  await page.waitForFunction(() => document.querySelector('oas-loading-bar') === null, null, {
    timeout: 5000,
  })
})

test('会话计数：A+B 计数 2，每完成一个减一，最后一个才移除', async ({ page }) => {
  await page.getByRole('button', { name: '开始任务 A' }).click()
  await page.getByRole('button', { name: '开始任务 B' }).click()
  await page.waitForFunction(() => document.getElementById('lb-count')?.textContent === '2', null, {
    timeout: 5000,
  })
  await page.getByRole('button', { name: '完成一个任务' }).click()
  // 仍有一个会话活跃：条还在，计数 1
  await page.waitForFunction(() => document.getElementById('lb-count')?.textContent === '1', null, {
    timeout: 5000,
  })
  expect(await page.locator('oas-loading-bar').count()).toBe(1)
  await page.getByRole('button', { name: '完成一个任务' }).click()
  await page.waitForFunction(() => document.querySelector('oas-loading-bar') === null, null, {
    timeout: 5000,
  })
})

test('局部容器：条挂进指定容器（local 属性），全局宿主无条', async ({ page }) => {
  await page.locator('#lb-local-btn').click()
  await page.waitForFunction(
    () => document.querySelector('#lb-local-box oas-loading-bar') !== null,
    null,
    { timeout: 5000 },
  )
  const list = await bars(page)
  expect(list.length).toBe(1)
  expect(list[0]!.local).toBe(true)
  // 相对容器顶部：条上边缘贴近容器顶部（非视口顶部）
  const box = await page.locator('#lb-local-box').boundingBox()
  expect(box).not.toBeNull()
  expect(Math.abs(list[0]!.rect.top - box!.y)).toBeLessThan(2)
})

test('位置：bottom 条贴视口底部', async ({ page }) => {
  await page.getByRole('button', { name: '底部', exact: true }).click()
  await page.waitForFunction(
    () => document.querySelector('oas-loading-bar')?.getAttribute('position') === 'bottom',
    null,
    { timeout: 5000 },
  )
  const list = await bars(page)
  const vh = page.viewportSize()?.height ?? 0
  expect(vh - list[0]!.rect.bottom).toBeLessThan(2)
})

test('增量控制：开始后推进 10，进度显示 >0', async ({ page }) => {
  await page.locator('#lb-inc-start').click()
  await page.getByRole('button', { name: '推进 10' }).click()
  await page.waitForFunction(
    () => {
      const t = document.getElementById('lb-progress')
      const v = t?.textContent ?? '—'
      return v !== '—' && Number.parseInt(v, 10) > 0
    },
    null,
    { timeout: 5000 },
  )
})

test('生命周期事件：报错后事件日志显示 oas-error', async ({ page }) => {
  await page.getByRole('button', { name: '报错', exact: true }).click()
  await page.waitForFunction(
    () => document.getElementById('lb-log')?.textContent?.includes('oas-error') ?? false,
    null,
    { timeout: 5000 },
  )
})

test('error 兜底：未 start 直接报错 → 错误态收尾，日志无 oas-start', async ({ page }) => {
  await page.getByRole('button', { name: '直接报错' }).click()
  await page.waitForFunction(
    () => document.querySelector('oas-loading-bar')?.getAttribute('status') === 'error',
    null,
    { timeout: 5000 },
  )
  const log = await page.locator('#lb-log').textContent()
  expect(log).not.toContain('oas-start')
  // 淡出后移除
  await page.waitForFunction(() => document.querySelector('oas-loading-bar') === null, null, {
    timeout: 5000,
  })
})
