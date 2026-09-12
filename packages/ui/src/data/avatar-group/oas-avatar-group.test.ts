import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASAvatarGroup } from './index.js'

function mount(count = 5): OASAvatarGroup {
  const el = new OASAvatarGroup()
  for (let i = 0; i < count; i++) {
    const a = document.createElement('oas-avatar')
    a.textContent = `成员${i}`
    el.appendChild(a)
  }
  document.body.appendChild(el)
  return el
}

describe('OASAvatarGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染分组容器并保留全部头像', () => {
    const el = mount(5)
    expect(el.shadowRoot!.querySelector('[part="group"]')).not.toBeNull()
    expect(el.querySelectorAll('oas-avatar').length).toBe(5)
  })

  it('max 超限时隐藏多余头像并显示 +N 计数', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[3]!.style.display).toBe('none')
    expect(avatars[4]!.style.display).toBe('none')
    const count = el.shadowRoot!.querySelector('[part="count"]')!
    expect(count.hasAttribute('hidden')).toBe(false)
    expect(count.textContent).toBe('+2')
  })

  it('未超过 max 时全部显示、无计数', () => {
    const el = mount(3)
    el.setAttribute('max', '5')
    const count = el.shadowRoot!.querySelector('[part="count"]')!
    expect(count.hasAttribute('hidden')).toBe(true)
    expect(count.textContent).toBe('')
  })

  it('移除 max 后恢复隐藏头像', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    el.removeAttribute('max')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[3]!.style.display).toBe('')
    expect(el.shadowRoot!.querySelector('[part="count"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('重叠陈列使用负向 margin', () => {
    const el = mount()
    const style = el.shadowRoot!.querySelector('style')!.textContent
    expect(style).toContain('-8px')
  })

  it('size 属性透传给头像并适配计数圆点', () => {
    const el = mount(4)
    el.setAttribute('max', '3')
    el.setAttribute('size', '48')
    const avatars = el.querySelectorAll<HTMLElement>('oas-avatar')
    expect(avatars[0]!.getAttribute('size')).toBe('48')
    const count = el.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    expect(count.style.width).toBe('48px')
  })
})

describe('OASAvatarGroup spacing（间距控制）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('叠距变量化：CSS 消费 --oas-avatar-group-overlap（默认 -8px）', () => {
    const el = mount(2)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('var(--oas-avatar-group-overlap, -8px)')
    // 成员描边防透叠：token ring（页面背景色，含 dark 变体）
    expect(css).toMatch(
      /::slotted\(oas-avatar\)[^{]*\{[^}]*box-shadow:\s*0 0 0 2px var\(--oas-avatar-group-ring, var\(--oas-color-bg\)\)/s,
    )
  })

  it('spacing 属性（数字）注入叠距变量，正负均可', () => {
    const el = mount(2)
    el.setAttribute('spacing', '4')
    expect(el.style.getPropertyValue('--oas-avatar-group-overlap')).toBe('4px')
    el.setAttribute('spacing', '-16')
    expect(el.style.getPropertyValue('--oas-avatar-group-overlap')).toBe('-16px')
  })

  it('移除 spacing 后回落 CSS 默认叠距', () => {
    const el = mount(2)
    el.setAttribute('spacing', '4')
    el.removeAttribute('spacing')
    expect(el.style.getPropertyValue('--oas-avatar-group-overlap')).toBe('')
  })
})

describe('OASAvatarGroup +N 折叠弹层', () => {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function panel(el: OASAvatarGroup): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="overflow"]')!
  }

  function countBtn(el: OASAvatarGroup): HTMLElement {
    return el.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
  }

  it('计数元素是按钮：aria-expanded 同步、可聚焦', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    const btn = countBtn(el)
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(btn.getAttribute('aria-controls')).toBe(panel(el).getAttribute('id'))
  })

  it('点击 +N：弹出浮层展示全部被折叠成员（克隆头像，display 已复位）', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).click()
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('false')
    expect(countBtn(el).getAttribute('aria-expanded')).toBe('true')
    const clones = panel(el).querySelectorAll('oas-avatar')
    expect(clones.length).toBe(2)
    expect((clones[0] as HTMLElement).style.display).toBe('')
  })

  it('再次点击（toggle）关闭浮层', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).click()
    await sleep(0)
    countBtn(el).click()
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
    expect(countBtn(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('Escape 关闭浮层（模块级 Esc 栈）', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).click()
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('false')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('外部点击关闭浮层', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).click()
    await sleep(0)
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('聚焦 +N 打开，焦点移出关闭（键盘可达）', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).dispatchEvent(new FocusEvent('focusin'))
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('false')
    countBtn(el).dispatchEvent(new FocusEvent('focusout', { relatedTarget: document.body }))
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('hover +N 延时打开，移出关闭；移入浮层取消关闭', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    const btn = countBtn(el)
    btn.dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(150)
    expect(panel(el).getAttribute('aria-hidden')).toBe('false')
    // 移出按钮但进入浮层：不关
    btn.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: panel(el) }))
    await sleep(150)
    panel(el).dispatchEvent(new MouseEvent('mouseenter'))
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('false')
    // 移出浮层：关闭
    panel(el).dispatchEvent(new MouseEvent('mouseleave'))
    await sleep(150)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
  })

  it('浮层面板带无障碍名称（aria-label 走 locale）', () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    expect(panel(el).getAttribute('aria-label')).toBe('全部成员')
  })

  it('未折叠（无 +N）时点击不计数按钮不弹层', () => {
    const el = mount(3)
    el.setAttribute('max', '5')
    expect(countBtn(el).hidden).toBe(true)
  })

  it('打开期间移除 max：计数隐藏且浮层关闭', async () => {
    const el = mount(5)
    el.setAttribute('max', '3')
    countBtn(el).click()
    await sleep(0)
    el.removeAttribute('max')
    await sleep(0)
    expect(panel(el).getAttribute('aria-hidden')).toBe('true')
    expect(countBtn(el).hidden).toBe(true)
  })

  it('动态新增成员（slotchange）刷新折叠计数', async () => {
    const el = mount(4)
    el.setAttribute('max', '3')
    expect(countBtn(el).textContent).toBe('+1')
    const a = document.createElement('oas-avatar')
    a.textContent = '新成员'
    el.appendChild(a)
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(countBtn(el).textContent).toBe('+2')
        resolve()
      }, 0)
    })
  })
})
