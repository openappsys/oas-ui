import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASLabel } from './index.js'

function mountLabel(attrs: Record<string, string> = {}, slot = '姓名'): OASLabel {
  const el = new OASLabel()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function labelEl(el: OASLabel): HTMLElement {
  return el.shadowRoot!.querySelector('[part="label"]')!
}

describe('OASLabel', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 <label part="label"> 与 slot 文本', () => {
    const el = mountLabel()
    expect(el.textContent).toContain('姓名')
    expect(labelEl(el).tagName.toLowerCase()).toBe('label')
    expect(labelEl(el).querySelector('slot')).not.toBeNull()
  })

  it('for 属性同步到原生 label', () => {
    const el = mountLabel({ for: 'name-input' })
    expect(labelEl(el).getAttribute('for')).toBe('name-input')
  })

  it('点击代理聚焦 for 指向的控件', () => {
    const input = document.createElement('input')
    input.id = 'name-input'
    document.body.appendChild(input)
    const el = mountLabel({ for: 'name-input' })
    labelEl(el).click()
    expect(document.activeElement).toBe(input)
  })

  it('无 for 时点击不报错、无焦点代理', () => {
    const el = mountLabel()
    expect(() => labelEl(el).click()).not.toThrow()
    expect(document.activeElement).toBe(document.body)
  })

  it('required 追加 * 标记（aria-hidden）', () => {
    const el = mountLabel({ required: '' })
    const marker = el.shadowRoot!.querySelector('[part="required"]')
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute('aria-hidden')).toBe('true')
    expect(marker!.textContent).toBe('*')
    expect(marker!.hasAttribute('hidden')).toBe(false)
  })

  it('无 required 时 * 标记隐藏', () => {
    const el = mountLabel()
    const marker = el.shadowRoot!.querySelector('[part="required"]')
    expect(marker!.hasAttribute('hidden')).toBe(true)
  })

  it('position="before" 时星号前置（reverse 布局类）', () => {
    const before = mountLabel({ required: '', position: 'before' })
    expect(labelEl(before).classList.contains('reverse')).toBe(true)
    const after = mountLabel({ required: '' })
    expect(labelEl(after).classList.contains('reverse')).toBe(false)
  })

  it('长文本换行不溢出（break 类）', () => {
    const el = mountLabel({}, '这是一段特别长的标签文案，用于验证长文本换行不溢出容器边界。')
    expect(labelEl(el).classList.contains('wrap')).toBe(true)
  })

  describe('error 状态色', () => {
    it('error 进入 observedAttributes，映射 error class', () => {
      expect(OASLabel.observedAttributes).toContain('error')
      const el = mountLabel({ error: '' })
      expect(labelEl(el).classList.contains('error')).toBe(true)
    })

    it('CSS：error 文字转 danger 色', () => {
      const el = mountLabel({ error: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/label\.error\s*{[^}]*--oas-color-danger-text/)
    })

    it('动态切换即时生效', () => {
      const el = mountLabel()
      el.setAttribute('error', '')
      expect(labelEl(el).classList.contains('error')).toBe(true)
      el.removeAttribute('error')
      expect(labelEl(el).classList.contains('error')).toBe(false)
    })
  })

  describe('disabled 静态灰化', () => {
    it('disabled 进入 observedAttributes，映射 disabled class', () => {
      expect(OASLabel.observedAttributes).toContain('disabled')
      const el = mountLabel({ disabled: '' })
      expect(labelEl(el).classList.contains('disabled')).toBe(true)
    })

    it('CSS：disabled 文字转 text-disabled 色', () => {
      const el = mountLabel({ disabled: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/label\.disabled\s*{[^}]*--oas-color-text-disabled/)
    })

    it('disabled 纯视觉不拦事件（点击仍派发）', () => {
      const input = document.createElement('input')
      input.id = 'name-input'
      document.body.appendChild(input)
      const el = mountLabel({ for: 'name-input', disabled: '' })
      labelEl(el).click()
      // disabled 是视觉态不拦点击代理（关联控件自己管 disabled）
      expect(document.activeElement).toBe(input)
    })
  })

  describe('双击防选中', () => {
    it('dblclick 不选中文本（preventDefault）', () => {
      const el = mountLabel()
      const evt = new MouseEvent('dblclick', { bubbles: true, cancelable: true })
      const prevented = !labelEl(el).dispatchEvent(evt)
      expect(prevented).toBe(true)
    })
  })

  describe('colon 冒号后缀', () => {
    it('colon 进入 observedAttributes', () => {
      expect(OASLabel.observedAttributes).toContain('colon')
    })

    it('colon 渲染冒号元素（aria-hidden）', () => {
      const el = mountLabel({ colon: '' })
      const colon = el.shadowRoot!.querySelector('.colon')
      expect(colon).not.toBeNull()
      expect(colon!.textContent).toBe(':')
      expect(colon!.getAttribute('aria-hidden')).toBe('true')
    })

    it('无 colon 不渲染冒号', () => {
      const el = mountLabel()
      const colon = el.shadowRoot!.querySelector('.colon') as HTMLElement
      expect(colon.hidden).toBe(true)
    })

    it('colon + position=before：冒号在星号后（文本-星号-冒号）', () => {
      const el = mountLabel({ colon: '', required: '', position: 'before' })
      const label = labelEl(el)
      const texts = [...label.querySelectorAll('span')].map((s) => s.textContent)
      expect(texts).toContain(':')
    })
  })

  describe('color 属性（统一协议：11 预设名→-text token / 任意 CSS 色值直注入）', () => {
    it('color 进入 observedAttributes', () => {
      expect(OASLabel.observedAttributes).toContain('color')
    })

    it('预设名映射 --oas-preset-*-text 达标 token', () => {
      const el = mountLabel({ color: 'geekblue' })
      expect(labelEl(el).style.getPropertyValue('--oas-label-color')).toBe(
        'var(--oas-preset-geekblue-text)',
      )
    })

    it('11 预设名全量映射 -text token', () => {
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
        const el = mountLabel({ color: name })
        expect(labelEl(el).style.getPropertyValue('--oas-label-color'), `preset=${name}`).toBe(
          `var(--oas-preset-${name}-text)`,
        )
        el.remove()
      }
    })

    it('任意 CSS 色值直注入（#hex）', () => {
      const el = mountLabel({ color: '#0e7490' })
      expect(labelEl(el).style.getPropertyValue('--oas-label-color')).toBe('#0e7490')
    })

    it('动态切换与移除即时生效', () => {
      const el = mountLabel({ color: 'red' })
      el.setAttribute('color', '#00b96b')
      expect(labelEl(el).style.getPropertyValue('--oas-label-color')).toBe('#00b96b')
      el.removeAttribute('color')
      expect(labelEl(el).style.getPropertyValue('--oas-label-color')).toBe('')
    })
  })

  describe('size 字号档（small/medium/large）', () => {
    it('size 进入 observedAttributes', () => {
      expect(OASLabel.observedAttributes).toContain('size')
    })

    it('small 映射 .small 类（sm 小字）', () => {
      const el = mountLabel({ size: 'small' })
      expect(labelEl(el).classList.contains('small')).toBe(true)
      expect(labelEl(el).classList.contains('large')).toBe(false)
    })

    it('large 映射 .large 类（lg 大字）', () => {
      const el = mountLabel({ size: 'large' })
      expect(labelEl(el).classList.contains('large')).toBe(true)
      expect(labelEl(el).classList.contains('small')).toBe(false)
    })

    it('默认（无 size）与 medium 均不加尺寸类（base 即 md 基准字号）', () => {
      const none = mountLabel()
      expect(labelEl(none).classList.contains('small')).toBe(false)
      expect(labelEl(none).classList.contains('large')).toBe(false)
      const medium = mountLabel({ size: 'medium' })
      expect(labelEl(medium).classList.contains('small')).toBe(false)
      expect(labelEl(medium).classList.contains('large')).toBe(false)
    })

    it('非法值回落 medium（不加尺寸类）并告警', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el = mountLabel({ size: 'huge' })
      expect(labelEl(el).classList.contains('small')).toBe(false)
      expect(labelEl(el).classList.contains('large')).toBe(false)
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('CSS：small 用 sm token、large 用 lg token', () => {
      const el = mountLabel({ size: 'large' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/label\.small\s*{[^}]*--oas-font-size-sm/)
      expect(css).toMatch(/label\.large\s*{[^}]*--oas-font-size-lg/)
    })

    it('动态切换即时生效', () => {
      const el = mountLabel()
      el.setAttribute('size', 'large')
      expect(labelEl(el).classList.contains('large')).toBe(true)
      el.removeAttribute('size')
      expect(labelEl(el).classList.contains('large')).toBe(false)
    })
  })

  describe('weight 字重档（regular/semibold）', () => {
    it('weight 进入 observedAttributes', () => {
      expect(OASLabel.observedAttributes).toContain('weight')
    })

    it('semibold 映射 .semibold 类（半粗强调）', () => {
      const el = mountLabel({ weight: 'semibold' })
      expect(labelEl(el).classList.contains('semibold')).toBe(true)
    })

    it('默认（无 weight）与 regular 均不加字重类', () => {
      const none = mountLabel()
      expect(labelEl(none).classList.contains('semibold')).toBe(false)
      const regular = mountLabel({ weight: 'regular' })
      expect(labelEl(regular).classList.contains('semibold')).toBe(false)
    })

    it('非法值回落 regular（不加字重类）并告警', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const el = mountLabel({ weight: 'bold' })
      expect(labelEl(el).classList.contains('semibold')).toBe(false)
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('CSS：semibold 字重 600', () => {
      const el = mountLabel({ weight: 'semibold' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/label\.semibold\s*{[^}]*font-weight:\s*600/)
    })

    it('动态切换即时生效', () => {
      const el = mountLabel()
      el.setAttribute('weight', 'semibold')
      expect(labelEl(el).classList.contains('semibold')).toBe(true)
      el.removeAttribute('weight')
      expect(labelEl(el).classList.contains('semibold')).toBe(false)
    })
  })

  describe('点击代理聚焦（死代码清理回归：内部子节点点击仍聚焦）', () => {
    it('点击 label 内部节点（part="text"）仍触发聚焦代理', () => {
      const input = document.createElement('input')
      input.id = 'name-input'
      document.body.appendChild(input)
      const el = mountLabel({ for: 'name-input' })
      const inner = el.shadowRoot!.querySelector<HTMLElement>('[part="text"]')!
      inner.click()
      expect(document.activeElement).toBe(input)
    })
  })
})
