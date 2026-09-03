import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAffix } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<oas-button>固钉内容</oas-button>`
  document.body.appendChild(el)
  return el
}

describe('debug 动态重传', () => {
  beforeEach(() => { document.body.innerHTML = '' })
  afterEach(() => { document.body.innerHTML = '' })

  it('debug', () => {
    const a = document.createElement('div'); a.id = 'affix-a'; document.body.appendChild(a)
    const b = document.createElement('div'); b.id = 'affix-b'; document.body.appendChild(b)
    const el = mount({ 'append-to': '#affix-a', offset: '80' })
    expect(a.querySelector('.wrap')).not.toBeNull()
    el.setAttribute('append-to', '#affix-b')
    // 状态检查
    const state = {
      attr: el.getAttribute('append-to'),
      parentA: a.querySelector('.wrap') !== null,
      parentB: b.querySelector('.wrap') !== null,
      wrapAnywhere: !!el.shadowRoot!.querySelector('.wrap'),
    }
    console.log('STATE:', JSON.stringify(state))
    expect(state.parentB, 'wrap 应已重传到 b').toBe(true)
  })
})
