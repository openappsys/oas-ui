import { describe, it, expect } from 'vitest'
import { locateAnchor, restoreAnchor, planScrollCompensation, scrollWriteMoved } from './row-geometry.js'

/** 等高校验：40px × 5 行的前缀——锚定数学在定高模型下必须与既有像素语义逐位等价 */
const UNIFORM = [0, 40, 80, 120, 160, 200]

describe('locateAnchor', () => {
  it('定高模型：与「scrollTop / 行高」像素语义逐位等价', () => {
    expect(locateAnchor(UNIFORM, 0)).toEqual({ index: 0, offset: 0 })
    expect(locateAnchor(UNIFORM, 39)).toEqual({ index: 0, offset: 39 })
    expect(locateAnchor(UNIFORM, 40)).toEqual({ index: 1, offset: 0 })
    expect(locateAnchor(UNIFORM, 100)).toEqual({ index: 2, offset: 20 })
    expect(locateAnchor(UNIFORM, 199)).toEqual({ index: 4, offset: 39 })
    expect(locateAnchor(UNIFORM, 200)).toEqual({ index: 4, offset: 40 })
  })

  it('变高模型：锚到包含 scrollTop 的行（跨顶行也算，不取上一行）', () => {
    // 行高 [40, 120, 40]：行 1 是高于视口的长行
    const prefix = [0, 40, 160, 200]
    expect(locateAnchor(prefix, 0)).toEqual({ index: 0, offset: 0 })
    expect(locateAnchor(prefix, 39)).toEqual({ index: 0, offset: 39 })
    // 恰在行 1 顶：锚到行 1 offset=0（lowerBound 边界语义，不回跳到行 0）
    expect(locateAnchor(prefix, 40)).toEqual({ index: 1, offset: 0 })
    // 长行中部：锚定长行自身（宽松判据会错取行 0 并多补偿）
    expect(locateAnchor(prefix, 100)).toEqual({ index: 1, offset: 60 })
    // 长行底边界：锚到行 2 offset=0
    expect(locateAnchor(prefix, 160)).toEqual({ index: 2, offset: 0 })
  })

  it('边界：负 scrollTop / 超总高 / 空表 / NaN 全钳制不抛', () => {
    expect(locateAnchor(UNIFORM, -10)).toEqual({ index: 0, offset: 0 })
    expect(locateAnchor(UNIFORM, 9999)).toEqual({ index: 4, offset: 40 })
    expect(locateAnchor([], 50)).toEqual({ index: 0, offset: 0 })
    expect(locateAnchor([0], 50)).toEqual({ index: 0, offset: 0 })
    expect(locateAnchor(UNIFORM, NaN)).toEqual({ index: 0, offset: 0 })
  })
})

describe('restoreAnchor', () => {
  it('高度修正后按身份恢复：行变高，scrollTop 同偏移跟随（视口不跳）', () => {
    // 旧前缀行 1 = 40px，新前缀行 1 变 120px：锚(1, 10) → 新行顶 40 + 10 = 50
    const newPrefix = [0, 40, 160, 200]
    expect(restoreAnchor(newPrefix, { index: 1, offset: 10 })).toBe(50)
  })

  it('行变矮：offset 钳到行底，不溢出到下一行（防补偿过头）', () => {
    // 锚在旧长行 offset=100；新前缀该行只有 40px → 钳到行底 40（行顶 40 + 40 = 80 = 下一行顶）
    const newPrefix = [0, 40, 80, 120]
    expect(restoreAnchor(newPrefix, { index: 1, offset: 100 })).toBe(80)
  })

  it('锚定行被删（index 越界）：钳到最后存在的行，offset 保留', () => {
    const newPrefix = [0, 40, 80]
    expect(restoreAnchor(newPrefix, { index: 4, offset: 10 })).toBe(50)
  })

  it('边界：空表 / index 负数 / 非整数 / NaN offset 全钳制不抛', () => {
    expect(restoreAnchor([], { index: 2, offset: 10 })).toBe(0)
    expect(restoreAnchor(UNIFORM, { index: -3, offset: 10 })).toBe(10)
    expect(restoreAnchor(UNIFORM, { index: 1.9, offset: 10 })).toBe(50)
    expect(restoreAnchor(UNIFORM, { index: 1, offset: NaN })).toBe(40)
  })

  it('locate → restore 往返一致性：无高度变化时恢复出原 scrollTop', () => {
    for (const top of [0, 1, 39, 40, 41, 100, 159, 160, 200]) {
      const anchor = locateAnchor(UNIFORM, top)
      expect(restoreAnchor(UNIFORM, anchor)).toBe(top)
    }
  })
})

describe('planScrollCompensation（补偿写钳制判定）', () => {
  it('目标与当前差在容差内：不写（零位写入不制造多余 scroll 回波）', () => {
    expect(planScrollCompensation(100, 100, 800)).toEqual({ needed: false, preRender: false, top: 100 })
    expect(planScrollCompensation(100, 100.4, 800)).toEqual({ needed: false, preRender: false, top: 100 })
  })

  it('目标在当前可达范围内：渲染前即可写（无钳制风险）', () => {
    expect(planScrollCompensation(100, 500, 800)).toEqual({ needed: true, preRender: true, top: 500 })
    // 恰好等于可达上界同样可预写
    expect(planScrollCompensation(100, 800, 800)).toEqual({ needed: true, preRender: true, top: 800 })
  })

  it('目标超出可达上界：不预写（预写必被钳制，钳制位不是补偿位）——渲染后内容铺满再写', () => {
    // 渲染前 DOM 仍是旧几何（可达 800），补偿目标 900 未可达
    expect(planScrollCompensation(100, 900, 800)).toEqual({ needed: true, preRender: false, top: 900 })
    // 行变矮导致目标下移超过当前可达位：同属「渲染后才可达」，不得预写钳制位
    expect(planScrollCompensation(900, 850, 800)).toEqual({ needed: true, preRender: false, top: 850 })
  })

  it('边界：可达上界缺失/负数/NaN 按 0 处理（无布局环境一律延后）；入参 NaN 不抛', () => {
    expect(planScrollCompensation(0, 100, NaN)).toEqual({ needed: true, preRender: false, top: 100 })
    expect(planScrollCompensation(0, 100, -50)).toEqual({ needed: true, preRender: false, top: 100 })
    expect(planScrollCompensation(NaN, 100, 800)).toEqual({ needed: true, preRender: true, top: 100 })
    expect(planScrollCompensation(0, NaN, 800)).toEqual({ needed: false, preRender: false, top: 0 })
  })
})

describe('scrollWriteMoved（写入落位判定）', () => {
  it('实际位移 > 0.5px 才算落位（浏览器可因内容不足把写入钳回原值）', () => {
    expect(scrollWriteMoved(3800, 3800)).toBe(false)
    expect(scrollWriteMoved(3800, 3800.4)).toBe(false)
    expect(scrollWriteMoved(3800, 3801)).toBe(true)
    expect(scrollWriteMoved(3800, 4800)).toBe(true)
  })

  it('容差可覆盖（横向滚动同理）', () => {
    expect(scrollWriteMoved(0, 1, 1)).toBe(false)
    expect(scrollWriteMoved(0, 2, 1)).toBe(true)
  })
})
