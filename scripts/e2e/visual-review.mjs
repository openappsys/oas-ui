#!/usr/bin/env node
/**
 * 视觉复核工具（大任务收口必 review 流程的截图臂）：
 * 对指定组件页的全部 demo 块逐一截图（light + dark 双主题），产出供识图复核。
 *
 * 用法：
 *   pnpm visual:review -- calendar carousel tabs        # 三个组件页全量 demo 块
 *   pnpm visual:review -- calendar --dark-only          # 只截 dark
 *   前置：docs dist 已构建（pnpm build）；自举起杀静态服务（VISUAL_REVIEW_PORT 覆盖端口）
 *
 * 产出：.opencode/visual-review/<page>/NN-light.png + NN-dark.png + index.json
 *   （index.json 记录每张图对应的 demo 标题，识图 agent 按标题核对要点）
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const darkOnly = args.includes('--dark-only')
const lightOnly = args.includes('--light-only')
const pages = args.filter((a) => !a.startsWith('--'))

if (pages.length === 0) {
  console.error('用法：pnpm visual:review -- <组件页名...> [--dark-only|--light-only]')
  process.exit(2)
}

const dist = resolve(process.cwd(), 'packages/docs/docs/.vitepress/dist')
if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('[visual-review] docs dist 缺失——先跑 pnpm build')
  process.exit(2)
}

const port = Number(process.env.VISUAL_REVIEW_PORT) || 4202
const base = `http://localhost:${port}`
const server = spawn(process.execPath, ['scripts/e2e/serve-dist.mjs', dist, String(port)], { stdio: 'ignore' })

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/index.html`)
      if (res.ok) return
    } catch {
      /* 未就绪 */
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('serve-dist 未就绪')
}

let code = 0
try {
  await waitReady()
  const browser = await chromium.launch()
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage()
  for (const name of pages) {
    const dir = resolve('.opencode/visual-review', name)
    mkdirSync(dir, { recursive: true })
    await page.goto(`${base}/components/${name}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.demo-block', { state: 'attached', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(400)
    const titles = await page.evaluate(() =>
      [...document.querySelectorAll('.demo-block')].map(
        (b) => b.querySelector('.demo-title, h3, h2')?.textContent?.trim() ?? '',
      ),
    )
    const manifest = []
    const blocks = await page.locator('.demo-block').all()
    for (let i = 0; i < blocks.length; i++) {
      const blk = blocks[i]
      await blk.scrollIntoViewIfNeeded()
      await page.waitForTimeout(200)
      const base2 = `${String(i + 1).padStart(2, '0')}`
      if (!darkOnly) {
        await blk.screenshot({ path: resolve(dir, `${base2}-light.png`) })
        manifest.push({ file: `${base2}-light.png`, title: titles[i] ?? '', theme: 'light' })
      }
      if (!lightOnly) {
        await page.evaluate(() => document.documentElement.classList.add('dark'))
        await page.waitForTimeout(250)
        await blk.screenshot({ path: resolve(dir, `${base2}-dark.png`) })
        await page.evaluate(() => document.documentElement.classList.remove('dark'))
        manifest.push({ file: `${base2}-dark.png`, title: titles[i] ?? '', theme: 'dark' })
      }
    }
    writeFileSync(resolve(dir, 'index.json'), JSON.stringify({ page: name, base, blocks: manifest }, null, 2))
    console.log(`[visual-review] ${name}: ${blocks.length} 块 × ${darkOnly || lightOnly ? 1 : 2} 主题`)
  }
  await browser.close()
} catch (e) {
  console.error('[visual-review]', String(e))
  code = 1
} finally {
  server.kill()
}
process.exit(code)
