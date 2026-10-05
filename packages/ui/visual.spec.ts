import { test } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))

// 文件内 test 并行：每页 1 test 曾串行共享 1 个 worker；各 test 独立 page，截图互不影响
test.describe.configure({ mode: 'parallel' })

for (const name of PAGES) {
  test(`视觉截图：${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 800 })
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    // index 页无 demo-block，等待失败可忽略；其余页等块渲染后截图更稳
    await page.waitForSelector('.demo-block', { state: 'attached', timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(200)
    await shoot(page, `test-results/visual/light-${name}`)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await page.waitForTimeout(300)
    await shoot(page, `test-results/visual/dark-${name}`)
  })
}

/** 分段截图：Firefox 画布上限 32767px（超高页 fullPage 直接协议报错，table 页实抓）——
    超过 16000px 时分段拍摄；visual.spec 只截图供人工审阅，分段不损用途 */
async function shoot(page: import('@playwright/test').Page, stem: string): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  if (height <= 16000) {
    await page.screenshot({ path: `${stem}.png`, fullPage: true })
    return
  }
  const parts = Math.ceil(height / 16000)
  for (let i = 0; i < parts; i++) {
    await page.screenshot({
      path: `${stem}-p${i + 1}.png`,
      // fullPage + clip：clip 取文档坐标（缺省按视口坐标会越界报错）
      fullPage: true,
      clip: { x: 0, y: i * 16000, width: 860, height: Math.min(16000, height - i * 16000) },
    })
  }
}
