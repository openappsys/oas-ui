// 复核回归：share-sheet 打开必须有真焦点与宫格；点击渠道派发 oas-select 后自动关闭；Esc 可退出。
import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('share-sheet 打开 → 焦点入面板 → 点渠道派发并自动关闭 → Esc 关闭', async ({ page }) => {
  await page.goto('/components/share-sheet.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ss-demo')

  const demo = page.locator('#ss-demo')
  const output = page.locator('#ss-output')
  await expect(demo).not.toHaveAttribute('open', /.*/)

  await page.click('#ss-open')
  await expect(demo).toHaveAttribute('open', '')
  await expect(demo.locator('button.channel')).toHaveCount(5)
  const focused = await demo.evaluate((el) => {
    const root = (el as HTMLElement).shadowRoot!
    return root.activeElement?.className ?? ''
  })
  expect(focused).toContain('channel')

  await demo.locator('button.channel', { hasText: '邮件' }).click()
  await expect(output).toHaveText(/已选择：邮件/)
  await expect(demo).not.toHaveAttribute('open', /.*/)

  // 再次打开并 Esc
  await page.click('#ss-open')
  await expect(demo).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(demo).not.toHaveAttribute('open', /.*/)
  await expect(output).toHaveText(/面板关闭：esc/)
})
