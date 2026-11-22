import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OASBarrage,
  estimateBarrageWidth,
  resolveBarrageGap,
  resolveBarrageMaxActive,
  resolveBarrageSpeed,
  resolveBarrageTracks,
} from './index.js'

function mount(attrs: Record<string, string> = {}): OASBarrage {
  const el = new OASBarrage()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function items(el: OASBarrage): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')]
}

function stage(el: OASBarrage): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.stage')!
}

describe('barrage 参数解析（纯函数）', () => {
  it('tracks 正整数，非法回落 3，上限 20', () => {
    expect(resolveBarrageTracks('')).toBe(3)
    expect(resolveBarrageTracks('0')).toBe(3)
    expect(resolveBarrageTracks('-2')).toBe(3)
    expect(resolveBarrageTracks('abc')).toBe(3)
    expect(resolveBarrageTracks('2')).toBe(2)
    expect(resolveBarrageTracks('99')).toBe(20)
  })

  it('speed 正数，非法回落 120', () => {
    expect(resolveBarrageSpeed('')).toBe(120)
    expect(resolveBarrageSpeed('0')).toBe(120)
    expect(resolveBarrageSpeed('-3')).toBe(120)
    expect(resolveBarrageSpeed('200')).toBe(200)
  })

  it('gap 非负，非法回落 48', () => {
    expect(resolveBarrageGap('')).toBe(48)
    expect(resolveBarrageGap('-1')).toBe(48)
    expect(resolveBarrageGap('0')).toBe(0)
    expect(resolveBarrageGap('80')).toBe(80)
  })

  it('max-active 0 = 不限；非法回落 0', () => {
    expect(resolveBarrageMaxActive('')).toBe(0)
    expect(resolveBarrageMaxActive('-1')).toBe(0)
    expect(resolveBarrageMaxActive('abc')).toBe(0)
    expect(resolveBarrageMaxActive('5')).toBe(5)
  })

  it('文本宽度估算：中文比等长英文宽', () => {
    expect(estimateBarrageWidth('你好')).toBeGreaterThan(estimateBarrageWidth('ab'))
    expect(estimateBarrageWidth('')).toBe(24)
  })
})

describe('OASBarrage 轨道与防重叠', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('默认 3 轨道，逐条分配空闲轨道', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelectorAll('.track').length).toBe(3)
    el.add('第一条')
    el.add('第二条')
    expect(items(el).length).toBe(2)
    // 两条落在不同轨道（第二条立即获得另一条空闲轨道）
    const tracks = items(el).map((item) => item.parentElement!.dataset.index)
    expect(new Set(tracks).size).toBe(2)
  })

  it('单轨道时后一条排队，前一条进场后才放行（防重叠）', () => {
    const el = mount({ tracks: '1', speed: '120', gap: '48' })
    el.add('第一条弹幕')
    el.add('第二条弹幕')
    expect(items(el).length).toBe(1)
    vi.advanceTimersByTime(2000)
    expect(items(el).length).toBe(2)
  })

  it('max-active 控制同屏密度，超出的排队等待', () => {
    const el = mount({ tracks: '3', 'max-active': '1' })
    el.add('一')
    el.add('二')
    expect(items(el).length).toBe(1)
    vi.advanceTimersByTime(8000)
    expect(items(el).length).toBe(1)
    // 第一条已离场，第二条接棒
    expect(items(el)[0]!.textContent).toBe('二')
  })

  it('弹幕定时离场（动画结束后移除 DOM）', () => {
    const el = mount({ tracks: '1', speed: '400' })
    el.add('会离场')
    expect(items(el).length).toBe(1)
    vi.advanceTimersByTime(8000)
    expect(items(el).length).toBe(0)
  })

  it('tracks 数量变化会清空在场弹幕并重建轨道', () => {
    const el = mount({ tracks: '2' })
    el.add('旧弹幕')
    expect(items(el).length).toBe(1)
    el.setAttribute('tracks', '4')
    expect(items(el).length).toBe(0)
    expect(el.shadowRoot!.querySelectorAll('.track').length).toBe(4)
  })
})

describe('OASBarrage 暂停 / 恢复 / 清空 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('pause() 冻结离场计时，resume() 继续', () => {
    const el = mount({ tracks: '1', speed: '400' })
    el.add('暂停测试')
    el.pause()
    expect(el.hasAttribute('paused')).toBe(true)
    expect(stage(el).classList.contains('paused')).toBe(true)
    vi.advanceTimersByTime(20000)
    expect(items(el).length).toBe(1)
    el.resume()
    expect(stage(el).classList.contains('paused')).toBe(false)
    vi.advanceTimersByTime(8000)
    expect(items(el).length).toBe(0)
  })

  it('paused 属性（受控）同样生效：暂停期间新弹幕排队', () => {
    const el = mount({ tracks: '1', speed: '400', paused: '' })
    el.add('受控暂停')
    vi.advanceTimersByTime(20000)
    expect(items(el).length).toBe(0)
    el.removeAttribute('paused')
    expect(items(el).length).toBe(1)
    vi.advanceTimersByTime(8000)
    expect(items(el).length).toBe(0)
  })

  it('clear() 清空在场与排队弹幕', () => {
    const el = mount({ tracks: '1' })
    el.add('一')
    el.add('二')
    expect(items(el).length).toBe(1)
    el.clear()
    expect(items(el).length).toBe(0)
    vi.advanceTimersByTime(20000)
    expect(items(el).length).toBe(0)
  })

  it('清空后可以重新添加', () => {
    const el = mount()
    el.add('旧')
    el.clear()
    el.add('新')
    expect(items(el).length).toBe(1)
    expect(items(el)[0]!.textContent).toBe('新')
  })
})

describe('OASBarrage 数据与无障碍', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('addBatch 支持字符串与对象（颜色 / key）', () => {
    const el = mount()
    el.addBatch(['甲', { text: '乙', color: 'blue', key: 'b' }, { text: '' }])
    const all = items(el)
    expect(all.length).toBe(2)
    const second = all.find((item) => item.textContent === '乙')!
    expect(second.style.getPropertyValue('--oas-barrage-item-color')).toBe('var(--oas-preset-blue-text)')
    expect(second.dataset.key).toBe('b')
  })

  it('空文本忽略', () => {
    const el = mount()
    el.add('   ')
    expect(items(el).length).toBe(0)
  })

  it('点击弹幕派发 oas-item-click（含 text/key/color）', () => {
    const el = mount()
    el.add('点我', { key: 'k1', color: '#fff' })
    const handler = vi.fn()
    el.addEventListener('oas-item-click', handler)
    items(el)[0]!.click()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0].detail).toEqual({ text: '点我', key: 'k1', color: '#fff' })
  })

  it('默认 aria-hidden，accessible 开启后为 log 活区', () => {
    const el = mount()
    expect(stage(el).getAttribute('aria-hidden')).toBe('true')
    expect(stage(el).getAttribute('role')).toBeNull()
    el.setAttribute('accessible', '')
    expect(stage(el).getAttribute('aria-hidden')).toBeNull()
    expect(stage(el).getAttribute('role')).toBe('log')
    expect(stage(el).getAttribute('aria-live')).toBe('polite')
  })

  it('height 纯数字按 px、CSS 长度原样、非法忽略', () => {
    const el = mount({ height: '160' })
    expect(el.style.getPropertyValue('--oas-barrage-height')).toBe('160px')
    el.setAttribute('height', '12rem')
    expect(el.style.getPropertyValue('--oas-barrage-height')).toBe('12rem')
    el.setAttribute('height', 'bogus-height-xyz')
    expect(el.style.getPropertyValue('--oas-barrage-height')).toBe('')
  })

  it('reduced-motion 关闭横向漂移时长', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-duration: 0.01ms !important')
  })
})
