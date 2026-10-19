import { test, expect } from '@playwright/test'
import { up } from './helpers'

// 回归：titlebar 副标题在 titlebar 自身半透明底上必须达到 WCAG AA 4.5:1。
// 旧实现直接用 --oas-color-text-secondary，VitePress 2 的标题栏底色下实测 4.35。
test('titlebar subtitle 对比度 light/dark 均 ≥ 4.5:1', async ({ page }) => {
  await page.goto('/components/titlebar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-basic')

  for (const theme of ['light', 'dark'] as const) {
    if (theme === 'dark') {
      await page.evaluate(() => document.documentElement.classList.add('dark'))
      await page.waitForTimeout(150)
    }
    const ratio = await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>('#tb-basic')!
      const subtitle = host.shadowRoot!.querySelector<HTMLElement>('[part="subtitle"]')!
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      const rgb = (color: string): [number, number, number] => {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
        return [r!, g!, b!]
      }
      const luminance = (c: [number, number, number]): number => {
        const [r, g, b] = c.map((v) => {
          const n = v / 255
          return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
        }) as [number, number, number]
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const fg = luminance(rgb(getComputedStyle(subtitle).color))
      const bg = luminance(rgb(getComputedStyle(host).backgroundColor))
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
    })
    expect(ratio, `titlebar subtitle ${theme} 对比度应 ≥ 4.5`).toBeGreaterThanOrEqual(4.5)
  }
})
