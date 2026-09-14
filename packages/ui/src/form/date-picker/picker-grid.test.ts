import { describe, it, expect } from 'vitest'
import { movePickerGridDate } from './picker-grid.js'

const d = new Date(2026, 7, 9) // 2026-08-09 周日

describe('movePickerGridDate 键盘网格移动', () => {
  it('方向键 ±1/±7 天', () => {
    expect(movePickerGridDate(d, 'ArrowLeft', 0)!.getDate()).toBe(8)
    expect(movePickerGridDate(d, 'ArrowRight', 0)!.getDate()).toBe(10)
    expect(movePickerGridDate(d, 'ArrowUp', 0)!.getDate()).toBe(2)
    expect(movePickerGridDate(d, 'ArrowDown', 0)!.getDate()).toBe(16)
  })

  it('RTL：水平方向键翻转（左=次日/右=前日），垂直向不变', () => {
    expect(movePickerGridDate(d, 'ArrowLeft', 0, false, true)!.getDate()).toBe(10)
    expect(movePickerGridDate(d, 'ArrowRight', 0, false, true)!.getDate()).toBe(8)
    expect(movePickerGridDate(d, 'ArrowUp', 0, false, true)!.getDate()).toBe(2)
    expect(movePickerGridDate(d, 'ArrowDown', 0, false, true)!.getDate()).toBe(16)
  })
})
