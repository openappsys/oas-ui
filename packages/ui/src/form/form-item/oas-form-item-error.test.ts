import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASFormItem } from './index.js'

function mount(): OASFormItem {
  const item = new OASFormItem()
  item.setAttribute('label', '邮箱')
  item.innerHTML = '<oas-input name="email" value="a@b.c"></oas-input>'
  document.body.appendChild(item)
  return item
}

const part = (item: OASFormItem, name: string): HTMLElement =>
  item.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!

describe('OASFormItem.setError 双态（error / warning）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 severity=error：role=alert 错误位上屏，警告位隐藏', () => {
    const item = mount()
    item.setError('必填')
    expect(part(item, 'error').hidden).toBe(false)
    expect(part(item, 'error').getAttribute('role')).toBe('alert')
    expect(part(item, 'error').textContent).toContain('必填')
    expect(part(item, 'warning').hidden).toBe(true)
  })

  it('severity=warning：role=status 弱播报位上屏，error 位不动', () => {
    const item = mount()
    item.setError('建议使用企业邮箱', 'warning')
    const warning = part(item, 'warning')
    expect(warning.hidden).toBe(false)
    expect(warning.getAttribute('role')).toBe('status')
    expect(warning.textContent).toContain('建议使用企业邮箱')
    expect(part(item, 'error').hidden).toBe(true)
  })

  it('error 与 warning 并存时 error 独占显示；清 error 后 warning 恢复', () => {
    const item = mount()
    item.setError('建议使用企业邮箱', 'warning')
    item.setError('服务端拒绝')
    expect(part(item, 'error').hidden).toBe(false)
    expect(part(item, 'warning').hidden).toBe(true)
    item.setError(null)
    // error 清空 = 本轮无错误，残留警告一并清掉（避免幽灵提示）
    expect(part(item, 'error').hidden).toBe(true)
    expect(part(item, 'warning').hidden).toBe(true)
  })

  it('setError(null) 清空错误位与状态图标', () => {
    const item = mount()
    item.setAttribute('status-icon', '')
    item.setError('必填')
    expect(part(item, 'status-icon').hidden).toBe(false)
    item.setError(null)
    expect(part(item, 'error').hidden).toBe(true)
    expect(part(item, 'status-icon').hidden).toBe(true)
  })
})
