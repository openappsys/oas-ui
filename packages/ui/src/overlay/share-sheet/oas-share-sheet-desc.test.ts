import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASShareSheet } from './index.js'

function mount(attrs: Record<string, string> = {}): OASShareSheet {
  const el = new OASShareSheet()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASShareSheet, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

describe('oas-share-sheet 标题描述与渠道描述', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('description：标题下方渲染描述文案；缺省不渲染', () => {
    const el = mount({ channels: '[{"key":"copy","name":"复制链接"}]' })
    expect(part(el, 'description')!.hidden).toBe(true)
    el.setAttribute('description', '分享给好友，一起编辑')
    const desc = part(el, 'description')!
    expect(desc.hidden).toBe(false)
    expect(desc.textContent).toBe('分享给好友，一起编辑')
    el.removeAttribute('description')
    expect(part(el, 'description')!.hidden).toBe(true)
  })

  it('channels[].description：渠道名下方渲染描述小字；缺省不渲染', () => {
    const el = mount({
      channels: '[{"key":"wechat","name":"微信","description":"分享到聊天"},{"key":"copy","name":"复制链接"}]',
      open: '',
    })
    const channels = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="channel"]')]
    expect(channels).toHaveLength(2)
    const descs = channels.map((c) => c.querySelector<HTMLElement>('[part="channel-desc"]'))
    expect(descs[0]!.textContent).toBe('分享到聊天')
    expect(descs[0]!.hidden).toBe(false)
    expect(descs[1]!.hidden).toBe(true)
  })

  it('oas-select detail 仍携带完整 channel（含 description）', () => {
    const el = mount({ channels: '[{"key":"weibo","name":"微博","description":"发帖分享"}]', open: '' })
    let detail: { channel?: { description?: string } } | null = null
    el.addEventListener('oas-select', (e) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="channel"]')!.click()
    expect(detail!.channel!.description).toBe('发帖分享')
  })
})
