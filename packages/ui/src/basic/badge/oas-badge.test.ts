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

/** 提取 shadow 样式里指定选择器对应的规则体（精确断言 class 驱动的 CSS 值） */
function cssRule(style: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = style.match(new RegExp(`${esc}\\s*\\{([\\s\\S]*?)\\}`))
  return m ? m[1]! : ''
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

describe('OASBadge ribbon-position 纵向三选', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 hang：无 position class、不写内联 top（回落基类 var(--oas-space-2)）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const r = ribbon(el)!
    expect(r.classList.contains('position-edge')).toBe(false)
    expect(r.classList.contains('position-cross')).toBe(false)
    expect(r.style.top).toBe('')
  })

  it('edge 贴顶边：position-edge class 驱动 top: 0', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-position': 'edge' })
    const r = ribbon(el)!
    expect(r.classList.contains('position-edge')).toBe(true)
    expect(r.classList.contains('position-cross')).toBe(false)
    expect(r.style.top).toBe('')
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(cssRule(style, '.ribbon.position-edge')).toContain('top: 0;')
  })

  it('cross 骑跨顶边：position-cross class 驱动 top: -6px', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-position': 'cross' })
    const r = ribbon(el)!
    expect(r.classList.contains('position-cross')).toBe(true)
    expect(r.classList.contains('position-edge')).toBe(false)
    expect(r.style.top).toBe('')
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(cssRule(style, '.ribbon.position-cross')).toContain('top: -6px;')
  })

  it('非法值静默回落 hang（无 position class、不写内联）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-position': 'below' })
    const r = ribbon(el)!
    expect(r.classList.contains('position-edge')).toBe(false)
    expect(r.classList.contains('position-cross')).toBe(false)
    expect(r.style.top).toBe('')
  })

  it('属性切换增量更新：edge→cross 切 class 不重建引用', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-position': 'edge' })
    const r = ribbon(el)!
    expect(r.classList.contains('position-edge')).toBe(true)
    el.setAttribute('ribbon-position', 'cross')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('position-cross')).toBe(true)
    expect(r.classList.contains('position-edge')).toBe(false)
  })

  it('与 placement 正交：placement=start + cross 同时生效（top 偏移与横向锚点互不干扰）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-position': 'cross', placement: 'start' })
    const r = ribbon(el)!
    expect(r.classList.contains('placement-start')).toBe(true)
    expect(r.classList.contains('position-cross')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // cross 只改纵向 top；横向仍由 placement 控制（start → 左端 + 镜像折叠角）
    expect(cssRule(style, '.ribbon.position-cross')).toContain('top: -6px;')
    expect(style).toContain('.ribbon.placement-start .ribbon-corner')
    expect(style).toContain('inset-inline-start: 0')
  })

  it('hang 基类 top 保留 var(--oas-space-2)（向后兼容现行行为）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(cssRule(style, '.ribbon')).toContain('top: var(--oas-space-2);')
  })
})

describe('OASBadge 折叠角尖三角几何', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('尖三角构造：clip-path 三点三角 + background currentColor + brightness 压暗；不再用 scaleY 压扁', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(el.shadowRoot!.querySelector('.ribbon-corner')).not.toBeNull()
    const corner = cssRule(style, '.ribbon-corner')
    expect(corner).toContain('clip-path: polygon(0 0, 100% 0, 0 100%)')
    expect(corner).toContain('background: currentColor')
    expect(corner).toContain('filter: brightness(75%)')
    expect(corner).not.toContain('scaleY')
  })

  it('start/end 镜像：end 共用 base 三角，start 显式镜像（clip-path 不随锚点自动翻转，曾现 bug）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('.ribbon.placement-end .ribbon-corner')
    expect(style).toContain('inset-inline-end: 0')
    expect(style).toContain('.ribbon.placement-start .ribbon-corner')
    expect(style).toContain('inset-inline-start: 0')
    // end 规则只设锚点，不含几何构造（三角形共用 base）
    expect(cssRule(style, '.ribbon.placement-end .ribbon-corner')).not.toContain('clip-path')
    // start 规则必须显式镜像三角（直角在右上）
    expect(cssRule(style, '.ribbon.placement-start .ribbon-corner')).toContain(
      'clip-path: polygon(100% 0, 0 0, 100% 100%)',
    )
  })
})

describe('OASBadge ribbon-form 形态维度', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const FORMS = ['fold', 'diagonal', 'triangle', 'bookmark', 'side', 'seal', 'banner', 'flag']

  it('默认 fold：未设置 ribbon-form 不写任何 form-* class（基类即 fold，向后兼容）', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const r = ribbon(el)!
    for (const f of FORMS) {
      expect(r.classList.contains(`form-${f}`), `form-${f}`).toBe(false)
    }
  })

  it('显式 ribbon-form="fold" 写入 form-fold class（与缺省区分）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'fold' })
    const r = ribbon(el)!
    expect(r.classList.contains('form-fold')).toBe(true)
    for (const f of FORMS.filter((x) => x !== 'fold')) {
      expect(r.classList.contains(`form-${f}`), f).toBe(false)
    }
  })

  it('ribbon-form 八值 class 切换（互斥）', () => {
    for (const f of FORMS) {
      const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': f })
      const r = ribbon(el)!
      expect(r.classList.contains(`form-${f}`), f).toBe(true)
      for (const other of FORMS.filter((x) => x !== f)) {
        expect(r.classList.contains(`form-${other}`), `${f} 不应有 form-${other}`).toBe(false)
      }
    }
  })

  it('非法值静默回落 fold（不写任何 form-* class）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'star' })
    const r = ribbon(el)!
    for (const f of FORMS) {
      expect(r.classList.contains(`form-${f}`), `form-${f}`).toBe(false)
    }
    expect(r.hidden).toBe(false)
  })

  it('属性切换增量更新：diagonal→seal 切 class 不重建引用', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'diagonal' })
    const r = ribbon(el)!
    expect(r.classList.contains('form-diagonal')).toBe(true)
    el.setAttribute('ribbon-form', 'seal')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('form-seal')).toBe(true)
    expect(r.classList.contains('form-diagonal')).toBe(false)
  })

  it('triangle 图标渲染：slot="ribbon" 内容出现且形态 class 生效', async () => {
    const el = mount({ ribbon: '', 'ribbon-form': 'triangle' })
    expect(ribbon(el)!.hidden).toBe(true)
    el.innerHTML = '<oas-icon slot="ribbon" name="star" size="18"></oas-icon>'
    await new Promise((r) => setTimeout(r, 0))
    const r = ribbon(el)!
    expect(r.hidden).toBe(false)
    expect(r.classList.contains('form-triangle')).toBe(true)
    // 图标经命名插槽投影（节点留在 light DOM，不在 .ribbon-text 的 textContent 里）
    const assigned = ribbonSlot(el)!.assignedNodes()
    expect(assigned.length).toBeGreaterThan(0)
    expect((assigned[0] as HTMLElement).tagName.toLowerCase()).toBe('oas-icon')
    expect(r.querySelector('.ribbon-text')).not.toBeNull()
  })

  it('seal 形态注入锯齿多边形 clip-path（点数充足）', () => {
    const el = mount({ ribbon: '', text: '奖', 'ribbon-form': 'seal' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const m = cssRule(style, '.ribbon.form-seal').match(/clip-path:\s*(polygon\([^;]+\))/)
    expect(m).not.toBeNull()
    const pts = (m![1]!.match(/%/g) ?? []).length
    expect(pts).toBeGreaterThan(24)
  })

  it('各形态关键几何规则在样式中落地（斜带镜像 / 三角 / 燕尾 / 侧挂 / 横幅）', () => {
    const style = mount({ ribbon: '', text: 'HOT' }).shadowRoot!.querySelector('style')!
      .textContent!
    // diagonal：end 逆时针 -45°、start 镜像 +45°
    expect(cssRule(style, '.ribbon.form-diagonal.placement-end')).toContain(
      'transform: rotate(-45deg)',
    )
    expect(cssRule(style, '.ribbon.form-diagonal.placement-start')).toContain(
      'transform: rotate(45deg)',
    )
    // triangle：直角在右上，start 显式镜像
    expect(cssRule(style, '.ribbon.form-triangle')).toContain(
      'clip-path: polygon(0 0, 100% 0, 100% 100%)',
    )
    expect(cssRule(style, '.ribbon.form-triangle.placement-start')).toContain(
      'clip-path: polygon(0 0, 100% 0, 0 100%)',
    )
    // bookmark：底部燕尾 V 缺口
    expect(cssRule(style, '.ribbon.form-bookmark')).toContain('50% 100%')
    expect(cssRule(style, '.ribbon.form-bookmark')).toContain('clip-path: polygon')
    // side：竖排写在 .ribbon-text 上，start/end 折叠角镜像
    expect(cssRule(style, '.ribbon.form-side .ribbon-text')).toContain('writing-mode: vertical-rl')
    expect(cssRule(style, '.ribbon.form-side .ribbon-corner')).toContain('top: 0;')
    expect(cssRule(style, '.ribbon.form-side.placement-start .ribbon-corner')).toContain(
      'clip-path: polygon(0 0, 100% 0, 0 100%)',
    )
    expect(cssRule(style, '.ribbon.form-side.placement-end .ribbon-corner')).toContain(
      'clip-path: polygon(100% 0, 0 0, 100% 100%)',
    )
    // banner：全宽 + 两端折角梯形
    const banner = cssRule(style, '.ribbon.form-banner')
    expect(banner).toContain('width: 100%')
    expect(banner).toContain('clip-path: polygon')
    expect(banner).toContain('20px 100%')
  })

  it('各形态与 placement 组合不冲突（form 与 placement class 并存且互不干扰）', () => {
    for (const f of FORMS) {
      for (const p of ['start', 'end']) {
        const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': f, placement: p })
        const r = ribbon(el)!
        expect(r.classList.contains(`form-${f}`), `${f}+${p}`).toBe(true)
        expect(r.classList.contains(`placement-${p}`), `${f}+${p}`).toBe(true)
        expect(r.classList.contains(`placement-${p === 'start' ? 'end' : 'start'}`)).toBe(false)
      }
    }
  })

  it('形态与 color 并存：语义色 class 保留', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'bookmark', color: 'success' })
    const r = ribbon(el)!
    expect(r.classList.contains('form-bookmark')).toBe(true)
    expect(r.classList.contains('color-success')).toBe(true)
  })
})

describe('OASBadge ribbon 形态细节：flag / rolled / wide', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('flag 形态：class 生效，探出端 V 缺口 clip-path（缺口朝探出端，placement start/end 镜像）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'flag' })
    const r = ribbon(el)!
    expect(r.classList.contains('form-flag')).toBe(true)
    expect(r.hidden).toBe(false)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // end（默认，探出右端）：右端侧燕尾 V 缺口
    expect(cssRule(style, '.ribbon.form-flag')).toContain(
      'clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)',
    )
    // start 镜像：缺口在左端（clip-path 走元素本地坐标，不随锚点自动翻转）
    expect(cssRule(style, '.ribbon.form-flag.placement-start')).toContain(
      'clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)',
    )
    // 探出端锚点：end 右探 / start 左探（镜像）
    expect(cssRule(style, '.ribbon.form-flag.placement-end')).toContain(
      'inset-inline-end: calc(var(--oas-space-2) * -1)',
    )
    expect(cssRule(style, '.ribbon.form-flag.placement-start')).toContain(
      'inset-inline-start: calc(var(--oas-space-2) * -1)',
    )
  })

  it('flag 折叠角保留：复用 .ribbon-corner（置于条身 clip 区域内 bottom 内侧，start/end 镜像）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'flag' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain('.ribbon.form-flag .ribbon-corner')
    expect(cssRule(style, '.ribbon.form-flag .ribbon-corner')).toContain('bottom: 0;')
    expect(cssRule(style, '.ribbon.form-flag.placement-end .ribbon-corner')).toContain(
      'inset-inline-start: 0',
    )
    expect(cssRule(style, '.ribbon.form-flag.placement-start .ribbon-corner')).toContain(
      'inset-inline-end: 0',
    )
    expect(cssRule(style, '.ribbon.form-flag.placement-start .ribbon-corner')).toContain(
      'clip-path: polygon(100% 100%, 100% 0, 0 100%)',
    )
  })

  it('flag 与其他属性正交：color / placement 并存', () => {
    const el = mount({
      ribbon: '',
      text: 'HOT',
      'ribbon-form': 'flag',
      placement: 'start',
      color: 'success',
    })
    const r = ribbon(el)!
    expect(r.classList.contains('form-flag')).toBe(true)
    expect(r.classList.contains('placement-start')).toBe(true)
    expect(r.classList.contains('color-success')).toBe(true)
  })

  it('rolled 布尔修饰：加 rolled class + 卷边几何规则存在（端部大圆角 + 渐暗渐变），移除后恢复', () => {
    const el = mount({ ribbon: '', text: 'HOT', rolled: '' })
    const r = ribbon(el)!
    expect(r.classList.contains('rolled')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // 端部大圆角（探出端 pill）
    expect(style).toContain('border-start-end-radius: 999px')
    expect(style).toContain('border-end-end-radius: 999px')
    // 内侧渐暗：currentColor 渐变 + brightness 压暗（纯 CSS 模拟卷起圆柱，无硬编码色值）
    expect(style).toContain('linear-gradient(90deg, transparent 0%, currentColor 100%)')
    expect(style).toContain('filter: brightness(70%)')
    // 独立开关：移除属性后 class 移除
    el.removeAttribute('rolled')
    expect(r.classList.contains('rolled')).toBe(false)
  })

  it('rolled 排除裁剪形态：diagonal/triangle/bookmark/side/seal 经 :not 排除（不产生卷边视觉）', () => {
    const el = mount({ ribbon: '', text: 'HOT', rolled: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style).toContain(
      ':not(.form-diagonal):not(.form-triangle):not(.form-bookmark):not(.form-side):not(.form-seal)',
    )
  })

  it('rolled 与 fold/banner/flag 叠加：class 并存', () => {
    for (const f of ['fold', 'banner', 'flag']) {
      const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': f, rolled: '' })
      const r = ribbon(el)!
      expect(r.classList.contains('rolled'), f).toBe(true)
      expect(r.classList.contains(`form-${f}`), f).toBe(true)
    }
  })

  it('rolled + banner：双端卷边（banner 规则置于 placement 单端规则后覆写）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'banner', rolled: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style.indexOf('.ribbon.rolled.form-banner::after')).toBeGreaterThan(
      style.indexOf('.ribbon.rolled.placement-end:where'),
    )
    expect(cssRule(style, '.ribbon.rolled.form-banner::after')).toContain('inset-inline-start: 0;')
    expect(cssRule(style, '.ribbon.rolled.form-banner::after')).toContain('inset-inline-end: 0;')
  })

  it('wide 宽幅大字斜带：仅与 diagonal 组合（尺寸/字号/平移按 200px 带宽比例）', () => {
    const el = mount({ ribbon: '', text: '50% OFF', 'ribbon-form': 'diagonal', wide: '' })
    const r = ribbon(el)!
    expect(r.classList.contains('wide')).toBe(true)
    expect(r.classList.contains('form-diagonal')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const wide = cssRule(style, '.ribbon.form-diagonal.wide')
    expect(wide).toContain('width: 200px')
    expect(wide).toContain('height: 32px')
    expect(wide).toContain('font-size: var(--oas-font-size-lg)')
    // 平移与现有逻辑一致：end 内半段左移 1/4 带长（200×1/4=50px），start 镜像右移
    expect(cssRule(style, '.ribbon.form-diagonal.wide .ribbon-text')).toContain(
      'transform: translateX(-50px)',
    )
    expect(cssRule(style, '.ribbon.form-diagonal.wide.placement-start .ribbon-text')).toContain(
      'transform: translateX(50px)',
    )
  })

  it('wide 非 diagonal 忽略：不写入 wide class', () => {
    for (const f of ['fold', 'banner', 'flag', 'seal', 'triangle', 'bookmark', 'side']) {
      const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': f, wide: '' })
      expect(ribbon(el)!.classList.contains('wide'), f).toBe(false)
    }
  })

  it('wide 增量更新：diagonal→seal 时 wide class 移除（不重建引用）', () => {
    const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': 'diagonal', wide: '' })
    const r = ribbon(el)!
    expect(r.classList.contains('wide')).toBe(true)
    el.setAttribute('ribbon-form', 'seal')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('wide')).toBe(false)
  })
})

describe('OASBadge premium 金属质感', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('premium 布尔属性 → 加 premium class，移除后恢复', () => {
    const el = mount({ ribbon: '', text: 'HOT', premium: '' })
    const r = ribbon(el)!
    expect(r.classList.contains('premium')).toBe(true)
    el.removeAttribute('premium')
    expect(r.classList.contains('premium')).toBe(false)
  })

  it('premium 与 color 优先级：premium 规则置于语义色规则之后（CSS 顺序保证 premium 覆盖 color）', () => {
    const el = mount({ ribbon: '', text: 'HOT', premium: '', color: 'success' })
    const r = ribbon(el)!
    expect(r.classList.contains('premium')).toBe(true)
    expect(r.classList.contains('color-success')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    expect(style.indexOf('.ribbon.premium {')).toBeGreaterThan(
      style.indexOf('.ribbon.color-success {'),
    )
    expect(style.indexOf('.ribbon.premium {')).toBeGreaterThan(
      style.indexOf('.ribbon.color-danger {'),
    )
    // premium 自带渐变/描边/文字色声明，不依赖 color 变量注入
    const premiumRule = cssRule(style, '.ribbon.premium')
    expect(premiumRule).toContain('background: linear-gradient')
    expect(premiumRule).toContain('color-mix')
    expect(premiumRule).toContain('border: 1px solid')
    expect(cssRule(style, '.ribbon.premium .ribbon-text')).toContain('color-mix')
  })

  it('premium 渐变走 --oas-preset-gold token（dark 自适应）', () => {
    const el = mount({ ribbon: '', text: 'HOT', premium: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const rule = cssRule(style, '.ribbon.premium')
    expect(rule).toContain('var(--oas-preset-gold)')
    expect(rule).not.toContain('#faad14')
  })

  it('裁剪形态 premium 用 drop-shadow 轮廓描边（box border 会被 clip-path 裁掉）', () => {
    const el = mount({ ribbon: '', text: 'HOT', premium: '' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    // 多选择器合写规则：取首个选择器起的整段规则体（至首个 }）
    const m = style.match(/\.ribbon\.premium\.form-triangle[\s\S]*?\{([\s\S]*?)\}/)
    expect(m).not.toBeNull()
    const rule = m![1]!
    expect(rule).toContain('border: none;')
    expect(rule).toContain('filter: drop-shadow')
  })

  it('premium 与形态正交：form 与 premium class 并存', () => {
    for (const f of ['fold', 'seal', 'banner', 'diagonal', 'triangle', 'bookmark', 'side', 'flag']) {
      const el = mount({ ribbon: '', text: 'HOT', 'ribbon-form': f, premium: '' })
      const r = ribbon(el)!
      expect(r.classList.contains('premium'), f).toBe(true)
      expect(r.classList.contains(`form-${f}`), f).toBe(true)
    }
  })

  it('属性切换增量更新：切 premium 不重建引用', () => {
    const el = mount({ ribbon: '', text: 'HOT' })
    const r = ribbon(el)!
    el.setAttribute('premium', '')
    expect(ribbon(el)).toBe(r)
    expect(r.classList.contains('premium')).toBe(true)
  })
})
