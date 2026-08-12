import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
})
