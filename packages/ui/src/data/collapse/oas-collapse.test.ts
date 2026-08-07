import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCollapse, OASCollapseItem } from './index.js'

function mount(attrs: Record<string, string> = {}): OASCollapse {
  const el = new OASCollapse()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
    <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认收起', () => {
    const el = mount()
    const items = el.querySelectorAll('oas-collapse-item')
    expect((items[0] as OASCollapseItem).getAttribute('open')).toBeNull()
  })

  it('active 受控展开并派发 oas-change', () => {
    const el = mount()
    el.setAttribute('active', 'a')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const items = el.querySelectorAll('oas-collapse-item')
    expect((items[0] as OASCollapseItem).getAttribute('open')).not.toBeNull()
    ;(el.querySelectorAll('oas-collapse-item')[0] as OASCollapseItem).shadowRoot!.querySelector('[part="head"]')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    )
    expect(detail).toEqual({ active: [] })
  })
})
