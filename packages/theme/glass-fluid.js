/**
 * @oas-ui/theme/glass-fluid.js —— 液态玻璃「动态层」运行时（可选，伴随 glass.css）。
 *
 * 职责（B 档：玻璃规则体从组件剥离，动态层由运行时注入）：
 * 1. **注入高光样式表**：按注册表（tag → surface 选择器）把一张共享 `CSSStyleSheet`
 *    经 `adoptedStyleSheets` 注入对应组件的 shadow 根——组件源码零玻璃规则体、零标记属性；
 * 2. **指针镜面高光**：单文档 `pointermove` + `composedPath` 命中注册表 surface →
 *    rAF 合批写本地归一坐标（`--oas-glass-px/py`）并挂运行时标记 `data-glass-fluid`
 *    （注入表据此淡入高光）；离开/停用即清理（SPA 泄漏防护）。
 *
 * 守卫（不满足即不注入不改 DOM，零开销）：无 `data-glass`；`prefers-reduced-motion: reduce`；
 * 粗指针（`pointer: coarse`，触屏无 hover 语义）；`high-contrast`。
 * 生命周期：`startGlassFluid()` / `stopGlassFluid()` 幂等；stop 真移除注入表与注入观察器；
 * 起停观察器常驻（条件恢复后自动重启）。
 * 单例假设：本运行时按**单实例**设计（`glass.css`/`glass-fluid.js` 只应引入一次）。若将来出现
 * 「宿主 bundle 与 CDN / 多包各持一份」的重复加载（监听器/注入表翻倍），再对齐 icons 运行时的
 * `globalThis` 单例方案（同 `architecture.md §3.1` 效果层扩展点）。
 * 兼容基线：`adoptedStyleSheets` / `CSSStyleSheet` 需 Safari 16.4+ / Firefox 101+ / Chrome 73+；
 * 注入表用到 `:where()`（Chrome 88+ / Safari 14+ / Firefox 78+），与库内既有 `:where()`/`color-mix()` 用法一致，
 * 实际基线更高（本库另有 color-mix 基线）。不支持构造样式表时静默跳过（高光缺失，不影响其余玻璃层）。
 * 注：app-bar 溢出弹层「打开期间关折射」的防裁切规则**在组件内**（`data-panel-open`，功能规则、
 * 不依赖本运行时）——仅引 glass.css 或 reduced-motion 下同样安全。
 */

/** 指针命中时运行时挂在 surface 上的激活标记（仅运行时写入，组件源码无此标记） */
export const GLASS_FLUID_ACTIVE_ATTR = 'data-glass-fluid'

const PX_VAR = '--oas-glass-px'
const PY_VAR = '--oas-glass-py'

/**
 * 注册表：参与动态层的组件 → surface 选择器（shadow 内选择器；`host: true` 表示 surface 即宿主本身）。
 * 注册表是「哪些 shadow 根注入样式」与「指针命中谁」的唯一事实源。
 */
export const GLASS_REGISTRY = [
  { tag: 'oas-button', surface: 'button, a[part="button"]' },
  { tag: 'oas-switch', surface: 'button' },
  { tag: 'oas-slider', surface: 'input[type="range"]' },
  { tag: 'oas-app-bar', surface: ':host', host: true },
  { tag: 'oas-bottom-navigation', surface: '.tablist' },
  { tag: 'oas-message', surface: '.box' },
  { tag: 'oas-toast', surface: '.box' },
  { tag: 'oas-snackbar', surface: '.box' },
  { tag: 'oas-notification', surface: '.box' },
]

/** 高光层作用的 surface 选择器基名——**唯一来源**：基态/命中/按压三态由它派生，杜绝漂移。
 *  slider 例外：高光画在把手伪元素（`::-webkit-slider-thumb` / `::-moz-range-thumb`）上，不参与此列表。 */
const SHEEN_SURFACES = ['button', 'a[part="button"]', '.box', '.tablist', ':host']

/** 给 surface 选择器挂运行时标记（`:host` 需写成 `:host([attr])` 形式）。 */
const mark = (sel, attr) => (sel === ':host' ? `:host([${attr}])` : `${sel}[${attr}]`)

/** 需要注入定位锚点（`position: relative`）的 surface 基名。
 *  ⚠️ 只列**基础态未定位**的 surface：`.box`（fixed/relative 各异）与 `:host`（app-bar 各 position 模式）
 *  都不得无差别覆盖——box 由组件侧补相对、`:host` 仅 static 模式补。 */
const POSITION_SURFACES = ['button', 'a[part="button"]', '.tablist']

/** 实心（不透明）表面选择器：底不透明、文字多为白（白字 / 自定义色 on-color）。
 *  与组件 `oas-button.ts` 的实心规则同构：语义色 / 自定义色(has-color) 且非 filled/outlined/dashed/text/link/plain/ghost。
 *  用途：hover 高光与玻璃面一致，但**按压改用边缘内描边（非提亮）**——白高光铺底会把白字对比度压到门限下，
 *  而边缘描边不冲淡文字（与 Apple 镜面描边 / Fluent 内凹的按压常态一致）。
 *  ⚠️ 整段用 `:where()` 归零特异性——按压/禁用规则源序与特异性都不得被反超。 */
const SOLID_SURFACE =
  ':where(.primary,.success,.warning,.danger,.has-color):where(:not(.plain):not(.ghost):not(.filled):not(.outlined):not(.dashed):not(.text):not(.link))'
const GLASS_BUTTONS = ['button', 'a[part="button"]']
/** 高光层作用的 surface 选择器（基态/命中/按压均由 SHEEN_SURFACES 派生，杜绝漂移） */
const HIT_SELECTORS = () => SHEEN_SURFACES.map((s) => mark(s, GLASS_FLUID_ACTIVE_ATTR))

/**
 * 注入样式表内容（共享一份；命中标记 `data-glass-fluid` 时淡入高光）。
 * 静止不生成 background（axe 采样不受扰），仅命中时生成。
 * 玻璃面按压换成更强的高光色（真增强，非压暗）；实心按钮按压走边缘内描边（非提亮，守文字对比度）。
 */
export function buildGlassFluidSheetCss() {
  const attr = GLASS_FLUID_ACTIVE_ATTR
  const radial = (color) =>
    `radial-gradient(\n      var(--oas-glass-sheen-size, 180px) circle at var(--oas-glass-px, 50%) var(--oas-glass-py, 50%),\n      ${color},\n      transparent 65%\n    )`
  const baseAfter = SHEEN_SURFACES.map((s) => `${s === ':host' ? ':host' : s}::after`)
  const hit = HIT_SELECTORS()
  return `
/* @oas-ui/theme glass-fluid —— 动态层（运行时注入；组件源码零玻璃规则体） */
/* 让 surface 自成层叠上下文：高光层（z-index:-1）落在「surface 背景之上、文字之下」，
   镜面反射不冲淡标签文字（深色文字被白光罩住会掉对比度） */
${SHEEN_SURFACES.join(',\n')} {
  isolation: isolate;
}
${POSITION_SURFACES.map((s) => mark(s, attr))
  .concat([`:host([${attr}][data-position='static'])`])
  .join(',\n')} {
  position: relative;
}
/* 基态层：常驻但透明（仅用于淡入/淡出过渡；无命中标记时不画背景）。
   必须与命中态同域（含 .box），否则命中规则缺 content → 伪元素不生成 → 高光整体失效 */
${baseAfter.join(',\n')} {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--oas-transition-fast) var(--oas-ease-out);
}
${hit.map((sel) => `${sel}::after`).join(',\n')} {
  opacity: 1;
  background: ${radial('var(--oas-glass-sheen, transparent)')};
}
/* 按压收紧（玻璃面）：换成更强的高光色（真增强，非压暗），纯 CSS 不动 transform */
${hit.map((sel) => `${sel}:active::after`).join(',\n')} {
  background: ${radial('var(--oas-glass-sheen-press, transparent)')};
}
/* 按压收紧（实心按钮）：边缘内描边替代提亮铺底——不冲淡白字（白高光铺底会把白字对比度压到门限下）；
   置于通用按压规则之后同特异性覆盖，与 Apple 镜面描边 / Fluent 内凹的按压常态一致 */
${GLASS_BUTTONS.map((s) => `${mark(s, attr)}${SOLID_SURFACE}:active::after`).join(',\n')} {
  background: none;
  box-shadow: inset 0 0 0 2px var(--oas-glass-sheen-press, transparent);
}
/* 禁用控件静态无装饰（折射已关，高光同样不亮）；background:none 让计算值可直接断言（不只是 opacity 0）；
   链接形态按钮（a[part=button]，无原生 disabled）用 aria-disabled 表达禁用，同样关高光 */
button[${attr}][disabled]::after,
button[${attr}][aria-disabled='true']::after,
a[part="button"][${attr}][aria-disabled='true']::after {
  opacity: 0;
  background: none;
  box-shadow: none;
}
/* slider 把手（伪元素继承 input 上的坐标变量） */
input[data-glass-fluid]::-webkit-slider-thumb {
  background: ${radial('var(--oas-glass-sheen, transparent)')}, var(--oas-slider-color);
}
input[data-glass-fluid]::-moz-range-thumb {
  background: ${radial('var(--oas-glass-sheen, transparent)')}, var(--oas-slider-color);
}
input[data-glass-fluid]:active::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px var(--oas-color-bg), 0 0 0 4px color-mix(in srgb, var(--oas-slider-color) 45%, transparent);
}
input[data-glass-fluid]:active::-moz-range-thumb {
  box-shadow: 0 0 0 2px var(--oas-color-bg), 0 0 0 4px color-mix(in srgb, var(--oas-slider-color) 45%, transparent);
}
`
}

/** 守卫判定（纯函数，便于单测）：任一不满足即不启用。 */
export function shouldEnableGlassFluid(env) {
  return Boolean(env.hasGlass) && !env.reducedMotion && !env.coarsePointer && !env.highContrast
}

/**
 * 命中判定：事件 `composedPath`（缺失时退 `target`）里首个注册表 surface。
 * 规则：shadow 内 surface → 其 shadow 宿主 tag 命中注册表且元素匹配该 surface 选择器；
 *      宿主级 surface（`host: true`）→ 元素自身 localName 即注册 tag。
 */
export function resolveGlassSurface(ev) {
  const path = typeof ev?.composedPath === 'function' ? ev.composedPath() : [ev?.target]
  for (const node of path ?? []) {
    if (!node || typeof node.matches !== 'function' || typeof node.getRootNode !== 'function') continue
    const host = node.getRootNode()?.host ?? null
    for (const entry of GLASS_REGISTRY) {
      if (entry.host) {
        if (node.localName === entry.tag) return node
      } else if (host && host.localName === entry.tag && node.matches(entry.surface)) {
        return node
      }
    }
  }
  return null
}

/**
 * 写/清元素高光坐标。
 * - `el` 非空：按元素 rect 换算本地百分比（子像素）+ 挂激活标记；
 * - `el` 为空：清内联变量与激活标记（指针离开该 surface）。
 */
export function applyGlassPointer(el, clientX, clientY) {
  if (!el) return
  if (clientX == null || clientY == null) {
    el.style.setProperty(PX_VAR, '')
    el.style.setProperty(PY_VAR, '')
    el.removeAttribute(GLASS_FLUID_ACTIVE_ATTR)
    return
  }
  const rect = el.getBoundingClientRect()
  const clamp = (v) => String(Number(Math.min(100, Math.max(0, v)).toFixed(2)))
  const px = rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 50
  const py = rect.height > 0 ? ((clientY - rect.top) / rect.height) * 100 : 50
  el.style.setProperty(PX_VAR, `${clamp(px)}%`)
  el.style.setProperty(PY_VAR, `${clamp(py)}%`)
  el.setAttribute(GLASS_FLUID_ACTIVE_ATTR, '')
}

// ---------- 运行时状态（模块级单例） ----------
let started = false
let listener = null
let rafId = 0
let pending = null
let currentSurface = null
/** 起停观察器（常驻：data-glass/data-theme/媒体查询变化 → 自动起停） */
let observers = []
/** 注入期观察器（shadow 根级 `{ mo, root }`，随 stop 断连 + 宿主断连时按帧摘除） */
let injectObservers = []
/** 文档级 light DOM 观察器（单例；随 stop 断连） */
let docObserver = null
let boundDoc = null
let boundWin = null
let sheet = null
/** @type {Set<WeakRef<ShadowRoot>>} */
const injectedRoots = new Set()
let observedRoots = new WeakSet()

function envNow(doc, win) {
  return {
    hasGlass: doc.documentElement?.hasAttribute?.('data-glass') ?? false,
    reducedMotion: win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
    coarsePointer: win.matchMedia?.('(pointer: coarse)')?.matches ?? false,
    highContrast: doc.documentElement?.dataset?.theme === 'high-contrast',
  }
}

function scheduleWrite() {
  if (rafId) return
  const raf = boundWin?.requestAnimationFrame ?? globalThis.requestAnimationFrame
  rafId = raf(() => {
    rafId = 0
    const p = pending
    pending = null
    if (!p) return
    if (p.surface !== currentSurface) {
      if (currentSurface) applyGlassPointer(currentSurface, null, null)
      currentSurface = p.surface
    }
    if (p.surface) applyGlassPointer(p.surface, p.x, p.y)
  })
}

function onPointerMove(e) {
  pending = { surface: resolveGlassSurface(e), x: e.clientX, y: e.clientY }
  scheduleWrite()
}

/** 非鼠标指针抬起/取消 → 清理（触屏 tap 无 pointerleave 路径，防高光残留） */
function onPointerRelease(e) {
  if (e.pointerType && e.pointerType !== 'mouse') clearCurrent()
}

/**
 * 文档捕获相位的 pointerleave：该事件在离开任意后代时也会触发，无条件清理会误灭高光。
 * 仅当指针真正离开当前 surface 或离开文档（relatedTarget 为 null）才清理。
 * 注：shadow 内 surface 的 relatedTarget 经 retargeting 呈现为宿主，contains 分支主要对 host 级
 * surface（如 app-bar）生效；shadow 内 surface 靠「离开事件后随之指针移动 → 同帧 rAF 重写」保证无可见闪烁。
 */
function onDocPointerLeave(e) {
  const rt = e.relatedTarget
  if (currentSurface && rt && (currentSurface === rt || currentSurface.contains(rt))) return
  clearCurrent()
}

function clearCurrent() {
  if (currentSurface) applyGlassPointer(currentSurface, null, null)
  currentSurface = null
  pending = null
}

/** 建共享样式表（一次；不支持构造样式表时返回 null，运行时静默跳过注入） */
function ensureSheet() {
  if (sheet) return sheet
  try {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(buildGlassFluidSheetCss())
  } catch {
    sheet = null
  }
  return sheet
}

/** 给一个 shadow 根注入共享样式表（幂等；外部清空后再次调用会补回） */
function injectInto(root) {
  if (!root || !root.adoptedStyleSheets) return
  const s = ensureSheet()
  if (!s) return
  if (root.adoptedStyleSheets.includes(s)) return
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, s]
  injectedRoots.add(new WeakRef(root))
}

/** 观察 shadow 根（找嵌套自研组件），幂等；观察器随会话在 stop 时断连。
 *  必须观察**每个**自研元素的 shadow 根：MutationObserver 不跨 shadow 边界，文档级 MO 看不到
 *  组件 shadow 内的动态插入（如 oas-table 可编辑单元格在 shadow 内插入 oas-switch）。
 *  为防瞬态实例常驻累积，宿主断连的根会在帧内被 `pruneObservers` 摘除。 */
function observeRoot(root) {
  if (!root || observedRoots.has(root)) return
  observedRoots.add(root)
  const mo = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLElement) scan(n)
    // shadow 内的增删不会触发文档级 MO（不跨 shadow 边界），必须就地排程摘除断连根
    pruneObservers()
  })
  mo.observe(root, { childList: true, subtree: true })
  injectObservers.push({ mo, root })
}

/** 摘除宿主已断连的观察器（防瞬态组件实例累积；帧内至多一次） */
let pruneScheduled = false
function pruneObservers() {
  if (pruneScheduled) return
  pruneScheduled = true
  const raf = boundWin?.requestAnimationFrame ?? globalThis.requestAnimationFrame
  raf(() => {
    pruneScheduled = false
    for (let i = injectObservers.length - 1; i >= 0; i--) {
      const e = injectObservers[i]
      const host = e.root?.host
      if (!host || !host.isConnected) {
        e.mo.disconnect()
        injectObservers.splice(i, 1)
      }
    }
  })
}

/** 发现一个组件元素：注册表命中 → 注入；任何自研元素 → 观察其 shadow 根（覆盖嵌套）。
 *  未升级（尚无 shadowRoot）时挂 whenDefined 兜底——升级不触发 mutation，必须显式补扫。 */
function visit(el) {
  if (!(el instanceof HTMLElement)) return
  const tag = el.localName
  if (!tag.startsWith('oas-')) return
  if (!el.shadowRoot) {
    if (GLASS_REGISTRY.some((e) => e.tag === tag)) {
      customElements.whenDefined(tag).then(() => visit(el))
    }
    return
  }
  if (!started) return // 仅运行期注入（停用即净）
  if (GLASS_REGISTRY.some((e) => e.tag === tag)) injectInto(el.shadowRoot)
  observeRoot(el.shadowRoot)
}

/** 扫描子树（含自身）里的自研组件 */
function scan(node) {
  if (!(node instanceof HTMLElement)) return
  if (node.localName.startsWith('oas-')) visit(node)
  for (const el of node.querySelectorAll('*')) if (el.localName.startsWith('oas-')) visit(el)
}

/** 安装起停观察器（幂等；常驻——禁用后重新满足条件时能自动复活） */
function installObservers(doc, win) {
  if (observers.length) return
  const sync = () => {
    if (shouldEnableGlassFluid(envNow(doc, win))) startGlassFluid({ doc, win })
    else stopGlassFluid()
  }
  const mo = new MutationObserver(sync)
  mo.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-glass', 'data-theme'] })
  observers.push(mo)
  for (const q of ['(prefers-reduced-motion: reduce)', '(pointer: coarse)']) {
    const mq = win.matchMedia?.(q)
    if (mq?.addEventListener) {
      mq.addEventListener('change', sync)
      observers.push({ disconnect: () => mq.removeEventListener('change', sync) })
    }
  }
}

/** 挂指针监听 + 注入扫描（单例；重复调用只补扫，不重复挂监听/观察器） */
function attachPointer(doc, win) {
  if (!started) {
    started = true
    listener = onPointerMove
    doc.addEventListener('pointermove', listener, { passive: true })
    doc.addEventListener('pointerleave', onDocPointerLeave, { passive: true, capture: true })
    doc.addEventListener('pointerup', onPointerRelease, { passive: true })
    doc.addEventListener('pointercancel', onPointerRelease, { passive: true })
    win.addEventListener('blur', clearCurrent)
    // 文档级 MO：捕获 light DOM（含跨根 slot 分发）里新增的自研组件；shadow 内由各根自己的 MO 覆盖
    docObserver = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) scan(n)
      pruneObservers()
    })
    docObserver.observe(doc.documentElement, { childList: true, subtree: true })
  }
  // 全量补扫（幂等）：覆盖「运行时节启动早于组件升级/挂载」的竞态
  scan(doc.documentElement)
}

/**
 * 启动（幂等）。守卫不满足时不注入不改 DOM，但会安装起停观察器（供之后满足条件时自动启用）。
 * @param {{ doc?: Document, win?: Window }} [opts]
 */
export function startGlassFluid(opts = {}) {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null)
  const win = opts.win ?? (typeof window !== 'undefined' ? window : null)
  if (!doc || !win) return
  boundDoc = doc
  boundWin = win
  installObservers(doc, win)
  if (shouldEnableGlassFluid(envNow(doc, win))) attachPointer(doc, win)
}

/** 停止（幂等）：退订指针监听 + 清标记/变量 + **移除注入表** + 断连注入观察器（起停观察器保留）。 */
export function stopGlassFluid() {
  const doc = boundDoc ?? (typeof document !== 'undefined' ? document : null)
  const win = boundWin ?? (typeof window !== 'undefined' ? window : null)
  if (doc && listener) {
    doc.removeEventListener('pointermove', listener)
    doc.removeEventListener('pointerleave', onDocPointerLeave, { capture: true })
    doc.removeEventListener('pointerup', onPointerRelease)
    doc.removeEventListener('pointercancel', onPointerRelease)
  }
  if (win) win.removeEventListener('blur', clearCurrent)
  if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
  rafId = 0
  clearCurrent()
  // 清宿主级/文档级标记（shadow 内元素由 currentSurface 覆盖）
  doc?.querySelectorAll?.(`[${GLASS_FLUID_ACTIVE_ATTR}]`)?.forEach((el) => applyGlassPointer(el, null, null))
  // 移除注入表（真停用即净）
  for (const ref of injectedRoots) {
    const root = ref.deref()
    if (root && sheet && root.adoptedStyleSheets) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets].filter((s) => s !== sheet)
    }
  }
  injectedRoots.clear()
  for (const e of injectObservers) e.mo.disconnect()
  injectObservers = []
  docObserver?.disconnect()
  docObserver = null
  observedRoots = new WeakSet()
  pruneScheduled = false
  listener = null
  started = false
}

// 浏览器环境模块加载即自动启动（安装起停观察器：data-glass 稍后加上/摘除、媒体查询变化均自动起停）；
// Node/SSR 静默跳过。
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  startGlassFluid()
}
