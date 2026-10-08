#!/usr/bin/env node
/**
 * RTL 交互态审计：浮层组件在 dir=rtl 下的打开态 sweep（承接 rtl-audit 静态几何轮）。
 *
 * 用法：pnpm rtl:audit:interactive [-- --no-shots]
 * （自举封装同 rtl-audit-gate：本脚本要求 base 服务已在跑；直接 node 调用时传 base URL）
 *
 * 检查项（每组件真实打开态）：
 *   - panel-visible：面板真实可见（非 hidden、有非零矩形）
 *   - panel-in-viewport：面板横向不越视口（RTL 右缘溢出/翻转失效的主抓信号，容差 2px）
 *   - placement-mirror：面板带 data-placement 时，RTL 下 start/end 应相对 LTR 基线镜像
 *     （同页先跑一遍 LTR 取基线；无 data-placement 的组件跳过本项）
 *
 * 产出：.opencode/rtl-audit/interactive-report.json + （可选）打开态截图。
 * 退出码：有问题 exit 1，全净 exit 0。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { chromium } from '@playwright/test'

const NO_SHOTS = process.argv.includes('--no-shots')
const posArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const base = posArgs[0] ?? 'http://localhost:4201'
const outDir = resolve(posArgs[1] ?? '.opencode/rtl-audit')
mkdirSync(outDir, { recursive: true })

const TOLERANCE = 2

/**
 * 覆盖清单：浮层组件 20 件。
 * - open: 'click' 点击触发器（shadow 内 .trigger / [part="trigger"] / 首个 button）；
 *         'hover' 真实鼠标悬停宿主；'demo-button' 点 demo 块内第一个 oas-button（drawer/modal 类）
 * - panel: shadow 内面板选择器（取第一个可见者）
 */
const COMPONENTS = [
  { name: 'popover', open: 'click-slot', panel: '.popover, [part="popover"], [part="panel"]' },
  { name: 'tooltip', open: 'hover', panel: '.tooltip, [part="tooltip"], [role="tooltip"]' },
  { name: 'hover-card', open: 'hover', panel: '.hover-card, [part="panel"], [part="card"]' },
  { name: 'dropdown', open: 'click', panel: '.dropdown, [part="dropdown"], [part="menu"], [role="menu"]' },
  { name: 'context-menu', open: 'contextmenu', panel: '[role="menu"], .menu, [part="menu"]' },
  { name: 'select', open: 'click', panel: '.dropdown, [part="dropdown"], [role="listbox"]' },
  { name: 'combobox', open: 'type', panel: '.dropdown, [part="dropdown"], [role="listbox"]' },
  { name: 'auto-complete', open: 'type', panel: '.dropdown, [part="dropdown"], [role="listbox"]' },
  { name: 'tree-select', open: 'click', panel: '.dropdown, [part="dropdown"], [role="tree"]' },
  { name: 'cascader', open: 'click', panel: '.dropdown, [part="dropdown"], [part="panel"]' },
  { name: 'date-picker', open: 'click', panel: '.dropdown, [part="dropdown"], [part="panel"], [role="dialog"]' },
  { name: 'time-picker', open: 'click', panel: '.dropdown, [part="dropdown"], [part="panel"]' },
  { name: 'mentions', open: 'type', panel: '.dropdown, [part="dropdown"], [role="listbox"]' },
  { name: 'color-picker', open: 'click', panel: '.panel, [part="panel"], [role="dialog"]' },
  { name: 'popconfirm', open: 'click-slot', panel: '.popover, .popconfirm, [part="panel"], [role="dialog"]' },
  { name: 'menubar', open: 'click', panel: '.dropdown, [part="dropdown"], [role="menu"]' },
  { name: 'navigation-menu', open: 'click', panel: '.viewport, [part="viewport"], [part="panel"]' },
  { name: 'menu', open: 'click', panel: '.submenu, [part="submenu"], [role="menu"]' },
  { name: 'drawer', open: 'demo-button', panel: '.drawer, [part="panel"], [role="dialog"]' },
  { name: 'modal', open: 'demo-button', panel: '.modal, [part="dialog"], [role="dialog"]' },
]

/** 文档站壳层中性化（与 rtl-audit 静态轮同款） */
const SHELL_NEUTRAL = `
.VPNavBar, .VPNavBar *, .VPMenu, .VPMenu *, .VPSidebar, .VPSidebar *, .VPLocalNav, .VPLocalNav *,
.VPPageNav, .VPPageNav *, .VPDocAside, .VPDocAside *, .VPDocFooter, .VPDocFooter *,
.VPFooter, .VPFooter *, .VPNavScreen, .VPNavScreen *, .VPBackdrop { direction: ltr !important; }
.VPNavBar .menu { display: none !important; }
`

async function runPass(browser, dir) {
  const context = await browser.newContext({ viewport: { width: 860, height: 800 } })
  const page = await context.newPage()
  const results = []
  for (const comp of COMPONENTS) {
    const url = `${base}/components/${comp.name}`
    try {
      if (dir === 'rtl') {
        await page.route(url, async (route) => {
          const res = await route.fetch()
          const body = (await res.text())
            .replace(/(<html[^>]*?)\sdir="[^"]*"/i, '$1')
            .replace(/<html([^>]*)>/i, '<html$1 dir="rtl">')
          await route.fulfill({ response: res, body })
        })
      } else {
        await page.unroute(url)
      }
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector(`oas-${comp.name}`, { state: 'attached', timeout: 8000 })
      await page.waitForFunction((n) => document.querySelector(`oas-${n}`)?.shadowRoot != null, comp.name, {
        timeout: 8000,
      })
      if (dir === 'rtl') {
        await page.evaluate((css) => {
          const s = document.createElement('style')
          s.textContent = css
          document.head.appendChild(s)
        }, SHELL_NEUTRAL)
      }
      // 滚进视口（指针交互纪律）→ 打开浮层
      await page.evaluate((n) => {
        const el = document.querySelector(`oas-${n}`)
        el.scrollIntoView({ block: 'center' })
      }, comp.name)
      await page.waitForTimeout(250)
      if (comp.open === 'click') {
        await page.evaluate((n) => {
          const el = document.querySelector(`oas-${n}`)
          const root = el.shadowRoot
          const trigger =
            root.querySelector('.trigger, [part="trigger"], [part="input"], input, textarea') ??
            root.querySelector('button, [role="button"], [part="item"]')
          ;(trigger ?? el).click()
        }, comp.name)
      } else if (comp.open === 'click-slot') {
        // popover/popconfirm 类：触发器是 light DOM 插槽内容（shadow 内点不到）——点宿主第一个可点子元素
        await page.evaluate((n) => {
          const el = document.querySelector(`oas-${n}`)
          const t = el.querySelector('oas-button, button, a, [slot]') ?? el
          t.click()
        }, comp.name)
      } else if (comp.open === 'type') {
        // 输入型下拉：聚焦内层输入并键入驱动面板打开（mentions 用触发符 @，其余用 'a'）
        await page.evaluate((n) => {
          const el = document.querySelector(`oas-${n}`)
          const input = el.shadowRoot.querySelector('input, textarea')
          input.focus()
          input.value = n === 'mentions' ? '@' : 'a'
          input.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        }, comp.name)
      } else if (comp.open === 'contextmenu') {
        await page.evaluate((n) => {
          const el = document.querySelector(`oas-${n}`)
          const target = el.firstElementChild ?? el
          const r = target.getBoundingClientRect()
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: r.left + r.width / 2,
              clientY: r.top + r.height / 2,
            }),
          )
        }, comp.name)
      } else if (comp.open === 'hover') {
        const box = await page.evaluate((n) => {
          const r = document.querySelector(`oas-${n}`).getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }, comp.name)
        await page.mouse.move(box.x, box.y)
      } else {
        // demo-button：demo 块内第一个按钮（打开抽屉/对话框/右键菜单的演示按钮）
        await page.evaluate((n) => {
          const el = document.querySelector(`oas-${n}`)
          const blk = el.closest('.demo-block')
          const btn = blk?.querySelector('oas-button') ?? el
          btn.click()
        }, comp.name)
      }
      await page
        .waitForFunction(
          ({ n, panelSel }) => {
            const el = document.querySelector(`oas-${n}`)
            if (!el?.shadowRoot) return false
            return [...el.shadowRoot.querySelectorAll(panelSel)].some((p) => {
              const rect = p.getBoundingClientRect()
              const cs = getComputedStyle(p)
              return rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
            })
          },
          { n: comp.name, panelSel: comp.panel },
          { timeout: 4000 },
        )
        .catch(() => {})
      const r = await page.evaluate(
        ({ n, panelSel }) => {
          const el = document.querySelector(`oas-${n}`)
          const root = el.shadowRoot
          const panels = [...root.querySelectorAll(panelSel)].filter((p) => {
            const rect = p.getBoundingClientRect()
            const cs = getComputedStyle(p)
            return rect.width > 0 && rect.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'
          })
          const p = panels[0]
          if (!p) return { open: false }
          const rect = p.getBoundingClientRect()
          return {
            open: true,
            rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
            placement: p.getAttribute('data-placement') ?? null,
            vw: document.documentElement.clientWidth,
            vh: window.innerHeight,
          }
        },
        { n: comp.name, panelSel: comp.panel },
      )
      if (!NO_SHOTS && r.open && dir === 'rtl') {
        await page.screenshot({ path: join(outDir, `interactive-${comp.name}-rtl.png`) })
      }
      results.push({ name: comp.name, ...r })
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(150)
    } catch (e) {
      results.push({ name: comp.name, error: String(e).slice(0, 200) })
    }
  }
  await context.close()
  return results
}

const browser1 = await chromium.launch()
const ltr = await runPass(browser1, 'ltr')
await browser1.close()
const browser2 = await chromium.launch()
const rtl = await runPass(browser2, 'rtl')
await browser2.close()

const issues = []
for (const r of rtl) {
  if (r.error) {
    issues.push(`${r.name}: ERROR ${r.error}`)
    continue
  }
  if (!r.open) {
    issues.push(`${r.name}: 面板未打开（RTL pass 未检测到可见面板）`)
    continue
  }
  if (r.rect.left < -TOLERANCE || r.rect.right > r.vw + TOLERANCE) {
    issues.push(
      `${r.name}: 面板横向越界 [${Math.round(r.rect.left)}, ${Math.round(r.rect.right)}] vw=${r.vw}（RTL placement=${r.placement ?? '—'}）`,
    )
  }
  // 镜像核对：LTR 与 RTL 的 placement 逻辑向应互为镜像（start↔end）。
  // 物理向（left/right）按设计不随书写方向翻转，跳过核对（不误映射为 start/end）
  const base0 = ltr.find((x) => x.name === r.name)
  const isLogical = (p) => /start|end/.test(p)
  if (
    r.placement &&
    base0?.placement &&
    base0.placement !== r.placement &&
    isLogical(r.placement) &&
    isLogical(base0.placement)
  ) {
    const mirror = base0.placement.replace(/start/g, '§').replace(/end/g, 'start').replace(/§/g, 'end')
    if (mirror !== r.placement) {
      issues.push(`${r.name}: placement 未镜像——LTR ${base0.placement} vs RTL ${r.placement}`)
    }
  }
}
const ltrProblems = ltr.filter((x) => x.error || !x.open)
if (ltrProblems.length)
  console.log(
    `[rtl-interactive] LTR 基线异常 ${ltrProblems.length} 件（先修 LTR）：`,
    ltrProblems.map((x) => x.name).join(', '),
  )

writeFileSync(
  join(outDir, 'interactive-report.json'),
  JSON.stringify({ base, components: COMPONENTS.length, ltr, rtl, issues }, null, 2),
)
console.log(`[rtl-interactive] components=${COMPONENTS.length} issues=${issues.length}`)
for (const i of issues) console.log('  ' + i)
process.exit(issues.length > 0 ? 1 : 0)
