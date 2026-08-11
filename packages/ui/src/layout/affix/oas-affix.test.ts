import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASAffix } from './index.js'

function mount(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>固钉内容</div>`
  document.body.appendChild(el)
  return el
}

const flushRaf = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

/** 模拟 DSD 水合：构造器 attachShadow 后注入「SSR 快照 + 指纹 meta」（等价于 DSD template 解析结果） */
function dsdAffix(attrs: Record<string, string> = {}): OASAffix {
  const el = new OASAffix()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `<div>固钉内容</div>`
  el.shadowRoot!.innerHTML = `
    <meta data-oas-ssr="oas-affix" data-oas-ssr-v="1">
    <style>.probe { color: red; }</style>
    <div class="wrap" part="wrap"><slot></slot></div>
  `
  return el
}

describe('OASAffix', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染包裹内容', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
  })

  it('offset 属性生效', () => {
    const el = mount({ offset: '80' })
    expect(el.getAttribute('offset')).toBe('80')
  })

  it('纯 CSR：update 同步写吸顶态（行为不变）', () => {
    const el = mount({ offset: '80' })
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // happy-dom rect 全 0 → top=0 <= offset=80 → 吸顶态同步写入
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.top).toBe('80px')
  })

  it('DSD 水合：首帧不写吸顶态，rAF 后按真实布局校正', async () => {
    const el = dsdAffix()
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // 水合接管：指纹移除、wrap 引用保持（shadow 未重建）
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('.wrap')).toBe(wrap)
    // 首帧：吸顶态尚未写入（延迟到 rAF）
    expect(wrap.classList.contains('fixed')).toBe(false)
    // rAF 校正：happy-dom rect 全 0 → top=0 <= offset=0 → 吸顶写入
    await flushRaf()
    expect(wrap.classList.contains('fixed')).toBe(true)
    el.remove()
  })

  it('DSD 水合：rAF 前抑制所有布局写入（含重复 update），校正后恢复正常', async () => {
    const el = dsdAffix({ offset: '80' })
    document.body.appendChild(el)
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('.wrap')!
    // rAF 前再次触发 update（如属性变化）：仍被抑制
    el.setAttribute('offset', '120')
    expect(wrap.classList.contains('fixed')).toBe(false)
    expect(wrap.style.top).toBe('')
    await flushRaf()
    // rAF 后校正按最新 offset 写入
    expect(wrap.classList.contains('fixed')).toBe(true)
    expect(wrap.style.top).toBe('120px')
    // 校正后：属性变化同步写入（水合后恢复正常行为）
    el.setAttribute('offset', '40')
    expect(wrap.style.top).toBe('40px')
    el.remove()
  })
})
