import { describe, it, expect } from 'vitest'
import { createPanelStack, type PanelStackMember } from './panel-stack.js'

/**
 * 族内叠放协议测试（零 DOM）。
 *
 * 不变量：
 * - 任意时刻最多一个「最前」成员；只有布尔态，**没有递增层级**（z-index 不随 open 次数增长）。
 * - 最前 = 最近激活且仍打开的成员；关闭/摘除后由下一个仍打开成员接任。
 * - applyFront 只在状态翻转时调用（不重复写同值）。
 */

interface FakeMember extends PanelStackMember {
  name: string
  open: boolean
  calls: boolean[]
}

function member(name: string, open = true): FakeMember {
  const m: FakeMember = {
    name,
    open,
    calls: [],
    isOpen: () => m.open,
    applyFront: (front: boolean) => {
      m.calls.push(front)
    },
  }
  return m
}

function fronts(members: FakeMember[]): string[] {
  return members.filter((m) => m.calls.at(-1) === true).map((m) => m.name)
}

describe('createPanelStack', () => {
  it('登记顺序：首个仍打开的成员成为最前；全关闭时无最前', () => {
    const stack = createPanelStack()
    const a = member('a', false)
    const b = member('b', true)
    const c = member('c', true)
    stack.register(a)
    expect(stack.front()).toBeNull()
    stack.register(b)
    expect(stack.front()).toBe(b)
    stack.register(c)
    expect(stack.front()).toBe(b)
    expect(fronts([a, b, c])).toEqual(['b'])
  })

  it('activate 移到队尾并成为最前；重复激活不重复写同值', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    stack.register(a)
    stack.register(b)
    expect(stack.front()).toBe(a)

    expect(stack.activate(b)).toBe(true)
    expect(stack.front()).toBe(b)
    expect(b.calls).toEqual([true])
    expect(a.calls, '首个登记成员先置前，激活他人后落档').toEqual([true, false])

    expect(stack.activate(b), '已是最前：无变化').toBe(false)
    expect(b.calls).toEqual([true])
    expect(a.calls).toEqual([true, false])
  })

  it('关闭最前后 refresh：下一个仍打开成员接任，旧最前落回基准档', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    const c = member('c')
    stack.register(a)
    stack.register(b)
    stack.register(c)
    expect(stack.front()).toBe(a)

    a.open = false
    stack.refresh()
    expect(stack.front()).toBe(c)
    expect(a.calls.at(-1)).toBe(false)
    expect(c.calls.at(-1)).toBe(true)
    expect(b.calls, '始终未置前的成员不被无谓写入').toEqual([])
  })

  it('全关闭时无最前；重新打开并激活后恢复', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    stack.register(a)
    stack.register(b)
    a.open = false
    b.open = false
    stack.refresh()
    expect(stack.front()).toBeNull()
    expect(fronts([a, b])).toEqual([])

    b.open = true
    expect(stack.activate(b)).toBe(true)
    expect(stack.front()).toBe(b)
    expect(fronts([a, b])).toEqual(['b'])
  })

  it('断开摘除：最前成员被摘除后由下一个打开成员接任；摘除非最前无变化', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    const c = member('c')
    const offA = stack.register(a)
    stack.register(b)
    stack.register(c)
    stack.activate(c)
    expect(stack.front()).toBe(c)

    stack.unregister(b)
    expect(stack.front(), '摘除非最前：最前不变').toBe(c)
    offA()
    expect(stack.front()).toBe(c)

    stack.unregister(c)
    expect(stack.front(), '摘除最前：无候选 → null').toBeNull()
    expect(c.calls.at(-1), '被摘除的最前落回基准档').toBe(false)
    expect(stack.size).toBe(0)
  })

  it('unsubscribe 幂等；重复 register 同一成员不重复登记', () => {
    const stack = createPanelStack()
    const a = member('a')
    const off1 = stack.register(a)
    const off2 = stack.register(a)
    expect(stack.size).toBe(1)
    off1()
    off2()
    expect(stack.size).toBe(0)
    expect(() => stack.unregister(a)).not.toThrow()
  })

  it('最前恒定只有一个：反复开关 100 次也不会累积（z-index 不随 open 次数增长）', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    stack.register(a)
    stack.register(b)
    for (let i = 0; i < 100; i++) {
      a.open = false
      b.open = false
      const target = i % 2 === 0 ? b : a
      target.open = true
      stack.activate(target)
      expect(fronts([a, b]).length, `第 ${i} 轮最前数量`).toBe(1)
      expect(stack.front()).toBe(target)
      target.open = false
      stack.refresh()
      expect(fronts([a, b]).length, `第 ${i} 轮关闭后最前数量`).toBe(0)
    }
    // applyFront 只收到布尔值：层级由组件映射成固定两档，不存在累加数值
    for (const m of [a, b]) {
      expect(m.calls.every((v) => typeof v === 'boolean')).toBe(true)
    }
  })

  it('onFrontChange 收到新旧最前（含 null）', () => {
    const events: Array<[string | null, string | null]> = []
    const stack = createPanelStack({
      onFrontChange: (front, previous) =>
        events.push([(front as FakeMember | null)?.name ?? null, (previous as FakeMember | null)?.name ?? null]),
    })
    const a = member('a')
    const b = member('b')
    stack.register(a)
    stack.register(b)
    stack.activate(b)
    a.open = false
    stack.refresh()
    b.open = false
    stack.refresh()
    expect(events).toEqual([
      ['a', null],
      ['b', 'a'],
      [null, 'b'],
    ])
  })

  it('activate 未登记成员返回 false 且不改变最前', () => {
    const stack = createPanelStack()
    const a = member('a')
    const stray = member('stray')
    stack.register(a)
    expect(stack.activate(stray)).toBe(false)
    expect(stack.front()).toBe(a)
  })

  it('clear 重置全部成员状态', () => {
    const stack = createPanelStack()
    const a = member('a')
    const b = member('b')
    stack.register(a)
    stack.register(b)
    stack.clear()
    expect(stack.size).toBe(0)
    expect(stack.front()).toBeNull()
    expect(a.calls.at(-1)).toBe(false)
    expect(b.calls, '未置前的成员无需落档').toEqual([])
  })
})
