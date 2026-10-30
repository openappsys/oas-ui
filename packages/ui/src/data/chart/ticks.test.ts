import { describe, it, expect, vi } from 'vitest'
import {
  formatTick,
  formatterCacheSize,
  resetFormatterCacheForTests,
  niceStep,
  niceTicks,
  tickFractionDigits,
} from './ticks.js'

describe('niceStep', () => {
  it('只使用 1 / 2 / 2.5 / 5 / 10 × 10^n 序列，阈值处向上切换', () => {
    expect(niceStep(1)).toBe(1)
    expect(niceStep(1.0001)).toBe(2)
    expect(niceStep(2)).toBe(2)
    expect(niceStep(2.0001)).toBe(2.5)
    expect(niceStep(2.5)).toBe(2.5)
    expect(niceStep(2.5001)).toBe(5)
    expect(niceStep(5)).toBe(5)
    expect(niceStep(5.0001)).toBe(10)
    expect(niceStep(10)).toBe(10)
    expect(niceStep(10.0001)).toBe(20)
  })

  it('跨数量级保持序列（小数与小数步长）', () => {
    expect(niceStep(0.0025)).toBe(0.0025)
    expect(niceStep(0.0026)).toBe(0.005)
    expect(niceStep(0.05)).toBe(0.05)
    expect(niceStep(250)).toBe(250)
    expect(niceStep(2.5e8)).toBe(2.5e8)
  })

  it('除法产生的浮点噪声不改变档位（0.2 / 4 = 0.05 仍落在 5 档）', () => {
    expect(niceStep(0.2 / 4)).toBe(0.05)
    expect(niceStep(0.3 / 4)).toBe(0.1)
    expect(niceStep(90 / 4)).toBe(25)
  })

  it('零 / 负数 / 非有限值返回 0', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(niceStep(bad), String(bad)).toBe(0)
    }
  })
})

describe('niceTicks', () => {
  it('0.01：步长 0.0025、顶格 0.01（小数量程不再退化为整步）', () => {
    expect(niceTicks(0.01)).toEqual({
      max: 0.01,
      step: 0.0025,
      values: [0, 0.0025, 0.005, 0.0075, 0.01],
    })
  })

  it('0.2：步长 0.05、顶格 0.2', () => {
    expect(niceTicks(0.2)).toEqual({
      max: 0.2,
      step: 0.05,
      values: [0, 0.05, 0.1, 0.15, 0.2],
    })
  })

  it('90：顶格 100（契约明确接受 90 → 100）', () => {
    expect(niceTicks(90)).toEqual({
      max: 100,
      step: 25,
      values: [0, 25, 50, 75, 100],
    })
  })

  it('10：顶格 10（双轴右轴 10 → 10，不再被抬到 12）', () => {
    expect(niceTicks(10)).toEqual({
      max: 10,
      step: 2.5,
      values: [0, 2.5, 5, 7.5, 10],
    })
  })

  it('浮点噪声：0.3 → 步长 0.1 / 顶格 0.4，values 无 0.30000000000000004', () => {
    const ticks = niceTicks(0.3)
    expect(ticks).toEqual({
      max: 0.4,
      step: 0.1,
      values: [0, 0.1, 0.2, 0.3, 0.4],
    })
    expect(ticks.values.map(String)).toEqual(['0', '0.1', '0.2', '0.3', '0.4'])
  })

  it('大数量程：1e9 → 步长 2.5e8 / 顶格 1e9', () => {
    expect(niceTicks(1e9)).toEqual({
      max: 1e9,
      step: 2.5e8,
      values: [0, 2.5e8, 5e8, 7.5e8, 1e9],
    })
  })

  it('段数可调（双轴以主轴档数为锚共用同一序列）', () => {
    const ticks = niceTicks(10, 5)
    expect(ticks.step).toBe(2)
    expect(ticks.max).toBe(10)
    expect(ticks.values).toHaveLength(6)
  })

  it('零 / 非法 / 负数：0 步长与全零刻度（保持档数，避免除零）', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(niceTicks(bad), String(bad)).toEqual({ max: 0, step: 0, values: [0, 0, 0, 0, 0] })
    }
  })

  // 回归：rough = rawMax / segments 的浮点尾差（如 0.4000000000000001/4 = 0.10000000000000003）
  // 曾被 1e-9 归一化吸到 0.1 档，导致 max=0.4 < rawMax。选档后必须再校验 max >= rawMax，
  // 不满足时顺延下一合法 nice 档（0.1 → 0.2、1 → 2、2.5 → 5）。
  it.each([
    ['0.4000000000000001', 0.4000000000000001, 0.2, 0.8],
    ['4.0000000001', 4.0000000001, 2, 8],
    ['10.0000000001', 10.0000000001, 5, 20],
  ])('浮点尾差 %s：顺延下一合法档，max 严格 ≥ rawMax', (_label, raw, step, max) => {
    const ticks = niceTicks(raw)
    expect(ticks.step).toBe(step)
    expect(ticks.max).toBe(max)
    expect(ticks.max).toBeGreaterThanOrEqual(raw)
    expect(ticks.values.every(Number.isFinite)).toBe(true)
  })

  // 有效有限渲染域：普通 double 上界 / 下界都要给有限可渲染结果；超出域或非有限 raw
  // 明确降级（上溢钳到 MAX_VALUE + 等分 step；非有限 raw 用文档化零哨兵）。
  it.each([
    ['1.7e308', 1.7e308],
    ['Number.MAX_VALUE', Number.MAX_VALUE],
    ['1e308', 1e308],
    ['5e-324 === Number.MIN_VALUE（最小次正规）', Number.MIN_VALUE],
    ['1e-320', 1e-320],
  ])('极值 %s：max 严格 ≥ rawMax 且 values 全有限', (_label, raw) => {
    const ticks = niceTicks(raw)
    expect(Number.isFinite(ticks.max)).toBe(true)
    expect(ticks.max).toBeGreaterThanOrEqual(raw)
    expect(ticks.step).toBeGreaterThan(0)
    expect(ticks.values).toHaveLength(5)
    expect(ticks.values[0]).toBe(0)
    expect(ticks.values.every(Number.isFinite)).toBe(true)
    expect(ticks.values[ticks.values.length - 1]).toBe(ticks.max)
    for (let i = 1; i < ticks.values.length; i++) {
      expect(ticks.values[i]!).toBeGreaterThan(ticks.values[i - 1]!)
    }
  })

  // 回归（fix round 2）：5..10 × MIN_VALUE 曾因 nextNiceStep 里 10 ** -324 === 0
  // 返回 Infinity，被 overflowTicks 误判为 MAX_VALUE。次正规档必须逐档推进：
  // 2×MIN → 2.5×MIN → 5×MIN → 10×MIN → 20×MIN，顶格不得跳到 MAX_VALUE。
  it.each([
    ['2×MIN', 2 * Number.MIN_VALUE],
    ['5×MIN', 5 * Number.MIN_VALUE],
    ['8×MIN', 8 * Number.MIN_VALUE],
    ['10×MIN', 10 * Number.MIN_VALUE],
  ])('次正规 %s：不误判上溢，顶格有限且 ≤ rawMax×10', (_label, raw) => {
    const ticks = niceTicks(raw)
    expect(ticks.max).toBeGreaterThanOrEqual(raw)
    expect(ticks.max).toBeLessThan(Number.MAX_VALUE)
    expect(ticks.max).toBeLessThan(1e-300)
    expect(ticks.max).toBeLessThanOrEqual(raw * 10)
    expect(ticks.values[0]).toBe(0)
    expect(ticks.values.every(Number.isFinite)).toBe(true)
    expect(ticks.values[ticks.values.length - 1]).toBe(ticks.max)
    for (let i = 1; i < ticks.values.length; i++) {
      expect(ticks.values[i]!).toBeGreaterThan(ticks.values[i - 1]!)
    }
  })

  // 属性式覆盖：随机量级（含次正规与接近 MAX_VALUE）都必须满足 max >= rawMax、
  // step > 0、values 全有限且严格递增。固定 LCG 种子保证可复现。
  it('随机量级属性：max ≥ rawMax、values 有限且严格递增', () => {
    let seed = 123456789
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    let checked = 0
    for (let i = 0; i < 320; i++) {
      const mantissa = 1 + rand() * 9
      const exponent = Math.floor(rand() * 633) - 324 // -324..308
      // 10 ** -324 === 0（次正规 1e-324 不可表示）；用 MIN_VALUE 作为有限近似单位。
      const raw = exponent === -324 ? mantissa * Number.MIN_VALUE : mantissa * 10 ** exponent
      if (!Number.isFinite(raw) || raw <= 0) continue
      checked++
      const ticks = niceTicks(raw)
      expect(ticks.max, `raw=${raw}`).toBeGreaterThanOrEqual(raw)
      expect(Number.isFinite(ticks.max), `raw=${raw}`).toBe(true)
      expect(ticks.step, `raw=${raw}`).toBeGreaterThan(0)
      expect(ticks.values.every(Number.isFinite), `raw=${raw}`).toBe(true)
      expect(ticks.values[0], `raw=${raw}`).toBe(0)
      expect(ticks.values[ticks.values.length - 1], `raw=${raw}`).toBe(ticks.max)
      for (let k = 1; k < ticks.values.length; k++) {
        expect(ticks.values[k]!, `raw=${raw} 第 ${k} 档`).toBeGreaterThan(ticks.values[k - 1]!)
      }
      // 合理上界：正常量程顶格不超过 rawMax×10；只有合法 MAX_VALUE 钳制例外。
      if (ticks.max !== Number.MAX_VALUE) {
        expect(ticks.max, `raw=${raw} 顶格上界`).toBeLessThanOrEqual(raw * 10)
      }
    }
    expect(checked).toBeGreaterThan(300)
  })
})

describe('tickFractionDigits', () => {
  it('按步长求得最少小数位（整数步长 0 位）', () => {
    expect(tickFractionDigits(25)).toBe(0)
    expect(tickFractionDigits(250000)).toBe(0)
    expect(tickFractionDigits(2.5)).toBe(1)
    expect(tickFractionDigits(0.05)).toBe(2)
    expect(tickFractionDigits(0.0025)).toBe(4)
    expect(tickFractionDigits(0)).toBe(0)
  })
})

describe('formatTick', () => {
  it('动态精度：整数步长不带小数、小数步长按步长补足', () => {
    expect(formatTick(25, 25, 'zh-CN')).toBe('25')
    expect(formatTick(2.5, 2.5, 'zh-CN')).toBe('2.5')
    expect(formatTick(0.05, 0.05, 'zh-CN')).toBe('0.05')
    expect(formatTick(0.0025, 0.0025, 'zh-CN')).toBe('0.0025')
  })

  it('浮点噪声在标签层被精度收口（不再依赖 Math.round）', () => {
    expect(formatTick(0.30000000000000004, 0.1, 'zh-CN')).toBe('0.3')
    expect(formatTick(0.30000000000000004, 0.05, 'zh-CN')).toBe('0.3')
  })

  it('locale 感知小数分隔符（de-DE 用逗号）', () => {
    expect(formatTick(0.05, 0.05, 'de-DE')).toBe('0,05')
  })

  it('科学计数：大步长（≥1e6）与极小小步长（<1e-4）走紧凑表示', () => {
    expect(formatTick(2.5e8, 2.5e8, 'zh-CN')).toBe('2.5E8')
    expect(formatTick(5e8, 2.5e8, 'zh-CN')).toBe('5E8')
    expect(formatTick(2.5e-5, 2.5e-5, 'zh-CN')).toBe('2.5E-5')
    // 0 不写成 0E0
    expect(formatTick(0, 2.5e-5, 'zh-CN')).toBe('0')
  })

  it('科学计数阈值两侧：step=1e6 / 1e-4 仍用常规小数，1e6 以上/1e-4 以下才切换', () => {
    expect(formatTick(1000000, 1000000, 'zh-CN')).toBe('1E6')
    expect(formatTick(250000, 250000, 'zh-CN')).toBe('250000')
    expect(formatTick(0.0001, 0.0001, 'zh-CN')).toBe('0.0001')
  })

  // 回归：provider 可注入 zh_CN（下划线）或任意自定义 locale，Intl.NumberFormat 会抛
  // RangeError 并让 Chart.update 整体中断（空白图）。formatTick 必须回退默认 locale
  // 且不得拿未校验 locale 二次构造。
  it('非法 locale（zh_CN / 自定义名 / 非 ASCII / 空串）不抛，固定回退 en-US', () => {
    for (const bad of ['zh_CN', 'custom-locale', '中文-locale', '']) {
      expect(() => formatTick(0.05, 0.05, bad), bad).not.toThrow()
      // 固定 fallback（en-US）保证 SSR 与客户端不依赖运行环境默认 locale
      expect(formatTick(0.05, 0.05, bad), bad).toBe(formatTick(0.05, 0.05, 'en-US'))
      expect(formatTick(0.05, 0.05, bad), bad).toBe('0.05')
    }
  })

  it('非有限 value 用显式哨兵，不再静默显示 0', () => {
    for (const bad of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
      expect(formatTick(bad, 1, 'zh-CN'), String(bad)).toBe('—')
    }
  })

  // 跨 ICU：ar 等 locale 的科学计数字形（阿拉伯数字 / 指数符号）可能随 ICU 版本不同，
  // 测试只锁「可渲染、非空、不是零」，不锁死具体字形；正式轴标签仍按 locale 输出。
  it('ar 科学计数只断言可渲染，不锁 ICU 字形', () => {
    const out = formatTick(2.5e8, 2.5e8, 'ar')
    expect(out.length).toBeGreaterThan(0)
    expect(out).not.toBe('0')
    expect(() => formatTick(2.5e8, 2.5e8, 'ar')).not.toThrow()
  })

  // 维护批：formatter 缓存上限 + fallback 健壮性（独立复核 A5；交叉审查 fix round 改为可观测断言）
  it('大量不同非法 locale 轮换：缓存条目数有上限（≤64），渲染不抛错', () => {
    for (let i = 0; i < 200; i++) {
      expect(() => formatTick(1, 1, `bad_${i}`)).not.toThrow()
    }
    // 只读探针（内部模块导出，不进公共 API 面）：上限常量改动会被此断言锁住
    expect(formatterCacheSize(), '缓存条目数不得超过上限 64').toBeLessThanOrEqual(64)
  })

  it('fallback 构造包 try：非法 locale 输出与固定 en-US 一致（SSR/客户端同口径）', () => {
    expect(formatTick(0.25, 0.25, 'zh_CN')).toBe(formatTick(0.25, 0.25, 'en-US'))
    expect(formatTick(25000, 25000, 'zh_CN')).toBe(formatTick(25000, 25000, 'en-US'))
  })

  it('最终兜底不依赖 Intl：Intl 完全不可用时退化为 toFixed，绝不向渲染抛错', () => {
    // 触达前提：先清模块级缓存——否则前面用例写过的 key 直接命中，mock 的
    // Intl.NumberFormat 根本不被调用（兜底路径零覆盖，M1 补审 I1 假绿实证）。
    // 另用文件内未出现过的 digits=3 组合（0.125）双保险。
    resetFormatterCacheForTests()
    const real = Intl.NumberFormat
    const calls: unknown[][] = []
    // 模拟极端 ICU 裁剪环境：任何 locale 的 Intl.NumberFormat 构造都抛错。
    // mockImplementation 必须用 function——箭头函数在 `new` 语义下 vitest 不执行
    // 函数体，calls 观测会失真（恒 0，M1 补审 I1 假绿的观测根源）
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (...args) {
      calls.push(args)
      throw new RangeError('Intl unavailable')
    })
    try {
      let out = ''
      expect(() => {
        out = formatTick(0.125, 0.125, 'zh_CN')
      }).not.toThrow()
      expect(calls.length, '兜底路径必须真实触达（构造器至少被调用过）').toBeGreaterThan(0)
      expect(out, '退化为数字字符串（toFixed 3 位）').toBe('0.125')
    } finally {
      vi.mocked(Intl.NumberFormat).mockRestore()
      void real
    }
  })
})
