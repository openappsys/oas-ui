// 复核回归：app——命令式消息挂载进最近容器、宿主全部移除后回退 body 固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('app 消息上下文：命令式 message 挂载进 oas-app 容器内（而非 body 直挂）', async ({ page }) => {
  await page.goto('/components/app.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, { timeout: 10000 })
  await page.evaluate(() => (window as any).message.success('挂载进 app'))
  await page.waitForFunction(() => document.querySelector('oas-app oas-message') != null, null, { timeout: 5000 })
  const where = await page.evaluate(() => {
    const msg = document.querySelector('oas-message')!
    const app = msg.closest('oas-app')
    return {
      inApp: app != null,
      stackInApp: app != null && app.contains(msg.parentElement!),
    }
  })
  expect(where.inApp, '消息元素在 app 容器子树内').toBe(true)
  expect(where.stackInApp, '消息栈容器（fixed 定位层）也挂在 app 内').toBe(true)
})

test('app 全部移除后回退 document.body：新消息栈挂 body 直下（宿主出栈接管链路）', async ({ page }) => {
  await page.goto('/components/app.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, { timeout: 10000 })
  await page.evaluate(() => {
    ;(window as any).destroyAllMessage?.()
    document.querySelectorAll('oas-app').forEach((el) => el.remove())
  })
  await page.evaluate(() => (window as any).message.success('回退 body'))
  await page.waitForFunction(
    () => [...document.querySelectorAll('oas-message')].some((m) => m.parentElement?.parentElement === document.body),
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => ({
    appsLeft: document.querySelectorAll('oas-app').length,
    bodyMounted: [...document.querySelectorAll('oas-message')].some(
      (m) => m.parentElement?.parentElement === document.body,
    ),
  }))
  expect(r.appsLeft, 'app 容器已全部移除').toBe(0)
  expect(r.bodyMounted, '无 app 宿主时消息栈回退挂 document.body（不丢消息）').toBe(true)
})
