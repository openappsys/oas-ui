import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASBadge } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '内容'): OASBadge {
  const el = new OASBadge()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function badge(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.badge')
}

function ribbon(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.ribbon')
}

function ribbonSlot(el: OASBadge): HTMLSlotElement | null {
  return el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="ribbon"]')
}

function ribbonFallback(el: OASBadge): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>('.ribbon-fallback')
}

describe('OASBadge', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('无 value 时渲染宿主槽但不显示徽标（hidden）', async () => {
    const el = mount()
    await Promise.resolve()
    expect(el.textContent).toContain('内容')
    expect(badge(el)!.hidden).toBe(true)
  })

  it('value 渲染数字徽标', () => {
    const el = mount({ value: '5' })
    expect(badge(el)!.textContent).toBe('5')
  })

  it('value 超过 max 截断为 max+', () => {
    const el = mount({ value: '120', max: '99' })
    expect(badge(el)!.textContent).toBe('99+')
  })

  it('value=0 默认隐藏，showZero 时显示 0', () => {
    const el = mount({ value: '0' })
    expect(badge(el)!.hidden).toBe(true)
    el.setAttribute('showZero', '')
    expect(badge(el)!.textContent).toBe('0')
  })

  it('dot 模式渲染小圆点（无文本）', () => {
    const el = mount({ value: '5', dot: '' })
    expect(badge(el)!.textContent).toBe('')
    expect(badge(el)!.classList.contains('dot')).toBe(true)
  })

  it('属性变化增量更新：切换 value 不重建引用', () => {
    const el = mount({ value: '3' })
    const b = badge(el)!
    el.setAttribute('value', '10')
    expect(badge(el)).toBe(b)
    expect(b.textContent).toBe('10')
  })
})

describe('OASBadge ribbon', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ribbon 布尔属性 + text 渲染缎带文本', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(false)
    expect(ribbonFallback(el)!.textContent).toContain('HOT')
    expect(ribbonFallback(el)!.hidden).toBe(false)
  })

  it('mode="ribbon" 等价启用缎带', () => {
    const el = mount({ mode: 'ribbon', text: '新品' })
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('mode="count" 不启用缎带', () => {
    const el = mount({ mode: 'count', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('未启用 ribbon 时缎带节点隐藏', () => {
    const el = mount({ text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('ribbon 无内容（无 text 无 slot）时隐藏', () => {
    const el = mount({ ribbon: '' })
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('text 清空后缎带重新隐藏', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.hidden).toBe(false)
    el.removeAttribute('text')
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('placement 默认 end，start 切换到左端', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.classList.contains('placement-end')).toBe(true)
    expect(ribbon(el)!.classList.contains('placement-start')).toBe(false)
    el.setAttribute('placement', 'start')
    expect(ribbon(el)!.classList.contains('placement-start')).toBe(true)
    expect(ribbon(el)!.classList.contains('placement-end')).toBe(false)
  })

  it('color 变体映射语义 class，默认 danger', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbon(el)!.classList.contains('color-danger')).toBe(true)
    el.setAttribute('color', 'success')
    expect(ribbon(el)!.classList.contains('color-success')).toBe(true)
    expect(ribbon(el)!.classList.contains('color-danger')).toBe(false)
    el.setAttribute('color', 'warning')
    expect(ribbon(el)!.classList.contains('color-warning')).toBe(true)
    el.setAttribute('color', 'primary')
    expect(ribbon(el)!.classList.contains('color-primary')).toBe(true)
  })

  it('与 count 并存：ribbon + value 同时渲染', () => {
    const el = mount({ ribbon: '', text: 'HOT', value: '5' })
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.textContent).toBe('5')
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('与 dot 并存：dot + ribbon 同时渲染', () => {
    const el = mount({ ribbon: '', text: 'HOT', dot: '' })
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.classList.contains('dot')).toBe(true)
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('ribbon 命名插槽内容驱动显隐（无 text 时）', async () => {
    const el = mount({ ribbon: '' })
    expect(ribbon(el)!.hidden).toBe(true)
    el.innerHTML = '<span slot="ribbon">HOT</span>'
    await new Promise((r) => setTimeout(r, 0))
    expect(ribbon(el)!.hidden).toBe(false)
    expect(ribbonSlot(el)!.assignedNodes().length).toBeGreaterThan(0)
  })

  it('text 属性写入兜底元素；slot 有内容时兜底隐藏、assigned 优先', async () => {
    const el = mount({ ribbon: '', text: 'attr' })
    expect(ribbonFallback(el)!.textContent).toContain('attr')
    expect(ribbonFallback(el)!.hidden).toBe(false)
    el.innerHTML = '<em slot="ribbon">slot</em>'
    await new Promise((r) => setTimeout(r, 0))
    expect(ribbonSlot(el)!.assignedNodes().length).toBeGreaterThan(0)
    expect(ribbonFallback(el)!.hidden).toBe(true)
    expect(ribbon(el)!.hidden).toBe(false)
  })

  it('text 兜底与 slot 并存时不写 slot 节点（防 slotchange 循环）', () => {
    const el = mount({ ribbon: '', text: 'attr' })
    const slot = ribbonSlot(el)!
    expect(slot.childNodes.length).toBe(0)
  })

  it('缎带文本为真实文本内容（屏幕阅读器可读，无 aria-hidden）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    expect(ribbonFallback(el)!.textContent!.trim()).toBe('HOT')
    expect(ribbon(el)!.hasAttribute('aria-hidden')).toBe(false)
  })

  it('text 兜底元素位于 ribbon-text 内（继承文字色，否则文字与缎带背景同色不可见）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const text = el.shadowRoot!.querySelector<HTMLElement>('.ribbon-text')!
    expect(text.querySelector('.ribbon-fallback')).not.toBeNull()
  })

  it('属性变化增量更新：切换 ribbon 属性不重建引用', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const r = ribbon(el)!
    el.setAttribute('color', 'success')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('color-success')).toBe(true)
  })
})

describe('OASBadge standalone 独立徽标', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认插槽无内容时回落静态行内（standalone class），有内容时角标定位', async () => {
    const el = new OASBadge()
    el.setAttribute('value', '5')
    document.body.appendChild(el)
    expect(badge(el)!.classList.contains('standalone')).toBe(true)
    // 补上子内容 → 回落为角标定位
    el.textContent = '通知'
    await new Promise((r) => setTimeout(r, 0))
    expect(badge(el)!.classList.contains('standalone')).toBe(false)
  })

  it('standalone 时数字仍正常显示', () => {
    const el = new OASBadge()
    el.setAttribute('value', '8')
    document.body.appendChild(el)
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.textContent).toBe('8')
  })

  it('standalone 时 dot 圆点正常显示', () => {
    const el = new OASBadge()
    el.setAttribute('dot', '')
    document.body.appendChild(el)
    expect(badge(el)!.hidden).toBe(false)
    expect(badge(el)!.classList.contains('dot')).toBe(true)
    expect(badge(el)!.classList.contains('standalone')).toBe(true)
  })
})

describe('OASBadge 颜色全模式', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('color 语义色应用于 count 徽标（token + on-color 变量）', () => {
    const el = mount({ value: '5', color: 'success' })
    const b = badge(el)!
    expect(b.style.getPropertyValue('--oas-badge-bg')).toBe('var(--oas-color-success)')
    expect(b.style.getPropertyValue('--oas-badge-on-color')).toBe(
      'var(--oas-color-text-on-success)',
    )
  })

  it('color 语义色应用于 dot 徽标', () => {
    const el = mount({ dot: '', color: 'warning' })
    const b = badge(el)!
    expect(b.style.getPropertyValue('--oas-badge-bg')).toBe('var(--oas-color-warning)')
    expect(b.style.getPropertyValue('--oas-badge-on-color')).toBe(
      'var(--oas-color-text-on-warning)',
    )
  })

  it('color 预设名解析到 --oas-preset-* 变量（count 与 dot 均支持）', () => {
    const presets = [
      'magenta',
      'red',
      'volcano',
      'orange',
      'gold',
      'lime',
      'green',
      'cyan',
      'blue',
      'geekblue',
      'purple',
    ]
    for (const name of presets) {
      const el = mount({ value: '3', color: name })
      expect(badge(el)!.style.getPropertyValue('--oas-badge-bg'), `count preset=${name}`).toBe(
        `var(--oas-preset-${name})`,
      )
    }
    const d = mount({ dot: '', color: 'purple' })
    expect(badge(d)!.style.getPropertyValue('--oas-badge-bg')).toBe('var(--oas-preset-purple)')
    expect(badge(d)!.style.getPropertyValue('--oas-badge-on-color')).toBe(
      'var(--oas-color-text-on-primary)',
    )
  })

  it('color 任意 CSS 色值：实心文字按底色亮度取黑/白', () => {
    const el = mount({ value: '5', color: '#16a34a' })
    expect(badge(el)!.style.getPropertyValue('--oas-badge-bg')).toBe('#16a34a')
    expect(badge(el)!.style.getPropertyValue('--oas-badge-on-color')).toBe('#ffffff')
    el.setAttribute('color', '#fbbf24')
    expect(badge(el)!.style.getPropertyValue('--oas-badge-on-color')).toBe('#18181b')
  })

  it('无 color 时清除变量（CSS 回落默认 danger）', () => {
    const el = mount({ value: '5', color: 'success' })
    expect(badge(el)!.style.getPropertyValue('--oas-badge-bg')).not.toBe('')
    el.removeAttribute('color')
    expect(badge(el)!.style.getPropertyValue('--oas-badge-bg')).toBe('')
    expect(badge(el)!.style.getPropertyValue('--oas-badge-on-color')).toBe('')
  })

  it('ribbon 支持预设名与任意色值（语义色 class 逻辑保留兼容）', () => {
    const el = mount({ ribbon: '', text: 'HOT', color: 'purple' })
    const r = ribbon(el)!
    expect(r.style.getPropertyValue('--oas-badge-bg')).toBe('var(--oas-preset-purple)')
    expect(r.classList.contains('color-danger')).toBe(false)
    el.setAttribute('color', '#7c3aed')
    expect(r.style.getPropertyValue('--oas-badge-bg')).toBe('#7c3aed')
    // 语义色 class 保留
    el.setAttribute('color', 'success')
    expect(r.classList.contains('color-success')).toBe(true)
    expect(r.classList.contains('color-danger')).toBe(false)
    expect(r.style.getPropertyValue('--oas-badge-bg')).toBe('var(--oas-color-success)')
  })
})

describe('OASBadge offset 偏移', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('offset="x,y" 叠加到角标 translate', () => {
    const el = mount({ value: '5', offset: '10,5' })
    expect(badge(el)!.style.transform).toBe('translate(calc(50% + 10px), calc(-50% + 5px))')
  })

  it('offset 非法值静默忽略（不设置内联 transform）', () => {
    const el = mount({ value: '5', offset: 'abc' })
    expect(badge(el)!.style.transform).toBe('')
    el.setAttribute('offset', '10')
    expect(badge(el)!.style.transform).toBe('')
    el.setAttribute('offset', '-1,5')
    expect(badge(el)!.style.transform).toBe('')
  })

  it('standalone 时不应用 offset（静态定位无 translate）', () => {
    const el = new OASBadge()
    el.setAttribute('value', '5')
    el.setAttribute('offset', '10,5')
    document.body.appendChild(el)
    expect(badge(el)!.classList.contains('standalone')).toBe(true)
    expect(badge(el)!.style.transform).toBe('')
  })
})

describe('OASBadge status 状态点', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function statusEl(el: OASBadge): HTMLElement | null {
    return el.shadowRoot!.querySelector<HTMLElement>('.status')
  }

  it('status 渲染「状态点 + text 文字」独立元素，与角标互斥', () => {
    const el = mount({ status: 'success', text: '运行中', value: '5' })
    const s = statusEl(el)!
    expect(s.hidden).toBe(false)
    expect(s.classList.contains('success')).toBe(true)
    expect(s.querySelector<HTMLElement>('.status-dot')!.style.getPropertyValue('--oas-status-color')).toBe(
      'var(--oas-color-success)',
    )
    expect(s.querySelector<HTMLElement>('.status-text')!.textContent).toBe('运行中')
    // 互斥：badge 与 ribbon 隐藏
    expect(badge(el)!.hidden).toBe(true)
    expect(ribbon(el)!.hidden).toBe(true)
  })

  it('status=processing 带脉冲 class，映射 primary 色', () => {
    const el = mount({ status: 'processing', text: '处理中' })
    const s = statusEl(el)!
    expect(s.hidden).toBe(false)
    expect(s.classList.contains('processing')).toBe(true)
    expect(s.querySelector<HTMLElement>('.status-dot')!.style.getPropertyValue('--oas-status-color')).toBe(
      'var(--oas-color-primary)',
    )
  })

  it('status 各语义色映射', () => {
    const cases: Array<[string, string]> = [
      ['error', 'var(--oas-color-danger)'],
      ['warning', 'var(--oas-color-warning)'],
      ['default', 'var(--oas-color-text-secondary)'],
      ['success', 'var(--oas-color-success)'],
      ['processing', 'var(--oas-color-primary)'],
    ]
    for (const [s, expectColor] of cases) {
      const el = mount({ status: s, text: 'x' })
      const dot = statusEl(el)!.querySelector<HTMLElement>('.status-dot')!
      expect(dot.style.getPropertyValue('--oas-status-color'), `status=${s}`).toBe(expectColor)
      expect(statusEl(el)!.hidden).toBe(false)
    }
  })

  it('status 非法值隐藏；移除后角标恢复', () => {
    const el = mount({ value: '5', status: 'foo' })
    expect(statusEl(el)!.hidden).toBe(true)
    expect(badge(el)!.hidden).toBe(false)
    el.setAttribute('status', 'success')
    expect(statusEl(el)!.hidden).toBe(false)
    expect(badge(el)!.hidden).toBe(true)
    el.removeAttribute('status')
    expect(statusEl(el)!.hidden).toBe(true)
    expect(badge(el)!.hidden).toBe(false)
  })

  it('status 优先于 ribbon：status 存在时缎带隐藏', () => {
    const el = mount({ ribbon: '', text: 'HOT', status: 'warning' })
    expect(statusEl(el)!.hidden).toBe(false)
    expect(ribbon(el)!.hidden).toBe(true)
  })
})

describe('OASBadge size 小尺寸', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size="small" 徽标加 small class（count 与 dot）', () => {
    const el = mount({ value: '5', size: 'small' })
    expect(badge(el)!.classList.contains('small')).toBe(true)
    const d = mount({ dot: '', size: 'small' })
    expect(badge(d)!.classList.contains('small')).toBe(true)
    expect(badge(d)!.classList.contains('dot')).toBe(true)
  })

  it('非 small 不加 class', () => {
    const el = mount({ value: '5' })
    expect(badge(el)!.classList.contains('small')).toBe(false)
  })
})

describe('OASBadge attention 吸引动画', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('attention="pulse"/"bounce" 加对应 class，非法值回落无 class', () => {
    const el = mount({ value: '5', attention: 'pulse' })
    expect(badge(el)!.classList.contains('attention-pulse')).toBe(true)
    expect(badge(el)!.classList.contains('attention-bounce')).toBe(false)
    el.setAttribute('attention', 'bounce')
    expect(badge(el)!.classList.contains('attention-bounce')).toBe(true)
    expect(badge(el)!.classList.contains('attention-pulse')).toBe(false)
    el.setAttribute('attention', 'spin')
    expect(badge(el)!.classList.contains('attention-pulse')).toBe(false)
    expect(badge(el)!.classList.contains('attention-bounce')).toBe(false)
  })

  it('attention 作用于 dot 与 standalone 徽标', () => {
    const d = mount({ dot: '', attention: 'pulse' })
    expect(badge(d)!.classList.contains('attention-pulse')).toBe(true)
    const s = new OASBadge()
    s.setAttribute('value', '5')
    s.setAttribute('attention', 'bounce')
    document.body.appendChild(s)
    expect(badge(s)!.classList.contains('standalone')).toBe(true)
    expect(badge(s)!.classList.contains('attention-bounce')).toBe(true)
  })

  it('bounce 时注入 --oas-badge-pos 基址（含 corner/offset 平移）', () => {
    const el = mount({ value: '5', attention: 'bounce', corner: 'top-left', offset: '3,4' })
    expect(badge(el)!.style.getPropertyValue('--oas-badge-pos')).toBe(
      'translate(calc(-50% + 3px), calc(-50% + 4px))',
    )
    el.removeAttribute('attention')
    expect(badge(el)!.style.getPropertyValue('--oas-badge-pos')).toBe('')
  })

  it('standalone + bounce 基址为恒等平移（不破坏静态定位）', () => {
    const el = new OASBadge()
    el.setAttribute('value', '5')
    el.setAttribute('attention', 'bounce')
    document.body.appendChild(el)
    expect(badge(el)!.classList.contains('standalone')).toBe(true)
    expect(badge(el)!.style.getPropertyValue('--oas-badge-pos')).toBe('translate(0, 0)')
  })

  it('prefers-reduced-motion 下 pulse/bounce 动画规则停用', () => {
    const el = mount({ value: '5', attention: 'pulse' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // 动画规则本体存在
    expect(style).toContain('.badge.attention-pulse')
    expect(style).toContain('.badge.attention-bounce')
    // prefers-reduced-motion 媒体查询中存在停用规则
    const mq = style.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}/g) ?? []
    expect(mq.length).toBeGreaterThan(0)
    expect(mq.join('')).toContain('.attention-pulse')
    expect(mq.join('')).toContain('.attention-bounce')
  })
})

describe('OASBadge corner 四角定位', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('corner 四值切换定位 class 与 translate（默认 top-right 无内联 transform）', () => {
    const el = mount({ value: '5' })
    expect(badge(el)!.style.transform).toBe('')
    el.setAttribute('corner', 'top-left')
    expect(badge(el)!.classList.contains('corner-top-left')).toBe(true)
    expect(badge(el)!.style.transform).toBe('translate(-50%, -50%)')
    el.setAttribute('corner', 'bottom-right')
    expect(badge(el)!.classList.contains('corner-bottom-right')).toBe(true)
    expect(badge(el)!.style.transform).toBe('translate(50%, 50%)')
    el.setAttribute('corner', 'bottom-left')
    expect(badge(el)!.classList.contains('corner-bottom-left')).toBe(true)
    expect(badge(el)!.style.transform).toBe('translate(-50%, 50%)')
    el.setAttribute('corner', 'top-right')
    expect(badge(el)!.classList.contains('corner-top-left')).toBe(false)
    expect(badge(el)!.classList.contains('corner-bottom-right')).toBe(false)
    expect(badge(el)!.classList.contains('corner-bottom-left')).toBe(false)
    expect(badge(el)!.style.transform).toBe('')
  })

  it('corner 非法值静默回落 top-right', () => {
    const el = mount({ value: '5', corner: 'north-east' })
    expect(badge(el)!.style.transform).toBe('')
    expect(badge(el)!.classList.contains('corner-top-left')).toBe(false)
    expect(badge(el)!.classList.contains('corner-bottom-right')).toBe(false)
    expect(badge(el)!.classList.contains('corner-bottom-left')).toBe(false)
  })

  it('corner 与 offset 叠加：transform 同时含 corner 平移与 offset px', () => {
    const el = mount({ value: '5', corner: 'bottom-left', offset: '3,4' })
    expect(badge(el)!.classList.contains('corner-bottom-left')).toBe(true)
    expect(badge(el)!.style.transform).toBe('translate(calc(-50% + 3px), calc(50% + 4px))')
    el.setAttribute('corner', 'top-left')
    expect(badge(el)!.style.transform).toBe('translate(calc(-50% + 3px), calc(-50% + 4px))')
  })
})

describe('OASBadge overlap 圆形内收', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('overlap 平移幅度从 50% 收到约 29%（1-√2/2）', () => {
    const el = mount({ value: '5', overlap: '' })
    expect(badge(el)!.style.transform).toBe('translate(29.29%, -29.29%)')
    el.removeAttribute('overlap')
    expect(badge(el)!.style.transform).toBe('')
  })

  it('overlap 与 offset/corner 叠加', () => {
    const el = mount({ value: '5', overlap: '', offset: '3,4' })
    expect(badge(el)!.style.transform).toBe('translate(calc(29.29% + 3px), calc(-29.29% + 4px))')
    el.setAttribute('corner', 'bottom-right')
    expect(badge(el)!.style.transform).toBe('translate(calc(29.29% + 3px), calc(29.29% + 4px))')
    el.removeAttribute('offset')
    expect(badge(el)!.style.transform).toBe('translate(29.29%, 29.29%)')
  })

  it('overlap 仅影响角标模式：standalone 无内联 transform', () => {
    const el = new OASBadge()
    el.setAttribute('value', '5')
    el.setAttribute('overlap', '')
    document.body.appendChild(el)
    expect(badge(el)!.classList.contains('standalone')).toBe(true)
    expect(badge(el)!.style.transform).toBe('')
  })
})

describe('OASBadge ribbon 与 corner/attention 互不干扰', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ribbon 不受 corner/attention 影响（placement 保留）', () => {
    const el = mount({ ribbon: '', text: 'HOT', corner: 'bottom-left', attention: 'pulse' })
    const r = ribbon(el)!
    expect(r.classList.contains('corner-bottom-left')).toBe(false)
    expect(r.classList.contains('attention-pulse')).toBe(false)
    expect(r.classList.contains('attention-bounce')).toBe(false)
    expect(r.classList.contains('placement-end')).toBe(true)
    // 同宿主角标照常生效
    expect(badge(el)!.classList.contains('corner-bottom-left')).toBe(true)
    expect(badge(el)!.classList.contains('attention-pulse')).toBe(true)
  })
})
