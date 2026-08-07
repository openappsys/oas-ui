import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASList, OASListItem } from './index.js'

function mount(): OASList {
  const el = new OASList()
  el.innerHTML = `
    <oas-list-item title="条目一"><span>描述</span></oas-list-item>
    <oas-list-item title="条目二"></oas-list-item>
  `
  document.body.appendChild(el)
  return el
}

describe('OASList', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染列表项', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="list"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-list-item').length).toBe(2)
  })

  it('bordered 时加边框', () => {
    const el = mount()
    el.setAttribute('bordered', '')
    expect(el.shadowRoot!.querySelector('[part="list"]')!.getAttribute('data-bordered')).toBe('true')
  })
})
