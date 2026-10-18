import { test, expect } from '@playwright/test'

// Vue property 劫持门禁（SPA 导航 + 静态数据属性契约表）：
// Vue 渲染自定义元素时，若 `'attr' in el` 为 true（原型 accessor / 实例 class 字段 / 内建属性），
// 会走 property 赋值而非 setAttribute——组件若不设防就静默丢值（table 无数据、select options
// 为空等同款根因）。SSR 硬加载恰好没事（SSR 一律输出 attribute），只有 SPA 客户端渲染发作。
//
// 检测不依赖 `__vnode`：该内部字段仅 dev 构建存在，生产构建下为 null——旧探针
// （遍历 vnode.props）在生产站点上恒空转、恒绿（已实测定性的假绿缺陷）。
//
// 现状两条数据通道（SPA 导航实况探测校准，2026-10）：
// ① attribute 通道（多数组件）：SPA 客户端渲染后静态 JSON 属性仍以 attribute 存在——
//    以**同路由的 SSR 静态 HTML 为基线**，按实例（id 优先，否则同 tag 序号）逐一比对：
//    基线实例携带某 attr 而 SPA 后的同实例缺失 ⇒ 该实例被 property 赋值劫持（防「部分实例
//    被劫持、页面还有别的实例带着 attr」的旧聚合漏判）；仍在的 attr 再断言 JSON.parse 类型
//    正确（数组双重编码 parse 得 string）+ 载体无同名 own property（class 字段遮蔽——有 own
//    property 时 `'attr' in el` 恒真，下一次渲染必被劫持）。
// ② property 通道（chart.data|options / menu.items / rate.icons|colors / list.data /
//    virtual-list.items：组件设计了访问器，SPA 下框架以 property 赋值，attribute 缺失属设计内行为）——
//    **逐实例**断言：原型链 setter 在场（intake 通道存在）+ 实例无同名 own property（遮蔽会让
//    property 赋值落到实例字段、绕过 setter）+ 该实例 shadow 内数据真实渲染（list 仅在实例
//    自己持有数据时要求渲染，slot 型实例不做数据渲染断言）。
// 失败输出具体组件 / 属性 / 实例（id 或序号），便于定位。

type ExpectType =
  | 'array'
  | 'object'
  | 'string'
  | 'number'
  | 'boolean'
  /** 同一 attr 在不同 demo 中既可能是数组也可能是对象（如 chart.data 的 labels/series 形态） */
  | 'array|object'
  /** JSON 容器按 JSON 校验；裸字符串（如 tree.selected="a-1"）合法 */
  | 'json-or-scalar'
  /** 逗号分隔数字（splitter.sizes="30,40,30"）或数字 JSON 数组（组件写回形态） */
  | 'csv-or-json-numbers'

/** property 字符串注入探针：用组件合法示例 JSON 字符串走 setter，验证运行时字符串容忍没有退化 */
interface StringProbe {
  /** 写入的 property 名（如 items / data / icons） */
  prop: string
  /** 合法示例 JSON 字符串 */
  raw: string
  /** 读取内部解析结果的 getter（默认与 prop 同名；如 list.data 读 dataItems） */
  accessor?: string
  /** 期望内部数据形态（默认 array） */
  kind?: 'array' | 'object'
  /**
   * 身份断言（逐实例）：内部数据必须与 JSON.parse(raw) 深等——仅断言「非空」时，setter
   * 退化为忽略字符串（保留旧数据）依然恒绿（假绿面）；深等断言抓「字符串被吞、数据没换」。
   */
  identity?: boolean
  /**
   * 渲染身份断言（页级聚合）：至少一个实例的 shadow 文本包含该注入独特文本——demo 页存在
   * template[slot] / oas-item 宿主填充型实例（逐实例断言会误报），聚合判定足以抓
   * 「字符串被解析进数据但渲染通道整体吞掉」的退化。
   */
  text?: string
}

interface ContractEntry {
  /** docs 组件页名（/components/{page}） */
  page: string
  tag: string
  /** attribute 通道契约：attr → JSON.parse 后的期望类型（逐实例：SSR 基线携带则 SPA 后必须仍携带） */
  attrContract?: Record<string, ExpectType>
  /**
   * 需要与 SSR 基线「比例等价」的数值数组属性（CSV / JSON 两种写法归一后逐项比较）。
   * 用于 splitter.sizes 这类文档写 CSV、组件写回 JSON 的双格式通道——只看格式合法会被
   * 「属性还在但值被覆盖成均分」蒙混过关。
   */
  attrRatio?: string[]
  /**
   * property 通道契约：attrs = 设计内 setter 属性名；renderedSel = shadow 内数据已渲染的选择器锚点。
   * - mode='all'（默认）：每个实例都必须渲染出 renderedSel
   * - mode='when-data'：仅当实例自己的 probe（默认 attrs[0]）有数据时才要求渲染（slot 型实例跳过）
   */
  propContract?: {
    attrs: string[]
    renderedSel: string
    mode?: 'all' | 'when-data'
    probe?: string
    /** 逐实例写入合法 JSON 字符串，断言内部数据已解析且该实例 shadow 渲染非空（防字符串容忍退化） */
    stringProbe?: StringProbe[]
  }
}

const CONTRACT: ContractEntry[] = [
  { page: 'index-bar', tag: 'oas-index-bar', attrContract: { sections: 'array' } },
  { page: 'cascader', tag: 'oas-cascader', attrContract: { options: 'array', value: 'array' } },
  { page: 'select', tag: 'oas-select', attrContract: { options: 'array' } },
  { page: 'toggle-group', tag: 'oas-toggle-group', attrContract: { items: 'array' } },
  { page: 'tree', tag: 'oas-tree', attrContract: { data: 'array', selected: 'json-or-scalar' } },
  // chart 的 data/options 是原型访问器：SPA 客户端渲染时 Vue 按「key in el」走 property 赋值，
  // attribute 不写入属设计内行为（SSR 硬加载才有 attribute）——按 property 通道逐实例断言。
  {
    page: 'chart',
    tag: 'oas-chart',
    propContract: {
      attrs: ['data', 'options'],
      renderedSel: 'svg.chart > *',
      mode: 'when-data',
      probe: 'data',
      stringProbe: [
        {
          prop: 'data',
          // 两个系列：legend 仅在 >1 系列时渲染系列名——「Probe X」成为可断言的独特文本
          raw: '{"labels":["A","B"],"series":[{"name":"Probe X","data":[1,2]},{"name":"Probe Y","data":[2,1]}]}',
          kind: 'object',
          identity: true,
          text: 'Probe X',
        },
        { prop: 'options', raw: '{"smooth":true}', kind: 'object' },
      ],
    },
  },
  { page: 'kanban', tag: 'oas-kanban', attrContract: { columns: 'array', cards: 'array' } },
  { page: 'calendar', tag: 'oas-calendar', attrContract: { events: 'array' } },
  { page: 'scheduler', tag: 'oas-scheduler', attrContract: { events: 'array', resources: 'array' } },
  // table：data/columns 是历史上被 Vue 劫持的重灾区（SPA 下表格空白，强刷才恢复）
  { page: 'table', tag: 'oas-table', attrContract: { columns: 'array', data: 'array' } },
  { page: 'gantt', tag: 'oas-gantt', attrContract: { tasks: 'array' } },
  { page: 'resource', tag: 'oas-resource', attrContract: { resources: 'array', tasks: 'array' } },
  // splitter 的 sizes 静态写法是逗号分隔百分比；组件写回后可能是 JSON 数组（两种都接受）。
  // 除格式外还与 SSR 基线逐项比比例，并核对实际 pane flex（防「属性还在但被覆盖成均分」）。
  {
    page: 'splitter',
    tag: 'oas-splitter',
    attrContract: { sizes: 'csv-or-json-numbers' },
    attrRatio: ['sizes'],
  },
  // property 通道：逐实例（不再全页聚合）
  {
    page: 'menu',
    tag: 'oas-menu',
    propContract: {
      attrs: ['items'],
      renderedSel: 'li',
      stringProbe: [
        {
          prop: 'items',
          raw: '[{"label":"Probe A","value":"probe-a"},{"label":"Probe B","value":"probe-b"}]',
          // 渲染身份：注入的 label 文本必须真实出现在页面实例 shadow 文本中
          //（防 setter 忽略字符串保留旧数据时渲染断言恒绿）
          text: 'Probe A',
        },
      ],
    },
  },
  {
    page: 'rate',
    tag: 'oas-rate',
    propContract: {
      attrs: ['icons', 'colors'],
      renderedSel: '.star',
      stringProbe: [
        // 图标用与缺省 '★' 不同的独特字形注入，渲染文本断言才有效
        { prop: 'icons', raw: '["◆","◆","◆","◆","◆"]', text: '◆' },
        // 颜色无文本形态：断言内部数据与 JSON.parse(raw) 深等（抓「字符串被吞」）
        { prop: 'colors', raw: '["red","gold","green"]', identity: true },
      ],
    },
  },
  {
    page: 'list',
    tag: 'oas-list',
    // 虚拟模式行在内嵌 oas-virtual-list 的 [part="item"]；普通数据模式为 oas-list-item[data-index]
    propContract: {
      attrs: ['data'],
      renderedSel: 'oas-list-item[data-index], [part="item"]',
      mode: 'when-data',
      probe: 'dataItems',
      stringProbe: [
        {
          prop: 'data',
          accessor: 'dataItems',
          raw: '[{"title":"Probe A"},{"title":"Probe B"}]',
          identity: true,
          text: 'Probe A',
        },
      ],
    },
  },
  {
    page: 'virtual-list',
    tag: 'oas-virtual-list',
    propContract: {
      attrs: ['items'],
      renderedSel: '[part="item"]',
      stringProbe: [{ prop: 'items', raw: '["probe-a","probe-b"]', identity: true, text: 'probe-a' }],
    },
  },
]

test('Vue property 劫持门禁：SPA 导航 + 静态 JSON 契约表（不依赖 __vnode）', async ({ page }) => {
  test.setTimeout(600_000)
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('oas-button', { timeout: 10000 })

  const problems: string[] = []
  for (const { page: name, tag, attrContract, attrRatio, propContract } of CONTRACT) {
    // SPA 导航（客户端渲染，patchProp 全量生效）；总览页在侧栏归一化为 /components/（末尾斜杠）
    const href = `/components/${name}`
    await page.evaluate((h) => {
      const a = document.querySelector<HTMLAnchorElement>(`a[href="${h}"]`)
      if (!a) throw new Error(`未找到侧栏锚点：${h}`)
      a.click()
    }, href)
    await page.waitForURL(`**/components/${name}`)
    // attached 而非默认 visible：组件渲染若被破坏（如 class 字段遮蔽致 0×0），仍要落到下方
    // 精确断言（attribute 缺失 / own property / 渲染为空），而非笼统的超时失败
    await page.waitForSelector(tag, { state: 'attached', timeout: 15000 })
    // 等一拍：SPA 首帧渲染后 demo 脚本还会有 property 写入 / 异步重渲染，attribute 与渲染树随后落定
    await page.waitForTimeout(250)

    const issues = await page.evaluate(
      async ({ href: pageHref, tag, attrContract, attrRatio, propContract }) => {
        const typeName = (v: unknown): string => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)
        const hasSetter = (el: Element, key: string): boolean => {
          // 从原型链开始：实例 own property 遮蔽单独报错，避免与「无 setter」重复归因
          let o: object | null = Object.getPrototypeOf(el)
          while (o) {
            const d = Object.getOwnPropertyDescriptor(o, key)
            if (d) return !!d.set
            o = Object.getPrototypeOf(o)
          }
          return false
        }
        const deepCount = (root: ShadowRoot | null, sel: string): number => {
          if (!root) return 0
          let n = 0
          const walk = (r: ShadowRoot | Document): void => {
            n += r.querySelectorAll(sel).length
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot)
          }
          walk(root)
          return n
        }
        /** shadow 全树文本（含嵌套 shadow——list 虚拟行在内嵌 oas-virtual-list 的 shadow 里） */
        const deepText = (root: ShadowRoot | null): string => {
          if (!root) return ''
          let t = root.textContent ?? ''
          for (const el of root.querySelectorAll('*')) if (el.shadowRoot) t += deepText(el.shadowRoot)
          return t
        }
        /** 数值数组属性归一（CSV / JSON 都接受），返回总和 100 的比例数组；非法返回 null */
        const numbersOf = (raw: string): number[] | null => {
          try {
            const trimmed = raw.trim()
            if (trimmed === '') return null
            const nums: unknown[] = trimmed.startsWith('[') ? JSON.parse(trimmed) : trimmed.split(',')
            if (!Array.isArray(nums) || nums.length === 0) return null
            const values = nums.map((n) => Number(n))
            if (values.some((n) => !Number.isFinite(n) || n < 0)) return null
            const sum = values.reduce((a, b) => a + b, 0)
            if (!(sum > 0)) return null
            return values.map((n) => (n / sum) * 100)
          } catch {
            return null
          }
        }
        const sameRatio = (a: number[], b: number[], tolerance = 0.05): boolean =>
          a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) <= tolerance)
        /** 实际 pane flex → 百分比数组（末个弹性面板吸收剩余空间） */
        const paneSizesOf = (el: HTMLElement): number[] => {
          const panes = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.pane')]
          let fixed = 0
          return panes
            .map((pane) => {
              const m = /^0\s+0\s+([\d.]+)%$/.exec(pane.style.flex.trim())
              if (!m) return null
              const v = Number(m[1])
              fixed += v
              return v
            })
            .map((v) => v ?? Math.max(0, 100 - fixed))
        }
        const validate = (raw: string, want: ExpectType): string | null => {
          if (want === 'csv-or-json-numbers') {
            if (/^\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*\s*$/.test(raw)) return null
            try {
              const parsed: unknown = JSON.parse(raw)
              if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number' && Number.isFinite(n))) {
                return null
              }
            } catch {
              /* 非 JSON：按逗号分隔格式判错 */
            }
            return `期望逗号分隔数字或数字 JSON 数组，实得 raw=${raw.slice(0, 50)}`
          }
          if (want === 'json-or-scalar') {
            const trimmed = raw.trim()
            if (trimmed === '') return '空值'
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
              try {
                JSON.parse(trimmed)
                return null
              } catch (e) {
                return `JSON 容器解析失败（${(e as Error).message.slice(0, 60)}）`
              }
            }
            return null
          }
          let parsed: unknown
          try {
            parsed = JSON.parse(raw)
          } catch (e) {
            return `不是合法 JSON（${(e as Error).message.slice(0, 60)}）raw=${raw.slice(0, 50)}`
          }
          const got = typeName(parsed)
          const allowed = want.split('|')
          return allowed.includes(got) ? null : `期望 JSON.parse 得 ${want}，实得 ${got}（数组双重编码会得到 string）`
        }
        /** 实例定位文案（id 优先，否则序号） */
        const where = (el: HTMLElement, i: number): string => (el.id ? `#${el.id}` : `nth(${i})`)

        const out: string[] = []
        const els = [...document.querySelectorAll<HTMLElement>(tag)]
        if (els.length === 0) {
          out.push(`${tag}: 页面上未找到任何实例（契约失效，请核对组件页是否还在渲染该组件）`)
          return out
        }

        if (attrContract) {
          // SSR 基线：同路由静态 HTML 由服务端渲染（一律输出 attribute），按实例比对才能识别
          // 「部分实例被 property 赋值劫持」——旧聚合判定会被同页其他正常实例掩盖。
          let ssrEls: Element[] | null = null
          try {
            const res = await fetch(pageHref, { headers: { accept: 'text/html' } })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
            ssrEls = [...doc.querySelectorAll(tag)]
          } catch (e) {
            out.push(
              `${tag}: 无法获取 SSR 基线 HTML（${pageHref}）：${(e as Error).message}——attribute 通道无法逐实例判定，请检查 e2e 服务`,
            )
          }
          const ssrById = new Map<string, Element>()
          ssrEls?.forEach((el, i) => {
            if (el.id) ssrById.set(el.id, el)
            else ssrById.set(`nth(${i})`, el)
          })
          /** 该 live 实例在 SSR 基线中的对应实例（无基线/额外实例返回 null） */
          const expectedOf = (el: HTMLElement, i: number): Element | null => {
            if (!ssrEls) return null
            return el.id ? (ssrById.get(el.id) ?? null) : (ssrEls[i] ?? null)
          }

          for (const [attr, want] of Object.entries(attrContract)) {
            const baselineCarriers = ssrEls?.filter((el) => el.hasAttribute(attr)) ?? []
            if (ssrEls && baselineCarriers.length === 0) {
              out.push(
                `${tag}[${attr}]: SSR 基线中没有任何实例携带该 attribute（契约失效：demo 已改道 property 通道或属性已删除——请核对后同步本契约表）`,
              )
              continue
            }
            let liveCarriers = 0
            els.forEach((el, i) => {
              const label = `${tag} ${where(el, i)} [${attr}]`
              const expected = expectedOf(el, i)
              // 逐实例缺失判定：基线该实例带 attr，SPA 后同实例没有 ⇒ 该实例被劫持
              if (expected && expected.hasAttribute(attr) && !el.hasAttribute(attr)) {
                out.push(
                  `${label}: SSR 基线实例携带该 attribute，SPA 渲染后缺失（该实例被 property 赋值劫持——同页其他实例正常也会在此逐实例暴露）`,
                )
              }
              if (!el.hasAttribute(attr)) return
              liveCarriers++
              if (Object.prototype.hasOwnProperty.call(el, attr)) {
                out.push(`${label}: 实例存在同名 own property（class 字段遮蔽，Vue 'in' 判定会走 property 赋值）`)
              }
              const err = validate(el.getAttribute(attr) ?? '', want)
              if (err) out.push(`${label}: ${err}`)

              // 与 SSR 基线做比例等价：仅格式合法不足以发现「值被覆盖成均分」
              if (attrRatio?.includes(attr)) {
                const base = expected?.hasAttribute(attr) ? numbersOf(expected.getAttribute(attr) ?? '') : null
                const live = numbersOf(el.getAttribute(attr) ?? '')
                if (!base) {
                  out.push(`${label}: SSR 基线属性值无法解析为数值数组（契约无法做比例比对）`)
                } else if (!live || !sameRatio(base, live)) {
                  out.push(
                    `${label}: 属性值与 SSR 基线比例不等价（基线 ${base.map((n) => n.toFixed(2)).join('/')}，实得 ${live ? live.map((n) => n.toFixed(2)).join('/') : '非法'}）`,
                  )
                } else if (tag === 'oas-splitter') {
                  // 属性还在但 setter 被均分覆盖时，实际布局也会变——同时核对 pane flex
                  const panes = paneSizesOf(el)
                  if (!sameRatio(base, panes, 0.1)) {
                    out.push(
                      `${label}: 实际 pane 比例与 SSR 基线不一致（基线 ${base.map((n) => n.toFixed(2)).join('/')}，实得 ${panes.map((n) => n.toFixed(2)).join('/')}——属性仍在但布局被覆盖）`,
                    )
                  }
                }
              }
            })
            // 无基线时的兜底：至少一个实例以 attribute 通道携带（聚合判定，能力弱于逐实例）
            if (!ssrEls && liveCarriers === 0) {
              out.push(
                `${tag}[${attr}]: 页面上没有任何实例以 attribute 通道携带该属性（疑似被 Vue property 赋值劫持，或 demo 改道 property 通道——请核对后同步本契约表）`,
              )
            }
          }
        }

        // ② property 通道：逐实例 setter 在场 + 无 own property 遮蔽 + 数据真实渲染
        if (propContract) {
          const { attrs, renderedSel, mode = 'all', probe, stringProbe } = propContract
          els.forEach((el, i) => {
            const label = `${tag} ${where(el, i)}`
            for (const attr of attrs) {
              if (!hasSetter(el, attr)) {
                out.push(
                  `${label} [${attr}]: 原型链上没有 setter（property 通道契约失效：demo 以 property 赋值供数，无 setter 则赋值落为实例 own property、绕过组件数据入口）`,
                )
              }
              if (Object.prototype.hasOwnProperty.call(el, attr)) {
                out.push(`${label} [${attr}]: 实例存在同名 own property（class 字段/裸赋值遮蔽 setter，数据丢失）`)
              }
            }
            const rendered = deepCount(el.shadowRoot, renderedSel)
            if (mode === 'all' && rendered === 0) {
              out.push(
                `${label}: shadow 内未渲染出任何 "${renderedSel}"（property 通道数据未落地：setter 可能退化为不设防实现——如只收数组丢弃 JSON 字符串；或数据入口被遮蔽）`,
              )
            } else if (mode === 'when-data') {
              const probeKey = probe ?? attrs[0]!
              const value = (el as unknown as Record<string, unknown>)[probeKey]
              const hasData = Array.isArray(value) ? value.length > 0 : value != null && value !== ''
              if (hasData && rendered === 0) {
                out.push(
                  `${label}: 实例自身 ${probeKey} 有数据，但 shadow 内未渲染出任何 "${renderedSel}"（property 通道数据未落地）`,
                )
              }
            }
          })

          // 字符串注入探针：框架把静态 JSON attribute 写成 property 字符串是实际到达路径；
          // 仅验证「数组供数」会让 setter 退化为只收数组也保持绿（假绿面）。逐实例写入
          // 组件合法示例 JSON 字符串：identity 开启时断言内部数据与 JSON.parse(raw) 深等
          // （抓「字符串被吞、数据没换」），再断言本实例 shadow 渲染非空。
          if (stringProbe) {
            els.forEach((el, i) => {
              const label = `${tag} ${where(el, i)}`
              for (const { prop, raw } of stringProbe) {
                try {
                  ;(el as unknown as Record<string, unknown>)[prop] = raw
                } catch (e) {
                  out.push(`${label} [${prop}]: property 字符串注入抛错（${(e as Error).message.slice(0, 80)}）`)
                }
              }
              for (const { prop, raw, accessor, kind = 'array', identity } of stringProbe) {
                const key = accessor ?? prop
                const value = (el as unknown as Record<string, unknown>)[key]
                if (identity) {
                  let expected: unknown
                  try {
                    expected = JSON.parse(raw)
                  } catch {
                    expected = raw // 本表内 raw 均为合法 JSON，兜底走标量比较
                  }
                  if (JSON.stringify(value ?? null) !== JSON.stringify(expected)) {
                    out.push(
                      `${label} [${prop}]: property 注入合法 JSON 字符串（${raw.slice(0, 40)}…）后内部数据与注入内容不一致（${key} ≠ JSON.parse(raw)——setter 可能忽略字符串、保留旧数据）`,
                    )
                  }
                  continue
                }
                const parsedOk =
                  kind === 'object'
                    ? value != null && typeof value === 'object'
                    : Array.isArray(value) && value.length > 0
                if (!parsedOk) {
                  out.push(
                    `${label} [${prop}]: property 注入合法 JSON 字符串（${raw.slice(0, 40)}…）后内部数据未解析（${key} 不是${kind === 'object' ? '对象' : '非空数组'}——setter 可能退化为只收数组）`,
                  )
                }
              }
              const rendered = deepCount(el.shadowRoot, renderedSel)
              if (rendered === 0) {
                out.push(
                  `${label}: property 注入合法 JSON 字符串后 shadow 内未渲染出任何 "${renderedSel}"（字符串容忍退化为不设防实现）`,
                )
              }
            })
            // 渲染身份（页级聚合）：至少一个实例渲染出注入的独特文本——逐实例断言会被
            // template[slot] / oas-item 宿主填充型实例误报，聚合足以抓「渲染通道整体吞内容」
            for (const { raw, text } of stringProbe) {
              if (!text) continue
              const anyRendered = els.some((el) => deepText(el.shadowRoot).includes(text))
              if (!anyRendered) {
                out.push(
                  `${tag}: property 注入合法 JSON 字符串（${raw.slice(0, 40)}…，独特文本 "${text}"）后，页面无任何实例渲染出该文本（字符串容忍退化为不渲染）`,
                )
              }
            }
          }
        }
        return out
      },
      { href, tag, attrContract, attrRatio, propContract },
    )
    problems.push(...issues.map((m) => `[${name}] ${m}`))
  }

  expect(problems, `Vue property 劫持契约失败：\n${problems.join('\n')}`).toEqual([])
})
