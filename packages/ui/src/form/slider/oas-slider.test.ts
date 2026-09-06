import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASSlider } from './index.js'
import '../form/index.js'

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
      // 视觉等价于「右端起」：值 30 的镜像位置是 70%，向右填充到 100%
      expect(fillEl(el).style.left).toBe('70%')
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

    it('range 双滑块拖动后 value 属性写回为 JSON 数组字符串（表单序列化友好）', () => {
      const el = mount({ range: '', value: '10,80' })
      const lo = byRole(el, 'range-min')
      const hi = byRole(el, 'range-max')
      lo.value = '25'
      lo.dispatchEvent(new Event('input'))
      hi.value = '75'
      hi.dispatchEvent(new Event('change'))
      expect(el.getAttribute('value')).toBe('[25,75]')
      expect(() => JSON.parse(el.getAttribute('value')!)).not.toThrow()
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

  describe('vertical 垂直模式', () => {
    it('vertical 属性镜像 data-vertical，input 获 orient 属性与 aria-orientation', () => {
      const el = mount({ vertical: '', value: '30' })
      expect(el.hasAttribute('data-vertical')).toBe(true)
      const input = range(el)
      expect(input.getAttribute('orient')).toBe('vertical')
      expect(input.getAttribute('aria-orientation')).toBe('vertical')
      const normal = mount({ value: '30' })
      expect(normal.hasAttribute('data-vertical')).toBe(false)
      expect(range(normal).hasAttribute('aria-orientation')).toBe(false)
    })

    it('填充区换轴：top/height 定位（而非 left/width）', () => {
      const el = mount({ vertical: '', value: '30', min: '0', max: '100' })
      const fill = fillEl(el)
      expect(fill.style.top).toBe('0%')
      expect(fill.style.height).toBe('30%')
      // 切回水平时垂直轴残留被清理
      el.removeAttribute('vertical')
      expect(fill.style.top).toBe('')
      expect(fill.style.height).toBe('')
      expect(fill.style.left).toBe('0%')
      expect(fill.style.width).toBe('30%')
    })

    it('marks 刻度换轴：top 定位', () => {
      const el = mount({
        vertical: '',
        min: '0',
        max: '100',
        marks: JSON.stringify([0, 26, 60]),
      })
      expect(markItems(el).map((n) => n.style.top)).toEqual(['0%', '26%', '60%'])
      expect(markItems(el).map((n) => n.style.left)).toEqual(['', '', ''])
    })

    it('custom-thumb 换轴定位（top 百分比）', () => {
      const el = mount({ vertical: '', 'show-tooltip': '', value: '40' })
      expect(thumbEl(el, 'value').style.top).toBe('40%')
    })

    it('range 模式 pointerdown 按 Y 轴抢拖动权', () => {
      const el = mount({ vertical: '', range: '', value: '[20, 80]' })
      const min = byRole(el, 'range-min')
      const max = byRole(el, 'range-max')
      const track = el.shadowRoot!.querySelector<HTMLElement>('.track-wrap')!
      // rect 无尺寸（happy-dom）：pct 回退 50 → 值 50 ≤ mid(50) → 抢 min
      track.dispatchEvent(new Event('pointerdown'))
      expect(min.style.zIndex).toBe('2')
      expect(max.style.zIndex).toBe('1')
    })

    it('vertical + reverse：dir=ltr（min 在上），aria-orientation 保留', () => {
      const el = mount({ vertical: '', reverse: '', value: '30' })
      expect(range(el).dir).toBe('ltr')
      expect(range(el).getAttribute('aria-orientation')).toBe('vertical')
    })
  })

  describe('tooltip 格式化（双通道）', () => {
    function tipOf(el: OASSlider, which: 'value' | 'min' | 'max'): HTMLElement {
      return thumbEl(el, which).querySelector<HTMLElement>('.thumb-tip')!
    }

    it('format 模板串：${value} 占位替换进气泡与 aria-valuetext', () => {
      const el = mount({ 'show-tooltip': '', format: '${value}%', value: '40' })
      expect(tipOf(el, 'value').textContent).toBe('40%')
      expect(range(el).getAttribute('aria-valuetext')).toBe('40%')
    })

    it('format 无占位符时原样显示', () => {
      const el = mount({ 'show-tooltip': '', format: 'USD', value: '40' })
      expect(tipOf(el, 'value').textContent).toBe('USD')
    })

    it('el.formatTooltip 函数 property：气泡与 aria-valuetext 同步', () => {
      const el = mount({ 'show-tooltip': '', value: '40' })
      el.formatTooltip = (v) => `$${v}`
      expect(tipOf(el, 'value').textContent).toBe('$40')
      expect(range(el).getAttribute('aria-valuetext')).toBe('$40')
    })

    it('formatTooltip 优先于 format 模板串；置 null 清除回落裸数字', () => {
      const el = mount({ 'show-tooltip': '', format: '${value}%', value: '40' })
      el.formatTooltip = (v) => `${v} 元`
      expect(tipOf(el, 'value').textContent).toBe('40 元')
      el.formatTooltip = null
      expect(tipOf(el, 'value').textContent).toBe('40%')
    })

    it('拖动中气泡与 aria-valuetext 随值实时更新', () => {
      const el = mount({ value: '10', format: '${value}px' })
      const input = range(el)
      input.value = '55'
      input.dispatchEvent(new Event('input'))
      expect(tipOf(el, 'value').textContent).toBe('55px')
      expect(input.getAttribute('aria-valuetext')).toBe('55px')
    })

    it('range 模式双滑块各自的 aria-valuetext', () => {
      const el = mount({ range: '', value: '[20, 80]', format: '${value}km' })
      expect(byRole(el, 'range-min').getAttribute('aria-valuetext')).toBe('20km')
      expect(byRole(el, 'range-max').getAttribute('aria-valuetext')).toBe('80km')
    })

    it('无格式化时不设 aria-valuetext（回落原生 valuenow）', () => {
      const el = mount({ value: '40' })
      expect(range(el).hasAttribute('aria-valuetext')).toBe(false)
    })
  })

  describe('tooltip 常显与方向', () => {
    it('tooltip-always：无需拖动/聚焦气泡常显', () => {
      const el = mount({ 'tooltip-always': '', value: '40' })
      const tip = thumbEl(el, 'value').querySelector<HTMLElement>('.thumb-tip')!
      expect(tip.hidden).toBe(false)
      expect(tip.textContent).toBe('40')
    })

    it('聚焦滑块时气泡显示（focus 语义，不依赖 show-tooltip）', () => {
      const el = mount({ value: '40' })
      const tip = thumbEl(el, 'value').querySelector<HTMLElement>('.thumb-tip')!
      expect(tip.hidden).toBe(true)
      range(el).dispatchEvent(new Event('focusin', { bubbles: true }))
      expect(tip.hidden).toBe(false)
      range(el).dispatchEvent(new Event('focusout', { bubbles: true }))
      expect(tip.hidden).toBe(true)
    })

    it('tooltip-position 四向镜像 data-tooltip-pos；非法值回退', () => {
      const el = mount({ 'tooltip-position': 'bottom', value: '40' })
      expect(el.getAttribute('data-tooltip-pos')).toBe('bottom')
      el.setAttribute('tooltip-position', 'left')
      expect(el.getAttribute('data-tooltip-pos')).toBe('left')
      el.setAttribute('tooltip-position', 'diagonal')
      expect(el.getAttribute('data-tooltip-pos')).toBe('top')
    })

    it('vertical 默认气泡方向 right', () => {
      const el = mount({ vertical: '', value: '40' })
      expect(el.getAttribute('data-tooltip-pos')).toBe('right')
      // 显式属性优先于 vertical 默认
      el.setAttribute('tooltip-position', 'top')
      expect(el.getAttribute('data-tooltip-pos')).toBe('top')
    })
  })

  describe('step="mark" 仅刻度值约束', () => {
    it('原生 input step 设为 any（吸附由组件接管）', () => {
      const el = mount({ step: 'mark', marks: JSON.stringify([0, 26, 60]), value: '26' })
      expect(range(el).step).toBe('any')
    })

    it('拖动到非刻度值吸附最近刻度（含 value 写回）', () => {
      const el = mount({ step: 'mark', marks: JSON.stringify([0, 26, 60]), min: '0', max: '100', value: '26' })
      const input = range(el)
      input.value = '30'
      input.dispatchEvent(new Event('input'))
      expect(Number(input.value)).toBe(26)
      expect(el.getAttribute('value')).toBe('26')
      input.value = '45'
      input.dispatchEvent(new Event('input'))
      expect(Number(input.value)).toBe(60)
    })

    it('受控 value 为非刻度值时显示层吸附', () => {
      const el = mount({ step: 'mark', marks: JSON.stringify([0, 26, 60]), min: '0', max: '100', value: '40' })
      expect(Number(range(el).value)).toBe(26)
    })

    it('range 双滑块各自吸附且保持 lo ≤ hi', () => {
      const el = mount({
        range: '',
        step: 'mark',
        marks: JSON.stringify([0, 26, 60, 100]),
        min: '0',
        max: '100',
        value: '[26, 60]',
      })
      const lo = byRole(el, 'range-min')
      lo.value = '40'
      lo.dispatchEvent(new Event('input'))
      expect(Number(lo.value)).toBe(26)
      const hi = byRole(el, 'range-max')
      hi.value = '90'
      hi.dispatchEvent(new Event('input'))
      expect(Number(hi.value)).toBe(100)
    })

    it('无 marks 时 step=mark 回退普通步进（step=1）', () => {
      const el = mount({ step: 'mark', value: '20' })
      expect(range(el).step).toBe('1')
    })

    it('键盘 Arrow 在刻度间跳档（非连续步进）', () => {
      const el = mount({ step: 'mark', marks: JSON.stringify([0, 26, 60, 100]), min: '0', max: '100', value: '26' })
      const input = range(el)
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      )
      expect(Number(input.value)).toBe(60)
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
      )
      expect(Number(input.value)).toBe(26)
    })

    it('键盘 Home/End 跳到首末刻度', () => {
      const el = mount({ step: 'mark', marks: JSON.stringify([0, 26, 60, 100]), min: '0', max: '100', value: '26' })
      const input = range(el)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }))
      expect(Number(input.value)).toBe(100)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }))
      expect(Number(input.value)).toBe(0)
    })
  })

  describe('show-stops 刻度点', () => {
    it('按 step 渲染刻度点（无标签节点）', () => {
      const el = mount({ 'show-stops': '', min: '0', max: '100', step: '20', value: '50' })
      expect(marksEl(el).hidden).toBe(false)
      const items = markItems(el)
      expect(items).toHaveLength(6)
      expect(items.map((n) => n.getAttribute('data-value'))).toEqual(['0', '20', '40', '60', '80', '100'])
      expect(marksEl(el).querySelectorAll('.mark-label')).toHaveLength(0)
    })

    it('stops 点经过高亮跟随当前值', () => {
      const el = mount({ 'show-stops': '', min: '0', max: '100', step: '25', value: '30' })
      expect(markItems(el).map((n) => n.getAttribute('data-passed'))).toEqual([
        'true',
        'true',
        'false',
        'false',
        'false',
      ])
    })

    it('marks 存在时刻度以 marks 为准（不叠加 stops）', () => {
      const el = mount({
        'show-stops': '',
        marks: JSON.stringify([0, 50, 100]),
        min: '0',
        max: '100',
        step: '10',
      })
      expect(markItems(el)).toHaveLength(3)
    })

    it('stops 超上限（100 个）不渲染', () => {
      const el = mount({ 'show-stops': '', min: '0', max: '100', step: '0.5' })
      expect(marksEl(el).hidden).toBe(true)
      expect(markItems(el)).toHaveLength(0)
    })

    it('小数步长浮点误差修正（0.1 步长的刻度值）', () => {
      const el = mount({ 'show-stops': '', min: '0', max: '0.3', step: '0.1' })
      expect(markItems(el).map((n) => n.getAttribute('data-value'))).toEqual(['0', '0.1', '0.2', '0.3'])
    })

    it('vertical 模式 stops 换 top 轴', () => {
      const el = mount({ vertical: '', 'show-stops': '', min: '0', max: '100', step: '50' })
      expect(markItems(el).map((n) => n.style.top)).toEqual(['0%', '50%', '100%'])
    })
  })

  describe('start-point 填充起点', () => {
    it('单值填充从起点向当前值延伸（温度计中点起）', () => {
      const el = mount({ 'start-point': '0', min: '-100', max: '100', value: '40' })
      const fill = fillEl(el)
      expect(fill.style.left).toBe('50%')
      expect(fill.style.width).toBe('20%')
    })

    it('值小于起点时向左延伸', () => {
      const el = mount({ 'start-point': '0', min: '-100', max: '100', value: '-40' })
      const fill = fillEl(el)
      expect(fill.style.left).toBe('30%')
      expect(fill.style.width).toBe('20%')
    })

    it('start-point 越界夹取到 [min, max]', () => {
      const el = mount({ 'start-point': '500', min: '0', max: '100', value: '40' })
      expect(fillEl(el).style.left).toBe('40%')
      expect(fillEl(el).style.width).toBe('60%')
    })

    it('marks passed 区间改为 [start, value]', () => {
      const el = mount({
        'start-point': '0',
        min: '-100',
        max: '100',
        value: '-40',
        marks: JSON.stringify([-100, -20, 0, 60]),
      })
      expect(markItems(el).map((n) => n.getAttribute('data-passed'))).toEqual([
        'false',
        'true',
        'true',
        'false',
      ])
    })

    it('range 模式忽略 start-point（区间填充不变）', () => {
      const el = mount({ range: '', 'start-point': '0', min: '-100', max: '100', value: '[20, 60]' })
      const fill = fillEl(el)
      expect(fill.style.left).toBe('60%')
      expect(fill.style.width).toBe('20%')
    })

    it('非法 start-point 视为未设置（从 min 填充）', () => {
      const el = mount({ 'start-point': 'abc', min: '0', max: '100', value: '40' })
      expect(fillEl(el).style.left).toBe('0%')
      expect(fillEl(el).style.width).toBe('40%')
    })
  })

  describe('size 尺寸档', () => {
    it('size 三档镜像 data-size（medium/large 词表归一）', () => {
      const el = mount({ size: 'sm' })
      expect(el.getAttribute('data-size')).toBe('sm')
      el.setAttribute('size', 'medium')
      expect(el.getAttribute('data-size')).toBe('md')
      el.setAttribute('size', 'large')
      expect(el.getAttribute('data-size')).toBe('lg')
      el.removeAttribute('size')
      expect(el.getAttribute('data-size')).toBe('md')
    })

    it('非法值回落 md', () => {
      const el = mount({ size: 'giant' })
      expect(el.getAttribute('data-size')).toBe('md')
    })

    it('CSS 尺寸变量按档切换（轨道/thumb 与 JS 换算常量成对）', () => {
      const el = mount()
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain("[data-size='sm']")
      expect(css).toContain("[data-size='lg']")
      expect(css).toContain('--oas-slider-thumb-size')
      expect(css).toContain('--oas-slider-track-size')
    })
  })

  describe('color / track-color 自定义色', () => {
    it('预设语义色映射到 token 变量', () => {
      const el = mount({ color: 'success' })
      expect(el.style.getPropertyValue('--oas-slider-color')).toBe('var(--oas-color-success)')
      el.setAttribute('color', 'danger')
      expect(el.style.getPropertyValue('--oas-slider-color')).toBe('var(--oas-color-danger)')
    })

    it('非预设值原样透传（任意 CSS 色）', () => {
      const el = mount({ color: '#ff5500', 'track-color': 'rgb(10 20 30)' })
      expect(el.style.getPropertyValue('--oas-slider-color')).toBe('#ff5500')
      expect(el.style.getPropertyValue('--oas-slider-track')).toBe('rgb(10 20 30)')
    })

    it('移除属性时清理变量（回落默认 token）', () => {
      const el = mount({ color: 'success', 'track-color': 'warning' })
      el.removeAttribute('color')
      el.removeAttribute('track-color')
      expect(el.style.getPropertyValue('--oas-slider-color')).toBe('')
      expect(el.style.getPropertyValue('--oas-slider-track')).toBe('')
    })
  })

  describe('readonly 只读', () => {
    it('可聚焦不灰显：input 不 disabled，aria-readonly 同步', () => {
      const el = mount({ readonly: '', value: '40' })
      const input = range(el)
      expect(input.disabled).toBe(false)
      expect(input.getAttribute('aria-readonly')).toBe('true')
      expect(el.hasAttribute('data-readonly')).toBe(true)
    })

    it('pointerdown 被拦截（不可拖动）', () => {
      const el = mount({ readonly: '', value: '40' })
      const e = new Event('pointerdown', { cancelable: true })
      el.shadowRoot!.querySelector('.track-wrap')!.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
    })

    it('键盘值键被拦截且值不变、不派发事件', () => {
      const el = mount({ readonly: '', value: '40' })
      const input = range(el)
      let events = 0
      el.addEventListener('oas-input', () => events++)
      el.addEventListener('oas-change', () => events++)
      const e = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
      input.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
      expect(Number(input.value)).toBe(40)
      expect(events).toBe(0)
    })

    it('show-input 联动输入框同步只读', () => {
      const el = mount({ readonly: '', 'show-input': '', value: '40' })
      expect(byRole(el, 'num').readOnly).toBe(true)
      expect(byRole(el, 'num').disabled).toBe(false)
    })

    it('disabled 优先于 readonly（同时设置时按禁用处理）', () => {
      const el = mount({ readonly: '', disabled: '', value: '40' })
      expect(range(el).disabled).toBe(true)
    })
  })

  describe('键盘大步进', () => {
    function pressKey(el: OASSlider, role: string, init: KeyboardEventInit): KeyboardEvent {
      const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      byRole(el, role).dispatchEvent(e)
      return e
    }

    it('PageUp 默认大步 = 10 × step，派发 oas-input + oas-change', () => {
      const el = mount({ value: '20', min: '0', max: '100', step: '1' })
      let inputDetail: unknown
      let changeDetail: unknown
      el.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
      el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
      const e = pressKey(el, 'range', { key: 'PageUp' })
      expect(e.defaultPrevented).toBe(true)
      expect(Number(range(el).value)).toBe(30)
      expect(inputDetail).toEqual({ value: 30 })
      expect(changeDetail).toEqual({ value: 30 })
      expect(el.getAttribute('value')).toBe('30')
    })

    it('PageDown 反向；Shift+ArrowRight 同为大步', () => {
      const el = mount({ value: '50', min: '0', max: '100' })
      pressKey(el, 'range', { key: 'PageDown' })
      expect(Number(range(el).value)).toBe(40)
      pressKey(el, 'range', { key: 'ArrowRight', shiftKey: true })
      expect(Number(range(el).value)).toBe(50)
    })

    it('large-step 显式覆盖大步量', () => {
      const el = mount({ value: '20', 'large-step': '25', min: '0', max: '100' })
      pressKey(el, 'range', { key: 'PageUp' })
      expect(Number(range(el).value)).toBe(45)
    })

    it('大步夹取边界不越界', () => {
      const el = mount({ value: '95', min: '0', max: '100' })
      pressKey(el, 'range', { key: 'PageUp' })
      expect(Number(range(el).value)).toBe(100)
      pressKey(el, 'range', { key: 'PageUp' })
      expect(Number(range(el).value)).toBe(100)
    })

    it('普通箭头/Home/End 不拦截（保留原生行为）', () => {
      const el = mount({ value: '50', min: '0', max: '100' })
      expect(pressKey(el, 'range', { key: 'ArrowRight' }).defaultPrevented).toBe(false)
      expect(pressKey(el, 'range', { key: 'Home' }).defaultPrevented).toBe(false)
    })

    it('reverse（rtl）下 ArrowRight 大步为减值', () => {
      const el = mount({ reverse: '', value: '50', min: '0', max: '100' })
      pressKey(el, 'range', { key: 'ArrowRight', shiftKey: true })
      expect(Number(range(el).value)).toBe(40)
    })

    it('vertical 下 ArrowUp 大步为增值', () => {
      const el = mount({ vertical: '', value: '50', min: '0', max: '100' })
      pressKey(el, 'range', { key: 'ArrowUp', shiftKey: true })
      expect(Number(range(el).value)).toBe(60)
    })

    it('range 模式大步作用于聚焦的滑块并写回数组', () => {
      const el = mount({ range: '', value: '[20, 80]', min: '0', max: '100' })
      pressKey(el, 'range-max', { key: 'PageUp' })
      expect(Number(byRole(el, 'range-max').value)).toBe(90)
      expect(Number(byRole(el, 'range-min').value)).toBe(20)
      expect(el.getAttribute('value')).toBe('[20,90]')
    })

    it('step=mark 时大步跳 3 档刻度', () => {
      const el = mount({
        step: 'mark',
        marks: JSON.stringify([0, 10, 20, 30, 40, 50]),
        min: '0',
        max: '100',
        value: '10',
      })
      pressKey(el, 'range', { key: 'PageUp' })
      expect(Number(range(el).value)).toBe(40)
    })
  })

  describe('表单序列化（range 双值）', () => {
    it('oas-form 内拖动提交后，字段值为合法 JSON 数组字符串', () => {
      const form = document.createElement('oas-form') as Element & { shadowRoot: ShadowRoot }
      form.innerHTML = '<oas-slider name="price" range min="0" max="100" value="[20, 80]"></oas-slider>'
      document.body.appendChild(form)
      const slider = form.querySelector('oas-slider')!
      const lo = slider.shadowRoot!.querySelector<HTMLInputElement>('[data-role="range-min"]')!
      lo.value = '35'
      lo.dispatchEvent(new Event('input'))
      lo.dispatchEvent(new Event('change'))
      let detail: unknown
      form.addEventListener('oas-submit', (e: Event) => (detail = (e as CustomEvent).detail))
      form.shadowRoot.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
      const values = (detail as { values: Record<string, string> }).values
      expect(values.price).toBe('[35,80]')
      expect(JSON.parse(values.price!)).toEqual([35, 80])
    })
  })
})
