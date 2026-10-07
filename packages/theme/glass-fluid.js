/**
 * @oas-ui/theme/glass-fluid.js —— 液态玻璃「动态流动感」运行时（伴随 glass.css 使用，可选）。
 *
 * v1 能力：**指针跟随的镜面高光**。单文档级 `pointermove` 监听 → `composedPath` 命中
 * `[data-glass-surface]`（shadow 内组件也能命中）→ rAF 合批写元素**本地归一坐标**
 * `--oas-glass-px` / `--oas-glass-py`（百分比）并挂 `data-glass-fluid` 标记，
 * 组件影子样式经空闲伪元素 `::after` 渲染径向高光（见 glass.css 的高光变量）。
 *
 * 守卫（不满足即不挂监听，零开销）：
 * - 无 `data-glass`；`prefers-reduced-motion: reduce`；粗指针（`pointer: coarse`，触屏无 hover 语义）；
 * - `high-contrast` 主题（实心可访问性档优先）。
 *
 * 生命周期：`startGlassFluid()` / `stopGlassFluid()` 幂等；`stop` 清理监听、rAF 与元素内联变量
 * （SPA 泄漏防护：`data-glass`/`data-theme` 或媒体查询变化会经观察器自动起停）。
 * 模块加载即自动启动（浏览器环境；Node/SSR 静默跳过）。
 */

export const GLASS_SURFACE_ATTR = 'data-glass-surface'
export const GLASS_FLUID_ACTIVE_ATTR = 'data-glass-fluid'

const PX_VAR = '--oas-glass-px'
const PY_VAR = '--oas-glass-py'

/**
 * 守卫判定（纯函数，便于单测）：任一不满足即不启用。
 * @param {{ hasGlass: boolean, reducedMotion: boolean, coarsePointer: boolean, highContrast: boolean }} env
 */
export function shouldEnableGlassFluid(env) {
  return Boolean(env.hasGlass) && !env.reducedMotion && !env.coarsePointer && !env.highContrast
}

/**
 * 命中判定：事件 `composedPath`（缺失时退 `target`）里首个 `[data-glass-surface]` 元素。
 * 不遍历树、不查表——单次数组扫描。
 */
export function resolveGlassSurface(ev) {
  const path = typeof ev?.composedPath === 'function' ? ev.composedPath() : [ev?.target]
  for (const node of path ?? []) {
    if (node && typeof node.hasAttribute === 'function' && node.hasAttribute(GLASS_SURFACE_ATTR)) return node
  }
  return null
}

/**
 * 写/清元素高光坐标。
 * - `el` 非空：按元素 rect 换算本地百分比（0~100 取整）+ 挂 active 标记；
 * - `el` 为空：清内联变量与 active 标记（指针离开该 surface）。
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
  // 子像素精度：宽条带（app-bar/bottom-nav 全宽）按 1% 取整会出现 ~14px 的高光跳步
  const clamp = (v) => String(Number(Math.min(100, Math.max(0, v)).toFixed(2)))
  const px = rect.width > 0 ? ((clientX - rect.left) / rect.width) * 100 : 50
  const py = rect.height > 0 ? ((clientY - rect.top) / rect.height) * 100 : 50
  el.style.setProperty(PX_VAR, `${clamp(px)}%`)
  el.style.setProperty(PY_VAR, `${clamp(py)}%`)
  el.setAttribute(GLASS_FLUID_ACTIVE_ATTR, '')
}

/** 运行时状态（模块级单例） */
let started = false
let listener = null
let rafId = 0
let pending = null
let currentSurface = null
let observers = []
let boundDoc = null
let boundWin = null

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
  const raf = pending?.win?.requestAnimationFrame ?? globalThis.requestAnimationFrame
  rafId = raf(() => {
    rafId = 0
    const p = pending
    pending = null
    if (!p) return
    const surface = p.surface
    if (surface !== currentSurface) {
      // 命中面切换：清上一面
      if (currentSurface) applyGlassPointer(currentSurface, null, null)
      currentSurface = surface
    }
    if (surface) applyGlassPointer(surface, p.x, p.y)
  })
}

function onPointerMove(e) {
  const surface = resolveGlassSurface(e)
  pending = { surface, x: e.clientX, y: e.clientY, win: boundWin }
  scheduleWrite()
}

/** 非鼠标指针抬起/取消 → 清理（触屏 tap 无 pointerleave 路径，防高光残留） */
function onPointerRelease(e) {
  if (e.pointerType && e.pointerType !== 'mouse') clearCurrent()
}

/**
 * 文档捕获相位的 pointerleave：该事件在离开**任意后代**（图标/插槽子元素）时也会触发，
 * 无条件清理会导致指针停在 surface 上但跨界到子元素时高光被错误熄灭。
 * 仅当指针真正离开当前 surface 或离开文档（relatedTarget 为 null）才清理。
 * 注：shadow 内 surface 的 relatedTarget 经 retargeting 会呈现为宿主元素，contains 分支主要对 host 级
 * surface（如 app-bar）生效；shadow 内 surface 靠「离开事件后必随之指针移动 → 同帧 rAF 重写」保证无可见闪烁。
 */
function onDocPointerLeave(e) {
  const rt = e.relatedTarget
  if (currentSurface && rt && (currentSurface === rt || currentSurface.contains(rt))) return
  clearCurrent()
}

/** 清理当前高光（离开/停用/隐藏时调用） */
function clearCurrent() {
  if (currentSurface) applyGlassPointer(currentSurface, null, null)
  currentSurface = null
  pending = null
}

/** 安装起停观察器（幂等；一次会话内常驻——禁用后重新满足条件时能自动复活） */
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

/** 挂指针监听（幂等；仅守卫满足时） */
function attachPointer(doc, win) {
  if (started) return
  started = true
  listener = onPointerMove
  doc.addEventListener('pointermove', listener, { passive: true })
  // pointerleave 不冒泡：必须 capture 才能在 document 收到（指针移出视口/元素无后续 move 时清理）
  doc.addEventListener('pointerleave', onDocPointerLeave, { passive: true, capture: true })
  doc.addEventListener('pointerup', onPointerRelease, { passive: true })
  doc.addEventListener('pointercancel', onPointerRelease, { passive: true })
  win.addEventListener('blur', clearCurrent)
}

/**
 * 启动（幂等）。守卫不满足时不挂指针监听，但会安装起停观察器（供之后满足条件时自动启用）。
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

/** 停止（幂等）：退订指针监听 + 清 rAF + 清元素内联变量；观察器保留（标记恢复后自动重启）。 */
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
  // 兜底清理：清掉仍带 active 标记的元素（含未经由监听写入的情形；shadow 内元素由 currentSurface 覆盖）
  doc?.querySelectorAll?.(`[${GLASS_FLUID_ACTIVE_ATTR}]`)?.forEach((el) => applyGlassPointer(el, null, null))
  listener = null
  started = false
}

// 浏览器环境模块加载即自动启动（安装起停观察器：data-glass 稍后加上/摘除、媒体查询变化均自动起停）；
// Node/SSR 静默跳过。
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  startGlassFluid()
}
