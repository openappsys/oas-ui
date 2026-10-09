import { describe, it, expect } from 'vitest'
import {
  beginScrub,
  scrubSteps,
  scrubModifier,
  scrubValueAt,
  roundToPrecision,
  SCRUB_PX_PER_STEP,
  SCRUB_FINE_FACTOR,
  SCRUB_FINER_FACTOR,
} from './scrub.js'

describe('scrub 像素锚定计步', () => {
  it('SCRUB_PX_PER_STEP = 4（每 4px 计一步）', () => {
    expect(SCRUB_PX_PER_STEP).toBe(4)
  })

  it('每 4px 计一步：横移 4px = +1 步、8px = +2 步、12px = +3 步', () => {
    expect(scrubSteps(100, 104)).toBe(1)
    expect(scrubSteps(100, 108)).toBe(2)
    expect(scrubSteps(100, 112)).toBe(3)
    expect(scrubSteps(100, 88)).toBe(-3)
  })

  it('拖回锚点 = 0 步 = 基准值（旧值复现）', () => {
    const anchor = beginScrub(100, 42)
    expect(scrubSteps(100, 100)).toBe(0)
    expect(scrubValueAt(anchor, 100, 1, false, false)).toBe(42)
  })

  it('值 = 基准 + 步数 × step：step 缩放计步幅度', () => {
    const anchor = beginScrub(100, 10)
    expect(scrubValueAt(anchor, 108, 1, false, false)).toBe(12)
    expect(scrubValueAt(anchor, 108, 5, false, false)).toBe(20)
    expect(scrubValueAt(anchor, 92, 5, false, false)).toBe(0)
  })

  it('Shift = 精调（×0.2，与 knob 同口径，不引入加速档）', () => {
    expect(SCRUB_FINE_FACTOR).toBe(0.2)
    expect(scrubModifier(true, false)).toBe(0.2)
    const anchor = beginScrub(100, 10)
    // 20px = 5 步 × 1 × 0.2 = +1
    expect(scrubValueAt(anchor, 120, 1, true, false)).toBe(11)
  })

  it('Alt = 超精调（×0.04）；Shift+Alt 同 Alt（不叠乘）', () => {
    expect(SCRUB_FINER_FACTOR).toBe(0.04)
    expect(scrubModifier(false, true)).toBe(0.04)
    expect(scrubModifier(true, true)).toBe(0.04)
    const anchor = beginScrub(100, 10)
    // 100px = 25 步 × 1 × 0.04 = +1
    expect(scrubValueAt(anchor, 200, 1, false, true)).toBe(11)
  })

  it('浮点尾巴自动收敛：Shift/Alt/小数 step 的步进合成值即数学期望（无显式 precision 也不产脏值）', () => {
    // Shift ×0.2：10 + 23 步在无修约时是 14.600000000000001（实现浮点误差 ≠ 数学期望 14.6）
    const a = beginScrub(100, 10)
    expect(scrubValueAt(a, 100 + 23 * SCRUB_PX_PER_STEP, 1, true, false)).toBe(14.6)
    // Alt ×0.04：10 + 28 步无修约时是 11.120000000000001
    const b = beginScrub(100, 10)
    expect(scrubValueAt(b, 100 + 28 * SCRUB_PX_PER_STEP, 1, false, true)).toBe(11.12)
    // 小数 step：0 + 0.1 × 3 步无修约时是 0.30000000000000004
    const c = beginScrub(100, 0)
    expect(scrubValueAt(c, 112, 0.1, false, false)).toBe(0.3)
  })

  it('自动收敛保留基准小数位：base=5.5、step=1 拖 2 步 = 7.5（不被取整吞掉）', () => {
    const a = beginScrub(100, 5.5)
    expect(scrubValueAt(a, 108, 1, false, false)).toBe(7.5)
  })

  it('科学计数法小步长（step=1e-7）不塌缩为整数：按指数正确推导小数位', () => {
    // String(1e-7) = "1e-7"（e 形）；朴素只认「.」的实现会判 0 位 → 步进值被取整吞成 0
    const a = beginScrub(100, 0)
    expect(scrubValueAt(a, 104, 1e-7, false, false)).toBe(1e-7)
    expect(scrubValueAt(a, 112, 1e-7, false, false)).toBe(3e-7)
    // 带小数尾数的指数形式（1.5e-7 → 8 位）与 step 叠加同样精确
    const b = beginScrub(100, 1.5e-7)
    expect(scrubValueAt(b, 104, 1e-7, false, false)).toBe(2.5e-7)
  })

  it('显式 precision 是更严的值约束：precision=0 时修饰键步进被钳回整数位', () => {
    const a = beginScrub(100, 10)
    expect(scrubValueAt(a, 120, 1, true, false, { precision: 0 })).toBe(11) // 5 步 ×0.2 = +1
    expect(scrubValueAt(a, 124, 1, true, false, { precision: 0 })).toBe(11) // 6 步 = 11.2 → 钳回 11
  })

  it('min/max 夹取：越界钳在边界', () => {
    const anchor = beginScrub(100, 8)
    expect(scrubValueAt(anchor, 200, 1, false, false, { min: 0, max: 10 })).toBe(10)
    expect(scrubValueAt(anchor, 0, 1, false, false, { min: 0, max: 10 })).toBe(0)
  })

  it('precision 修约：显式精度是更严的值约束（自动收敛已给 0.21；precision=1 再钳到 0.2）', () => {
    const anchor = beginScrub(100, 0)
    expect(scrubValueAt(anchor, 112, 0.07, false, false)).toBe(0.21) // 无 precision 也收敛到数学期望
    expect(scrubValueAt(anchor, 112, 0.07, false, false, { precision: 2 })).toBe(0.21)
    expect(scrubValueAt(anchor, 112, 0.07, false, false, { precision: 1 })).toBe(0.2)
  })

  it('0 步时精确返回基准值（不经 precision 修约，恢复原值）', () => {
    const anchor = beginScrub(100, 0.15)
    expect(scrubValueAt(anchor, 100, 1, false, false, { precision: 1 })).toBe(0.15)
  })

  it('roundToPrecision：非法精度原样返回', () => {
    expect(roundToPrecision(0.1 + 0.2, 2)).toBe(0.3)
    expect(roundToPrecision(1.005, 0)).toBe(1)
    expect(roundToPrecision(5, -1)).toBe(5)
    expect(roundToPrecision(5, Number.NaN)).toBe(5)
  })

  it('roundToPrecision：超大精度钳到 100 不抛 RangeError（toFixed 只接受 0–100）', () => {
    expect(() => roundToPrecision(1.5, 101)).not.toThrow()
    expect(() => roundToPrecision(1.5, 1e6)).not.toThrow()
    expect(roundToPrecision(1.5, 100)).toBe(1.5)
  })
})
