import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASBarrage } from './index.js'

function mount(attrs: Record<string, string> = {}): OASBarrage {
  const el = new OASBarrage()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function items(el: OASBarrage): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
}

describe('barrage items 声明式数据 + auto-play', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('items 字符串数组：挂载即批量入队（对齐 addBatch 语义）', () => {
    const el = mount({ items: '["第一条","第二条"]' })
    // pump 由排期计时驱动：轨道空闲立即挂载
    expect(items(el).map((n) => n.textContent)).toEqual(['第一条', '第二条'])
  })

  it('items 对象数组：text/color/key 与 addBatch 同构', () => {
    const el = mount({ items: '[{"text":"蓝弹幕","color":"blue","key":"k1"}]' })
    const item = items(el)[0]!
    expect(item.textContent).toBe('蓝弹幕')
    expect(item.dataset.key).toBe('k1')
    expect(item.style.getPropertyValue('--oas-barrage-item-color')).toBe('var(--oas-preset-blue-text)')
  })

  it('items 变化：追加语义（新数组条目继续入队，不清空在场）', () => {
    const el = mount({ items: '["a"]' })
    expect(items(el)).toHaveLength(1)
    el.setAttribute('items', '["a","b"]')
    expect(items(el).map((n) => n.textContent)).toEqual(['a', 'b'])
  })

  it('property 通道：items 为 get+set 访问器，赋数组反射 attribute', () => {
    const el = mount()
    el.items = ['甲', '乙']
    expect(el.getAttribute('items')).toBe('["甲","乙"]')
    expect(el.items).toEqual([{ text: '甲' }, { text: '乙' }])
    expect(items(el).map((n) => n.textContent)).toEqual(['甲', '乙'])
  })

  it('auto-play：队列耗尽后自动重播声明条目（循环，max-active=1 恒定一条在场）', () => {
    const el = mount({ items: '["循环弹"]', speed: '100000', 'max-active': '1', 'auto-play': '' })
    expect(items(el)).toHaveLength(1)
    // 离场后 auto-play 重新入队再挂载：任意时刻推进都恰有一条循环弹在场
    vi.advanceTimersByTime(500)
    expect(items(el).map((n) => n.textContent)).toEqual(['循环弹'])
    vi.advanceTimersByTime(500)
    expect(items(el).map((n) => n.textContent)).toEqual(['循环弹'])
  })

  it('无 auto-play：队列耗尽后不再重播', () => {
    const el = mount({ items: '["一次性"]', speed: '100000' })
    expect(items(el)).toHaveLength(1)
    vi.advanceTimersByTime(2000)
    expect(items(el)).toHaveLength(0)
  })

  it('auto-play × banned-words：循环重灌同样过滤屏蔽词（不被循环绕过）', () => {
    const el = mount({
      'banned-words': '广告',
      items: '["好弹幕","广告弹幕"]',
      'auto-play': '',
      speed: '100000',
      'max-active': '1',
    })
    const seen = new Set<string>()
    const record = () => {
      for (const node of items(el)) seen.add(node.textContent ?? '')
    }
    record()
    // 多轮循环：每轮重灌都走同一屏蔽词判据，被过滤的条目不因循环回流
    for (let round = 0; round < 8; round++) {
      vi.advanceTimersByTime(200)
      record()
    }
    expect([...seen]).toEqual(['好弹幕'])
    expect(items(el).map((node) => node.textContent)).toEqual(['好弹幕'])
  })

  it('auto-play 首轮：声明条目全部播完才重灌，首轮不重复 mount', () => {
    // speed=1 → 条目长时间在场；轨道充足，首轮两条都会立即入场
    const el = mount({ items: '["甲","乙"]', 'auto-play': '', tracks: '3' })
    expect(items(el).map((node) => node.textContent)).toEqual(['甲', '乙'])
    // 队列排空的瞬间不得重灌：同一条弹幕会双份在场、独占双倍轨道
    vi.advanceTimersByTime(1000)
    expect(items(el).map((node) => node.textContent)).toEqual(['甲', '乙'])
  })

  it('非法 items JSON：devWarn 一次并按空数据处理', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ items: '{bad' })
      expect(items(el)).toHaveLength(0)
      const warns = warn.mock.calls.filter((c) => String(c[0]).includes('items'))
      expect(warns.length).toBeGreaterThanOrEqual(1)
    } finally {
      warn.mockRestore()
    }
  })
})

// ---------------------------------------------------------------------------
// 本批回归：clear() 后 auto-play 续播（清空即从声明条目重新轮转，与文档口径一致）
// ---------------------------------------------------------------------------

describe('barrage clear × auto-play', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('clear() 后 auto-play 从声明条目重新轮转（修复前舞台空到下一次外部触发）', () => {
    const el = mount({ items: '["循环甲","循环乙"]', speed: '100000', 'max-active': '1', 'auto-play': '' })
    expect(items(el)).toHaveLength(1)
    el.clear()
    // 清空后不依赖任何外部触发：refill 立即接管排期（同帧回填首条 = 主动续轮语义），
    // 此后推进时间两条声明内容交替循环出现，舞台不再空转
    const seen = new Set<string>()
    const record = (): void => {
      for (const node of items(el)) seen.add(node.textContent ?? '')
    }
    for (let round = 0; round < 6; round++) {
      vi.advanceTimersByTime(300)
      record()
    }
    expect(seen.has('循环甲'), 'clear 后声明条目重新进场').toBe(true)
    expect(seen.has('循环乙'), '轮转覆盖全部声明条目').toBe(true)
  })

  it('clear() 后无 auto-play 仍保持清空（不越界续播）', () => {
    const el = mount({ items: '["一次性"]', speed: '100000' })
    expect(items(el)).toHaveLength(1)
    el.clear()
    vi.advanceTimersByTime(2000)
    expect(items(el)).toHaveLength(0)
  })

  it('clear() 后 paused 状态下不续播（暂停语义优先）', () => {
    const el = mount({ items: '["暂停弹"]', speed: '100000', 'auto-play': '', paused: '' })
    expect(items(el)).toHaveLength(0)
    el.removeAttribute('paused')
    expect(items(el)).toHaveLength(1)
    el.pause()
    el.clear()
    vi.advanceTimersByTime(2000)
    expect(items(el), '暂停中 clear 不自动续播').toHaveLength(0)
    el.resume()
    expect(
      items(el).map((n) => n.textContent),
      'resume 后恢复轮转',
    ).toContain('暂停弹')
  })
})
