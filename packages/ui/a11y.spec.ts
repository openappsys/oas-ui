import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { perceptualContrast, relativeLuminance } from '../theme/oklab'

// 自动收集全部 demo 页（与 smoke/console-sweep 同机制）：新组件默认进 axe 审计。
// EXCLUDE_PAGES = a11y 专项批次债务台账（页 → 违规类型 + 设计冲突说明），修复一页出一页；当前为空：
// 设计级冲突已全部收口——可点/可选容器不再挂缺省交互角色（card/list），折叠按钮移出 separator（splitter），
// 图形语义落到 <svg> 自身（qrcode），跨 shadow 的 ID 引用改走页面级规则豁免（stepper）。
const EXCLUDE_PAGES = new Set<string>([])

// 页面级规则豁免：仅用于「工具静态分析够不到、且有等价断言兜底」的单页误报，逐条写明理由与兜底位置。
// ⚠️ 爆炸半径：axe 的 disableRules 只能**整规则**禁用——如下面 stepper 那条 aria-valid-attr-value 豁免，
//   会一并放行该页**其它**「ARIA 属性取值非法」的情形。等价强度兜底见 qa-regression/stepper.spec.ts：
//   「全量 aria-* 取值合法性」断言（token 值集合 + 引用目标存在 + 未知名非空）覆盖「值合法」，
//   「aria-controls 指向真实 panel」断言覆盖引用存在性。新增豁免必须确认旁泄风险可接受且有等价兜底，
//   禁止当过闸逃生舱用。
const PAGE_RULE_EXEMPTIONS: Record<string, string[]> = {
  // stepper：tab 的 aria-controls 指向的 panel 由组件跨 shadow 生成，axe 静态分析无法验证该 ID 引用
  //   （getElementById 实测可查到 panel 节点）；兜底见 qa-regression/stepper.spec.ts 的
  //   aria-controls 存在性断言 + 全量 aria-* 取值合法性断言
  'stepper.html': ['aria-valid-attr-value'],
}
const PAGES = readdirSync(resolve(import.meta.dirname, '../docs/docs/components'))
  .filter((f) => f.endsWith('.md') && f !== 'index.md')
  .map((f) => `${basename(f, '.md')}.html`)
  .filter((html) => !EXCLUDE_PAGES.has(html))
  .sort()
  .map((html) => `/components/${html}`)

// ---------- 感知对比度：度量函数（公式真源 packages/theme/oklab.ts，与派生规则/守卫同源） ----------
// 量级 0-100+，带符号：正值=深字浅底，负值=浅字深底；门禁按绝对值分档（30 / 45 / 60）。
// ⚠️ 公式（亮度系数 / 近黑软截断 / 幂次与系数）只在 theme/oklab.ts 维护一份，本 spec 直接 import；
// 此处仅保留「非纯色（rgba/渐变）→ null 跳过」的本地容错解析，不再复制任何公式常数。
function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
/** 感知对比度绝对值；入参非纯色（如 rgba/渐变）返回 null 由调用方跳过 */
function scoreOf(fg: string, bg: string): number | null {
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  if (!f || !b) return null
  return Math.abs(perceptualContrast(relativeLuminance(f), relativeLuminance(b)))
}

// ---------- 感知对比度：ratchet 门禁（只许降不许升，修一处降一处） ----------
// 基线进 git（先例：scripts/perf 的性能基线）：逐页记录分档节点数与 axe 比值违规数。
// 存量债务分类（禁用态示例 / 软色 tag / 真实误用）与烧债计划记在 PRD；基线随修复逐项下调。
// 容差：骨架/加载/虚拟列表等动态 demo 的节点数有 ±3 波动（并行 worker 下更明显）——
// 门禁目标是拦「新增整块低对比文字」这类数量级回归，故按页给 3 的绝对容差；超容差即判回归。
const CONTRAST_TOLERANCE = 3
// 逐页容差覆盖：轮播这类「自动切换态」的组件，可见文字节点随当前 slide 变化（比值违规 1↔5 波动），
// 属同一组件的动态态而非新增债务；给足容差，其余页面仍按上面的严格容差。
const PAGE_TOLERANCE: Record<string, number> = { 'carousel.html': 6 }
// 定时追加型 demo 的冻结清单：log 的「贴底自动滚动」流用 setInterval(1.2s) 持续追加行，
// DOM 永不静止——axe 扫描跨 interval 边界的时点不同，可见 rgba 节点数实测 139↔179 漂移，
// 任何 ratchet 都会被时序误伤。对这类页在扫描前冻结定时器（goto 前 hook setInterval 记录句柄，
// waitForStableDom 后全部 clear），扫描对象定格为「已渲染内容」：计数稳定，且 <60 硬闸
// 与 ratio/exempt ratchet 对该页仍全部生效（不是豁免，只是把测量变成确定性的）。
const TIMER_FROZEN_PAGES = new Set(['log.html'])
const BASELINE_FILE = resolve(import.meta.dirname, 'a11y-contrast-baseline.json')
const UPDATE_BASELINE = process.env.CONTRAST_BASELINE === 'update'
// 基线模式显式提示：误在全量门禁/CI 携带该环境变量时，逐页断言全部 skipped（报告可见），而非静默全绿
if (UPDATE_BASELINE) {
  console.warn(
    '⚠️ [a11y.spec] CONTRAST_BASELINE=update：本次运行仅生成对比度基线，全部逐页 a11y 断言将显式跳过（skipped）——门禁/CI 严禁携带该环境变量',
  )
}
const LEVELS = [30, 45, 60] as const
const ZERO_COUNTS: PageCounts = { below30: 0, below45: 0, below60: 0, ratio: 0, exempt: 0, skipped: 0 }

interface ContrastSample {
  page: string
  target: string
  fg: string
  bg: string
  ratio: number
  score: number
}
interface PageCounts {
  below30: number
  below45: number
  below60: number
  ratio: number
  exempt: number
  skipped: number
}
interface AxeNodeLike {
  target: unknown
  any: Array<{ data?: Record<string, unknown> }>
}
interface AxeRuleLike {
  id: string
  nodes: AxeNodeLike[]
}
interface AxeResultsLike {
  passes: AxeRuleLike[]
  violations: AxeRuleLike[]
  incomplete: AxeRuleLike[]
}

function loadBaseline(): { pages: Record<string, PageCounts> } {
  try {
    return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as { pages: Record<string, PageCounts> }
  } catch {
    return { pages: {} }
  }
}

/** 禁用色 token 取不到/格式不合法时的哨兵：调用方必须红灯，禁止静默当「无豁免」或「全豁免」 */
const DISABLED_COLOR_MISSING = '__missing__'

/**
 * 读当前主题下 `--oas-color-text-disabled` 的**原始值**并归一化成 #rrggbb——禁用态文字按 WCAG 豁免，不进门禁。
 * fail-safe：旧实现用 probe + getComputedStyle 取「计算色」，token 未定义时拿到的是继承色（非空值），
 * 会把正文色及其被背景冲淡的所有档误当禁用态豁免（豁免面静默扩大）；且 `color(srgb …)` 这类序列化
 * 会被 `\d+` 抓取拼成垃圾 hex。现直接读自定义属性原始值并严格校验格式（3/6 位 hex 或 rgb()/rgba()）：
 * 合法→归一化 #rrggbb；不合法/取不到→返回哨兵，由每页断言显式红灯（失败时绝不静默放大豁免）。
 */
async function disabledTextColor(page: Page): Promise<string> {
  return page.evaluate((missing) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--oas-color-text-disabled').trim()
    const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (hex) {
      const h = hex[1]!
      const full =
        h.length === 3
          ? h
              .split('')
              .map((c) => c + c)
              .join('')
          : h
      return `#${full.toLowerCase()}`
    }
    const rgb = raw.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i)
    if (rgb) {
      return `#${rgb
        .slice(1, 4)
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')}`
    }
    return missing
  }, DISABLED_COLOR_MISSING)
}

/** 禁用文字常再叠 opacity 淡化（如 0.6 行级透明）：把 disabled 色与底色的合成档一并认作豁免 */
function isFadedDisabled(fg: string, bg: string, disabled: string): boolean {
  if (disabled === '' || disabled === DISABLED_COLOR_MISSING) return false
  const f = hexToRgb(fg)
  const b = hexToRgb(bg)
  const d = hexToRgb(disabled)
  if (!f || !b || !d) return false
  for (let a = 0.4; a <= 1.0001; a += 0.05) {
    const mix = d.map((v, i) => v * a + b[i]! * (1 - a))
    if (f.every((v, i) => Math.abs(v - mix[i]!) <= 2)) return true
  }
  return false
}

/** 从 axe 结果抽取每节点的文字/背景实测色 → 感知分（passes/violations/incomplete 三处都要取） */
function collectContrast(
  pageName: string,
  results: AxeResultsLike,
  disabledFg = '',
): { samples: ContrastSample[]; counts: PageCounts } {
  const samples: ContrastSample[] = []
  let ratio = 0
  let exempt = 0
  let skipped = 0
  // 哨兵值（token 缺失）绝不参与豁免判定——豁免只在拿到合法禁用色时生效
  const exemptEnabled = disabledFg !== '' && disabledFg !== DISABLED_COLOR_MISSING
  for (const rule of [...results.violations, ...results.passes, ...results.incomplete]) {
    if (rule.id !== 'color-contrast') continue
    for (const node of rule.nodes) {
      const d = node.any[0]?.data
      const fg = typeof d?.fgColor === 'string' ? d.fgColor : ''
      const bg = typeof d?.bgColor === 'string' ? d.bgColor : ''
      if (exemptEnabled && (fg.toLowerCase() === disabledFg || isFadedDisabled(fg, bg, disabledFg))) {
        exempt++
        continue
      }
      const s = fg && bg ? scoreOf(fg, bg) : null
      if (s == null) {
        // 非纯色 fg/bg（rgba/渐变等）无法评分：计入 skipped 进基线 ratchet，防止「改成 rgba/渐变」绕闸
        skipped++
        continue
      }
      samples.push({
        page: pageName,
        target: (Array.isArray(node.target) ? node.target.join(' ') : String(node.target)).slice(0, 160),
        fg,
        bg,
        ratio: Math.round((typeof d?.contrastRatio === 'number' ? d.contrastRatio : 0) * 100) / 100,
        score: Math.round(s * 100) / 100,
      })
    }
  }
  for (const rule of results.violations) {
    if (rule.id === 'color-contrast') {
      ratio += rule.nodes.filter((n) => {
        const d = n.any[0]?.data
        const fg = typeof d?.fgColor === 'string' ? d.fgColor : ''
        const bg = typeof d?.bgColor === 'string' ? d.bgColor : ''
        if (!exemptEnabled) return true
        return !(fg.toLowerCase() === disabledFg || isFadedDisabled(fg, bg, disabledFg))
      }).length
    }
  }
  const counts: PageCounts = {
    below30: samples.filter((s) => s.score < 30).length,
    below45: samples.filter((s) => s.score < 45).length,
    below60: samples.filter((s) => s.score < 60).length,
    ratio,
    exempt,
    skipped,
  }
  return { samples, counts }
}

function runAxe(page: Page, exemptions: string[] = []) {
  return new AxeBuilder({ page })
    .include('.demo-block')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .disableRules(exemptions)
    .analyze()
}

/** 等 DOM 静止（无变更 250ms，最长 cap）后再审计：虚拟列表/骨架/异步渲染在渲染中途测到的节点数会漂移 */
async function waitForStableDom(page: Page, capMs = 1500): Promise<void> {
  await page.evaluate(
    (cap) =>
      new Promise<void>((res) => {
        const done = () => {
          observer.disconnect()
          clearTimeout(hard)
          clearTimeout(timer)
          res()
        }
        const observer = new MutationObserver(() => {
          clearTimeout(timer)
          timer = setTimeout(done, 250)
        })
        const hard = setTimeout(done, cap)
        let timer = setTimeout(done, 250)
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
      }),
    capMs,
  )
}

interface FrozenWindow {
  __oasA11yIntervals?: number[]
}

/** 定时冻结：goto 前调用——hook setInterval 记录句柄，供 freezeTimers 在扫描前统一清除 */
async function hookTimers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as FrozenWindow & { setInterval: typeof window.setInterval }
    w.__oasA11yIntervals = []
    const orig = w.setInterval.bind(window)
    w.setInterval = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
      const id = orig(fn, ms, ...(args as []))
      w.__oasA11yIntervals!.push(id)
      return id
    }) as typeof w.setInterval
  })
}

/** 定时冻结：waitForStableDom 后调用——清除页面全部 interval 并再等一次静止（消化最后一次追加） */
async function freezeTimers(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as FrozenWindow
    for (const id of w.__oasA11yIntervals ?? []) clearInterval(id)
    w.__oasA11yIntervals = []
  })
  await waitForStableDom(page)
}

// 落盘目录：违规明细（无严重违规时为空）与感知对比度烧债清单
const RESULT_DIR = resolve(import.meta.dirname, 'test-results')
mkdirSync(RESULT_DIR, { recursive: true })
const NODES_FILE = resolve(RESULT_DIR, `a11y-nodes.${Date.now()}.jsonl`)
const CONTRAST_FILE = resolve(RESULT_DIR, `contrast-nodes.${Date.now()}.jsonl`)

test.describe('无障碍审计（axe，零严重违规）', () => {
  for (const page of PAGES) {
    test(`无严重违规：${page}`, async ({ page: p }) => {
      // 基线模式显式 skip（报告里可见大量 skipped），取代旧的「continue 跳过断言」——误带环境变量不再静默全绿
      test.skip(UPDATE_BASELINE, 'CONTRAST_BASELINE=update：仅生成基线，跳过逐页断言')
      // 关动画：动态 demo（自动播放/轮播/加载）在动画中途测得的文字/背景会漂移，先固定到静止态
      await p.emulateMedia({ reducedMotion: 'reduce' })
      const name = basename(page)
      // 定时追加型 demo：goto 前 hook、静止后冻结（保证 axe 扫描对象确定性，见 TIMER_FROZEN_PAGES 注释）
      if (TIMER_FROZEN_PAGES.has(name)) await hookTimers(p)
      await p.goto(page, { waitUntil: 'networkidle' })
      await waitForStableDom(p)
      if (TIMER_FROZEN_PAGES.has(name)) await freezeTimers(p)
      const exemptions = PAGE_RULE_EXEMPTIONS[name] ?? []
      // 防绕过守卫：color-contrast 必须始终参与扫描（感知对比度门禁依赖它提供 fg/bg 实测色），
      // 任何页面都不允许把它列进豁免
      expect(exemptions, 'color-contrast 不得进页面级规则豁免').not.toContain('color-contrast')
      const baseline = loadBaseline().pages
      const tol = PAGE_TOLERANCE[name] ?? CONTRAST_TOLERANCE

      // light / dark 双主题都过门禁：暗色是另一套 token，必须同等看守（不放行「抽查」）
      for (const theme of ['light', 'dark'] as const) {
        if (theme === 'dark') {
          await p.evaluate(() => document.documentElement.classList.add('dark'))
          await waitForStableDom(p)
        }
        const results = (await runAxe(p, exemptions)) as unknown as AxeResultsLike

        // 语义/键盘/ARIA 断言（两主题都查）
        const serious = (results.violations as unknown as Array<{ id: string; impact: string | null; help: string }>)
          .filter((v) => v.id !== 'color-contrast' && ['critical', 'serious'].includes(v.impact ?? ''))
          .map((v) => `${v.id}: ${v.help}`)
        if (serious.length) {
          const detail = results.violations
            .filter((v) => v.id !== 'color-contrast')
            .map((v) => ({
              id: v.id,
              help: (v as unknown as { help: string }).help,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                html: ((n as unknown as { html?: string }).html ?? '').slice(0, 300),
                fix: ((n as unknown as { failureSummary?: string }).failureSummary ?? '').slice(0, 400),
              })),
            }))
          appendFileSync(NODES_FILE, JSON.stringify({ page, theme, violations: detail }) + '\n')
        }
        expect(serious, `${name} [${theme}]`).toEqual([])

        // 感知对比度：硬闸 <60 零容忍 + 比值法 ratchet
        const disabledFg = await disabledTextColor(p)
        expect(disabledFg, `${name} [${theme}]：主题必须定义 --oas-color-text-disabled（禁用态豁免依赖它）`).not.toBe(
          DISABLED_COLOR_MISSING,
        )
        const { samples, counts } = collectContrast(name, results, disabledFg)
        for (const s of samples.filter((v) => v.score < 60)) {
          appendFileSync(CONTRAST_FILE, JSON.stringify({ ...s, theme }) + '\n')
        }
        const b = baseline[theme === 'dark' ? `${name}::dark` : name] ?? ZERO_COUNTS
        const worst = samples
          .filter((s) => s.score < 60)
          .sort((a, b2) => a.score - b2.score)
          .slice(0, 5)
          .map((s) => `${s.score}（${s.fg} on ${s.bg}, ${s.target.slice(0, 60)}）`)
          .join('；')
        expect(counts.below60, `${name} [${theme}]：感知对比度 <60 的节点不得存在（当前热点：${worst || '无'}）`).toBe(
          0,
        )
        expect(counts.ratio, `${name} [${theme}]：axe 比值违规数不得高于基线`).toBeLessThanOrEqual(b.ratio + tol)
        // 豁免/无法评分数同走 ratchet：防止「把低对比文字刷成禁用色」或「改成 rgba/渐变」绕过硬闸
        expect(counts.exempt, `${name} [${theme}]：禁用态豁免节点数不得高于基线（防刷禁用色绕闸）`).toBeLessThanOrEqual(
          b.exempt + tol,
        )
        expect(
          counts.skipped,
          `${name} [${theme}]：无法评分节点数不得高于基线（防改 rgba/渐变绕闸）`,
        ).toBeLessThanOrEqual(b.skipped + tol)
      }
    })
  }
})

// 门禁自检：证明采集器真的能抓到低对比文本（否则门禁可能「静默全绿」）
test('感知对比度门禁自检：注入低对比文本能被捕获且指标分档正确', async ({ page: p }) => {
  await p.goto(PAGES[0]!, { waitUntil: 'networkidle' })
  await p.evaluate(() => {
    const block = document.querySelector('.demo-block')
    const el = document.createElement('p')
    el.id = 'contrast-canary'
    el.textContent = '低对比自检'
    el.style.cssText = 'color:#f4f4f5;background:#ffffff;margin:0'
    block?.appendChild(el)
  })
  const results = (await new AxeBuilder({ page: p })
    .include('.demo-block')
    .withRules(['color-contrast'])
    .analyze()) as unknown as AxeResultsLike
  const { samples } = collectContrast('canary', results)
  const hit = samples.find((s) => s.target.includes('contrast-canary'))
  expect(hit, '采集器应捕获注入的低对比节点').toBeTruthy()
  expect(hit!.score, '注入节点感知分应低于 30 档').toBeLessThan(30)
  // 指标函数本身的分档与极性
  expect(scoreOf('#f4f4f5', '#ffffff')!, '浅字浅底应判定为低分').toBeLessThan(30)
  expect(scoreOf('#18181b', '#ffffff')!, '深字浅底应判定为高分').toBeGreaterThan(75)
  expect(scoreOf('#ffffff', '#18181b')!, '浅字深底应为高绝对值').toBeGreaterThan(75)
})

// 基线生成（显式执行）：CONTRAST_BASELINE=update 单 worker 跑本用例，逐页实测后重写基线文件
test('生成对比度基线（CONTRAST_BASELINE=update --workers=1 -g 生成对比度基线）', async ({ page: p }) => {
  test.skip(!UPDATE_BASELINE, '仅在显式更新基线时运行')
  test.setTimeout(30 * 60_000)
  const pages: Record<string, PageCounts> = {}
  const totals = { sampled: 0, below30: 0, below45: 0, below60: 0, ratio: 0, exempt: 0, skipped: 0 }
  const pairHistogram = new Map<string, number>()
  for (const page of PAGES) {
    await p.emulateMedia({ reducedMotion: 'reduce' })
    const key0 = basename(page)
    // 与正常审计路径同机制：冻结定时追加型 demo，保证基线与门禁两侧测量一致
    if (TIMER_FROZEN_PAGES.has(key0)) await hookTimers(p)
    await p.goto(page, { waitUntil: 'networkidle' })
    await waitForStableDom(p)
    if (TIMER_FROZEN_PAGES.has(key0)) await freezeTimers(p)
    for (const theme of ['light', 'dark'] as const) {
      if (theme === 'dark') {
        await p.evaluate(() => document.documentElement.classList.add('dark'))
        await waitForStableDom(p)
      }
      const results = (await runAxe(p, PAGE_RULE_EXEMPTIONS[key0] ?? [])) as unknown as AxeResultsLike
      const disabledFg = await disabledTextColor(p)
      expect(disabledFg, `${key0} [${theme}]：主题必须定义 --oas-color-text-disabled（禁用态豁免依赖它）`).not.toBe(
        DISABLED_COLOR_MISSING,
      )
      const { samples, counts } = collectContrast(key0, results, disabledFg)
      const key = theme === 'dark' ? `${key0}::dark` : key0
      totals.sampled += samples.length
      totals.below30 += counts.below30
      totals.below45 += counts.below45
      totals.below60 += counts.below60
      totals.ratio += counts.ratio
      totals.exempt += counts.exempt
      totals.skipped += counts.skipped
      for (const s of samples.filter((v) => v.score < 60)) {
        const pairKey = `${s.fg} on ${s.bg}`
        pairHistogram.set(pairKey, (pairHistogram.get(pairKey) ?? 0) + 1)
        appendFileSync(CONTRAST_FILE, JSON.stringify({ ...s, theme }) + '\n')
      }
      // 任一字段非零即登记进基线（含 exempt/skipped）：只记 ratio 会让「豁免多但无比值违规」的页
      // 落到 ZERO_COUNTS，存量豁免直接误红或 ratchet 失效
      if (counts.below60 > 0 || counts.ratio > 0 || counts.exempt > 0 || counts.skipped > 0) pages[key] = counts
    }
  }
  const pairs = [...pairHistogram.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([pair, n]) => ({ pair, n }))
  const out = {
    note: '感知对比度 ratchet 基线（只许降不许升）：逐页记录 <30/<45/<60 档节点数、axe 比值违规数、禁用态豁免数（exempt）与无法评分数（skipped，非纯色 fg/bg）；未登记的页必须为零。更新方式见 a11y.spec.ts 顶部说明。',
    totals,
    topPairs: pairs,
    pages,
  }
  writeFileSync(BASELINE_FILE, `${JSON.stringify(out, null, 2)}\n`)
  expect(Object.keys(pages).length).toBeGreaterThan(0)
})
