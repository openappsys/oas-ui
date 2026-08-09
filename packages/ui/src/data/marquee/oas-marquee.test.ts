import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASMarquee } from './index.js'

function mount(attrs: Record<string, string> = {}, content = 'OAS-UI 滚动内容'): OASMarquee {
  const el = new OASMarquee()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = content
  document.body.appendChild(el)
  return el
}

function track(el: OASMarquee): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
}

function clone(el: OASMarquee): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="group"].clone')!
}

function styleText(el: OASMarquee): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASMarquee', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 speed 为 20s（animation-duration 变量写入 track）', () => {
    const el = mount()
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('20s')
  })

  it('speed 属性转成 animation-duration 变量', () => {
    const el = mount({ speed: '10' })
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('10s')
    el.setAttribute('speed', '3.5')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('3.5s')
  })

  it('speed 非法/非正数回退默认 20s', () => {
    const el = mount({ speed: 'abc' })
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('20s')
    el.setAttribute('speed', '0')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('20s')
    el.setAttribute('speed', '-5')
    expect(track(el).style.getPropertyValue('--oas-marquee-speed')).toBe('20s')
  })

  it('内容 slot 复制一份形成无缝循环（克隆 aria-hidden）', () => {
    const el = mount()
    const groups = el.shadowRoot!.querySelectorAll('[part="group"]')
    expect(groups.length).toBe(2)
    expect(clone(el).getAttribute('aria-hidden')).toBe('true')
    expect(clone(el).textContent).toBe('OAS-UI 滚动内容')
    // 原组经 slot 展示 light DOM 内容（happy-dom 下 slot 自身 textContent 为空，校验结构）
    expect(groups[0]!.querySelector('slot')).not.toBeNull()
    expect(el.textContent).toBe('OAS-UI 滚动内容')
  })

  it('slotchange 后克隆组与内容保持一致', () => {
    const el = mount()
    const span = document.createElement('span')
    span.textContent = '新增条目'
    el.appendChild(span)
    const slot = el.shadowRoot!.querySelector('slot')!
    slot.dispatchEvent(new Event('slotchange'))
    expect(clone(el).textContent).toContain('新增条目')
  })

  it('pause-on-hover 反射且样式含暂停规则', () => {
    const el = mount({ 'pause-on-hover': '' })
    expect(el.hasAttribute('pause-on-hover')).toBe(true)
    const css = styleText(el)
    expect(css).toContain('[pause-on-hover]')
    expect(css).toContain('animation-play-state: paused')
  })

  it('prefers-reduced-motion 时静态（样式含媒体查询关闭动画）', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('animation: none')
  })

  it('样式含无缝循环关键帧与隐藏溢出', () => {
    const el = mount()
    const css = styleText(el)
    expect(css).toContain('@keyframes')
    expect(css).toContain('translateX(-50%)')
    expect(css).toContain('overflow: hidden')
  })
})
