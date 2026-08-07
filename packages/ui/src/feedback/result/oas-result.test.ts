import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASResult } from './index.js'

describe('OASResult', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标题与描述，status 默认 success', () => {
    const el = new OASResult()
    el.setAttribute('title', '操作成功')
    el.setAttribute('description', '已完成')
    document.body.appendChild(el)
    const sr = el.shadowRoot!
    expect(sr.textContent).toContain('操作成功')
    expect(sr.textContent).toContain('已完成')
    expect(sr.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('success')
  })

  it('error 状态渲染错误图标区域', () => {
    const el = new OASResult()
    el.setAttribute('status', 'error')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="icon"]')!.getAttribute('data-status')).toBe('error')
  })

  it('extra 插槽存在', () => {
    const el = new OASResult()
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('slot[name="extra"]')).not.toBeNull()
  })
})
