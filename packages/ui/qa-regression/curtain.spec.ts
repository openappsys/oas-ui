// 复核回归：curtain 打开覆盖视口、关闭写本地记忆并派发 oas-close、reset 后记忆清空。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('curtain 打开可见 → 关闭写记忆 → reset 清除记忆', async ({ page }) => {
  await page.goto('/components/curtain.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ct-demo')

  const demo = page.locator('#ct-demo')
  const output = page.locator('#ct-output')
  const panel = demo.locator('[part="panel"]')
  await expect(panel).toBeHidden()

  await page.click('#ct-open')
  await expect(panel).toBeVisible()
  const box = await panel.boundingBox()
  expect(box!.width).toBeGreaterThan(200)

  await demo.locator('.close-btn').click()
  await expect(panel).toBeHidden()
  await expect(output).toHaveText(/已关闭（button）/)
  const stored = await page.evaluate(() => window.localStorage.getItem('oas-docs-curtain'))
  expect(stored).toBe('1')

  await page.click('#ct-reset')
  const cleared = await page.evaluate(() => window.localStorage.getItem('oas-docs-curtain'))
  expect(cleared).toBeNull()
  await expect(output).toHaveText(/已清除/)

  // 再次打开并 Esc
  await page.click('#ct-open')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(output).toHaveText(/esc/)
})

test('curtain Tab 域包含插槽内容：链接/按钮不被锁死在关闭按钮', async ({ page }) => {
  await page.goto('/components/curtain.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ct-demo')

  // demo 内容只有段落；注入一个插槽链接模拟「宿主编排的弹窗内容」
  await page.evaluate(() => {
    const host = document.querySelector('#ct-demo')!
    const link = document.createElement('a')
    link.id = 'ct-slot-link'
    link.href = '#more'
    link.textContent = '了解更多'
    host.appendChild(link)
  })
  await page.click('#ct-open')
  await expect(page.locator('#ct-demo')).toHaveAttribute('open', '')

  // 打开时焦点在关闭按钮（shadow 内首端）→ Shift+Tab 必须回绕到插槽末尾链接
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => document.activeElement?.id ?? '')).toBe('ct-slot-link')

  // 插槽链接是 Tab 序末位 → 继续 Tab 必须回到面板内（document.activeElement 重定向为宿主）
  await page.locator('#ct-slot-link').focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.id ?? '')).toBe('ct-demo')
})
