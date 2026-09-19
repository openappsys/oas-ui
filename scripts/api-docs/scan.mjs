/**
 * 组件 API 元数据扫描器（AST 级）。
 *
 * 从 `packages/ui/src/index.ts` 的副作用导入行拿到组件目录清单，
 * 对每个目录用 TypeScript Compiler API（typescript@7 原生 sync API）解析
 * `oas-*.ts` 类文件，抽取：
 *   - attrs：observedAttributes ∪ getAttr/hasAttr/injectValue 调用点
 *     （类型/默认值推断：`as XxxType` 强转别名、字面量第二实参的
 *     string/number/boolean 与默认值、hasAttr-only 的 boolean；表达式不硬算）
 *   - props：get/set 访问器（富类型 property，取 setter 形参注解）+ 公共字段类型注解
 *   - events：this.emit(...)（事件名自动加 oas- 前缀）+ new CustomEvent('oas-...')
 *   - slots：render() 模板字符串里的 <slot> / <slot name="...">，以及
 *     `template[slot="..."]` 子模板选择器引用（宿主侧命名插槽）
 * 产物：docs/api-manifest.json（按 tag 名 keyed）。
 *
 * 用法：node scripts/api-docs/scan.mjs
 *
 * 容错：单个组件解析失败不中断整体，记入该组件 unresolved 数组并继续。
 * 推断不出来的（emit 变量事件名、条件 observedAttributes 等）一律标 unresolved，
 * 不编造。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { API } from 'typescript/unstable/sync'
import * as tsast from 'typescript/unstable/ast'

const ROOT = process.cwd()
const UI_SRC = join(ROOT, 'packages', 'ui', 'src')
const OUT = join(ROOT, 'docs', 'api-manifest.json')
// per-component 输出目录（每组件一份 manifest 文件，原子提交 + 按组件门禁）
const OUT_DIR = join(ROOT, 'docs', 'api-manifest')

// ---------- cssVars：组件出口 var(--oas-*) 收割 ----------
// 出口 = 组件 CSS 里 var() 读取的自定义点。默认值取字面 fallback，无则取源码声明值。
// 排除：全局家族 token（NON_OUTLET_FAMILY）、动态前缀拼接（尾部 `-` / `${}`）、
// theme 定义的全局 token（组件自身作用域 `--<tag>-` 命名的除外）。theme 定义集用于排除判定。
const THEME_TOKENS = (() => {
  try {
    return new Set(
      [
        ...readFileSync(join(ROOT, 'packages', 'theme', 'index.css'), 'utf8').matchAll(/(--oas-[a-z0-9-]+)\s*[:{]/g),
      ].map((m) => m[1]),
    )
  } catch {
    return new Set()
  }
})()
const NON_OUTLET_FAMILY =
  /^--oas-(space|radius|font|ease|color|shadow|z|control-height|transition|line-height|touch-target)-/

/** 从组件源码收割 var(--oas-*) 出口：[{ name, default }]（default = 字面 fallback 或源码声明值，无则 null） */
function extractCssVars(source, tag) {
  // 源码内自声明（--oas-x: <value>）→ 用作无 fallback 出口的默认值（取首处，通常是基态）
  const declared = new Map()
  for (const m of source.matchAll(/(--oas-[a-z0-9-]+)\s*:\s*([^;{}]+)/g)) {
    if (!declared.has(m[1])) declared.set(m[1], m[2].trim())
  }
  const selfPrefix = `--${tag}-`
  // fallback / 声明值原样收录（仅规范化空白）；无 fallback 且无声明 → null（表里显示 —）
  const normDefault = (v) => (v && v.trim() ? v.replace(/\s+/g, ' ').trim() : null)

  const out = []
  const seen = new Set()
  let i = source.indexOf('var(')
  while (i !== -1) {
    let j = i + 4
    while (j < source.length && /\s/.test(source[j])) j++
    const nm = /^(--oas-[a-z0-9-]+)/.exec(source.slice(j, j + 64))
    if (!nm) {
      i = source.indexOf('var(', i + 4)
      continue
    }
    const name = nm[1]
    j += name.length
    while (j < source.length && /\s/.test(source[j])) j++
    let fallback = null
    if (source[j] === ',') {
      // 平衡括号扫描：无论回退嵌套多深都能取全，不会因正则失配漏掉变量
      let k = j + 1
      let depth = 1
      const start = k
      while (k < source.length && depth > 0) {
        const ch = source[k]
        if (ch === '(') depth++
        else if (ch === ')') depth--
        if (depth === 0) break
        k++
      }
      fallback = source.slice(start, k).trim()
      j = k
    }
    i = source.indexOf('var(', j + 1)
    if (
      seen.has(name) ||
      NON_OUTLET_FAMILY.test(name) ||
      name.endsWith('-') ||
      (THEME_TOKENS.has(name) && !name.startsWith(selfPrefix))
    )
      continue
    seen.add(name)
    out.push({ name, default: normDefault(fallback) ?? normDefault(declared.get(name)) ?? null })
  }
  return collapseIndexRuns(out)
}

/** 同前缀数字出口（-1/-2/...）≥3 个折叠为 `--x-{1..N}`，避免逐条刷屏 */
function collapseIndexRuns(rows) {
  const groups = new Map()
  const order = []
  for (const r of rows) {
    const m = /^(.*-)(\d+)$/.exec(r.name)
    if (!m) {
      order.push({ row: r })
      continue
    }
    if (!groups.has(m[1])) {
      groups.set(m[1], [])
      order.push({ run: m[1] })
    }
    groups.get(m[1]).push({ ...r, idx: Number(m[2]) })
  }
  const out = []
  for (const o of order) {
    if (!o.run) {
      out.push(o.row)
      continue
    }
    const g = groups.get(o.run)
    if (g.length < 3) {
      out.push(...g.map((r) => ({ name: r.name, default: r.default })))
      continue
    }
    const idx = g.map((r) => r.idx).sort((a, b) => a - b)
    out.push({ name: `${o.run}{${idx[0]}..${idx[idx.length - 1]}}`, default: null })
  }
  return out
}

// ---------- TS7 AST 常用节点 kind ----------
const K = tsast.SyntaxKind

const OBSERVED_GETTER = 'observedAttributes'

/** 全局约定属性：跨组件通用、属库级约定而非组件自身 API，一律不进 manifest / API 表
 *  （如全局禁用注入的组件级逃逸口 `disabled-skip`，由 config-provider 文档统一说明；
 *   标准全局属性 `dir`——书写方向，config-provider direction / 根级 dir 控制，
 *   RTL 批次起方向敏感组件观察它触发重判定，行为由 RTL 说明覆盖） */
const GLOBAL_CONVENTION_ATTRS = new Set(['disabled-skip', 'dir'])
const ATTR_HELPERS = new Set(['getAttr', 'hasAttr', 'injectValue', 'injectDisabled'])

// 跨组件属性补充：AST 探不到的公开 attribute，显式登记（observed:false，不参与
// attributeChanged 联动）。两类来源：
//   1) 父组件读取子元素属性（如 oas-tabs 读 oas-tab-panel 的 badge/href）；
//   2) 纯 CSS 消费属性（组件 JS 无任何读取点，仅 :host([...]) 选择器/子组件转发）。
const SUPPLEMENT_ATTRS = {
  // href/target/rel/icon-only 由 oas-tabs 解析子面板读取（渲染为链接 tab/纯图标 tab）
  'oas-tab-panel': ['badge', 'icon', 'href', 'target', 'rel', 'icon-only'],
  // success 为纯 CSS 消费属性（无 getAttr/hasAttr），扫描正则探不到，人工补录
  'oas-pin-input': ['success'],
  // check-all 由 oas-checkbox-group 读子项（全选联动标记）；label-position 为纯 CSS 消费
  'oas-checkbox': ['check-all', 'label-position'],
  // label-position 为纯 CSS 消费属性（:host([label-position='start']) 镜像布局）
  'oas-radio': ['label-position'],
  // no-collapse 由父组件 oas-collapse 读子项（强锁展开态）
  'oas-collapse-item': ['no-collapse'],
}

// ---------- 组件目录清单：ui/src/index.ts 的副作用导入行 ----------
function listComponentDirs() {
  const idx = readFileSync(join(UI_SRC, 'index.ts'), 'utf8')
  const dirs = []
  for (const line of idx.split('\n')) {
    const m = line.match(/^import '\.\/(.+)\/index\.js'/)
    if (m) dirs.push(m[1].replace(/\\/g, '/'))
  }
  return dirs
}

// ---------- 通用 AST 遍历 ----------
function walk(node, fn) {
  if (!node) return
  fn(node)
  node.forEachChild((c) => walk(c, fn))
}

// 字符串字面量 / 模板字面量取原始值
function litText(node) {
  if (!node) return undefined
  if (node.kind === K.StringLiteral || node.kind === K.NoSubstitutionTemplateLiteral) return node.text
  return undefined
}

// 取节点源码文本（单行压缩，用于 default / detail 等）
function srcText(node) {
  if (!node) return undefined
  return node.getText().replace(/\s+/g, ' ').trim()
}

// ---------- 目录 index.ts：收集 customElements.define 的 tag -> className ----------
// 覆盖两种形式：
//   1) customElements.define('oas-x', OASX)
//   2) layout：for (const [tag, cls] of [['oas-layout', OASLayout], ...]) define(tag, cls)
function collectDefines(sourceFile) {
  const out = []
  const push = (tag, cls) => {
    if (out.some((o) => o.tag === tag)) return
    out.push({ tag, cls })
  }
  walk(sourceFile, (n) => {
    // 直接 define('oas-x', OASX)
    if (n.kind === K.CallExpression) {
      const callee = n.expression
      if (
        callee &&
        callee.kind === K.PropertyAccessExpression &&
        callee.name?.text === 'define' &&
        callee.expression?.text === 'customElements' &&
        n.arguments?.length >= 2
      ) {
        const tag = litText(n.arguments[0])
        const clsNode = n.arguments[1]
        if (tag && clsNode && clsNode.kind === K.Identifier) push(tag, clsNode.text)
      }
    }
    // 数组字面量对：['oas-layout', OASLayout]（layout 的 for-of 初始数组）
    if (n.kind === K.ArrayLiteralExpression) {
      for (const el of n.elements || []) {
        if (el.kind === K.ArrayLiteralExpression && el.elements?.length === 2) {
          const tag = litText(el.elements[0])
          const clsNode = el.elements[1]
          if (tag && tag.startsWith('oas-') && clsNode && clsNode.kind === K.Identifier) {
            push(tag, clsNode.text)
          }
        }
      }
    }
  })
  return out
}

// ---------- 类文件解析 ----------
// 每个组件目录：oas-*.ts（类文件）+ 测试 + index.ts
function listClassFiles(dirAbs) {
  if (!existsSync(dirAbs)) return []
  return readdirSync(dirAbs)
    .filter((f) => /^oas-.*\.ts$/.test(f) && !/\.(test|spec)\.ts$/.test(f))
    .map((f) => join(dirAbs, f))
}

// 找到 className 对应的类：
//   1) 直接 `class OASX extends OASElement` 声明
//   2) `export const OASX = factory(...)` 工厂创建类（如 typography 的 createTypography），
//      返回工厂内部 `class ... extends OASElement` 的声明节点
// 返回值：{ node, factoryCall?, factoryFn? }
function findClassNode(sourceFile, className) {
  let found = null
  walk(sourceFile, (n) => {
    if (found) return
    if (n.kind === K.ClassDeclaration && n.name?.text === className) {
      found = { node: n }
      return
    }
    // const OASX = factoryCall(...)：定位工厂函数内部返回的类
    if (
      n.kind === K.VariableDeclaration &&
      n.name?.kind === K.Identifier &&
      n.name.text === className &&
      n.initializer?.kind === K.CallExpression
    ) {
      const factoryName = n.initializer.expression?.text
      if (factoryName) {
        let factoryFn = null
        walk(sourceFile, (m) => {
          if (factoryFn) return
          if (m.kind === K.FunctionDeclaration && m.name?.text === factoryName) factoryFn = m
        })
        if (factoryFn) {
          let inner = null
          walk(factoryFn, (m) => {
            if (inner) return
            if (m.kind === K.ClassDeclaration && m.name?.text) inner = m
          })
          if (inner) found = { node: inner, factoryCall: n.initializer, factoryFn }
        }
      }
    }
  })
  return found
}

/** 类是否直接声明 observedAttributes getter（组装类自身不声明时需回退基类） */
function hasObservedGetter(cls) {
  return (cls.members || []).some((m) => m.kind === K.GetAccessor && m.name?.text === 'observedAttributes')
}

/** 解析类声明中的 extends 基类（同目录类文件）；用于组装类（星骨架+index 组装）的 API 承载回退 */
function resolveApiBase(cls, dirAbs, project, fromFile, visited = new Set()) {
  const ext = (cls.heritageClauses || []).find((h) => h.token === K.ExtendsKeyword)
  const baseName = ext?.types?.[0]?.expression?.text
  if (!baseName || visited.has(baseName)) return null
  visited.add(baseName)
  const rel = (f) => relative(ROOT, f).replace(/\\/g, '/')
  // 1) import 声明来源（跨目录基类，如 dropdown-item ← menu-item）：比全仓扫描快且准
  if (fromFile) {
    let src = ''
    try {
      const sf = project.program.getSourceFile(fromFile)
      src = sf?.getText ? sf.getText() : readFileSync(fromFile, 'utf8')
    } catch {
      src = ''
    }
    for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])
      if (!names.includes(baseName)) continue
      const spec = m[2]
      if (!spec.startsWith('.')) break // 外部包基类（如 OASElement），不在本仓，走同目录兜底
      const abs = join(dirname(fromFile), spec.replace(/\.js$/, '.ts'))
      if (!existsSync(abs)) break
      const sf = project.program.getSourceFile(abs)
      const hit = sf ? findClassNode(sf, baseName) : null
      if (!hit) break
      if (hasObservedGetter(hit.node)) return { node: hit.node, file: rel(abs) }
      // 基类自身仍是空壳（extends 更上层基类）→ 递归上溯，失败则用该层基类兜底
      const up = resolveApiBase(hit.node, dirAbs, project, abs, visited)
      return up ?? { node: hit.node, file: rel(abs) }
    }
  }
  // 2) 同目录类文件兜底（组装类基类，如 OASTableBase 定义于同目录）
  for (const fileAbs of listClassFiles(dirAbs)) {
    const sf = project.program.getSourceFile(fileAbs)
    if (!sf) continue
    const hit = findClassNode(sf, baseName)
    if (hit) return { node: hit.node, file: rel(fileAbs) }
  }
  return null
}

// ---------- observedAttributes 提取 ----------
// 支持返回数组字面量；条件表达式（如 typography levels ? A : B）尝试求值：
//   - 条件为标识符，工厂调用第 2 实参对象字面量含该属性（布尔字面量）
//   - 否则查工厂函数体内解构默认值（const { levels = false } = options）
// 仍无法求值则并集 + unresolved
function evalCondBoolean(cond, factoryCall, factoryFn) {
  if (!cond) return undefined
  if (cond.kind === K.TrueKeyword) return true
  if (cond.kind === K.FalseKeyword) return false
  if (cond.kind !== K.Identifier) return undefined
  const name = cond.text
  // 1) 工厂调用对象字面量中的属性
  const opts = factoryCall?.arguments?.[1]
  if (opts && opts.kind === K.ObjectLiteralExpression) {
    const prop = (opts.properties || []).find((p) => p.name?.text === name)
    if (prop?.initializer?.kind === K.TrueKeyword) return true
    if (prop?.initializer?.kind === K.FalseKeyword) return false
  }
  // 2) 工厂函数解构默认值：const { levels = false, ... } = options
  if (factoryFn) {
    let def = undefined
    walk(factoryFn, (n) => {
      if (def !== undefined) return
      if (n.kind === K.VariableDeclaration && n.name?.kind === K.ObjectBindingPattern) {
        for (const el of n.name.elements || []) {
          if (el.propertyName?.text === name || el.name?.text === name) {
            if (el.initializer?.kind === K.TrueKeyword) {
              def = true
              return
            }
            if (el.initializer?.kind === K.FalseKeyword) {
              def = false
              return
            }
          }
        }
      }
    })
    if (def !== undefined) return def
  }
  return undefined
}

function resolveArrayExpr(expr, unresolved, factoryCall, factoryFn) {
  if (!expr) return []
  if (expr.kind === K.ArrayLiteralExpression) {
    return (expr.elements || []).map(litText).filter(Boolean)
  }
  if (expr.kind === K.ParenthesizedExpression) {
    return resolveArrayExpr(expr.expression, unresolved, factoryCall, factoryFn)
  }
  if (expr.kind === K.ConditionalExpression) {
    const val = evalCondBoolean(expr.condition, factoryCall, factoryFn)
    if (val === true) return resolveArrayExpr(expr.whenTrue, unresolved, factoryCall, factoryFn)
    if (val === false) return resolveArrayExpr(expr.whenFalse, unresolved, factoryCall, factoryFn)
    const a = resolveArrayExpr(expr.whenTrue, unresolved, factoryCall, factoryFn)
    const b = resolveArrayExpr(expr.whenFalse, unresolved, factoryCall, factoryFn)
    const note = `observedAttributes 为条件表达式（${srcText(expr.condition)}），无法求值，取两分支并集，需人工核对`
    if (!unresolved.includes(note)) unresolved.push(note)
    return [...new Set([...a, ...b])]
  }
  unresolved.push(`observedAttributes 返回值不是数组字面量（${srcText(expr)}）`)
  return []
}

function getObservedAttributes(cls, unresolved, factoryCall, factoryFn) {
  const getter = (cls.members || []).find((m) => m.kind === K.GetAccessor && m.name?.text === OBSERVED_GETTER)
  if (!getter || !getter.body) return []
  const ret = (getter.body.statements || []).find((s) => s.kind === K.ReturnStatement)
  return resolveArrayExpr(ret?.expression, unresolved, factoryCall, factoryFn)
}

// ---------- attrs：observed ∪ helper 调用点 ----------
// 类型/默认值推断（只做可靠的，宁可不猜）：
//   - `as XxxType` 强转（如 getAttr('type','default') as ButtonType）→ type 取别名，优先
//   - 仅出现在 hasAttr('x') 调用点（无 getAttr/injectValue）→ type: boolean
//   - getAttr/injectValue('x', 字面量) → type 按字面量类型（string/number/boolean），
//     default 填字面量（字符串字面量去引号、数字/布尔取原文）
//   - 第二实参是表达式（三元、函数调用、String(X)、标识符）→ default 保持省略
//     （gen 渲染 —，不硬算）
//   - attr 有同名 prop 时不做类型推断（prop 类型更富，gen 回退用 prop 类型）
function extractAttrs(cls, observed, propNames) {
  // 中间结构：name -> { type?, default?, observed, has, get, inferTypes }
  const map = new Map()
  for (const name of observed) map.set(name, { name, observed: true, has: false, get: false, inferTypes: [] })

  walk(cls, (n) => {
    if (n.kind !== K.CallExpression) return
    const callee = n.expression
    if (!callee || callee.kind !== K.PropertyAccessExpression || callee.expression?.kind !== K.ThisKeyword) return
    const helper = callee.name?.text
    if (!ATTR_HELPERS.has(helper)) return

    // `this.injectDisabled()` 读取自身 disabled 属性（config-provider 全局禁用注入判定点），
    // 无参调用；等价于 hasAttr('disabled') → 把 disabled 标记为 boolean attr，保住类型推断
    if (helper === 'injectDisabled') {
      let entry = map.get('disabled')
      if (!entry) {
        entry = { name: 'disabled', observed: false, has: false, get: false, inferTypes: [] }
        map.set('disabled', entry)
      }
      entry.has = true
      return
    }

    const nameNode = n.arguments?.[0]
    const name = litText(nameNode)
    if (!name) return // 非字面量首参（动态 attr 名），无法静态提取

    let entry = map.get(name)
    if (!entry) {
      entry = { name, observed: false, has: false, get: false, inferTypes: [] }
      map.set(name, entry)
    }
    const isHas = helper === 'hasAttr'
    if (isHas) entry.has = true
    else entry.get = true

    // type：`as XxxType` 强转（如 getAttr('type','default') as ButtonType），优先于字面量推断
    const parent = n.parent
    if (parent && parent.kind === K.AsExpression && parent.type) {
      const t = srcText(parent.type)
      if (t) entry.type = t
    }
    if (isHas || !n.arguments?.[1]) return
    const dArg = n.arguments[1]
    // default：仅字面量第二实参取值；表达式/标识符不写（gen 渲染 —）
    const lit = litText(dArg)
    if (lit !== undefined) {
      entry.default = lit
    } else if (dArg.kind === K.NumericLiteral || dArg.kind === K.TrueKeyword || dArg.kind === K.FalseKeyword) {
      entry.default = dArg.text
    }
    // 字面量 → 可推断类型
    if (dArg.kind === K.StringLiteral || dArg.kind === K.NoSubstitutionTemplateLiteral) {
      entry.inferTypes.push('string')
    } else if (dArg.kind === K.NumericLiteral) {
      entry.inferTypes.push('number')
    } else if (dArg.kind === K.TrueKeyword || dArg.kind === K.FalseKeyword) {
      entry.inferTypes.push('boolean')
    }
  })

  // 类型收尾：as 强转 > 字面量推断（多调用点同类型才采纳）> hasAttr-only boolean。
  // 有同名 prop 的 attr 不推断（prop 类型更富，gen 回退用 prop 类型，不拿 string 遮蔽）；
  // attr(kebab) 与 prop(camel) 需规范化互配：model-value ↔ modelValue
  for (const entry of map.values()) {
    if (entry.type !== undefined) continue
    const camel = entry.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    if (propNames?.has(entry.name) || propNames?.has(camel)) continue
    const uniq = [...new Set(entry.inferTypes)]
    if (uniq.length === 1) entry.type = uniq[0]
    else if (entry.has && !entry.get) entry.type = 'boolean'
  }

  // 排序：observed 在前（按声明顺序），非 observed 在后
  const observedOrder = new Map(observed.map((name, i) => [name, i]))
  return (
    [...map.values()]
      .filter(({ name }) => !GLOBAL_CONVENTION_ATTRS.has(name))
      // data-* 前缀是 HTML 规范保留的内部数据通道（组件间下发/状态镜像），
      // 不是公开 API，一律不进 API 表（全库现状零依赖，纯防御性过滤）
      .filter(({ name }) => !name.startsWith('data-'))
      .sort((a, b) => {
        const ao = a.observed ? (observedOrder.get(a.name) ?? 0) : 1e9
        const bo = b.observed ? (observedOrder.get(b.name) ?? 0) : 1e9
        return ao - bo
      })
      .map(({ name, type, default: def, observed }) => {
        // 按 { name, type?, default?, observed } 顺序输出
        const item = { name }
        if (type !== undefined) item.type = type
        if (def !== undefined) item.default = def
        item.observed = observed
        return item
      })
  )
}

// ---------- props：get/set 访问器 + 公共字段 ----------
// type 优先取 setter 形参类型注解（如 set columns(value: TableColumn[] | string)），
// 无 setter 时取 getter 返回类型；公共字段（如 tree 的 `load?: (payload) => void`）
// 取字段类型注解（非 static/private/protected 且带注解才抓，不猜）。
//
// default（只抓可靠字面量初始值，表达式/标识符/函数调用/对象/null 一律不抓）：
//   1) 字段声明初始值字面量（如 `private _items: unknown[] = []` → "[]"；
//      `load?: ... = undefined` 不抓；`action: ToastAction | null = null` 不抓）
//   2) getter 返回 backing field 引用（`return this._options` / `this.data.slice()` /
//      `[...this._files]`）时，追踪该字段的字面量初始值（如 virtual-list 的
//      `get items() { return this.data.slice() }` + `private data: unknown[] = []` → "[]"）
// 宁可不抓不可错抓：非字面量初始值（标识符 DEFAULT_DURATION、对象 {}、null）保持省略。
// 成员声明的前导 JSDoc 是否含 @apiProperty 标记（公开 property 通道的显式声明）。
// getFullText 含前导 trivia（注释/空白），取最后一个 JSDoc 块判定，避免误配更早的注释。
function hasApiPropFlag(member) {
  const full = typeof member.getFullText === 'function' ? member.getFullText() : member.getText()
  const start = full.lastIndexOf('/**')
  if (start === -1) return false
  return full.slice(start).includes('@apiProperty')
}

function extractProps(cls) {
  const propMap = new Map() // name -> { name, setType?, getType?, default?, api? }

  // backing fields：类内字段声明 → 初始值节点（含 private，供 getter 默认值追踪）
  const fieldInit = new Map()
  for (const m of cls.members || []) {
    if (m.kind === K.PropertyDeclaration && m.name?.text && m.initializer) {
      fieldInit.set(m.name.text, m.initializer)
    }
  }

  for (const m of cls.members || []) {
    // 静态成员（observedAttributes 等）与普通方法不作 props
    const mods = (m.modifiers || []).map((x) => x.kind)
    if (mods.includes(K.StaticKeyword)) continue
    if (m.kind !== K.GetAccessor && m.kind !== K.SetAccessor && m.kind !== K.PropertyDeclaration) continue
    const name = m.name?.text
    if (!name || name === OBSERVED_GETTER) continue

    const isAccessor = m.kind === K.GetAccessor || m.kind === K.SetAccessor
    // 私有/受保护成员一律不进 props（accessor 与公共字段同样过滤）
    if (mods.includes(K.PrivateKeyword) || mods.includes(K.ProtectedKeyword)) continue
    // 公共字段：无类型注解不猜
    if (!isAccessor) {
      if (!m.type) continue
    }
    let entry = propMap.get(name)
    if (!entry) {
      entry = { name }
      propMap.set(name, entry)
    }
    // @apiProperty 标记：getter/setter 任一声明即视为该 property 公开
    if (hasApiPropFlag(m)) entry.api = true

    if (isAccessor) {
      if (m.kind === K.SetAccessor) {
        entry.setType = m.parameters?.[0]?.type ? srcText(m.parameters[0].type) : undefined
      } else if (m.type) {
        entry.getType = srcText(m.type)
      }
      // getter：追踪 backing field 引用 → 该字段的字面量初始值作为默认值
      if (m.kind === K.GetAccessor) {
        const ret = (m.body?.statements || []).find((s) => s.kind === K.ReturnStatement)
        const field = getterBackingField(ret?.expression)
        if (field && fieldInit.has(field)) {
          const def = literalDefault(fieldInit.get(field))
          if (def !== undefined) entry.default = def
        }
      }
      continue
    }

    // 公共字段（带类型注解）：property setter 之外的另一类 property 通道
    const t = srcText(m.type)
    if (!t) continue
    if (!entry.setType) entry.setType = t
    // 字段声明初始值字面量 → 默认值（表达式/标识符/null 不抓）
    const def = literalDefault(m.initializer)
    if (def !== undefined) entry.default = def
  }
  const props = []
  for (const p of propMap.values()) {
    const item = { name: p.name }
    const type = p.setType ?? p.getType
    if (type) item.type = type
    if (p.default !== undefined) item.default = p.default
    if (p.api) item.api = true
    props.push(item)
  }
  return props
}

// getter 返回表达式 → backing field 字段名（无则不返回）：
//   `return this.X`、`return this.X.slice()`、`return [...this.X]`
function getterBackingField(retExpr) {
  if (!retExpr) return undefined
  // return this.X
  if (retExpr.kind === K.PropertyAccessExpression && retExpr.expression?.kind === K.ThisKeyword && retExpr.name?.text) {
    return retExpr.name.text
  }
  // return this.X.slice() / this.X.map(...) 等：this.X 上的方法调用
  if (retExpr.kind === K.CallExpression) {
    const callee = retExpr.expression
    if (
      callee?.kind === K.PropertyAccessExpression &&
      callee.expression?.kind === K.PropertyAccessExpression &&
      callee.expression.expression?.kind === K.ThisKeyword &&
      callee.expression.name?.text
    ) {
      return callee.expression.name.text
    }
  }
  // return [...this.X]：数组展开复制
  if (retExpr.kind === K.ArrayLiteralExpression) {
    const els = retExpr.elements || []
    if (els.length === 1 && els[0]?.kind === K.SpreadElement) {
      const spread = els[0].expression
      if (
        spread?.kind === K.PropertyAccessExpression &&
        spread.expression?.kind === K.ThisKeyword &&
        spread.name?.text
      ) {
        return spread.name.text
      }
    }
  }
  return undefined
}

// 字面量初始值 → 默认值文本（只抓 [] / '' / 0 / false / true / 数字 / 字符串）。
// 非字面量（标识符、函数调用、对象字面量 {}、null、undefined、含元素数组）一律不抓。
function literalDefault(node) {
  if (!node) return undefined
  // 空数组字面量（非空数组元素含表达式风险，宁可不抓）
  if (node.kind === K.ArrayLiteralExpression) {
    if ((node.elements || []).length === 0) return '[]'
    return undefined
  }
  if (node.kind === K.StringLiteral || node.kind === K.NoSubstitutionTemplateLiteral) return node.text
  if (node.kind === K.NumericLiteral) return node.text
  if (node.kind === K.TrueKeyword) return 'true'
  if (node.kind === K.FalseKeyword) return 'false'
  return undefined
}

// ---------- events：emit / new CustomEvent ----------
function extractEvents(cls, unresolved) {
  const events = []
  const seen = new Set()
  // 同一事件多处 emit 且 detail 不同的：合并为联合类型（A | B），避免漏报分支（如 menubar action/radio）
  // 组件间内部协议信号（非宿主 API，如 checkbox 子项→组的 limit-blocked 转发）不进公共 API 表
  const INTERNAL_EVENTS = new Set(['oas-limit-blocked', 'oas-collapse-item-click'])
  const variants = new Map() // name -> Set<detailText>
  const add = (name, detail) => {
    if (INTERNAL_EVENTS.has(name)) return
    if (!variants.has(name)) variants.set(name, new Set())
    if (detail) variants.get(name).add(detail)
  }
  const flush = () => {
    for (const [name, set] of variants) {
      if (seen.has(name)) continue
      seen.add(name)
      const item = { name }
      const list = [...set]
      if (list.length > 0) item.detail = list.length > 1 ? list.join(' | ') : list[0]
      events.push(item)
    }
    variants.clear()
  }

  walk(cls, (n) => {
    if (n.kind === K.NewExpression && n.expression?.text === 'CustomEvent') {
      const nameNode = n.arguments?.[0]
      const name = litText(nameNode)
      if (name) add(name) // CustomEvent 首参已是 oas- 前缀（如 oas-tag 的 oas-close）
      return
    }
    if (n.kind !== K.CallExpression) return
    const callee = n.expression
    if (
      !callee ||
      callee.kind !== K.PropertyAccessExpression ||
      callee.name?.text !== 'emit' ||
      callee.expression?.kind !== K.ThisKeyword
    )
      return
    const nameNode = n.arguments?.[0]
    const name = litText(nameNode)
    if (name) {
      // detail：第二实参源码文本；变量则省略
      let detail
      const dArg = n.arguments?.[1]
      if (dArg && dArg.kind !== K.Identifier) detail = srcText(dArg)
      add(`oas-${name}`, detail)
      return
    }
    // 非字面量事件名：emit(action)（modal/drawer）、emit(this.x ? 'a' : 'b')
    if (nameNode && nameNode.kind === K.Identifier) {
      // 回溯：找该标识符在所在方法参数上的联合类型注解（如 close(action: 'ok' | 'cancel')）
      const fn = enclosingFunctionLike(n)
      const param = fn?.parameters?.find((p) => p.name?.text === nameNode.text)
      const t = param?.type
      if (t && t.kind === K.UnionType) {
        const names = (t.types || [])
          .filter((x) => x.kind === K.LiteralType && x.literal?.kind === K.StringLiteral)
          .map((x) => x.literal.text)
        if (names.length) {
          for (const ev of names) add(`oas-${ev}`)
          return
        }
      }
      unresolved.push(`emit(${nameNode.text})：事件名来自变量，参数类型注解非字符串字面量联合，无法回溯`)
      return
    }
    if (nameNode && nameNode.kind === K.ConditionalExpression) {
      const a = litText(nameNode.whenTrue)
      const b = litText(nameNode.whenFalse)
      if (a && b) {
        let detail
        const dArg = n.arguments?.[1]
        if (dArg && dArg.kind !== K.Identifier) detail = srcText(dArg)
        add(`oas-${a}`, detail)
        add(`oas-${b}`, detail)
        return
      }
    }
    unresolved.push(`emit 首参既非字符串字面量也无法回溯（${srcText(nameNode)}）`)
  })

  flush()
  return events
}

// 向上找最近的函数/方法声明（用于 emit 变量回溯）
function enclosingFunctionLike(node) {
  let cur = node
  while (cur && cur.kind !== K.SourceFile) {
    if (cur.parameters) return cur // MethodDeclaration / FunctionDeclaration / ArrowFunction
    cur = cur.parent
  }
  return undefined
}

// ---------- slots：render() 模板字符串里的 <slot> ----------
// 用栈匹配排除「嵌套在 <slot name="x">…</slot> 内部」的 fallback `<slot>`（如 splitter）
function scanSlotsInHtml(html, names) {
  if (!html) return
  const re = /<slot\b([^>]*)(\/?)>|<\/slot>/g
  const stack = []
  let m
  while ((m = re.exec(html))) {
    if (m[0] === '</slot>') {
      stack.pop()
      continue
    }
    const attrs = m[1] || ''
    const selfClose = m[2] === '/'
    const nm = /name\s*=\s*["']([^"']+)["']/.exec(attrs)
    if (stack.length === 0) {
      // 模板表达式插值的动态插槽名（如 slot="${src.slotName}"）不是真实槽位名，跳过
      if (nm && nm[1].includes('${')) continue
      // 栈空 = 顶层 slot，才是组件真实槽位
      names.add(nm ? nm[1] : '')
    }
    if (!selfClose) stack.push(nm ? nm[1] : '')
  }
}

// `<template slot="x">` 选择器引用（如 virtual-list 的 itemTemplate() 查宿主子模板）：
// 命名插槽写在宿主侧子模板上而非 <slot name="...">，仍属该组件暴露的插槽 API。
// 名字按 doc 约定取完整选择器 `template[slot="x"]`（与语料/手写表 key 一致）。
function scanTemplateSlotRefs(text, names) {
  if (!text) return
  const re = /template\[slot=(?:"([^"]+)"|'([^']+)')\]/g
  let m
  while ((m = re.exec(text))) {
    const name = m[1] ?? m[2]
    // 模板表达式插值的动态名（如 slot="${src.slotName}" 被部分截获为 ${slot}）不是真实槽位，跳过
    if (name && !name.includes('${')) names.add(`template[slot="${name}"]`)
  }
}

// light-DOM 标记式插槽：组件用 querySelector('[slot="x"]') 读取（或动态 createElement('slot') 建槽）的
// 宿主子元素槽位，不走 shadow <slot>。同一槽已有归一形式 `template[slot="x"]` 时不再收裸名（避免重复行）。
// 排除：动态插值名、内部保留标记。
const MARKER_SLOT_DENY = new Set(['oas-popover-stash'])
function scanMarkerSlots(text, names) {
  if (!text) return
  const re = /\[slot\s*=\s*['"]([^'"]+)['"]\]/g
  let m
  while ((m = re.exec(text))) {
    const before = text.slice(0, m.index).match(/[A-Za-z_$]+$/)
    if (before && before[0] === 'template') continue
    const name = m[1]
    if (!name || name.includes('${') || name === '...' || MARKER_SLOT_DENY.has(name)) continue
    if (names.has(`template[slot="${name}"]`)) continue
    names.add(name)
  }
}

// `getAttribute('slot') === 'x'` / `.slot === 'x'`：组件按宿主子元素 slot 名识别槽位（写在代码而非模板里）
function scanSlotAttrRefs(text, names) {
  if (!text) return
  const re = /getAttribute\(\s*['"]slot['"]\s*\)\s*===\s*['"]([^'"]+)['"]|\.slot\s*===\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(text))) {
    const name = m[1] ?? m[2]
    if (name && !name.includes('${')) names.add(name)
  }
}

function extractSlots(cls) {
  const names = new Set()
  // 类内所有模板字面量（render 的 innerHTML 模板）与普通字符串
  const texts = []
  walk(cls, (n) => {
    if (n.kind === K.TemplateExpression || n.kind === K.NoSubstitutionTemplateLiteral) texts.push(n.getText())
    else if (n.kind === K.StringLiteral) texts.push(n.text)
  })
  for (const t of texts) {
    scanSlotsInHtml(t, names)
    scanTemplateSlotRefs(t, names)
  }
  // 归一扫描之后跑：已有 template[slot="x"] 的槽不再重复收裸名
  for (const t of texts) scanMarkerSlots(t, names)
  // 代码式判定（跨字符串，需整类源码）
  scanSlotAttrRefs(cls.getText(), names)
  return [...names].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a < b ? -1 : 1)).map((name) => ({ name }))
}

// ---------- 解析单个组件目录 ----------
function scanDir(project, dir, unresolvedGlobal) {
  const dirAbs = join(UI_SRC, dir)
  const indexAbs = join(dirAbs, 'index.ts')
  const manifest = {}
  if (!existsSync(indexAbs)) return manifest

  const indexSF = project.program.getSourceFile(indexAbs)
  if (!indexSF) {
    unresolvedGlobal.push(`${dir}/index.ts 解析失败`)
    return manifest
  }

  const defines = collectDefines(indexSF)
  for (const { tag, cls } of defines) {
    const tagKey = tag
    // 找到类文件
    let classNode = null
    let factoryCall = null
    let factoryFn = null
    let classFile = null
    // 组件目录：oas-*.ts 类文件 + index.ts（组装类可能定义于此，如 OASTable extends OASTableBase）
    const classFiles = [...listClassFiles(dirAbs)]
    const idxAbs = join(dirAbs, 'index.ts')
    if (existsSync(idxAbs)) classFiles.push(idxAbs)
    for (const fileAbs of classFiles) {
      const sf = project.program.getSourceFile(fileAbs)
      if (!sf) continue
      const hit = findClassNode(sf, cls)
      if (hit) {
        classNode = hit.node
        factoryCall = hit.factoryCall ?? null
        factoryFn = hit.factoryFn ?? null
        classFile = relative(ROOT, fileAbs).replace(/\\/g, '/')
        break
      }
    }
    // 组装类（如 OASTable extends OASTableBase）或跨目录继承类（如 dropdown-item ← menu-item）
    // 自身无 observedAttributes getter 时，回退解析其基类作为 API 承载体（属性/事件都在基类声明）
    if (classNode && !hasObservedGetter(classNode)) {
      const base = resolveApiBase(classNode, dirAbs, project, classFile)
      if (base) {
        classNode = base.node
        classFile = base.file
      }
    }
    const unresolved = []
    if (!classNode) {
      unresolved.push(`类 ${cls} 未在目录 ${dir} 中找到（可能定义于其他目录，跳过）`)
      manifest[tagKey] = {
        className: cls,
        sourceFile: null,
        attrs: [],
        props: [],
        events: [],
        slots: [],
        unresolved,
      }
      continue
    }

    const observed = getObservedAttributes(classNode, unresolved, factoryCall, factoryFn)
    const props = extractProps(classNode)
    const attrs = extractAttrs(classNode, observed, new Set(props.map((p) => p.name)))
    // 跨组件属性补充（badge 等由父组件 getAttribute 读取的属性）
    for (const name of SUPPLEMENT_ATTRS[tag] ?? []) {
      if (!attrs.some((a) => a.name === name)) attrs.push({ name, observed: false })
    }
    const events = extractEvents(classNode, unresolved)
    const slots = extractSlots(classNode)
    const cssVars = classFile ? extractCssVars(readFileSync(join(ROOT, classFile), 'utf8'), tag) : []

    manifest[tagKey] = {
      className: cls,
      sourceFile: classFile,
      attrs,
      props,
      events,
      slots,
      cssVars,
      unresolved,
    }
  }
  return manifest
}

// ---------- 统计 ----------
function summarize(manifest) {
  let attrs = 0
  let typed = 0
  let events = 0
  let slots = 0
  for (const m of Object.values(manifest)) {
    attrs += m.attrs.length
    typed += m.attrs.filter((a) => a.type).length
    events += m.events.length
    slots += m.slots.length
  }
  return {
    components: Object.keys(manifest).length,
    attrs,
    typed,
    events,
    slots,
    typeRatio: attrs ? (typed / attrs).toFixed(3) : '0',
  }
}

// ---------- main ----------
function main() {
  const dirs = listComponentDirs()
  console.log(`[scan] 组件目录：${dirs.length}`)

  const api = new API({ cwd: ROOT })
  api.ensureInitialized()
  const snap = api.updateSnapshot({ openProjects: [join(ROOT, 'packages', 'ui', 'tsconfig.json')] })
  const project = snap.getProjects()[0]

  const manifest = {}
  const unresolvedGlobal = []
  const order = [] // 保持 index.ts 顺序

  for (const dir of dirs) {
    const sub = scanDir(project, dir, unresolvedGlobal)
    for (const tag of Object.keys(sub)) {
      if (!(tag in manifest)) {
        manifest[tag] = sub[tag]
        order.push(tag)
      }
    }
  }

  // 按 index.ts 顺序输出
  const ordered = {}
  for (const tag of order) ordered[tag] = manifest[tag]

  // 按组件拆 manifest：每组件一个 <tag>.json（原子提交、按组件门禁），index.json 记顺序；清陈旧文件
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(order, null, 2) + '\n', 'utf8')
  const writtenTags = new Set(order)
  for (const tag of order) {
    writeFileSync(join(OUT_DIR, `${tag}.json`), JSON.stringify(ordered[tag], null, 2) + '\n', 'utf8')
  }
  for (const f of readdirSync(OUT_DIR)) {
    if (f === 'index.json' || !f.endsWith('.json')) continue
    const tag = f.slice(0, -5)
    if (!writtenTags.has(tag)) rmSync(join(OUT_DIR, f))
  }
  // 迁移：删旧单文件 manifest（已由 per-component 目录取代）
  if (existsSync(OUT)) rmSync(OUT)

  snap.dispose()
  api.close()

  const s = summarize(ordered)
  console.log('--- 统计 ---')
  console.log(`组件数（tag）：${s.components}`)
  console.log(`attr 总数：${s.attrs}（有 type 推断 ${s.typed}，占比 ${s.typeRatio}）`)
  console.log(`event 总数：${s.events}`)
  console.log(`slot 总数：${s.slots}`)
  const unresolvedList = []
  for (const tag of Object.keys(ordered)) {
    if (ordered[tag].unresolved.length) {
      for (const u of ordered[tag].unresolved) unresolvedList.push(`${tag}: ${u}`)
    }
  }
  for (const u of unresolvedGlobal) unresolvedList.push(`global: ${u}`)
  if (unresolvedList.length) {
    console.log('--- unresolved（需人工核对）---')
    for (const u of unresolvedList) console.log(`  - ${u}`)
  } else {
    console.log('--- unresolved：无 ---')
  }
  console.log(`=> 已写入 ${relative(ROOT, OUT)}`)
}

main()
