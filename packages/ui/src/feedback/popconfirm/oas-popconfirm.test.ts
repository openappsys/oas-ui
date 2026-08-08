import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASPopconfirm } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPopconfirm {
  const el = new OASPopconfirm()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<button>删除</button>`
  document.body.appendChild(el)
  return el
}

describe('OASPopconfirm', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 时渲染气泡，含 title 与操作按钮', async () => {
    const el = mount({ open: '', title: '确认删除？' })
    await Promise.resolve()
    const pop = el.shadowRoot!.querySelector('[part="popover"]')!
    expect(pop).not.toBeNull()
    expect(pop.textContent).toContain('确认删除？')
    expect(el.shadowRoot!.querySelector('[part="ok"]')).not.toBeNull()
  })

  it('点击确定派发 oas-ok 并关闭', async () => {
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    let ok = 0
    el.addEventListener('oas-ok', () => ok++)
    ;(el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement).click()
    expect(ok).toBe(1)
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('点击取消派发 oas-cancel 并关闭', async () => {
    const el = mount({ open: '' })
    await Promise.resolve()
    let cancel = 0
    el.addEventListener('oas-cancel', () => cancel++)
    ;(el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement).click()
    expect(cancel).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('点击 slot 内触发元素切换 open', async () => {
    const el = mount({ title: '确认' })
    await Promise.resolve()
    ;(el.querySelector('button') as HTMLElement).click()
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'false',
    )
  })

  it('键盘/脚本激活 ok（合成 click）后 open 不被误恢复', async () => {
    // element.click() 派发 composed=false 的 click，跨 shadow boundary 时浏览器会把
    // e.target retarget 成 host 自身；组件必须用 composedPath()[0] 判断，避免 toggle 误翻转。
    const el = mount({ open: '', title: '确认' })
    await Promise.resolve()
    const okBtn = el.shadowRoot!.querySelector('[part="ok"]') as HTMLElement
    okBtn.click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="popover"]')!.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})
