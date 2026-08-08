import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { registerLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import './index.js'
import '../../feedback/empty/index.js'
import '../../basic/button/index.js'
import '../../basic/tag/index.js'

/**
 * config-provider 注入机制测试：
 * - 包裹内组件正确读取注入的 locale/size
 * - 自身属性优先于注入值
 * - 就近优先（内层 config-provider 覆盖外层）
 * - theme 写入 data-theme 到子树
 */
describe('oas-config-provider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    registerLocale(en)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('包裹内组件读取注入的 locale（t() 就近翻译）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('locale', 'en')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)

    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('No data')
  })

  it('无 config-provider 时回退全局 locale', () => {
    const empty = document.createElement('oas-empty')
    document.body.appendChild(empty)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')
  })

  it('包裹内组件读取注入的 size', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.textContent = '大按钮'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('large')).toBe(true)
    expect(btnEl.classList.contains('medium')).toBe(false)
  })

  it('自身属性优先于注入值（size）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.setAttribute('size', 'small')
    btn.textContent = '自身小按钮'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('small')).toBe(true)
    expect(btnEl.classList.contains('large')).toBe(false)
  })

  it('自身属性未设置时才走注入值（size）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('size', 'large')
    const btn = document.createElement('oas-button')
    btn.textContent = '走注入值'
    cp.appendChild(btn)
    document.body.appendChild(cp)

    const btnEl = btn.shadowRoot!.querySelector('button')!
    expect(btnEl.classList.contains('large')).toBe(true)
  })

  it('就近优先：内层 config-provider 覆盖外层（locale）', () => {
    const outer = document.createElement('oas-config-provider')
    outer.setAttribute('locale', 'en')

    const inner = document.createElement('oas-config-provider')
    inner.setAttribute('locale', 'zh-CN')

    const emptyInner = document.createElement('oas-empty')
    inner.appendChild(emptyInner)

    const emptyOuter = document.createElement('oas-empty')
    outer.appendChild(emptyOuter)
    outer.appendChild(inner)

    document.body.appendChild(outer)

    // 内层包裹的组件用内层 locale（zh-CN）
    const descInner = emptyInner.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(descInner.textContent).toBe('暂无数据')
    // 外层包裹（未再嵌套）的组件用外层 locale（en）
    const descOuter = emptyOuter.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(descOuter.textContent).toBe('No data')
  })

  it('就近优先：内层 config-provider 覆盖外层（size）', () => {
    const outer = document.createElement('oas-config-provider')
    outer.setAttribute('size', 'large')

    const inner = document.createElement('oas-config-provider')
    inner.setAttribute('size', 'small')

    const btnInner = document.createElement('oas-button')
    btnInner.textContent = '内层按钮'
    inner.appendChild(btnInner)

    const btnOuter = document.createElement('oas-button')
    btnOuter.textContent = '外层按钮'
    outer.appendChild(btnOuter)
    outer.appendChild(inner)

    document.body.appendChild(outer)

    const innerEl = btnInner.shadowRoot!.querySelector('button')!
    expect(innerEl.classList.contains('small')).toBe(true)
    const outerEl = btnOuter.shadowRoot!.querySelector('button')!
    expect(outerEl.classList.contains('large')).toBe(true)
  })

  it('theme 属性写入 data-theme 到自身（子树继承主题 token）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('theme', 'dark')
    document.body.appendChild(cp)
    expect(cp.getAttribute('data-theme')).toBe('dark')

    cp.removeAttribute('theme')
    expect(cp.getAttribute('data-theme')).toBeNull()
  })

  it('locale 属性变化时包裹组件即时重刷文案', () => {
    const cp = document.createElement('oas-config-provider')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')

    cp.setAttribute('locale', 'en')
    expect(desc.textContent).toBe('No data')

    cp.removeAttribute('locale')
    expect(desc.textContent).toBe('暂无数据')
  })

  it('全局 setLocale 与 config-provider 注入并存时，注入值就近优先', async () => {
    const { setLocale } = await import('@oas-ui/i18n')
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('locale', 'zh-CN')
    const empty = document.createElement('oas-empty')
    cp.appendChild(empty)
    document.body.appendChild(cp)

    // 全局切到 en，但 config-provider 注入 zh-CN → 包裹组件仍显示中文
    setLocale(en)
    const desc = empty.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    expect(desc.textContent).toBe('暂无数据')

    setLocale('zh-CN')
  })
})
