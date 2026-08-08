import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTree } from './index.js'

const DATA = JSON.stringify([
  { key: 'a', label: '节点 A', children: [{ key: 'a-1', label: '子节点 1' }] },
  { key: 'b', label: '节点 B' },
])

function mount(attrs: Record<string, string> = {}): OASTree {
  const el = new OASTree()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.data) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

function rows(el: OASTree): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

describe('OASTree', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('渲染根节点，子节点默认收起', () => {
    const el = mount()
    expect(rows(el).length).toBe(2)
    expect(el.shadowRoot!.textContent).toContain('节点 A')
    expect(el.shadowRoot!.textContent).not.toContain('子节点 1')
  })

  it('点击展开按钮显示子节点', () => {
    const el = mount()
    ;(el.shadowRoot!.querySelector('[part="toggle"]') as HTMLElement).click()
    expect(el.shadowRoot!.textContent).toContain('子节点 1')
  })

  it('点击选中节点派发 oas-select', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-select', (e: Event) => (detail = (e as CustomEvent).detail))
    rows(el)[0]!.click()
    expect(detail).toEqual({ key: 'a', selected: true })
  })

  it('locale：展开/选择 aria-label 随 setLocale 切换', () => {
    const el = mount({ checkable: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe('展开/收起')
    expect(
      el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.getAttribute('aria-label'),
    ).toBe('选择 节点 A')

    setLocale(en)
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe(
      'Expand/Collapse',
    )
    expect(
      el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!.getAttribute('aria-label'),
    ).toBe('Select 节点 A')

    setLocale('zh-CN')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toggle"]')!.getAttribute('aria-label')).toBe('展开/收起')
  })
})
