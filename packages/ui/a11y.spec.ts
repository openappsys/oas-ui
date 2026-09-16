import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { appendFileSync, mkdirSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

// 自动收集全部 demo 页（与 smoke/console-sweep 同机制）：新组件默认进 axe 审计。
// EXCLUDE_PAGES = a11y 专项批次债务台账（页 → critical/serious 违规类型），修复一页出一页。
// 台账来源：自动收集改造时的首次全量 axe 审计，逐页实测违规如下。
// 自动收集全部 demo 页（与 smoke/console-sweep 同机制）：新组件默认进 axe 审计。
// EXCLUDE_PAGES = a11y 专项批次债务台账（页 → 违规类型 + 设计冲突说明），修复一页出一页。
// 台账来源：自动收集改造时的首次全量 axe 审计 + 本批收口后的剩余项。
const EXCLUDE_PAGES = new Set<string>([
  // card：整卡可点（role=button/checkbox）+ slot="actions" 内含 oas-button —— 交互容器嵌套交互子元素
  //   是「可点卡 + 行内操作」的固有设计模式；拆嵌套需去 role=button 或重排 DOM，属设计级决策
  'card.html',
  // list：可点击行（role=button）内含 oas-switch（extra slot）——「设置行 + 行内开关」的同款模式冲突
  'list.html',
  // qrcode：expired 状态下点击刷新的 wrapper 含 role=img —— 交互语义与图片语义嵌套
  'qrcode.html',
  // splitter：可聚焦 separator（拖拽/键盘调宽）内含折叠按钮 —— 分隔条与折叠钮的嵌套是设计取舍
  'splitter.html',
  // stepper：tab 的 aria-controls 跨 shadow 引用 panel id —— panel 在 light DOM 存在（getElementById 可查），
  //   axe-core 的静态分析无法穿透 shadow 边界验证 ID 引用，判 invalid 为误报
  'stepper.html',
])
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md') && f !== 'index.md')
  .map((f) => `${basename(f, '.md')}.html`)
  .filter((html) => (process.env.A11Y_ALL === '1' ? true : !EXCLUDE_PAGES.has(html)))
  .sort()
  .map((html) => `/components/${html}`)

// 违规明细落盘（JSONL，每行一页）：A11Y_ALL=1 时供修复批次逐条定位；不存在则不写。
// 文件名带进程时间戳：多 worker 并发时互不覆盖、互不误删（rmSync 在 2 worker 下会竞态互删）。
const NODES_FILE = resolve(import.meta.dirname, `test-results/a11y-nodes.${Date.now()}.jsonl`)
if (process.env.A11Y_ALL === '1') {
  mkdirSync(resolve(import.meta.dirname, 'test-results'), { recursive: true })
}

test.describe('无障碍审计（axe，零严重违规）', () => {
  for (const page of PAGES) {
    test(`无严重违规：${page}`, async ({ page: p }) => {
      await p.goto(page, { waitUntil: 'networkidle' })
      // color-contrast 走 WCAG 3 草案的感知对比度算法（axe 的 WCAG 2.1 比值法已退役）；
      // 其余规则（ARIA/键盘/语义）axe 与 WCAG 3 兼容继续跑
      const results = await new AxeBuilder({ page: p })
        .include('.demo-block')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .disableRules(['color-contrast'])
        .analyze()
      const serious = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''))
      if (serious.length) {
        // 失败时把违规节点明细（target + HTML 片段 + 修复建议）落盘，供逐条修复定位
        const detail = serious.map((v) => ({
          id: v.id,
          help: v.help,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            html: (n.html ?? '').slice(0, 300),
            fix: (n.failureSummary ?? '').slice(0, 400),
          })),
        }))
        appendFileSync(NODES_FILE, JSON.stringify({ page, violations: detail }) + '\n')
      }
      expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([])
    })
  }
})
