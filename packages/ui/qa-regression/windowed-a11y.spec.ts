import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// windowed / 虚拟化实例的 axe 覆盖（回归固化）：
// 文档站逐页 axe 审计（a11y.spec.ts）扫的是各组件页 demo——windowed / 虚拟化实例只出现在
// guide 页与宿主集成场景，aria-rowcount / aria-rowindex / aria-setsize / aria-posinset 这批
// 「虚拟化数据缺失错觉对策」属性从未进过 axe 审计面。本 spec 注入 windowed 实例
// （gantt / table / tree / list / resource，不依赖 docs 页面 demo 块），断言：
// ① 五类实例的行数/行位 ARIA 真实写入（保证 axe 规则面真实覆盖这些属性，而非空转过闸）；
// ② axe（wcag2a / wcag2aa / wcag21aa）无 critical / serious 违规。

const SCOPE_SEL = '.qa-windowed-a11y-scope'

// 已知债务台账（ratchet，非豁免）：仅收「已定位、待修复」的 windowed a11y 违规。
// 双向锁死：① 未登记的 critical/serious 违规一律红；② 台账条目必须仍然命中（组件修复后
// 条目失配即红，提示删除条目——防台账腐化成常驻逃生舱）。
// 当前无登记项：gantt 的 tree/treeitem 行位 ARIA 已改为合法属性（posinset/setsize/level）。
const KNOWN_ISSUES: Record<string, { hostSel: string; htmlMarks: string[]; where: string; why: string }> = {}

// 等待 DOM 静止（无变更 250ms，最长 cap）后再审计：虚拟/窗口实例的 rAF 重建会让
// 扫描中途的节点漂移（与 a11y.spec.ts 的 waitForStableDom 同机制）
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

test('windowed/虚拟化实例 axe 审计：gantt/table/tree/list/resource 无 critical/serious', async ({ page }) => {
  const consoleIssues: string[] = []
  page.on('console', (m) => {
    // 与 table 回归 spec 的滚动帧用例同口径：只收 error + [oas- 前缀 warning（firefox 浏览器级 warning 非组件缺陷）
    if (m.type() === 'error' || (m.type() === 'warning' && /^\[oas-/.test(m.text())))
      consoleIssues.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleIssues.push(`pageerror: ${e.message}`))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  // 任一组件页加载站点 bundle（组件全局注册）；实例全部自建，不依赖 demo 块
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      ['oas-table', 'oas-gantt', 'oas-tree', 'oas-list', 'oas-resource'].every((t) => customElements.get(t) != null),
    null,
    { timeout: 15000 },
  )

  // 注入五类 windowed/虚拟化实例（契约见 src/shared/window-data.ts：windowed + total + window-start，
  // data 只承载已装载切片；gantt/resource 另需宿主托管时间轴 range-*）
  await page.evaluate(() => {
    const scope = document.createElement('div')
    scope.className = 'qa-windowed-a11y-scope'
    scope.style.cssText = 'width: 960px; padding: 8px'
    document.body.appendChild(scope)

    const el = <T extends HTMLElement>(tag: string, id: string, attrs: Record<string, string>): T => {
      const n = document.createElement(tag) as T
      n.id = id
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
      scope.appendChild(n)
      return n
    }

    // 1) table windowed：aria-rowcount=500（table）+ 行 aria-rowindex（绝对行号 1 基）
    el('oas-table', 'qa-win-table', {
      windowed: '',
      total: '500',
      'window-start': '0',
      'row-key': 'name',
      height: '200',
      'row-height': '40',
      columns: JSON.stringify([
        { key: 'name', title: '名称', width: '220px' },
        { key: 'age', title: '年龄', width: '120px' },
      ]),
      data: JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ name: `行${i}`, age: 20 + i }))),
    })

    // 2) tree windowed：行 aria-setsize=300 / aria-posinset（绝对根序 1 基）
    el('oas-tree', 'qa-win-tree', {
      windowed: '',
      total: '300',
      'window-start': '0',
      height: '160',
      'row-height': '32',
      data: JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ key: `k${i}`, label: `根 ${i}` }))),
    })

    // 3) list windowed：行 role=listitem + aria-setsize=300 / aria-posinset
    const list = el<HTMLElement & { data?: unknown }>('oas-list', 'qa-win-list', {
      windowed: '',
      total: '300',
      'window-start': '0',
      height: '160',
      'row-height': '36',
    })
    // 行内容经 oas-item-render 契约填充（监听器先于 data 赋值挂上）
    list.addEventListener('oas-item-render', ((e: Event) => {
      const d = (e as CustomEvent<{ item: { title: string }; element: HTMLElement }>).detail
      d.element.textContent = d.item.title
    }) as EventListener)
    list.data = Array.from({ length: 30 }, (_, i) => ({ title: `条目 ${i}` }))

    // 4) gantt windowed：行 aria-posinset/setsize（全量口径）+ aria-level；treeitem 不用 rowcount/rowindex
    const gantt = el<HTMLElement & { tasks?: unknown }>('oas-gantt', 'qa-win-gantt', {
      windowed: '',
      total: '200',
      'window-start': '0',
      'range-start': '2026-01-01',
      'range-end': '2026-09-30',
      height: '240',
      scale: 'week',
    })
    const DAY = 86400000
    gantt.tasks = Array.from({ length: 30 }, (_, i) => {
      const start = new Date(2026, 0, 1 + ((i * 11) % 240))
      return {
        id: `g${i}`,
        name: `任务 ${i + 1}`,
        start: start.toISOString().slice(0, 10),
        end: new Date(start.getTime() + (2 + (i % 5)) * DAY).toISOString().slice(0, 10),
        progress: (i * 17) % 100,
      }
    })

    // 5) resource windowed：泳道区 aria-rowcount=100 + 行 aria-rowindex（绝对行号 1 基）
    const res = el<HTMLElement & { resources?: unknown; tasks?: unknown }>('oas-resource', 'qa-win-resource', {
      windowed: '',
      total: '100',
      'window-start': '0',
      'range-start': '2026-01-01',
      'range-end': '2026-06-30',
      height: '240',
      scale: 'week',
    })
    res.resources = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, name: `资源 ${i + 1}`, capacity: 1 }))
    res.tasks = Array.from({ length: 40 }, (_, i) => {
      const rid = `r${i % 20}`
      const start = new Date(2026, 0, 1 + ((i * 7) % 150))
      return {
        id: `t${i}`,
        name: `任务 ${i + 1}`,
        start: start.toISOString().slice(0, 10),
        end: new Date(start.getTime() + (1 + (i % 3)) * DAY).toISOString().slice(0, 10),
        resources: [rid],
      }
    })
  })

  // 等五类实例的 windowed ARIA 真实写入（含 gantt/resource 异步渲染任务条）
  await page.waitForFunction(
    () => {
      const q = (rootSel: string, attr: string): number => {
        const root = document.querySelector(rootSel)
        if (!root?.shadowRoot) return 0
        let n = 0
        const walk = (r: Document | ShadowRoot): void => {
          n += r.querySelectorAll(`[${attr}]`).length
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot)
        }
        walk(root.shadowRoot)
        return n
      }
      return (
        q('#qa-win-table', 'aria-rowcount') > 0 &&
        q('#qa-win-table', 'aria-rowindex') > 0 &&
        q('#qa-win-tree', 'aria-setsize') > 0 &&
        q('#qa-win-tree', 'aria-posinset') > 0 &&
        q('#qa-win-list', 'aria-setsize') > 0 &&
        q('#qa-win-list', 'aria-posinset') > 0 &&
        q('#qa-win-gantt', 'aria-posinset') > 0 &&
        q('#qa-win-gantt', 'aria-setsize') > 0 &&
        q('#qa-win-resource', 'aria-rowcount') > 0 &&
        q('#qa-win-resource', 'aria-rowindex') > 0
      )
    },
    null,
    { timeout: 15000 },
  )
  await waitForStableDom(page)

  // ① 覆盖面自证：五类实例的行数/行位 ARIA 与全量口径逐一断言（空转过闸=假绿，先锁覆盖面）
  const coverage = await page.evaluate(() => {
    const deepAll = (root: Document | ShadowRoot, attr: string): Element[] => {
      const out: Element[] = []
      const walk = (r: Document | ShadowRoot): void => {
        for (const el of r.querySelectorAll(`[${attr}]`)) out.push(el)
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot)
      }
      walk(root)
      return out
    }
    const val = (rootSel: string, attr: string): string | null => {
      const root = document.querySelector(rootSel)
      if (!root?.shadowRoot) return null
      const hit = deepAll(root.shadowRoot, attr)[0]
      return hit?.getAttribute(attr) ?? null
    }
    // 行角色锚在「带 aria-setsize 的行」上（容器的 role=list 不算行角色）
    const rowRoleOf = (rootSel: string): string | null => {
      const root = document.querySelector(rootSel)
      if (!root?.shadowRoot) return null
      const hit = deepAll(root.shadowRoot, 'aria-setsize')[0]
      return hit?.getAttribute('role') ?? null
    }
    return {
      tableRowcount: val('#qa-win-table', 'aria-rowcount'),
      tableRowIndex: val('#qa-win-table', 'aria-rowindex'),
      treeSetsize: val('#qa-win-tree', 'aria-setsize'),
      treePosinset: val('#qa-win-tree', 'aria-posinset'),
      listSetsize: val('#qa-win-list', 'aria-setsize'),
      listPosinset: val('#qa-win-list', 'aria-posinset'),
      listRowRole: rowRoleOf('#qa-win-list'),
      ganttRowcount: val('#qa-win-gantt', 'aria-rowcount'),
      ganttPosinset: val('#qa-win-gantt', 'aria-posinset'),
      ganttSetsize: val('#qa-win-gantt', 'aria-setsize'),
      ganttLevel: val('#qa-win-gantt', 'aria-level'),
      ganttRowindex: val('#qa-win-gantt', 'aria-rowindex'),
      resourceRowcount: val('#qa-win-resource', 'aria-rowcount'),
      resourceRowIndex: val('#qa-win-resource', 'aria-rowindex'),
      sanityDeepQuery: deepAll(document, 'aria-posinset').length,
    }
  })
  expect(coverage.tableRowcount, 'table windowed：aria-rowcount 为全量 total').toBe('500')
  expect(coverage.tableRowIndex, 'table：行 aria-rowindex（绝对行号）在场').toMatch(/^\d+$/)
  expect(coverage.treeSetsize, 'tree windowed：行 aria-setsize=total').toBe('300')
  expect(coverage.treePosinset, 'tree：行 aria-posinset 在场').toMatch(/^\d+$/)
  expect(coverage.listSetsize, 'list windowed：行 aria-setsize=total').toBe('300')
  expect(coverage.listPosinset, 'list：行 aria-posinset 在场').toMatch(/^\d+$/)
  expect(coverage.listRowRole, 'list：行角色为 listitem（行数 ARIA 的合法宿主）').toBe('listitem')
  expect(coverage.ganttRowcount, 'gantt windowed：tree 不使用 aria-rowcount').toBeNull()
  expect(coverage.ganttPosinset, 'gantt：行 aria-posinset 在场').toMatch(/^\d+$/)
  expect(coverage.ganttSetsize, 'gantt windowed：行 aria-setsize=total').toBe('200')
  expect(coverage.ganttLevel, 'gantt：treeitem 带 aria-level').toMatch(/^\d+$/)
  expect(coverage.ganttRowindex, 'gantt windowed：treeitem 不使用 aria-rowindex').toBeNull()
  expect(coverage.resourceRowcount, 'resource windowed：泳道区 aria-rowcount=total').toBe('100')
  expect(coverage.resourceRowIndex, 'resource：行 aria-rowindex 在场').toMatch(/^\d+$/)
  expect(coverage.sanityDeepQuery, '深度遍历自检：shadow 内 aria-posinset 可被 axe 同等遍历到').toBeGreaterThan(0)

  // ② axe：wcag2a / wcag2aa / wcag21aa 全规则面，critical / serious 零容忍（已登记债务除外）
  const results = await new AxeBuilder({ page })
    .include(SCOPE_SEL)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  interface AxeNodeLike {
    target: unknown
    html?: string
  }
  interface AxeViolationLike {
    id: string
    impact: string | null
    help: string
    nodes: AxeNodeLike[]
  }
  const serious = (results.violations as AxeViolationLike[]).filter((v) =>
    ['critical', 'serious'].includes(v.impact ?? ''),
  )
  const fmt = (v: AxeViolationLike): string =>
    `${v.id} [${v.impact}]: ${v.help}（nodes: ${v.nodes.length}，targets: ${v.nodes
      .slice(0, 3)
      .map((n) => JSON.stringify(n.target))
      .join(' / ')}${v.nodes.length > 3 ? ' …' : ''}）`
  // 未登记的违规一律红
  const unknown = serious.filter((v) => !KNOWN_ISSUES[v.id])
  expect(unknown.map(fmt), `windowed 实例存在未登记的 critical/serious 违规：\n${unknown.map(fmt).join('\n')}`).toEqual(
    [],
  )
  // 台账条目必须仍然命中且形态与登记一致（组件修复 / 违规恶化 → 红，强制同步或删除条目）
  for (const [id, entry] of Object.entries(KNOWN_ISSUES)) {
    const v = serious.find((x) => x.id === id)
    expect(v, `台账条目 "${id}" 已不再命中（${entry.where} 可能已修复）——请核实后删除台账条目`).toBeTruthy()
    if (!v) continue
    const offLedger = v.nodes.filter((n) => {
      // axe target 形态：Array<string | string[]>（shadow 穿透路径为嵌套数组）——拍平后取 host 锚
      const segs = Array.isArray(n.target) ? (n.target as Array<string | string[]>).flat() : []
      const hostOk = segs[0] === entry.hostSel
      const html = (n as { html?: string }).html ?? ''
      return !(hostOk && entry.htmlMarks.some((m) => html.includes(m)))
    })
    expect(
      offLedger,
      `"${id}" 出现台账描述（host=${entry.hostSel}，marks=${entry.htmlMarks.join(' / ')}）之外的违规节点：${JSON.stringify(
        offLedger.map((n) => n.target),
      )}`,
    ).toEqual([])
  }

  expect(consoleIssues, 'console 零告警（error + [oas- warning 口径）').toEqual([])
})
