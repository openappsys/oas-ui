import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASStatistic } from './index.js'

function mount(attrs: Record<string, string> = {}): OASStatistic {
  const el = new OASStatistic()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function valueEl(el: OASStatistic): HTMLElement {
  return el.shadowRoot!.querySelector('[part="value"]')!
}

function text(el: OASStatistic): string {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="statistic"]')!.textContent!
}

describe('OASStatistic', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('Intl.NumberFormat 千分位分组（默认开启）', () => {
    const el = mount({ value: '1234567.8', precision: '1' })
    expect(valueEl(el).textContent).toBe('1,234,567.8')
  })

  it('precision 控制小数位并四舍五入', () => {
    const el = mount({ value: '12345.678', precision: '2' })
    expect(valueEl(el).textContent).toBe('12,345.68')
    el.setAttribute('precision', '0')
    expect(valueEl(el).textContent).toBe('12,346')
  })

  it('group-separator=false 关闭千分位', () => {
    const el = mount({ value: '1234567', 'group-separator': 'false' })
    expect(valueEl(el).textContent).toBe('1234567')
  })

  it('prefix / suffix 拼接在数值两侧', () => {
    const el = mount({ value: '12', prefix: '¥', suffix: '元' })
    expect(text(el)).toContain('¥')
    expect(text(el)).toContain('元')
    expect(text(el).indexOf('¥')).toBeLessThan(text(el).indexOf('12'))
    expect(text(el).indexOf('12')).toBeLessThan(text(el).indexOf('元'))
  })

  it('loading 渲染骨架占位，非 loading 渲染数值', () => {
    const el = mount({ value: '123', loading: '' })
    expect(el.shadowRoot!.querySelector('oas-skeleton')).not.toBeNull()
    el.removeAttribute('loading')
    expect(el.shadowRoot!.querySelector('oas-skeleton')).toBeNull()
    expect(valueEl(el).textContent).toBe('123')
  })

  it('config-provider 注入 locale 生效（de-DE 分隔符）', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('locale', 'de-DE')
    const el = new OASStatistic()
    el.setAttribute('value', '12345.6')
    el.setAttribute('precision', '2')
    provider.appendChild(el)
    document.body.appendChild(provider)
    expect(valueEl(el).textContent).toBe('12.345,60')
  })

  it('setLocale(en) 后仍按 locale 格式化', () => {
    const el = mount({ value: '1234567.8', precision: '1' })
    expect(valueEl(el).textContent).toBe('1,234,567.8')
    setLocale(en)
    expect(valueEl(el).textContent).toBe('1,234,567.8')
    setLocale('zh-CN')
    expect(valueEl(el).textContent).toBe('1,234,567.8')
  })

  it('受控：外部改 value / precision 即时重渲染', () => {
    const el = mount({ value: '100', precision: '1' })
    expect(valueEl(el).textContent).toBe('100.0')
    el.setAttribute('value', '200.55')
    expect(valueEl(el).textContent).toBe('200.6')
  })
})
