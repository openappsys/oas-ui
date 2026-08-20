import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSlider } from './index.js'

function mount(attrs: Record<string, string> = {}): OASSlider {
  const el = new OASSlider()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function range(el: OASSlider): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

function byRole(el: OASSlider, role: string): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>(`[data-role="${role}"]`)!
}

function inputsWrap(el: OASSlider): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="inputs"]')!
}

function thumbEl(el: OASSlider, which: 'value' | 'min' | 'max'): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`.custom-thumb[data-thumb="${which}"]`)!
}

function fillEl(el: OASSlider): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.fill')!
}

function marksEl(el: OASSlider): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.marks')!
}

function markItems(el: OASSlider): HTMLElement[] {
  return [...marksEl(el).querySelectorAll<HTMLElement>('.mark')]
}

describe('OASSlider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 range input，min/max/step 透传', async () => {
    const el = mount({ min: '0', max: '100', step: '5' })
    const input = range(el)
    await Promise.resolve()
    expect(input.type).toBe('range')
    expect(Number(input.min)).toBe(0)
    expect(Number(input.max)).toBe(100)
    expect(Number(input.step)).toBe(5)
  })

  it('样式表覆盖 Firefox 伪元素（::-moz-range-track/thumb），防回归', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    // Firefox 曾因此缺失整条轨道横线；moz 伪元素必须与 webkit 分开书写
    expect(css).toContain('::-moz-range-track')
    expect(css).toContain('::-moz-range-thumb')
    expect(css).toContain('::-webkit-slider-runnable-track')
    expect(css).not.toMatch(/::-webkit-slider-runnable-track\s*,\s*input::-moz-range-track/)
  })

  it('value 受控同步 + 外部变更增量更新', () => {
    const el = mount({ value: '40' })
    const input = range(el)
    expect(Number(input.value)).toBe(40)
    el.setAttribute('value', '60')
    expect(range(el)).toBe(input)
    expect(Number(input.value)).toBe(60)
  })

  it('input 事件派发 oas-input（实时），change 派发 oas-change', () => {
    const el = mount()
    let inputDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    const input = range(el)
    input.value = '50'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('change'))
    expect(inputDetail).toEqual({ value: 50 })
    expect(changeDetail).toEqual({ value: 50 })
  })

  it('disabled 透传', () => {
    const el = mount({ disabled: '' })
    expect(range(el).disabled).toBe(true)
  })

  describe('marks 刻度', () => {
    it('无 marks 时刻度区隐藏', () => {
      const el = mount()
      expect(marksEl(el).hidden).toBe(true)
      expect(markItems(el)).toHaveLength(0)
    })

    it('对象形式：渲染刻度点 + 标签，位置映射到百分比', () => {
      const el = mount({
        min: '0',
        max: '100',
        marks: JSON.stringify({ '0': '0°C', '26': '26°C', '60': '60°C' }),
      })
      expect(marksEl(el).hidden).toBe(false)
      const items = markItems(el)
      expect(items).toHaveLength(3)
      expect(items.map((n) => n.getAttribute('data-value'))).toEqual(['0', '26', '60'])
      expect(items.map((n) => n.style.left)).toEqual(['0%', '26%', '60%'])
      const labels = [...marksEl(el).querySelectorAll('.mark-label')].map((n) => n.textContent)
      expect(labels).toEqual(['0°C', '26°C', '60°C'])
    })

    it('数组形式：渲染刻度点，标签回退为数值文本', () => {
      const el = mount({
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 26, 60]),
      })
      const items = markItems(el)
      expect(items).toHaveLength(3)
      expect(items.map((n) => n.style.left)).toEqual(['0%', '26%', '60%'])
      const labels = [...marksEl(el).querySelectorAll('.mark-label')].map((n) => n.textContent)
      expect(labels).toEqual(['0', '26', '60'])
    })

    it('位置随 min/max 重新映射不错位', () => {
      const el = mount({
        min: '-50',
        max: '50',
        marks: JSON.stringify({ '-50': 'min', '0': '中', '50': 'max' }),
      })
      expect(markItems(el).map((n) => n.style.left)).toEqual(['0%', '50%', '100%'])
    })

    it('当前值经过的刻度高亮 data-passed，未经过不高亮', () => {
      const el = mount({
        value: '30',
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 26, 60]),
      })
      expect(markItems(el).map((n) => n.getAttribute('data-passed'))).toEqual([
        'true',
        'true',
        'false',
      ])
      // 值增大后增量刷新高亮
      el.setAttribute('value', '70')
      expect(markItems(el).map((n) => n.getAttribute('data-passed'))).toEqual([
        'true',
        'true',
        'true',
      ])
      expect(markItems(el)).toHaveLength(3)
    })

    it('input 事件实时刷新经过状态（不重建节点）', () => {
      const el = mount({
        value: '0',
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 50, 100]),
      })
      const input = range(el)
      const before = markItems(el)
      input.value = '80'
      input.dispatchEvent(new Event('input'))
      const after = markItems(el)
      expect(after.map((n) => n.getAttribute('data-passed'))).toEqual(['true', 'true', 'false'])
      // 节点未被重建（同一引用）
      expect(after).toEqual(before)
    })

    it('marks 非法 JSON 时回退为空（隐藏）', () => {
      const el = mount({ marks: '{oops' })
      expect(marksEl(el).hidden).toBe(true)
      expect(markItems(el)).toHaveLength(0)
    })
  })

  describe('show-input 带输入框联动', () => {
    it('默认输入区隐藏；设置 show-input 后显示并同步当前值', () => {
      const el = mount({ value: '40' })
      expect(inputsWrap(el).hidden).toBe(true)
      el.setAttribute('show-input', '')
      expect(inputsWrap(el).hidden).toBe(false)
      expect(byRole(el, 'num').hidden).toBe(false)
      expect(byRole(el, 'num').value).toBe('40')
    })

    it('拖滑块实时更新输入框并派发 oas-input（detail.value 为数字）', () => {
      const el = mount({ 'show-input': '', value: '20' })
      const input = range(el)
      let detail: unknown
      el.addEventListener('oas-input', (e: Event) => (detail = (e as CustomEvent).detail))
      input.value = '65'
      input.dispatchEvent(new Event('input'))
      expect(byRole(el, 'num').value).toBe('65')
      expect(detail).toEqual({ value: 65 })
    })

    it('输入数字：防抖 300ms 后驱动滑块并夹取范围，输入框归一化', () => {
      vi.useFakeTimers()
      try {
        const el = mount({ 'show-input': '', min: '0', max: '100', value: '20' })
        const num = byRole(el, 'num')
        num.value = '120' // 越界
        num.dispatchEvent(new Event('input'))
        // 防抖窗口内滑块不动
        expect(Number(range(el).value)).toBe(20)
        vi.advanceTimersByTime(400)
        // 夹取到 max
        expect(Number(range(el).value)).toBe(100)
        expect(num.value).toBe('100')
      } finally {
        vi.useRealTimers()
      }
    })

    it('输入数字：change（Enter/失焦）立即提交并派发 oas-change', () => {
      const el = mount({ 'show-input': '', value: '20' })
      const num = byRole(el, 'num')
      let changeDetail: unknown
      el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
      num.value = '70'
      num.dispatchEvent(new Event('change'))
      expect(Number(range(el).value)).toBe(70)
      expect(changeDetail).toEqual({ value: 70 })
    })

    it('输入非法值（空/非数字）时还原为当前值，不破坏滑块', () => {
      vi.useFakeTimers()
      try {
        const el = mount({ 'show-input': '', value: '40' })
        const num = byRole(el, 'num')
        num.value = 'abc'
        num.dispatchEvent(new Event('input'))
        vi.advanceTimersByTime(400)
        expect(Number(range(el).value)).toBe(40)
        expect(num.value).toBe('40')
      } finally {
        vi.useRealTimers()
      }
    })

    it('外部 setAttribute(value) 受控同步到滑块与输入框', () => {
      const el = mount({ 'show-input': '', value: '40' })
      const input = range(el)
      el.setAttribute('value', '85')
      expect(Number(input.value)).toBe(85)
      expect(byRole(el, 'num').value).toBe('85')
    })

    it('disabled 时输入框同步禁用', () => {
      const el = mount({ 'show-input': '', disabled: '', value: '30' })
      expect(byRole(el, 'num').disabled).toBe(true)
    })
  })

  describe('range 范围模式', () => {
    it('value 为 JSON 数组：渲染两个 range 输入并同步，单值输入隐藏', () => {
      const el = mount({ range: '', value: '[20, 80]' })
      expect(byRole(el, 'range').hidden).toBe(true)
      expect(byRole(el, 'range-min').hidden).toBe(false)
      expect(byRole(el, 'range-max').hidden).toBe(false)
      expect(Number(byRole(el, 'range-min').value)).toBe(20)
      expect(Number(byRole(el, 'range-max').value)).toBe(80)
    })

    it('value 为逗号分隔字符串同样可解析', () => {
      const el = mount({ range: '', value: '30,70' })
      expect(Number(byRole(el, 'range-min').value)).toBe(30)
      expect(Number(byRole(el, 'range-max').value)).toBe(70)
    })

    it('拖动任一滑块派发 oas-input/oas-change，detail.value 为数组', () => {
      const el = mount({ range: '', value: '[20, 80]' })
      const min = byRole(el, 'range-min')
      const max = byRole(el, 'range-max')
      let inputDetail: unknown
      let changeDetail: unknown
      el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
      el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
      min.value = '35'
      min.dispatchEvent(new Event('input'))
      expect(inputDetail).toEqual({ value: [35, 80] })
      min.dispatchEvent(new Event('change'))
      expect(changeDetail).toEqual({ value: [35, 80] })
      // max 侧
      max.value = '95'
      max.dispatchEvent(new Event('input'))
      expect(inputDetail).toEqual({ value: [35, 95] })
    })

    it('range + show-input：min/max 两个数字输入框联动', () => {
      vi.useFakeTimers()
      try {
        const el = mount({ range: '', 'show-input': '', value: '[20, 80]' })
        const numMin = byRole(el, 'num-min')
        const numMax = byRole(el, 'num-max')
        expect(byRole(el, 'num').hidden).toBe(true)
        expect(numMin.hidden).toBe(false)
        expect(numMax.hidden).toBe(false)
        expect(numMin.value).toBe('20')
        expect(numMax.value).toBe('80')
        // 输 min：防抖后驱动 min 滑块
        numMin.value = '35'
        numMin.dispatchEvent(new Event('input'))
        vi.advanceTimersByTime(400)
        expect(Number(byRole(el, 'range-min').value)).toBe(35)
        expect(Number(byRole(el, 'range-max').value)).toBe(80)
        // 输 max：防抖后驱动 max 滑块
        numMax.value = '90'
        numMax.dispatchEvent(new Event('input'))
        vi.advanceTimersByTime(400)
        expect(Number(byRole(el, 'range-max').value)).toBe(90)
      } finally {
        vi.useRealTimers()
      }
    })

    it('范围输入越界：min 超过 max 时推着 max 走（约束范围）', () => {
      vi.useFakeTimers()
      try {
        const el = mount({ range: '', 'show-input': '', min: '0', max: '100', value: '[20, 80]' })
        const numMin = byRole(el, 'num-min')
        numMin.value = '120'
        numMin.dispatchEvent(new Event('input'))
        vi.advanceTimersByTime(400)
        expect(Number(byRole(el, 'range-min').value)).toBe(100) // 夹取到 max
        expect(Number(byRole(el, 'range-max').value)).toBe(100) // max 被推着走
      } finally {
        vi.useRealTimers()
      }
    })

    it('外部受控 setAttribute(value) 同步两个滑块', () => {
      const el = mount({ range: '', value: '[20, 80]' })
      el.setAttribute('value', '[10, 60]')
      expect(Number(byRole(el, 'range-min').value)).toBe(10)
      expect(Number(byRole(el, 'range-max').value)).toBe(60)
    })

    it('range + marks：落在 [lo, hi] 区间内的刻度高亮', () => {
      const el = mount({
        range: '',
        value: '[20, 80]',
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 26, 60, 100]),
      })
      expect(markItems(el).map((n) => n.getAttribute('data-passed'))).toEqual([
        'false',
        'true',
        'true',
        'false',
      ])
    })
  })

  describe('reverse 反向', () => {
    it('range input 方向反转（dir=rtl，min 在右）', () => {
      const el = mount({ reverse: '', value: '30' })
      expect(range(el).dir).toBe('rtl')
      const normal = mount({ value: '30' })
      expect(range(normal).dir).toBe('ltr')
    })

    it('填充区从右端起（单值）', () => {
      const normal = mount({ value: '30', min: '0', max: '100' })
      expect(fillEl(normal).style.left).toBe('0%')
      expect(fillEl(normal).style.width).toBe('30%')
      const el = mount({ reverse: '', value: '30', min: '0', max: '100' })
      expect(fillEl(el).style.left).toBe('auto')
      expect(fillEl(el).style.right).toBe('0%')
      expect(fillEl(el).style.width).toBe('30%')
    })

    it('范围模式填充区镜像：左端为 hi 的位置', () => {
      const el = mount({ range: '', reverse: '', value: '[20, 80]', min: '0', max: '100' })
      expect(fillEl(el).style.left).toBe('20%') // 100 - pct(hi=80)
      expect(fillEl(el).style.width).toBe('60%')
    })

    it('自定义滑块 data-pct 镜像（值 30 → 70%）', () => {
      const el = mount({ reverse: '', 'show-tooltip': '', value: '30' })
      expect(thumbEl(el, 'value').getAttribute('data-pct')).toBe('70')
    })

    it('marks 位置镜像（0/50/100 → 100/50/0）', () => {
      const el = mount({
        reverse: '',
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 50, 100]),
      })
      expect(markItems(el).map((n) => n.style.left)).toEqual(['100%', '50%', '0%'])
    })
  })

  describe('custom-thumb 自定义滑块', () => {
    it('template[slot="custom-thumb"] 克隆进滑块，原生 thumb 隐藏', async () => {
      const el = mount()
      el.innerHTML = '<template slot="custom-thumb"><span class="t-glyph">★</span></template>'
      await new Promise((r) => setTimeout(r))
      const thumb = thumbEl(el, 'value')
      expect(thumb.hidden).toBe(false)
      expect(thumb.querySelector('.thumb-content')!.textContent).toContain('★')
      expect(el.hasAttribute('data-custom-thumb')).toBe(true)
    })

    it('普通 [slot="custom-thumb"] 元素同样克隆进滑块', async () => {
      const el = mount()
      el.innerHTML = '<span slot="custom-thumb">🔥</span>'
      await new Promise((r) => setTimeout(r))
      const thumb = thumbEl(el, 'value')
      expect(thumb.hidden).toBe(false)
      expect(thumb.textContent).toContain('🔥')
    })

    it('range 模式下模板克隆到 min/max 两个滑块', async () => {
      const el = mount({ range: '', 'show-tooltip': '', value: '[20, 80]' })
      el.innerHTML = '<template slot="custom-thumb"><b>●</b></template>'
      await new Promise((r) => setTimeout(r))
      expect(thumbEl(el, 'min').hidden).toBe(false)
      expect(thumbEl(el, 'max').hidden).toBe(false)
      expect(thumbEl(el, 'min').textContent).toContain('●')
      expect(thumbEl(el, 'max').textContent).toContain('●')
    })

    it('无自定义内容且无 tooltip 时，不使用自定义滑块（隐藏）', () => {
      const el = mount({ value: '30' })
      expect(thumbEl(el, 'value').hidden).toBe(true)
      expect(el.hasAttribute('data-custom-thumb')).toBe(false)
    })
  })

  describe('show-tooltip 值气泡', () => {
    it('气泡显示当前值并随受控 value 更新', () => {
      const el = mount({ 'show-tooltip': '', value: '40' })
      const tip = thumbEl(el, 'value').querySelector<HTMLElement>('.thumb-tip')!
      expect(tip.textContent).toBe('40')
      el.setAttribute('value', '75')
      expect(tip.textContent).toBe('75')
    })

    it('拖动时气泡随 value 实时更新（不依赖 show-tooltip）', () => {
      const el = mount({ value: '10' })
      const tip = thumbEl(el, 'value').querySelector<HTMLElement>('.thumb-tip')!
      expect(tip.hidden).toBe(true)
      const input = range(el)
      input.value = '55'
      input.dispatchEvent(new Event('input'))
      expect(tip.hidden).toBe(false)
      expect(tip.textContent).toBe('55')
      input.dispatchEvent(new Event('change'))
      expect(tip.hidden).toBe(true)
    })
  })

  describe('ARIA 与键盘可达', () => {
    it('range input 带 locale aria-label，role/aria-valuenow 由原生提供', () => {
      const el = mount({ value: '40' })
      const input = range(el)
      expect(input.getAttribute('aria-label')).toBe('滑块')
      expect(input.getAttribute('role')).toBe('slider')
      // 原生 range：aria-valuenow 自动反映 value
      expect(input.getAttribute('aria-valuenow')).toBe('40')
    })

    it('range 模式两个滑块分别带 min/max aria-label', () => {
      const el = mount({ range: '', value: '[20, 80]' })
      expect(byRole(el, 'range-min').getAttribute('aria-label')).toBe('最小值')
      expect(byRole(el, 'range-max').getAttribute('aria-label')).toBe('最大值')
    })
  })

  describe('受控状态写回（宿主 attr 可读）', () => {
    it('单值拖动后 value 属性写回宿主（input 与 change 均同步）', () => {
      const el = mount({ value: '20' })
      const input = range(el)
      input.value = '65'
      input.dispatchEvent(new Event('input'))
      expect(el.getAttribute('value')).toBe('65')
      input.value = '70'
      input.dispatchEvent(new Event('change'))
      expect(el.getAttribute('value')).toBe('70')
    })

    it('range 双滑块拖动后 value 属性写回为 lo,hi 逗号分隔', () => {
      const el = mount({ range: '', value: '10,80' })
      const lo = byRole(el, 'range-min')
      const hi = byRole(el, 'range-max')
      lo.value = '25'
      lo.dispatchEvent(new Event('input'))
      hi.value = '75'
      hi.dispatchEvent(new Event('change'))
      expect(el.getAttribute('value')).toBe('25,75')
    })

    it('数值输入框提交后 value 属性同步写回', () => {
      const el = mount({ 'show-input': '', value: '20' })
      const num = byRole(el, 'num')
      num.value = '70'
      num.dispatchEvent(new Event('change'))
      expect(el.getAttribute('value')).toBe('70')
    })

    it('写回不产生二次事件（setAttribute 循环防护）', () => {
      const el = mount({ value: '20' })
      const input = range(el)
      let inputEvents = 0
      let changeEvents = 0
      el.addEventListener('oas-input', () => inputEvents++)
      el.addEventListener('oas-change', () => changeEvents++)
      input.value = '50'
      input.dispatchEvent(new Event('change'))
      expect(inputEvents).toBe(0)
      expect(changeEvents).toBe(1)
    })
  })
})
