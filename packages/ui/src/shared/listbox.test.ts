import { describe, it, expect } from 'vitest'
import { resolveRovingMove } from './listbox.js'

describe('resolveRovingMove 键盘导航内核', () => {
  it('非监听键 / 可导航项为 0 → null（不拦截）', () => {
    expect(resolveRovingMove('Enter', { count: 3, current: 0 })).toBeNull()
    expect(resolveRovingMove('Escape', { count: 3, current: 0 })).toBeNull()
    expect(resolveRovingMove('ArrowDown', { count: 0, current: 0 })).toBeNull()
  })

  it('垂直方向：Down +1 / Up -1，默认回绕', () => {
    expect(resolveRovingMove('ArrowDown', { count: 3, current: 0 })).toBe(1)
    expect(resolveRovingMove('ArrowUp', { count: 3, current: 0 })).toBe(2)
    expect(resolveRovingMove('ArrowDown', { count: 3, current: 2 })).toBe(0)
    expect(resolveRovingMove('ArrowUp', { count: 3, current: 1 })).toBe(0)
  })

  it('回绕关闭（filter）：边界 clamp 到原 index（焦点不动，仍可拦截默认滚动）', () => {
    const o = { count: 3, current: 2, wrap: false }
    expect(resolveRovingMove('ArrowDown', o)).toBe(2)
    expect(resolveRovingMove('ArrowRight', o)).toBe(2)
    const first = { count: 3, current: 0, wrap: false }
    expect(resolveRovingMove('ArrowUp', first)).toBe(0)
    expect(resolveRovingMove('ArrowLeft', first)).toBe(0)
  })

  it('Home / End 跳首末项（默认支持）', () => {
    expect(resolveRovingMove('Home', { count: 4, current: 2 })).toBe(0)
    expect(resolveRovingMove('End', { count: 4, current: 2 })).toBe(3)
  })

  it('keys 白名单声明 Home/End 不支持（select / invoice / filter）', () => {
    const keys = ['ArrowDown', 'ArrowUp']
    expect(resolveRovingMove('Home', { count: 4, current: 2, keys })).toBeNull()
    expect(resolveRovingMove('End', { count: 4, current: 2, keys })).toBeNull()
    expect(resolveRovingMove('ArrowRight', { count: 4, current: 2, keys })).toBeNull()
    expect(resolveRovingMove('ArrowDown', { count: 4, current: 2, keys })).toBe(3)
  })

  it('RTL 镜像：左右键互换，垂直键不受影响', () => {
    const rtl = { count: 4, current: 1, rtl: true }
    expect(resolveRovingMove('ArrowRight', rtl)).toBe(0)
    expect(resolveRovingMove('ArrowLeft', rtl)).toBe(2)
    expect(resolveRovingMove('ArrowDown', rtl)).toBe(2)
    expect(resolveRovingMove('ArrowUp', rtl)).toBe(0)
    // LTR 对照
    const ltr = { count: 4, current: 1, rtl: false }
    expect(resolveRovingMove('ArrowRight', ltr)).toBe(2)
    expect(resolveRovingMove('ArrowLeft', ltr)).toBe(0)
  })

  it('disabled 跳过：skip 谓词沿推进方向找下一个可用项', () => {
    const skip = (index: number): boolean => index === 1
    expect(resolveRovingMove('ArrowDown', { count: 3, current: 0, skip })).toBe(2)
    expect(resolveRovingMove('ArrowUp', { count: 3, current: 2, skip })).toBe(0)
    // Home / End 同样跳过不可用项
    expect(resolveRovingMove('Home', { count: 3, current: 2, skip })).toBe(0)
    expect(resolveRovingMove('End', { count: 3, current: 0, skip: (i) => i === 2 })).toBe(1)
    // 全部不可用 → 无可达目标
    expect(resolveRovingMove('ArrowDown', { count: 2, current: 0, skip: () => true })).toBeNull()
  })

  it('current 越界兜底：-1（无当前项）向下取首项，向上回绕到末项前（保留各组件既有语义）', () => {
    expect(resolveRovingMove('ArrowDown', { count: 3, current: -1 })).toBe(0)
    expect(resolveRovingMove('ArrowUp', { count: 3, current: -1 })).toBe(1)
  })
})
