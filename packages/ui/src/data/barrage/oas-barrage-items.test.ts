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
