import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTabs } from './index.js'

function mount(attrs: Record<string, string> = {}): OASTabs {
  const el = new OASTabs()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = `
    <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
    <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
  `
  document.body.appendChild(el)
  return el
}

describe('OASTabs', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染标签栏，默认激活第一项', () => {
    const el = mount()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(2)
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('点击标签切换并派发 oas-change', async () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelectorAll('[role="tab"]')[1] as HTMLElement).click()
    expect(detail).toEqual({ value: 'b' })
    expect(el.getAttribute('active')).toBe('b')
  })

  it('左右方向键切换', () => {
    const el = mount()
    el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
    )
    expect(el.getAttribute('active')).toBe('b')
  })

  it('懒渲染：未激活面板默认隐藏', () => {
    const el = mount()
    const panels = el.querySelectorAll('oas-tab-panel')
    expect((panels[1] as HTMLElement).hidden).toBe(true)
    expect((panels[0] as HTMLElement).hidden).toBe(false)
  })

  it('默认 type=line 为下划线式，无卡片类名', () => {
    const el = mount()
    expect(el.classList.contains('oas-tabs--card')).toBe(false)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(false)
    expect(tabs[1]!.classList.contains('tab--card')).toBe(false)
  })

  it('type=card 时为卡片式，host 与标签带卡片类名', () => {
    const el = mount({ type: 'card' })
    expect(el.classList.contains('oas-tabs--card')).toBe(true)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(true)
    expect(tabs[1]!.classList.contains('tab--card')).toBe(true)
  })

  it('type 从 line 切换为 card 时类名同步', () => {
    const el = mount()
    el.setAttribute('type', 'card')
    expect(el.classList.contains('oas-tabs--card')).toBe(true)
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs[0]!.classList.contains('tab--card')).toBe(true)
  })

  it('closable：每个标签渲染关闭按钮（span tabindex=-1 无 role，避免 axe 嵌套交互违规）', () => {
    const el = mount({ closable: '' })
    const closes = el.shadowRoot!.querySelectorAll('.tab-close')
    expect(closes.length).toBe(2)
    expect(closes[0]!.tagName).toBe('SPAN')
    expect(closes[0]!.getAttribute('tabindex')).toBe('-1')
    expect(closes[0]!.getAttribute('role')).toBeNull()
    expect(closes[0]!.getAttribute('aria-label')).toBeTruthy()
  })

  it('closable：点击 × 派发 oas-close detail { key }，不自动移除、不触发切换', () => {
    const el = mount({ closable: '' })
    let detail: unknown
    let changeCount = 0
    el.addEventListener('oas-close', (e: Event) => (detail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => changeCount++)
    ;(el.shadowRoot!.querySelectorAll('.tab-close')[0] as HTMLElement).click()
    expect(detail).toEqual({ key: 'a' })
    expect(changeCount).toBe(0)
    expect(el.querySelectorAll('oas-tab-panel').length).toBe(2)
    expect(el.hasAttribute('active')).toBe(false)
  })

  it('closable：关闭按钮支持 Enter / Space 触发 oas-close', () => {
    const el = mount({ closable: '' })
    let keys: unknown[] = []
    el.addEventListener('oas-close', (e: Event) => keys.push((e as CustomEvent).detail.key))
    const close = el.shadowRoot!.querySelector<HTMLElement>('.tab-close')!
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    close.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))
    expect(keys).toEqual(['a', 'a'])
  })

  it('closable 关闭后外部移除面板，标签栏增量刷新（MutationObserver）', async () => {
    const el = mount({ closable: '' })
    el.querySelector('oas-tab-panel[value="a"]')!.remove()
    // MutationObserver 回调为微任务，先 flush 再断言
    await Promise.resolve()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(1)
    expect(tabs[0]!.textContent).toContain('标签二')
  })

  it('badge：带 badge 属性的 tab 渲染徽标，未设置的不渲染', () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="标签一" value="a" badge="3"><p>内容一</p></oas-tab-panel>
      <oas-tab-panel label="标签二" value="b"><p>内容二</p></oas-tab-panel>
      <oas-tab-panel label="标签三" value="c" badge="新"><p>内容三</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    const badges = el.shadowRoot!.querySelectorAll('.tab-badge')
    expect(badges.length).toBe(2)
    expect(badges[0]!.textContent).toBe('3')
    expect(badges[1]!.textContent).toBe('新')
  })

  it('tab-position=left：host 与 tablist 带纵向布局类名', () => {
    const el = mount({ 'tab-position': 'left' })
    expect(el.classList.contains('oas-tabs--vertical')).toBe(true)
    expect(el.classList.contains('oas-tabs--left')).toBe(true)
    expect(el.classList.contains('oas-tabs--right')).toBe(false)
    expect(el.classList.contains('oas-tabs--bottom')).toBe(false)
    expect(
      el.shadowRoot!.querySelector('[role="tablist"]')!.classList.contains('tablist--vertical'),
    ).toBe(true)
  })

  it('tab-position 默认 top，可切换 right / bottom 并同步类名', () => {
    const el = mount()
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
    el.setAttribute('tab-position', 'right')
    expect(el.classList.contains('oas-tabs--vertical')).toBe(true)
    expect(el.classList.contains('oas-tabs--right')).toBe(true)
    el.setAttribute('tab-position', 'bottom')
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
    expect(el.classList.contains('oas-tabs--bottom')).toBe(true)
    el.setAttribute('tab-position', 'top')
    expect(el.classList.contains('oas-tabs--bottom')).toBe(false)
    expect(el.classList.contains('oas-tabs--vertical')).toBe(false)
  })

  it('回归：tab-position=right 时 tab 内容右对齐（justify-content: flex-end）', () => {
    const el = mount({ 'tab-position': 'right' })
    expect(el.classList.contains('oas-tabs--right')).toBe(true)
    const tab = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    const computed = getComputedStyle(tab).justifyContent
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const rule = style.match(/:host\(\.oas-tabs--right\) \.tab\s*\{[^}]*\}/)?.[0] ?? ''
    // happy-dom 对 shadow 内联样式解析支持有限：计算样式能拿到则断言计算值，否则退化为 STYLE 字符串断言
    if (computed !== '') expect(computed).toBe('flex-end')
    expect(rule).toContain('justify-content: flex-end')
  })

  it('回归：card + vertical + right 组合样式仍生效（盒式卡片不被右对齐破坏）', () => {
    const el = mount({ type: 'card', 'tab-position': 'right' })
    expect(el.classList.contains('oas-tabs--card')).toBe(true)
    expect(el.classList.contains('oas-tabs--vertical')).toBe(true)
    expect(el.classList.contains('oas-tabs--right')).toBe(true)
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const cardRule =
      style.match(/:host\(\.oas-tabs--card\.oas-tabs--vertical\) \.tab\s*\{[^}]*\}/)?.[0] ?? ''
    // 卡片盒式规则必须保留边框与圆角，且不覆盖右对齐
    expect(cardRule).toContain('border-radius: var(--oas-radius-md)')
    expect(cardRule).not.toContain('justify-content')
  })

  // ---- P1：动态增删（addable）+ 图标 tab + roving tabindex 焦点管理 ----

  it('addable：渲染 + 新增按钮（native button + aria-label 走 locale + part 暴露）', () => {
    const el = mount({ addable: '' })
    const add = el.shadowRoot!.querySelector<HTMLElement>('.tab-add')
    expect(add).not.toBeNull()
    expect(add!.tagName).toBe('BUTTON')
    expect(add!.getAttribute('aria-label')).toBe('新增标签')
    expect(add!.getAttribute('part')).toBe('add-button')
    expect(add!.querySelector('svg')).not.toBeNull()
    // a11y 回归：tablist 直接子元素必须带 role=tab（axe aria-required-children）；
    // aria-selected=false 占位 tab + tabindex=0 保证 Tab 键可达
    expect(add!.getAttribute('role')).toBe('tab')
    expect(add!.getAttribute('aria-selected')).toBe('false')
    expect(add!.getAttribute('tabindex')).toBe('0')
  })

  it('未设置 addable 时不渲染 + 按钮', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('.tab-add')).toBeNull()
  })

  it('addable：点击 + 派发 oas-add，detail 携带默认新标签文案（走 locale）', () => {
    const el = mount({ addable: '' })
    let detail: unknown
    el.addEventListener('oas-add', (e: Event) => (detail = (e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLElement>('.tab-add')!.click()
    expect(detail).toEqual({ label: '新标签' })
  })

  it('addable：宿主新增面板后标签栏增量刷新，新标签激活且 roving tabindex 生效', async () => {
    const el = mount({ addable: '' })
    el.addEventListener('oas-add', () => {
      const p = document.createElement('oas-tab-panel')
      p.setAttribute('label', '新标签')
      p.setAttribute('value', 'c')
      el.appendChild(p)
      el.setAttribute('active', 'c')
    })
    el.shadowRoot!.querySelector<HTMLElement>('.tab-add')!.click()
    await Promise.resolve()
    // 排除 + 占位 tab（无 data-value），只数真实标签
    const tabs = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    expect(tabs.length).toBe(3)
    expect(tabs[2]!.textContent).toContain('新标签')
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs[2]!.getAttribute('tabindex')).toBe('0')
    expect(tabs[0]!.getAttribute('tabindex')).toBe('-1')
  })

  it('addable：点击 + 新增面板后焦点落到新标签（host 同步激活时）', async () => {
    const el = mount({ addable: '' })
    const add = el.shadowRoot!.querySelector<HTMLElement>('.tab-add')!
    add.focus()
    el.addEventListener('oas-add', () => {
      const p = document.createElement('oas-tab-panel')
      p.setAttribute('label', '新标签')
      p.setAttribute('value', 'c')
      el.appendChild(p)
      el.setAttribute('active', 'c')
    })
    add.click()
    await Promise.resolve()
    const tabs = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    expect(el.shadowRoot!.activeElement).toBe(tabs[2])
  })

  it('roving tabindex：仅选中标签 tabindex=0，切换后同步', () => {
    const el = mount()
    const get = () =>
      [...el.shadowRoot!.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute('tabindex'))
    expect(get()).toEqual(['0', '-1'])
    el.setAttribute('active', 'b')
    expect(get()).toEqual(['-1', '0'])
  })

  it('方向键切换后焦点落到新激活标签（roving）', () => {
    const el = mount()
    const first = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    first.focus()
    el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
    )
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(el.getAttribute('active')).toBe('b')
    expect(el.shadowRoot!.activeElement).toBe(tabs[1])
  })

  it('关闭并移除激活标签后，焦点落到剩余选中标签', async () => {
    const el = mount({ closable: '', active: 'a' })
    const first = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    first.focus()
    el.addEventListener('oas-close', (e) => {
      const key = (e as CustomEvent).detail.key
      el.querySelector(`oas-tab-panel[value="${key}"]`)!.remove()
      el.setAttribute('active', 'b')
    })
    el.shadowRoot!.querySelector<HTMLElement>('.tab-close')!.click()
    await Promise.resolve()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(1)
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs[0]!.getAttribute('tabindex')).toBe('0')
    expect(el.shadowRoot!.activeElement).toBe(tabs[0])
  })

  it('动态增删后 roving tabindex 与 aria-selected 保持（键盘可循环到新标签）', async () => {
    const el = mount({ addable: '' })
    const p = document.createElement('oas-tab-panel')
    p.setAttribute('label', '新标签')
    p.setAttribute('value', 'c')
    el.appendChild(p)
    await Promise.resolve()
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]')!
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('active')).toBe('c')
    // 排除 + 占位 tab（无 data-value）
    const tabs = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true')
    expect(tabs[2]!.getAttribute('tabindex')).toBe('0')
    expect(tabs[0]!.getAttribute('tabindex')).toBe('-1')
    // 循环回第一项
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('active')).toBe('a')
  })

  it('a11y：addable 时 tablist 直接子元素全部为 tab，且 + 占位 tab 与选中标签均进 Tab 顺序', () => {
    const el = mount({ addable: '' })
    const children = [...el.shadowRoot!.querySelector('[role="tablist"]')!.children]
    // axe aria-required-children：tablist 只允许 tab 子元素
    expect(children.every((c) => c.getAttribute('role') === 'tab')).toBe(true)
    // Tab 顺序 = 选中标签(0) + + 占位(0)，其余 roving -1
    expect(children.filter((c) => c.getAttribute('tabindex') === '0').length).toBe(2)
    expect(children.filter((c) => c.getAttribute('tabindex') === '-1').length).toBe(1)
    // + 占位为 aria-selected=false，不冒充选中项
    const add = children.find((c) => c.classList.contains('tab-add'))!
    expect(add.getAttribute('aria-selected')).toBe('false')
  })

  it('icon：tab 渲染 iconRegistry 内联 SVG，装饰性对读屏隐藏', () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="消息" value="a" icon="mail"><p>内容</p></oas-tab-panel>
      <oas-tab-panel label="搜索" value="b" icon="search"><p>内容</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    const icons = el.shadowRoot!.querySelectorAll('.tab-icon')
    expect(icons.length).toBe(2)
    const svg = icons[0]!.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(icons[0]!.getAttribute('aria-hidden')).toBe('true')
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    // 非法 icon 名不渲染图标容器
    const bad = new OASTabs()
    bad.innerHTML =
      '<oas-tab-panel label="X" value="x" icon="not-exist"><p>内容</p></oas-tab-panel>'
    document.body.appendChild(bad)
    expect(bad.shadowRoot!.querySelector('.tab-icon')).toBeNull()
  })

  it('icon slot：面板直接子元素 [slot="icon"] 克隆进标签图标位', () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="星标" value="a"><span slot="icon">⭐</span><p>内容</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    const icon = el.shadowRoot!.querySelector<HTMLElement>('.tab-icon')
    expect(icon).not.toBeNull()
    expect(icon!.textContent).toContain('⭐')
    expect(icon!.getAttribute('aria-hidden')).toBe('true')
  })

  it('icon 属性优先于 slot="icon"，图标 + 文字顺序在标签内', () => {
    const el = new OASTabs()
    el.innerHTML = `
      <oas-tab-panel label="星标" value="a" icon="star"><span slot="icon">⭐</span><p>内容</p></oas-tab-panel>
    `
    document.body.appendChild(el)
    const btn = el.shadowRoot!.querySelector('[role="tab"]')!
    const icon = btn.querySelector<HTMLElement>('.tab-icon')!
    expect(icon.querySelector('svg')).not.toBeNull()
    expect(icon.textContent).not.toContain('⭐')
    // 图标在文字之前
    expect(btn.children[0]!.classList.contains('tab-icon')).toBe(true)
  })

  it('非激活 tab hover 反馈：line 与 card 两模式均有规则且不覆盖选中项', () => {
    const el = mount({ type: 'card' })
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const lineHover =
      style.match(/\.tab:not\(\[aria-selected='true'\]\):hover\s*\{[^}]*\}/)?.[0] ?? ''
    const cardHover =
      style.match(
        /:host\(\.oas-tabs--card\) \.tab:not\(\[aria-selected='true'\]\):hover\s*\{[^}]*\}/,
      )?.[0] ?? ''
    expect(lineHover).toContain('background')
    expect(lineHover).toContain('var(--oas-color-primary)')
    expect(cardHover).toContain('color-mix')
  })
})
