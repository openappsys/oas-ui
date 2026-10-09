/**
 * scrub —— 数值指针微调（像素锚定计步）的纯函数核心。
 *
 * 交互语义（专业密度数值录入惯例）：
 * - 按下时记录「锚点像素 + 基准值」，按下本身不写值（零操作）；
 * - 横移每 SCRUB_PX_PER_STEP 像素计一步，值 = 基准 + 步数 × step；
 * - 拖回锚点（0 步）精确恢复基准值——旧值复现，误拖可无损撤销；
 * - Shift = 精调（×0.2，与 knob 的 FINE_FACTOR 同口径）、Alt = 超精调（×0.04）；
 *   **不引入加速档**（同库修饰键方向必须唯一：Shift 恒为「更细」）；
 * - 激活阈值 = 一个计步单位：位移不足 SCRUB_PX_PER_STEP 时视为普通点击
 *   （不激活、不写值，保留宿主输入框的聚焦/文本选择默认行为）。
 *
 * 本模块不碰 DOM 事件，锚定状态由调用方（slider 读数框 / input-number 输入框）持有。
 */

/** 计步单位：横移每 4px 计一步 */
export const SCRUB_PX_PER_STEP = 4

/** Shift 精调倍率（与 form/knob 的 FINE_FACTOR 同一口径） */
export const SCRUB_FINE_FACTOR = 0.2

/** Alt 超精调倍率（在精调基础上再细一档） */
export const SCRUB_FINER_FACTOR = 0.04

/** 一次 scrub 的锚定状态：按下像素 + 基准值 */
export interface ScrubAnchor {
  /** 按下时的 clientX（像素锚点） */
  anchorX: number
  /** 按下时的基准值（拖回锚点时精确恢复） */
  baseValue: number
}

/** 值夹取与修约选项（调用方按组件语义传入，缺省不夹取不修约） */
export interface ScrubClampOptions {
  min?: number
  max?: number
  /** 小数位修约（仅作用于位移后的值；0 步恢复基准时不修约） */
  precision?: number
}

/** 记录锚点：按下像素 + 基准值 */
export function beginScrub(clientX: number, baseValue: number): ScrubAnchor {
  return { anchorX: clientX, baseValue }
}

/** 锚点 → 当前像素的步数（四舍五入；拖回锚点 = 0） */
export function scrubSteps(anchorX: number, currentX: number): number {
  return Math.round((currentX - anchorX) / SCRUB_PX_PER_STEP)
}

/** 修饰键倍率：Shift 精调、Alt 超精调（Shift+Alt 同 Alt，不叠乘）、无修饰 = 1 */
export function scrubModifier(shiftKey: boolean, altKey: boolean): number {
  if (altKey) return SCRUB_FINER_FACTOR
  if (shiftKey) return SCRUB_FINE_FACTOR
  return 1
}

/** 按 precision 小数位修约（浮点步进尾巴收敛）；精度非法（负数/NaN）原样返回 */
export function roundToPrecision(v: number, precision: number): number {
  if (!Number.isFinite(precision) || precision < 0) return v
  // 上限 100：Number.prototype.toFixed 只接受 0–100，超大精度（如 precision="1000"）会抛 RangeError
  const p = Math.min(100, Math.floor(precision))
  return Number(v.toFixed(p))
}

/**
 * 锚点 + 当前像素 → 值：基准 + 步数 × step × 修饰倍率，再夹取范围与按 precision 修约。
 * 步数为 0（拖回锚点）时精确返回基准值——基准是既有合法值，不修约、仅夹取。
 *
 * 浮点尾巴自动收敛（正确性而非显示约束）：步进合成（如 0.1×3、0.2 的倍数）会产生
 * 二进制浮点误差（0.30000000000000004 ≠ 数学期望 0.3），修约位数 = step/倍率/基准的
 * 有效小数位之和——只消实现误差，不改变步进语义。显式 precision 是更严的值约束
 * （如 0 = 整数），与自动位数取较小者（precision=0 时修饰键步进被值约束钳回整数位）。
 */
export function scrubValueAt(
  anchor: ScrubAnchor,
  currentX: number,
  step: number,
  shiftKey: boolean,
  altKey: boolean,
  clamp?: ScrubClampOptions,
): number {
  const steps = scrubSteps(anchor.anchorX, currentX)
  if (steps === 0) return clampNum(anchor.baseValue, clamp)
  const effStep = (Number.isFinite(step) && step > 0 ? step : 1) * scrubModifier(shiftKey, altKey)
  const v = anchor.baseValue + steps * effStep
  const auto = Math.min(12, decimalsOf(effStep) + decimalsOf(anchor.baseValue))
  const digits =
    clamp?.precision != null && Number.isFinite(clamp.precision)
      ? Math.min(auto, Math.max(0, Math.floor(clamp.precision)))
      : auto
  return clampNum(roundToPrecision(v, digits), clamp)
}

/** 范围夹取（缺省边界不夹） */
function clampNum(v: number, clamp?: ScrubClampOptions): number {
  let out = v
  if (clamp?.min != null && Number.isFinite(clamp.min)) out = Math.max(out, clamp.min)
  if (clamp?.max != null && Number.isFinite(clamp.max)) out = Math.min(out, clamp.max)
  return out
}

/** 数字的十进制有效小数位（含科学计数法，如 1e-7 → 7）；cap 12 防脏基准的超长浮点尾巴放大修约位数 */
function decimalsOf(n: number): number {
  if (!Number.isFinite(n)) return 0
  const s = String(Math.abs(n))
  const expIdx = s.indexOf('e')
  if (expIdx >= 0) {
    // 科学计数法（<1e-6 或 ≥1e21 时 String 会走指数形式）：小数位 = 尾数小数位 − 指数
    const mantissa = s.slice(0, expIdx)
    const dot = mantissa.indexOf('.')
    const mantDecimals = dot < 0 ? 0 : mantissa.length - dot - 1
    const exp = Number(s.slice(expIdx + 1))
    return Math.min(Math.max(0, mantDecimals - exp), 12)
  }
  const dot = s.indexOf('.')
  if (dot < 0) return 0
  return Math.min(s.length - dot - 1, 12)
}
