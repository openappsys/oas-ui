import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSpin } from './index.js'

describe('OASSpin', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染加载指示器，size 默认中号', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="indicator"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(
      'medium',
    )
  })

  it('size 五档：xs/small/medium/large/xl 映射到 data-size', () => {
    for (const s of ['xs', 'small', 'medium', 'large', 'xl'] as const) {
      const el = new OASSpin()
      el.setAttribute('size', s)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size')).toBe(s)
      el.remove()
    }
  })

  it('旧缩写 sm/md/lg 保留别名兼容（归一化为全拼）', () => {
    const map: Array<[string, string]> = [
      ['sm', 'small'],
      ['md', 'medium'],
      ['lg', 'large'],
    ]
    for (const [raw, normalized] of map) {
      const el = new OASSpin()
      el.setAttribute('size', raw)
      document.body.appendChild(el)
      expect(
        el.shadowRoot!.querySelector('[part="indicator"]')!.getAttribute('data-size'),
        `size=${raw}`,
      ).toBe(normalized)
      el.remove()
    }
  })

  it('role=status + aria-busy', () => {
    const el = new OASSpin()
    document.body.appendChild(el)
    const indicator = el.shadowRoot!.querySelector('[part="indicator"]')!
    expect(indicator.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-busy')).toBe('false')
    el.setAttribute('spinning', '')
    expect(el.getAttribute('aria-busy')).toBe('true')
  })

  it('包裹内容时嵌套显示', () => {
    const el = new OASSpin()
    el.setAttribute('spinning', '')
    el.innerHTML = `<p>内容</p>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="wrap"]')).not.toBeNull()
  })
})
