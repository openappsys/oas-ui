#!/usr/bin/env node
/**
 * RTL 视觉审计 sweep：全组件文档页在 dir=rtl 下的几何检查 + 整页截图产出。
 *
 * 用法：
 *   1. 起静态服务（dist 需为最新）：node scripts/e2e/serve-dist.mjs packages/docs/docs/.vitepress/dist 4201
 *      （或直接用自举封装：pnpm rtl:audit —— 自动起/杀服务）
 *   2. 跑审计：node scripts/e2e/rtl-audit.mjs http://localhost:4201 [输出目录] [--no-shots]
 *   3. 用完杀掉自己起的 4201 服务。
 *
 * 参数：
 *   --no-shots   跳过整页截图（CI 门禁用：只跑几何检查，省时省磁盘）
 *
 * 退出码（门禁语义）：存在 RTL 独有问题或页面错误时 exit 1，全净 exit 0。
 *
 * 产出（默认 .opencode/rtl-audit/，git 排除区）：
 *   - rtl-<组件>.png          RTL 整页截图（供识图 triage）
 *   - report.json             几何检查报告（LTR/RTL 双跑取差集，只报 RTL 独有问题）
 *
 * 几何检查项（客观量测，识图前先过滤）：
 *   - horizontal-overflow：<html> 横向滚动溢出（RTL 下向左溢出，最常见 RTL 缺陷信号）
 *   - demo-out-of-viewport：demo 块矩形越出视口（左缘 <0 或右缘 >视口宽，容差 2px）
 *
 * 交互浮层（popover/menu 下拉打开态）不在此脚本范围——静态 sweep 先行，浮层打开态另批处理。
 */
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, basename, join } from 'node:path'
import { chromium } from '@playwright/test'

const NO_SHOTS = process.argv.includes('--no-shots')
const posArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const base = posArgs[0] ?? 'http://localhost:4201'
const outDir = resolve(posArgs[1] ?? '.opencode/rtl-audit')
mkdirSync(outDir, { recursive: true })

const componentsDir = resolve(process.cwd(), 'packages/docs/docs/components')
const pages = readdirSync(componentsDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))
  .filter((n) => n !== 'index')

const TOLERANCE = 2
const CONCURRENCY = Number(process.env.RTL_AUDIT_WORKERS) || 4

/** 文档站壳层（Vitepress 主题 chrome）RTL 中性化：壳层是站点自身装饰、不在组件库审计范围，
 *  其物理定位（right:0 弹层 / translateX 侧栏）在 documentElement.dir=rtl 下每页恒定制造
 *  +126px 假溢出与截图噪声——统一压回 LTR 布局，检查与截图只看组件内容。 */
const SHELL_NEUTRAL = `
.VPNavBar, .VPNavBar *, .VPMenu, .VPMenu *, .VPSidebar, .VPSidebar *, .VPLocalNav, .VPLocalNav *,
.VPPageNav, .VPPageNav *, .VPDocAside, .VPDocAside *, .VPDocFooter, .VPDocFooter *,
.VPFooter, .VPFooter *, .VPNavScreen, .VPNavScreen *, .VPBackdrop { direction: ltr !important; }
/* 语言切换弹层（.VPNavBar .menu）物理 right:0 锚定，RTL 下悬到视口外制造假溢出——审计装饰件直接隐藏 */
.VPNavBar .menu { display: none !important; }
`

/** 单页几何检查：返回 { ltr: [...], rtl: [...] } 各自的问题清单 */
async function auditPage(browser, name) {
  const context = await browser.newContext({ viewport: { width: 860, height: 800 } })
  const page = await context.newPage()
  // dir 必须在解析期生效：JS 方向判定组件（resolveDirection/isRtl）在 connect 时定型。
  // 文档站 <html> 自带 dir="ltr"（首访语言适配），重复属性首个胜出——先剥旧 dir 再注入。
  // 仅 RTL pass 注册 route：两个 pass 都注入会让 LTR 基线变成「解析期 RTL + 运行时翻回 LTR」，
  // connect 时定型且不观察 dir 的组件在两 pass 同为 RTL，差集漏报其 RTL 独有缺陷（实抓）。
  const run = async (dir) => {
    if (dir === 'rtl') {
      await page.route(`**/components/${name}.html`, async (route) => {
        const res = await route.fetch()
        const body = (await res.text())
          .replace(/(<html[^>]*?)\sdir="[^"]*"/i, '$1')
          .replace(/<html([^>]*)>/i, '<html$1 dir="rtl">')
        await route.fulfill({ response: res, body })
      })
    } else {
      await page.unroute(`**/components/${name}.html`)
    }
    await page.goto(`${base}/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.demo-block', { state: 'attached', timeout: 5000 }).catch(() => {})
    await page.evaluate(
      ({ d, shellNeutral }) => {
        document.documentElement.setAttribute('dir', d)
        if (d === 'rtl') {
          const s = document.createElement('style')
          s.textContent = shellNeutral
          document.head.appendChild(s)
        }
      },
      { d: dir, shellNeutral: SHELL_NEUTRAL },
    )
    await page.waitForTimeout(250)
    return page.evaluate((tol) => {
      const issues = []
      const de = document.documentElement
      if (de.scrollWidth > de.clientWidth + tol) {
        // 抓溢出贡献者明细：可见元素中越出视口的前 8 个（跳过文档站壳层子树）
        const offenders = []
        const vw0 = de.clientWidth
        for (const el of document.querySelectorAll('body *')) {
          if (el.closest && el.closest('.VPNavBar, .VPSidebar')) continue
          const cs = getComputedStyle(el)
          if (cs.display === 'none') continue
          const r = el.getBoundingClientRect()
          if (r.right > vw0 + tol || r.left < -tol) {
            offenders.push(
              `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}] ${cs.position}`,
            )
          }
          if (offenders.length >= 8) break
        }
        issues.push({
          type: 'horizontal-overflow',
          detail: `scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}${offenders.length ? ` :: ${offenders.join(' | ')}` : ' :: (无可见越界元素，疑似瞬时布局)'}`,
        })
      }
      const vw = de.clientWidth
      const blocks = [...document.querySelectorAll('.demo-block')]
      for (const el of blocks) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        if (r.left < -tol || r.right > vw + tol) {
          const label = el.querySelector('.demo-title, h3, h2')?.textContent?.trim() ?? ''
          issues.push({
            type: 'demo-out-of-viewport',
            detail: `left ${Math.round(r.left)} right ${Math.round(r.right)} vw ${vw}${label ? ` :: ${label.slice(0, 40)}` : ''}`,
          })
        }
      }
      return issues
    }, TOLERANCE)
  }
  const ltr = await run('ltr')
  const rtl = await run('rtl')
  // 截图取 RTL 态（当前页面已是 rtl）；--no-shots（CI 门禁）跳过
  if (!NO_SHOTS) await page.screenshot({ path: join(outDir, `rtl-${name}.png`), fullPage: true })
  await context.close()

  const rtlOnly = rtl.filter((x) => !ltr.some((y) => y.type === x.type && y.detail === x.detail))
  return { name, ltrCount: ltr.length, rtlCount: rtl.length, issues: rtlOnly }
}

const browser = await chromium.launch()
const queue = [...pages]
const results = []
async function worker() {
  for (;;) {
    const name = queue.shift()
    if (!name) return
    try {
      results.push(await auditPage(browser, name))
    } catch (e) {
      results.push({ name, error: String(e) })
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
await browser.close()

results.sort((a, b) => a.name.localeCompare(b.name))
const bad = results.filter((r) => r.error || r.issues.length > 0)
writeFileSync(join(outDir, 'report.json'), JSON.stringify({ base, total: results.length, results }, null, 2))
console.log(`[rtl-audit] pages=${results.length} clean=${results.length - bad.length} flagged=${bad.length}`)
for (const r of bad) {
  if (r.error) {
    console.log(`  ERROR ${r.name}: ${r.error}`)
    continue
  }
  for (const i of r.issues) console.log(`  ${r.name}: ${i.type} :: ${i.detail}`)
}
// 门禁语义：有 RTL 独有问题/页面错误即非零退出（CI 与 pre-push 可接）
process.exit(bad.length > 0 ? 1 : 0)
