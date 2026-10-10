#!/usr/bin/env node
/**
 * 生成文档站社交分享图 og-image.jpg（1200×630，JPEG q90），写入 packages/docs/docs/public/。
 * 用 Playwright Chromium 渲染内联 HTML 截图——无需额外图形依赖（Chromium 已在 devDependencies）。
 * 选 JPEG 而非 PNG：内容是渐变+文字，JPEG 压缩率远高（PNG 对平滑渐变最差）；且 JPEG 跨社交抓取器
 * （Facebook/X/LinkedIn/Slack/WeChat）兼容最广——og:image 由抓取器服务端拉取，不进页面加载路径。
 * 改设计后重跑：node scripts/docs/gen-og-image.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const OUT = resolve(import.meta.dirname, '../../packages/docs/docs/public/og-image.jpg')

const HTML = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    font-family: 'Segoe UI', 'Microsoft YaHei', system-ui, sans-serif;
    background: radial-gradient(120% 120% at 15% 10%, #1f7ae0 0%, #0a1a3a 55%, #060f24 100%);
    color: #fff; position: relative;
  }
  .grid {
    position: absolute; inset: 0; opacity: .14;
    background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px);
    background-size: 60px 60px;
    -webkit-mask-image: radial-gradient(90% 90% at 30% 30%, #000 30%, transparent 85%);
    mask-image: radial-gradient(90% 90% at 30% 30%, #000 30%, transparent 85%);
  }
  .glow {
    position: absolute; width: 820px; height: 820px; right: -260px; top: -300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(56,150,255,.55), transparent 62%);
  }
  .wrap { position: relative; padding: 88px 92px; height: 100%; display: flex; flex-direction: column; justify-content: center; }
  .eyebrow { display: inline-flex; align-items: center; gap: 12px; font-size: 24px; letter-spacing: 6px; color: #9fc4ff; font-weight: 600; }
  .eyebrow i { width: 34px; height: 4px; border-radius: 2px; background: #4c9bff; display: inline-block; }
  h1 { font-size: 132px; line-height: 1; letter-spacing: -2px; font-weight: 800; margin: 26px 0 18px; }
  .sub { font-size: 38px; color: #dbe7ff; font-weight: 500; }
  .foot { position: absolute; left: 92px; bottom: 70px; font-size: 26px; color: #8fb6f0; letter-spacing: 1px; }
  .foot b { color: #fff; font-weight: 700; }
</style></head><body>
  <div class="glow"></div><div class="grid"></div>
  <div class="wrap">
    <span class="eyebrow"><i></i>WEB COMPONENTS</span>
    <h1>OAS-UI</h1>
    <div class="sub">框架无关的 Web Components UI 组件库</div>
  </div>
  <div class="foot"><b>oas-ui.dev</b> · 一套组件，到处运行</div>
</body></html>`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.setContent(HTML, { waitUntil: 'networkidle' })
await page.waitForTimeout(150)
const buf = await page.screenshot({ type: 'jpeg', quality: 90 })
await browser.close()

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, buf)
console.log(`[og-image] wrote ${OUT} (${buf.length} bytes)`)
