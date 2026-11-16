import { test, expect } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve, basename } from 'node:path'

// 交互元素视觉内容守卫（axe button-name 的必要补充）：
// axe 的 button-name 只看可访问名（aria-label 即可通过），抓不到「按钮存在但无任何
// 视觉内容」的缺陷——calendar 翻页按钮曾只有 aria-label、无 content 无 SVG 无样式段，
// 用户看到一个空灰块（见 qa-regression/calendar.spec.ts 回归）。本守卫直接判定
// 「用户可感知的视觉内容」：每个 button / [role="button"]（含 open shadow DOM 内）
// 至少满足一项：非空文本 / 图标或图形元素 / CSS 绘制（背景/伪元素）。
// 两者合起来覆盖「有按钮但无箭头」类缺陷：a11y 管可访问名，本守卫管视觉可感知内容。

const PAGES = readdirSync(resolve(import.meta.dirname, '../../docs/docs/components'))
  .filter((f) => f.endsWith('.md'))
  .filter((f) => f !== 'index.md')
  .map((f) => `/components/${basename(f, '.md')}.html`)

test.describe.configure({ mode: 'parallel' })

// 判定准则（至少满足一项即通过；全缺 = 用户看到一个无内容的可交互块 = 失败）：
// - 文本：textContent 非空。shadow DOM 内组件常以 <slot> 承接 light DOM 内容，
//   textContent 不含指派节点，故同时算 slot.assignedNodes({flatten:true}) 的文本。
// - 图标：自身或后代是 svg / img / oas-icon / [data-icon] / [part~="icon"]；自身是
//   SVG 图形元素（svg / path 等，图形即像素内容，gantt 可交互条依赖此项）；或自身/后代
//   带 background-image（CSS 背景图标是合法图标实现）。
// - CSS 绘制：自身或后代有不透明 background-color（圆点指示器/开关轨道/色板/甘特条
//   全靠背景色成形）或带盒模型的 ::before/::after（空 content + 宽高绘制的旋钮/对勾）。
//   反例校验：calendar 旧翻页钮完全无样式段（透明背景、无伪元素），该准则不会漏报它。
// - CSS content：::before/::after 的 computed content 是带可见字符的非空串。

// 豁免清单（每条带理由；新增豁免必须写清「为何空内容是正确行为」，不许整页跳过）。
// kind: attrEq（属性等于）/ attrPresent（属性存在）/ part（part 列表含）/ matches（CSS 选择器）
// page 为 '' 表示全站；否则仅该组件页命中。
interface ExemptionRule {
  page: string
  kind: 'attrEq' | 'attrPresent' | 'part' | 'matches'
  name?: string
  value?: string
  sel?: string
  reason: string
}

const EXEMPTIONS: ExemptionRule[] = [
  {
    page: '',
    kind: 'attrEq',
    name: 'aria-hidden',
    value: 'true',
    reason: 'aria-hidden 的装饰性交互占位：视觉语义由相邻可见元素承担，本身不要求视觉内容',
  },
  {
    page: '',
    kind: 'attrPresent',
    name: 'slot',
    reason:
      '具名槽元素且宿主未指派内容：空槽由宿主 slot 上下文负责（宿主可用 ::slotted 背景图绘制，CSS 绘制准则已兜底被指派的情形）',
  },
  {
    page: '',
    kind: 'attrPresent',
    name: 'data-empty',
    reason: '组件空态反射（如 marker/statusbar）：data-empty 驱动整件视觉收起，是产品设计而非缺陷',
  },
  {
    page: '',
    kind: 'part',
    value: 'scroll-area',
    reason: '纯容器（滚动区）：滚动交互载体，无视觉内容是预期行为',
  },
  {
    page: '',
    kind: 'attrPresent',
    name: 'disabled',
    reason: '禁用态可空：不可用交互元素不要求视觉内容（产品约定，同 axe 对禁用控件的态度）',
  },
  // 结构槽（table structural-render）由用户 property 回调自绘：槽内空元素属宿主用户责任，
  // 组件侧无 DOM 标记可挂钩。若实际扫描在该类场景误报，按页补 matches 规则并注明具体槽。
]

// 等 DOM 静默（与 windowed-a11y.spec.ts 同款）：demo 挂载/渲染是渐进的，
// 按钮在 shadow DOM 里随 upgrade 分批出现，静默后才扫描。
async function waitForStableDom(page: import('@playwright/test').Page, capMs = 2500): Promise<void> {
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

// 浏览器端扫描：遍历各 demo 块 + 其下所有 open shadowRoot，收集 button / [role="button"]，
// 应用豁免 + 可见性过滤（0×0 / visibility:hidden / opacity:0 的元素用户看不见，不判定），
// 返回失败列表（可读路径 + 各缺失准则）。
async function scanPage(p: import('@playwright/test').Page): Promise<Array<{ path: string; reasons: string[] }>> {
  const rules = EXEMPTIONS.filter((r) => r.page === '' || r.page === new URL(p.url()).pathname)
  return p.evaluate(
    ({ rules }) => {
      const failures: Array<{ path: string; reasons: string[] }> = []
      const ICON_SEL = 'svg,img,oas-icon,[data-icon],[part~="icon"]'
      const SHAPE_SEL = 'svg,svg *'

      const describe = (el: Element): string => {
        if (el.id) return `#${el.id}`
        const part = el.getAttribute('part')
        const head = part ? `${el.localName}[part="${part.split(/\s+/)[0]}"]` : el.localName
        const cls = typeof (el as HTMLElement).className === 'string' ? (el as HTMLElement).className.trim() : ''
        return cls ? `${head}.${cls.split(/\s+/)[0]}` : head
      }
      const pathOf = (el: Element): string => {
        const segs: string[] = []
        let node: Element | null = el
        while (node) {
          segs.unshift(describe(node))
          const root = node.getRootNode()
          if (root instanceof ShadowRoot) {
            segs.unshift('>>')
            node = (root as ShadowRoot).host
          } else break
        }
        return segs.join(' ')
      }
      const exempt = (el: Element): boolean =>
        rules.some((r) => {
          if (r.kind === 'attrEq') return el.getAttribute(r.name!) === r.value
          if (r.kind === 'attrPresent') return el.hasAttribute(r.name!)
          if (r.kind === 'part') return (el.getAttribute('part') ?? '').split(/\s+/).includes(r.value!)
          return r.sel != null && el.matches(r.sel)
        })
      const rendered = (el: Element): boolean => {
        const r = el.getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) return false
        const cs = getComputedStyle(el)
        return cs.visibility !== 'hidden' && cs.opacity !== '0'
      }
      const bgAlpha = (color: string): number => {
        if (color === 'transparent') return 0
        const m = color.match(/rgba?\(\s*([^)]+)\)/)
        if (m == null || m[1] == null) return 1
        const parts = m[1].trim().split(/\s*[/,]\s*/)
        const last = parts[parts.length - 1]
        return parts.length >= 4 && last != null ? parseFloat(last) : 1
      }
      const painted = (el: Element): boolean => {
        // 自身或后代有不透明背景色：圆点/轨道/色板/甘特条等纯背景色成形控件
        for (const e of [el, ...el.querySelectorAll('*')]) {
          if (bgAlpha(getComputedStyle(e).backgroundColor) > 0) return true
        }
        return false
      }
      const hasPseudo = (el: Element): boolean => {
        for (const pseudo of ['::before', '::after']) {
          const cs = getComputedStyle(el, pseudo)
          const c = cs.content
          if (!c || c === 'none' || c === 'normal') continue
          const inner = c.replace(/^["']|["']$/g, '').trim()
          if (inner !== '') return true
          // content:'' 的伪元素以盒模型绘制（旋钮/对勾）：有实际宽高即视觉内容
          if (parseFloat(cs.width) > 0 || parseFloat(cs.height) > 0) return true
        }
        return false
      }
      const slotVisual = (el: Element): boolean => {
        // shadow 内 <slot> 指派的 light DOM 内容（textContent 看不见它）
        for (const slot of el.querySelectorAll('slot')) {
          for (const n of (slot as HTMLSlotElement).assignedNodes({ flatten: true })) {
            if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '').trim() !== ''
            if (n.nodeType === Node.ELEMENT_NODE) {
              const e = n as Element
              if (
                e.matches(`${ICON_SEL},${SHAPE_SEL}`) ||
                (e.textContent ?? '').trim() !== '' ||
                e.querySelector(ICON_SEL) != null
              )
                return true
            }
          }
        }
        return false
      }
      const check = (el: Element): void => {
        if (exempt(el) || !rendered(el)) return
        const reasons: string[] = []
        if (el.textContent?.trim() === '' && !slotVisual(el)) reasons.push('无文本')
        const hasIcon =
          el.matches(`${ICON_SEL},${SHAPE_SEL}`) ||
          el.querySelector(`${ICON_SEL},${SHAPE_SEL}`) != null ||
          getComputedStyle(el).backgroundImage !== 'none'
        if (!hasIcon) reasons.push('无图标')
        if (!painted(el)) reasons.push('无背景绘制')
        if (!hasPseudo(el)) reasons.push('无 CSS content')
        if (reasons.length === 4) failures.push({ path: pathOf(el), reasons })
      }
      const walk = (root: Document | ShadowRoot | Element): void => {
        root.querySelectorAll('button, [role="button"]').forEach(check)
        root.querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot) walk(el.shadowRoot)
        })
      }
      // 扫描范围限定 demo 块：守卫对象是组件渲染的交互元素；文档站 chrome
      // （VitePress 主题的侧栏折叠钮/外观开关等）不在范围内，避免每页批量主题误报。
      document.querySelectorAll('.demo-block').forEach((block) => walk(block))
      return failures
    },
    { rules },
  )
}

for (const path of PAGES) {
  test(`交互元素视觉内容非空：${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.demo-block', { state: 'attached', timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)
    await waitForStableDom(page)
    const failures = await scanPage(page)
    // 报告格式：组件页 + 可读路径 + 缺失准则，便于直接定位「哪个组件的哪个按钮是空块」
    expect(
      failures.map((f) => `${path} | ${f.path} | ${f.reasons.join('/')}`),
      `发现 ${failures.length} 个无视觉内容的交互元素`,
    ).toEqual([])
  })
}
