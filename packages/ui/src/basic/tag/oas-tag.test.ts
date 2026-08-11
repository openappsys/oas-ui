import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASTag } from './index.js'

function mount(attrs: Record<string, string> = {}, slot = '标签'): OASTag {
  const el = new OASTag()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function root(el: OASTag): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.tag')!
}

describe('OASTag', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认渲染：type default、size medium、含 slot', async () => {
    const el = mount({}, '进行中')
    const r = root(el)
    await Promise.resolve()
    expect(r.classList.contains('default')).toBe(true)
    expect(r.classList.contains('medium')).toBe(true)
    expect(el.textContent).toContain('进行中')
    expect(r.querySelector('slot')).not.toBeNull()
  })

  it('type/size/round 属性映射到 class', () => {
    const el = mount({ type: 'success', size: 'small', round: '' })
    const r = root(el)
    expect(r.classList.contains('success')).toBe(true)
    expect(r.classList.contains('small')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })

  it('默认关闭按钮 hidden（不可交互/不入 a11y 树）；closable 时显示', () => {
    const el = mount({})
    const btn = root(el).querySelector('button')
    expect(btn).not.toBeNull()
    expect(btn!.hidden).toBe(true)
    el.setAttribute('closable', '')
    expect(root(el).querySelector('button')!.hidden).toBe(false)
    expect(root(el).querySelector('button')!.getAttribute('aria-label')).toBe('关闭')
  })

  it('点关闭派发 oas-close（bubbles + composed + cancelable），组件自动移除', () => {
    const el = mount({ closable: '' })
    let detail: unknown
    let fired = 0
    el.addEventListener('oas-close', (e: Event) => {
      fired++
      detail = e
    })
    root(el).querySelector('button')!.click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
    expect((detail as CustomEvent).cancelable).toBe(true)
    expect(el.isConnected).toBe(false)
  })

  it('宿主 preventDefault 后组件不移除', () => {
    const el = mount({ closable: '' })
    el.addEventListener('oas-close', (e: Event) => e.preventDefault())
    root(el).querySelector('button')!.click()
    expect(el.isConnected).toBe(true)
  })

  it('属性变化增量更新：切换 type 不重建内部节点引用', () => {
    const el = mount({ type: 'primary' })
    const r = root(el)
    el.setAttribute('type', 'danger')
    el.setAttribute('round', '')
    expect(root(el)).toBe(r)
    expect(r.classList.contains('danger')).toBe(true)
    expect(r.classList.contains('round')).toBe(true)
  })

  it('locale：关闭按钮 aria-label 随 setLocale 切换', () => {
    const el = mount({ closable: '' })
    const btn = root(el).querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('关闭')

    setLocale(en)
    expect(btn.getAttribute('aria-label')).toBe('Close')

    setLocale('zh-CN')
    expect(btn.getAttribute('aria-label')).toBe('关闭')
  })

  it('chip 布尔 → class 含 chip', () => {
    const el = mount({ chip: '' })
    expect(root(el).classList.contains('chip')).toBe(true)
  })

  it('clickable → 宿主 role=button + tabindex=0，可聚焦可点', () => {
    const el = mount({ clickable: '' })
    expect(root(el).classList.contains('clickable')).toBe(true)
    expect(el.getAttribute('role')).toBe('button')
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  it('点击整签派发 oas-click（bubbles + composed）', () => {
    const el = mount({ clickable: '' })
    let fired = 0
    let detail: unknown
    el.addEventListener('oas-click', (e: Event) => {
      fired++
      detail = e
    })
    el.click()
    expect(fired).toBe(1)
    expect((detail as CustomEvent).bubbles).toBe(true)
    expect((detail as CustomEvent).composed).toBe(true)
  })

  it('clickable + Enter/Space 键盘触发 oas-click', () => {
    const el = mount({ clickable: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(1)
    fired = 0
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(fired).toBe(1)
  })

  it('clickable + closable：点关闭只触发 oas-close，不触发 oas-click', () => {
    const el = mount({ clickable: '', closable: '' })
    let closeFired = 0
    let clickFired = 0
    el.addEventListener('oas-close', () => closeFired++)
    el.addEventListener('oas-click', () => clickFired++)
    root(el).querySelector('button')!.click()
    expect(closeFired).toBe(1)
    expect(clickFired).toBe(0)
  })

  it('disabled：不派发 oas-click、aria-disabled、去 tabindex、视觉禁用 class', () => {
    const el = mount({ clickable: '', disabled: '' })
    let fired = 0
    el.addEventListener('oas-click', () => fired++)
    el.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(root(el).classList.contains('disabled')).toBe(true)
  })

  it('disabled：点关闭不派发 oas-close、组件不移除、按钮 disabled', () => {
    const el = mount({ closable: '', disabled: '' })
    const btn = root(el).querySelector('button')!
    expect(btn.disabled).toBe(true)
    let fired = 0
    el.addEventListener('oas-close', () => fired++)
    btn.click()
    expect(fired).toBe(0)
    expect(el.isConnected).toBe(true)
  })

  it('chip + disabled 边界：不可点不可关', () => {
    const el = mount({ chip: '', clickable: '', closable: '', disabled: '' })
    let clickFired = 0
    let closeFired = 0
    el.addEventListener('oas-click', () => clickFired++)
    el.addEventListener('oas-close', () => closeFired++)
    el.click()
    root(el).querySelector('button')!.click()
    expect(clickFired).toBe(0)
    expect(closeFired).toBe(0)
    expect(el.isConnected).toBe(true)
  })

  describe('真水合（hydrate 接管 SSR 快照）', () => {
    /** 用组件自身 template() 产快照内容（保证与客户端渲染结构严格一致），前置指纹 meta */
    function snapshotWith(el: OASTag, fingerprintTag: string): string {
      const template = (el as unknown as { template(): string }).template()
      return `<meta data-oas-ssr="${fingerprintTag}" data-oas-ssr-v="1">${template}`
    }

    it('指纹匹配 + 结构完整：跳过重建、DOM 引用保持、事件已绑定（含 host 级 click/keydown）、指纹移除', () => {
      const el = new OASTag()
      el.setAttribute('clickable', '')
      el.setAttribute('closable', '')
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-tag')
      const tagEl = el.shadowRoot!.querySelector('.tag')!
      const closeBtn = el.shadowRoot!.querySelector('button')!
      el.textContent = '标签'
      document.body.appendChild(el)

      // 真水合：.tag 与关闭按钮是同一对象（未重建）
      expect(el.shadowRoot!.querySelector('.tag')).toBe(tagEl)
      expect(el.shadowRoot!.querySelector('button')).toBe(closeBtn)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

      // host 级 click 已绑定：整签点击派发 oas-click
      let clickFired = 0
      el.addEventListener('oas-click', () => clickFired++)
      el.click()
      expect(clickFired).toBe(1)

      // 关闭按钮事件已绑定：派发 oas-close 并自动移除
      let closeFired = 0
      el.addEventListener('oas-close', () => closeFired++)
      closeBtn.click()
      expect(closeFired).toBe(1)
      expect(el.isConnected).toBe(false)
    })

    it('指纹 tag 不匹配：回退 render() 重建', () => {
      const el = new OASTag()
      el.shadowRoot!.innerHTML = snapshotWith(el, 'oas-button')
      const pre = el.shadowRoot!.querySelector('.tag')
      document.body.appendChild(el)

      expect(el.shadowRoot!.querySelector('.tag')).not.toBe(pre)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      el.remove()
    })
  })
})
