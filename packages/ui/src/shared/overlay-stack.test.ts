import { describe, it, expect, afterEach } from 'vitest'
import { lockBodyScroll, promoteEscapeLayer, pushEscapeLayer } from './overlay-stack.js'

/**
 * 共享浮层栈（Esc 层栈 + body 滚动锁）单元测试。
 * 存在意义：modal / drawer / tour / dropdown / context-menu / sidebar 各自裸听 Esc 与
 * 各自维护 body 计数锁，会导致「一次 Esc 同关多层」「两套计数锁互抵消永久锁死」
 * 「tour 裸写 overflow 抹掉宿主 inline 值」。此设施是唯一收口点。
 */

describe('overlay-stack：Esc 层栈', () => {
  const releases: Array<() => void> = []

  afterEach(() => {
    for (const release of releases.splice(0)) release()
  })

  function pressEscape(init: KeyboardEventInit = {}): KeyboardEvent {
    const e = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, ...init })
    document.dispatchEvent(e)
    return e
  }

  it('后进先出：一次 Esc 只消费最上层', () => {
    const calls: string[] = []
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('bottom')
          return true
        },
      }),
    )
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('top')
          return true
        },
      }),
    )
    pressEscape()
    expect(calls).toEqual(['top'])
    releases.pop()!()
    pressEscape()
    expect(calls).toEqual(['top', 'bottom'])
  })

  it('handle 返回 false：不消费，交下层处理', () => {
    const calls: string[] = []
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('bottom')
          return true
        },
      }),
    )
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('top-skip')
          return false
        },
      }),
    )
    pressEscape()
    expect(calls).toEqual(['top-skip', 'bottom'])
  })

  it('active 返回 false 的层被跳过（抽屉在可见模态之下时不抢 Esc）', () => {
    const calls: string[] = []
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('modal')
          return true
        },
      }),
    )
    releases.push(
      pushEscapeLayer({
        active: () => false,
        handle: () => {
          calls.push('drawer')
          return true
        },
      }),
    )
    pressEscape()
    expect(calls).toEqual(['modal'])
  })

  it('消费后 preventDefault + 阻断同节点后续监听（不穿透宿主 Esc）', () => {
    const calls: string[] = []
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('layer')
          return true
        },
      }),
    )
    const late = (): void => {
      calls.push('host')
    }
    document.addEventListener('keydown', late)
    try {
      const e = pressEscape()
      expect(e.defaultPrevented).toBe(true)
      expect(calls).toEqual(['layer'])
    } finally {
      document.removeEventListener('keydown', late)
    }
  })

  it('非 Esc 键不触发', () => {
    let called = false
    releases.push(
      pushEscapeLayer({
        handle: () => {
          called = true
          return true
        },
      }),
    )
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    expect(called).toBe(false)
  })

  it('release 幂等，重复调用不会误删下层', () => {
    const calls: string[] = []
    releases.push(
      pushEscapeLayer({
        handle: () => {
          calls.push('bottom')
          return true
        },
      }),
    )
    const releaseTop = pushEscapeLayer({
      handle: () => {
        calls.push('top')
        return true
      },
    })
    releaseTop()
    releaseTop()
    pressEscape()
    expect(calls).toEqual(['bottom'])
  })

  it('全部释放后不再拦截 Esc（监听器摘除）', () => {
    const calls: string[] = []
    const release = pushEscapeLayer({
      handle: () => {
        calls.push('layer')
        return true
      },
    })
    release()
    const e = pressEscape()
    expect(calls).toEqual([])
    expect(e.defaultPrevented).toBe(false)
  })

  it('promote：把已压栈的层移到栈顶（Esc 顺序跟随视觉最前，而非打开先后）', () => {
    const calls: string[] = []
    const a = { handle: () => (calls.push('a'), true) }
    const b = { handle: () => (calls.push('b'), true) }
    releases.push(pushEscapeLayer(a))
    releases.push(pushEscapeLayer(b))
    pressEscape()
    expect(calls).toEqual(['b'])

    expect(promoteEscapeLayer(a)).toBe(true)
    pressEscape()
    expect(calls).toEqual(['b', 'a'])

    // 已在栈顶：幂等
    expect(promoteEscapeLayer(a)).toBe(true)
    pressEscape()
    expect(calls).toEqual(['b', 'a', 'a'])
    // 释放后 promote 不再生效（不复活幽灵层）
    releases[1]!()
    expect(promoteEscapeLayer(b)).toBe(false)
    pressEscape()
    expect(calls).toEqual(['b', 'a', 'a', 'a'])
  })
})

describe('overlay-stack：body 滚动锁', () => {
  afterEach(() => {
    document.body.removeAttribute('style')
  })

  it('跨组件引用计数：全部释放才恢复，且恢复宿主 inline 原值', () => {
    document.body.style.overflow = 'scroll'
    document.body.style.paddingRight = '12px'
    const a = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    const b = lockBodyScroll()
    a()
    expect(document.body.style.overflow, '仍有一层持锁').toBe('hidden')
    b()
    expect(document.body.style.overflow, '恢复宿主 inline 原值而非清空').toBe('scroll')
    expect(document.body.style.paddingRight).toBe('12px')
  })

  it('release 幂等：重复释放不会把计数减穿', () => {
    const a = lockBodyScroll()
    const b = lockBodyScroll()
    a()
    a()
    expect(document.body.style.overflow).toBe('hidden')
    b()
    expect(document.body.style.overflow).toBe('')
  })
})
