import { test, expect } from '@playwright/test'

test('prompt-input 回归：输入提交 / 建议回填 / loading 停止', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/prompt-input.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const el = document.querySelector('oas-prompt-input') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
    return !!el?.shadowRoot?.querySelector('[part="textarea"]')
  })
  const basic = page.locator('#prompt-input-basic')
  const textarea = basic.locator('[part="textarea"]')
  await textarea.fill('你好，生成一版')
  await textarea.press('Enter')
  await expect(page.locator('#prompt-input-output')).toContainText('已提交：你好，生成一版')
  await expect(textarea).toHaveValue('')

  await basic.locator('.suggestion', { hasText: '继续写一版' }).click()
  await expect(textarea).toHaveValue('继续写一版')
  await expect(page.locator('#prompt-input-output')).toContainText('继续写一版')

  await page.locator('#prompt-input-stop [part="send"]').click()
  await expect(page.locator('#prompt-input-output')).toContainText('已停止生成')
  await expect(page.locator('#prompt-input-stop [part="send"]')).toHaveText('发送')
  expect(errors).toEqual([])
})
