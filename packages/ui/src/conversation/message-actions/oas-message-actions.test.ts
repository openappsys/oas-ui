import { describe, expect, it, beforeEach } from 'vitest'
import { OASMessageActions } from './index.js'

function mount(attrs: Record<string, string> = {}): OASMessageActions {
  const el = new OASMessageActions()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

describe('oas-message-actions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('按 actions JSON 渲染按钮并派发 oas-action', () => {
    const el = mount({
      'message-id': 'm1',
      actions: JSON.stringify([
        { key: 'copy', label: '复制' },
        { key: 'retry', label: '重试', title: '重新请求' },
      ]),
    })
    const buttons = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action')]
    expect(buttons.map((button) => button.textContent)).toEqual(['复制', '重试'])
    expect(buttons[1]!.title).toBe('重新请求')
    const seen: Array<{ key: string; messageId?: string }> = []
    el.addEventListener('oas-action', (event) => seen.push((event as CustomEvent).detail))
    buttons[0]!.click()
    expect(seen).toEqual([{ key: 'copy', messageId: 'm1' }])
  })

  it('disabled / active / danger 状态生效', () => {
    const el = mount({
      actions: JSON.stringify([
        { key: 'copy', label: '复制', disabled: true },
        { key: 'like', label: '赞', active: true },
        { key: 'delete', label: '删除', tone: 'danger' },
      ]),
    })
    const [copy, like, remove] = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action')]
    expect(copy!.disabled).toBe(true)
    expect(like!.getAttribute('aria-pressed')).toBe('true')
    expect(remove!.dataset.tone).toBe('danger')
    el.setAttribute('disabled', '')
    expect(remove!.disabled).toBe(true)
  })

  it('label 按文本渲染，不注入 HTML', () => {
    const el = mount({ actions: JSON.stringify([{ key: 'x', label: '<img src=x onerror=alert(1)>' }]) })
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.action')!
    expect(button.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(button.querySelector('img')).toBeNull()
  })
})
