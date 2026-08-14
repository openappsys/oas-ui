import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCompact } from './index.js'
import '../button/index.js'
import '../../form/input/index.js'
import '../../form/input-number/index.js'
import '../../form/select/index.js'

function mountCompact(
  attrs: Record<string, string> = {},
  controls: Array<[string, string?]> = [
    ['oas-button', '一'],
    ['oas-button', '二'],
  ],
): OASCompact {
  const el = new OASCompact()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const [tag, text] of controls) {
    const c = document.createElement(tag)
    if (text) c.textContent = text
    el.appendChild(c)
  }
  document.body.appendChild(el)
  return el
}

function radius(el: Element): string {
  return (el as HTMLElement).style.getPropertyValue('--oas-button-group-radius')
}

describe('OASCompact', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('相邻控件贴合：后项 margin-left -1px，首项无负 margin', () => {
    const el = mountCompact()
    const items = el.querySelectorAll<HTMLElement>(':scope > oas-button')
    expect(items[0]!.style.marginLeft).toBe('')
    expect(items[1]!.style.marginLeft).toBe('-1px')
  })

  it('首尾圆角、中间直角（--oas-button-group-radius 注入）', () => {
    const el = mountCompact({}, [
      ['oas-button', '一'],
      ['oas-button', '二'],
      ['oas-button', '三'],
    ])
    const items = el.querySelectorAll<HTMLElement>(':scope > oas-button')
    expect(radius(items[0]!)).toBe('var(--oas-radius-md) 0 0 var(--oas-radius-md)')
    expect(radius(items[1]!)).toBe('0')
    expect(radius(items[2]!)).toBe('0 var(--oas-radius-md) var(--oas-radius-md) 0')
  })

  it('单控件：整体圆角', () => {
    const el = mountCompact({}, [['oas-button', '一']])
    const item = el.querySelector<HTMLElement>(':scope > oas-button')!
    expect(radius(item)).toBe('var(--oas-radius-md)')
  })

  it('vertical：纵向贴合（margin-top -1px）与上/下圆角', () => {
    const el = mountCompact({ vertical: '' }, [
      ['oas-button', '一'],
      ['oas-button', '二'],
    ])
    const items = el.querySelectorAll<HTMLElement>(':scope > oas-button')
    expect(items[0]!.style.marginTop).toBe('')
    expect(items[1]!.style.marginTop).toBe('-1px')
    expect(radius(items[0]!)).toBe('var(--oas-radius-md) var(--oas-radius-md) 0 0')
    expect(radius(items[1]!)).toBe('0 0 var(--oas-radius-md) var(--oas-radius-md)')
  })

  it('disabled 透传全组禁用（四类控件均带 disabled）', () => {
    const el = mountCompact({ disabled: '' }, [
      ['oas-button', '一'],
      ['oas-input'],
      ['oas-input-number'],
      ['oas-select'],
    ])
    for (const c of el.querySelectorAll(':scope > *')) {
      expect(c.hasAttribute('disabled'), `${c.tagName} 应带 disabled`).toBe(true)
    }
  })

  it('空组渲染不报错', () => {
    const el = mountCompact({}, [])
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    expect(el.querySelectorAll(':scope > *').length).toBe(0)
  })

  it('子项增减后重新贴合（slotchange → update 重算 margin/圆角）', async () => {
    const el = mountCompact({}, [['oas-button', '一']])
    expect(el.querySelector<HTMLElement>(':scope > oas-button')!.style.marginLeft).toBe('')
    const second = document.createElement('oas-button')
    el.appendChild(second)
    await new Promise((r) => setTimeout(r, 0))
    const items = el.querySelectorAll<HTMLElement>(':scope > oas-button')
    expect(items[1]!.style.marginLeft).toBe('-1px')
    expect(radius(items[0]!)).toBe('var(--oas-radius-md) 0 0 var(--oas-radius-md)')
  })
})
