import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('AI 会话 recipe：流式、停止、失败与重试', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/guide/ai-chat.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.querySelector('#ai-chat-input') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
    return !!el?.shadowRoot?.querySelector('[part="textarea"]')
  })

  const input = page.locator('#ai-chat-input [part="textarea"]')
  const userRows = page.locator('#ai-chat-log oas-message-row[align="end"]')

  await input.fill('测试消息')
  await input.press('Enter')
  await expect(page.locator('#ai-chat-log')).toContainText('测试消息')
  await expect(page.locator('#ai-chat-status')).toHaveText('完成', { timeout: 10_000 })
  await expect(userRows).toHaveCount(1)

  await input.fill('停止测试')
  await input.press('Enter')
  await page.waitForTimeout(80)
  await page.locator('#ai-chat-input [part="send"]').click()
  await expect(page.locator('#ai-chat-status')).toHaveText('已停止', { timeout: 5000 })
  await expect(userRows).toHaveCount(2)

  await page.locator('#ai-chat-fail').click()
  await expect(page.locator('#ai-chat-log')).toContainText('请求失败：网络错误', { timeout: 5000 })
  await expect(userRows, '失败不应重复追加用户消息').toHaveCount(2)
  await page.locator('#ai-chat-retry').click()
  await expect(page.locator('#ai-chat-status')).toHaveText('完成', { timeout: 10_000 })
  await expect(userRows, '重试不应重复追加用户消息').toHaveCount(2)
  const a11y = await new AxeBuilder({ page }).analyze()
  expect(
    a11y.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    a11y.violations.map((v) => v.id).join(', '),
  ).toEqual([])
  expect(errors).toEqual([])
})

test('AI 会话流式期间上翻不被逐 token 拉回', async ({ page }) => {
  await page.goto('/guide/ai-chat.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.querySelector('#ai-chat-log') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
    return !!el?.shadowRoot?.querySelector('[part="viewport"]')
  })
  await page.evaluate(() => {
    const log = document.getElementById('ai-chat-log') as HTMLElement
    log.style.height = '80px'
  })
  const input = page.locator('#ai-chat-input [part="textarea"]')
  await input.fill('上翻阅读测试')
  await input.press('Enter')
  await expect(page.locator('#ai-chat-log')).toContainText('上翻阅读测试')
  // 等流式内容撑出滚动空间后，模拟读者上翻到顶部
  await page.waitForFunction(
    () => {
      const log = document.getElementById('ai-chat-log') as HTMLElement & { shadowRoot?: ShadowRoot | null }
      const vp = log.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]')
      return !!vp && vp.scrollHeight > vp.clientHeight + 20
    },
    undefined,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const log = document.getElementById('ai-chat-log') as HTMLElement & { shadowRoot?: ShadowRoot | null }
    log.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!.scrollTop = 0
  })
  await page.waitForFunction(
    () => {
      const log = document.getElementById('ai-chat-log') as HTMLElement
      const bubbles = log.querySelectorAll('oas-bubble')
      const text = bubbles[bubbles.length - 1]?.textContent ?? ''
      return text.length > 20
    },
    undefined,
    { timeout: 5000 },
  )
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  )
  const scrollTop = await page.evaluate(() => {
    const log = document.getElementById('ai-chat-log') as HTMLElement & { shadowRoot?: ShadowRoot | null }
    return log.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!.scrollTop
  })
  expect(scrollTop, '读者上翻后流式追加不应强制滚底').toBeLessThan(5)
  await page.locator('#ai-chat-input [part="send"]').click()
  await expect(page.locator('#ai-chat-status')).toHaveText('已停止', { timeout: 5000 })
})
