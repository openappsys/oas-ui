import { describe, it, expect } from 'vitest'
import { RowHeightModel, windowFor } from './virtual-rows.js'

describe('RowHeightModel 基础', () => {
  it('初始：count=0、总高 0、任意下标偏移 0', () => {
    const model = new RowHeightModel()
    expect(model.length).toBe(0)
    expect(model.total()).toBe(0)
    expect(model.offsetOf(0)).toBe(0)
    expect(model.offsetOf(100)).toBe(0)
  })

  it('setCount 后全部行用预估高：offsetOf 是预估前缀和', () => {
    const model = new RowHeightModel(50)
    model.setCount(4)
    expect(model.length).toBe(4)
    expect(model.offsetOf(2)).toBe(100)
    expect(model.total()).toBe(200)
  })

  it('预估高变化 → 未测行整体失效（前缀和重算）', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    model.setEstimated(80)
    expect(model.total()).toBe(240)
  })

  it('measure：记录实测高并失效其后前缀和；<0.5px 差异视为未变', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    expect(model.measure(1, 70)).toBe(true)
    expect(model.heightAt(1)).toBe(70)
    expect(model.total()).toBe(50 + 70 + 50)
    expect(model.measure(1, 70.3)).toBe(false)
    expect(model.heightAt(1)).toBe(70)
  })

  it('measure 非法输入拒绝（越界 / 非有限 / ≤0）', () => {
    const model = new RowHeightModel(50)
    model.setCount(2)
    expect(model.measure(-1, 10)).toBe(false)
    expect(model.measure(2, 10)).toBe(false)
    expect(model.measure(0, Number.NaN)).toBe(false)
    expect(model.measure(0, 0)).toBe(false)
    expect(model.measure(0, Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('RowHeightModel 行增删的下标平移（数组表单行操作语义）', () => {
  it('insertAt(i)：i 及之后的实测高整体后移，i 落位预估', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    model.measure(0, 60)
    model.measure(1, 70)
    model.measure(2, 80)
    model.insertAt(1)
    expect(model.length).toBe(4)
    expect(model.heightAt(0)).toBe(60)
    expect(model.heightAt(1)).toBe(50) // 新行：回落预估
    expect(model.heightAt(2)).toBe(70)
    expect(model.heightAt(3)).toBe(80)
    expect(model.total()).toBe(60 + 50 + 70 + 80)
  })

  it('removeAt(i)：i 的实测高丢弃，其后整体前移', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    model.measure(0, 60)
    model.measure(1, 70)
    model.measure(2, 80)
    model.removeAt(1)
    expect(model.length).toBe(2)
    expect(model.heightAt(0)).toBe(60)
    expect(model.heightAt(1)).toBe(80)
    expect(model.total()).toBe(60 + 80)
  })

  it('removeAt 首行：其余实测高保持', () => {
    const model = new RowHeightModel(50)
    model.setCount(2)
    model.measure(1, 90)
    model.removeAt(0)
    expect(model.length).toBe(1)
    expect(model.heightAt(0)).toBe(90)
  })

  it('swapAt：交换两行实测高（move 语义：值交换、行高随之互换）', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    model.measure(0, 60)
    model.measure(2, 80)
    model.swapAt(0, 2)
    expect(model.heightAt(0)).toBe(80)
    expect(model.heightAt(2)).toBe(60)
    expect(model.heightAt(1)).toBe(50)
    // 实测 ↔ 预估互换：60 落到行 1，行 2 回落预估
    model.swapAt(1, 2)
    expect(model.heightAt(1)).toBe(60)
    expect(model.heightAt(2)).toBe(50)
    // 双方都未实测：无操作（预估不变）
    const plain = new RowHeightModel(50)
    plain.setCount(2)
    plain.swapAt(0, 1)
    expect(plain.heightAt(0)).toBe(50)
    expect(plain.heightAt(1)).toBe(50)
  })

  it('setCount 增长不清实测高（受控缩容后再补行的场景）', () => {
    const model = new RowHeightModel(50)
    model.setCount(2)
    model.measure(0, 66)
    model.setCount(5)
    expect(model.heightAt(0)).toBe(66)
    expect(model.offsetOf(1)).toBe(66)
    expect(model.total()).toBe(66 + 50 * 4)
  })

  it('setCount 缩减：被截掉的实测高丢弃（下标越界不复活）', () => {
    const model = new RowHeightModel(50)
    model.setCount(4)
    model.measure(3, 99)
    model.setCount(2)
    expect(model.heightAt(0)).toBe(50)
    expect(model.heightAt(1)).toBe(50)
    expect(model.total()).toBe(100)
    model.setCount(4)
    expect(model.heightAt(3)).toBe(50)
  })
})

describe('windowFor 窗口计算', () => {
  it('全估高：scrollTop=0 → 首窗口，含上下 overscan', () => {
    const model = new RowHeightModel(50)
    model.setCount(1000)
    const win = windowFor(model, 0, 320, 5)
    expect(win.start).toBe(0)
    // 320/50 = 6.4 → 7 行可见（0..6，末行部分可见）；+ overscan 5×2 = 12
    expect(win.end).toBe(12)
  })

  it('滚动到中部：窗口平移且夹取边界', () => {
    const model = new RowHeightModel(50)
    model.setCount(100)
    // scrollTop=2000 → 首可见行 40（2000/50）；viewport 300 → 可见 6 行（40..45）
    const win = windowFor(model, 2000, 300, 5)
    expect(win.start).toBe(35)
    expect(win.end).toBe(51)
  })

  it('overscan=0：只渲染可视行', () => {
    const model = new RowHeightModel(50)
    model.setCount(100)
    const win = windowFor(model, 0, 100, 0)
    expect(win.start).toBe(0)
    expect(win.end).toBe(2)
  })

  it('行数少于视口：整列表渲染', () => {
    const model = new RowHeightModel(50)
    model.setCount(3)
    expect(windowFor(model, 0, 320, 5)).toEqual({ start: 0, end: 3 })
  })

  it('实测高参与定位：大行把后续行推出窗口', () => {
    const model = new RowHeightModel(50)
    model.setCount(10)
    model.measure(0, 500)
    // scrollTop=100 落在第 0 行内（0..500）→ 首可见行 0
    expect(windowFor(model, 100, 100, 0)).toEqual({ start: 0, end: 1 })
    // scrollTop=520 落在第 1 行（500..550）；viewport 100 → 可见行 1..3（行 4 顶 650 ≥ 620）
    expect(windowFor(model, 520, 100, 0)).toEqual({ start: 1, end: 4 })
  })

  it('scrollTop 超出总高：夹取到末尾窗口', () => {
    const model = new RowHeightModel(50)
    model.setCount(10)
    // 总高 500；top 夹到 400 → 首可见行 8，可见行 8..9
    const win = windowFor(model, 99999, 100, 0)
    expect(win.start).toBe(8)
    expect(win.end).toBe(10)
  })

  it('viewport=0（测量不可用）：仍渲染从顶部起的兜底行（兜底 8 行 + overscan）', () => {
    const model = new RowHeightModel(50)
    model.setCount(100)
    const win = windowFor(model, 0, 0, 5)
    expect(win.start).toBe(0)
    expect(win.end).toBe(13) // FALLBACK_MIN_ROWS(8) + overscan(5)
  })

  it('空列表：空窗口', () => {
    const model = new RowHeightModel(50)
    expect(windowFor(model, 0, 320, 5)).toEqual({ start: 0, end: 0 })
  })
})
