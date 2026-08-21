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
    // + 移出滚动区固定 nav：role=button（不再占位 tab），tabindex=0 进 Tab 顺序，可见
    expect(add!.getAttribute('role')).toBe('button')
    expect(add!.hasAttribute('hidden')).toBe(false)
    expect(add!.getAttribute('tabindex')).toBe('0')
    // tablist 只含真 tab
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]')!
    expect(tablist.contains(add)).toBe(false)
  })

  it('未设置 addable 时 + 按钮隐藏（template 占位存在但 hidden）', () => {
    const el = mount()
    const add = el.shadowRoot!.querySelector<HTMLElement>('.tab-add')
    expect(add!.hasAttribute('hidden')).toBe(true)
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

  it('a11y：addable 时 tablist 只含真 tab（+ 按钮移出滚动区固定在 nav），+ 为 button 进 Tab 顺序', () => {
    const el = mount({ addable: '' })
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]')!
    const nav = el.shadowRoot!.querySelector('.nav')!
    // tablist 直接子元素全部是真 tab（+ 已移出滚动区）
    const children = [...tablist.children]
    expect(children.every((c) => c.getAttribute('role') === 'tab' && c.hasAttribute('data-value'))).toBe(true)
    // + 按钮在 nav（滚动区外），role=button、可聚焦
    const add = nav.querySelector('.tab-add')!
    expect(tablist.contains(add)).toBe(false) // 不在 tablist 内
    expect(add.getAttribute('role')).toBe('button')
    expect(add.getAttribute('tabindex')).toBe('0')
  })

  it('addable：溢出时 + 按钮固定在标签栏末尾，不随 tablist 滚动被遮挡', () => {
    const el = new OASTabs()
    el.setAttribute('addable', '')
    el.innerHTML = Array.from(
      { length: 10 },
      (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c${i}</p></oas-tab-panel>`,
    ).join('')
    document.body.appendChild(el)
    const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
    Object.defineProperty(tablist, 'scrollWidth', { value: 1200, configurable: true })
    Object.defineProperty(tablist, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(tablist, 'scrollLeft', { value: 800, writable: true, configurable: true })
    ;(el as any).update()
    const add = el.shadowRoot!.querySelector('.tab-add')!
    // + 在 nav（不在滚动的 tablist 内）→ 不随滚动位移，始终可见
    expect(tablist.contains(add)).toBe(false)
    expect((el.shadowRoot!.querySelector('.nav') as HTMLElement).contains(add)).toBe(true)
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

  // ===== 批次 1：disabled / size / centered / justified =====

  describe('disabled tab', () => {
    function mountDisabled(): OASTabs {
      const el = new OASTabs()
      el.innerHTML = `
        <oas-tab-panel label="标签一" value="a"><p>内容一</p></oas-tab-panel>
        <oas-tab-panel label="标签二" value="b" disabled><p>内容二</p></oas-tab-panel>
        <oas-tab-panel label="标签三" value="c"><p>内容三</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      return el
    }

    it('disabled 标签渲染 aria-disabled + disabled 属性', () => {
      const el = mountDisabled()
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')
      expect(tabs[1]!.getAttribute('aria-disabled')).toBe('true')
      expect(tabs[0]!.hasAttribute('aria-disabled')).toBe(false)
    })

    it('点击 disabled 标签不切换、不派发 oas-change', () => {
      const el = mountDisabled()
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      ;(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!).click()
      expect(fired).toBe(0)
      expect(el.getAttribute('active')).toBeNull()
    })

    it('方向键跳过 disabled 标签', () => {
      const el = mountDisabled()
      const tablist = el.shadowRoot!.querySelector('[role="tablist"]')!
      tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      // 从 a 出发，跳过 disabled 的 b，落到 c
      expect(el.getAttribute('active')).toBe('c')
    })

    it('disabled 标签不可聚焦（tabindex -1）', () => {
      const el = mountDisabled()
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')
      expect(tabs[1]!.getAttribute('tabindex')).toBe('-1')
    })
  })

  describe('size 档位', () => {
    it('size 属性映射到 host 类，驱动标签尺寸', () => {
      for (const size of ['small', 'large'] as const) {
        const el = mount({ size })
        expect(el.classList.contains(`oas-tabs--${size}`)).toBe(true)
      }
    })

    it('size 样式走 CSS 变量（字号/内边距随档位变化）', () => {
      const el = mount({ size: 'small' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/oas-tabs--small/)
      expect(style).toMatch(/font-size/)
    })

    it('非法 size 值回落 medium 并告警', () => {
      const warn: unknown[][] = []
      const orig = console.warn
      console.warn = (...a: unknown[]) => warn.push(a)
      const el = mount({ size: 'huge' })
      console.warn = orig
      expect(el.classList.contains('oas-tabs--medium')).toBe(true)
      expect(warn.length).toBeGreaterThan(0)
    })
  })

  describe('centered / justified 布局', () => {
    it('centered：标签栏居中', () => {
      const el = mount({ centered: '' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(el.classList.contains('oas-tabs--centered')).toBe(true)
      expect(style).toMatch(/oas-tabs--centered[^{]*\{[^}]*justify-content:\s*center/)
    })

    it('justified：标签均分占满', () => {
      const el = mount({ justified: '' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(el.classList.contains('oas-tabs--justified')).toBe(true)
      expect(style).toMatch(/oas-tabs--justified[^{]*\.tab[^{]*\{[^}]*flex:\s*1/)
    })
  })

  // ===== 批次 2a：溢出滚动箭头 =====

  describe('溢出滚动箭头', () => {
    function mountMany(): OASTabs {
      const el = new OASTabs()
      const panels = Array.from(
        { length: 10 },
        (_, i) =>
          `<oas-tab-panel label="标签${i + 1}" value="t${i}"><p>内容${i + 1}</p></oas-tab-panel>`,
      ).join('')
      el.innerHTML = panels
      document.body.appendChild(el)
      return el
    }

    /** mock tablist 的溢出几何（jsdom 无布局） */
    function mockOverflow(el: OASTabs, scrollWidth: number, clientWidth: number): void {
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', { value: scrollWidth, configurable: true })
      Object.defineProperty(tablist, 'clientWidth', { value: clientWidth, configurable: true })
    }

    it('溢出时出现滚动箭头，未溢出时隐藏', () => {
      const el = mountMany()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      // 未溢出：scrollWidth == clientWidth
      mockOverflow(el, 500, 500)
      el.dispatchEvent(new Event('resize'))
      // 触发重新检测（调用内部 sync）
      ;(el as any).syncScrollControls?.()
      expect(el.shadowRoot!.querySelector('.scroll-start')!.hasAttribute('hidden')).toBe(true)
      // 溢出
      mockOverflow(el, 1000, 500)
      ;(el as any).syncScrollControls?.()
      expect(el.shadowRoot!.querySelector('.scroll-start')!.hasAttribute('hidden')).toBe(false)
      expect(el.shadowRoot!.querySelector('.scroll-end')!.hasAttribute('hidden')).toBe(false)
      void tablist
    })

    it('箭头 aria-label 走 locale，且为原生 button', () => {
      const el = mountMany()
      mockOverflow(el, 1000, 500)
      ;(el as any).syncScrollControls?.()
      const prev = el.shadowRoot!.querySelector('.scroll-start') as HTMLButtonElement
      const next = el.shadowRoot!.querySelector('.scroll-end') as HTMLButtonElement
      expect(prev.tagName).toBe('BUTTON')
      expect(prev.getAttribute('aria-label')).toBe('向前滚动标签')
      expect(next.getAttribute('aria-label')).toBe('向后滚动标签')
    })

    it('点击箭头滚动 tablist（scrollBy）', () => {
      const el = mountMany()
      mockOverflow(el, 1000, 500)
      ;(el as any).syncScrollControls?.()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      let scrolled = 0
      tablist.scrollBy = ((opts: ScrollToOptions) => {
        scrolled = (opts.left as number) ?? 0
      }) as typeof tablist.scrollBy
      ;(el.shadowRoot!.querySelector('.scroll-end') as HTMLElement).click()
      expect(scrolled).toBeGreaterThan(0)
    })

    it('without-scroll-controls 关闭箭头（溢出也不显示）', () => {
      const el = new OASTabs()
      el.setAttribute('without-scroll-controls', '')
      el.innerHTML = Array.from(
        { length: 10 },
        (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      mockOverflow(el, 1000, 500)
      ;(el as any).syncScrollControls?.()
      expect(el.shadowRoot!.querySelector('.scroll-start')!.hasAttribute('hidden')).toBe(true)
    })
  })

  // ===== 批次 2b：more 溢出收缩下拉 =====

  describe('more 溢出收缩下拉', () => {
    function mountMore(count = 8, eachWidth = 100, avail = 400): OASTabs {
      const el = new OASTabs()
      el.setAttribute('more', '')
      el.innerHTML = Array.from(
        { length: count },
        (_, i) => `<oas-tab-panel label="标签${i + 1}" value="t${i}"><p>内容${i + 1}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      // mock 每个 tab 的 offsetWidth 与 nav 可用宽度（jsdom 无布局）
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t) => Object.defineProperty(t, 'offsetWidth', { value: eachWidth, configurable: true }))
      const nav = el.shadowRoot!.querySelector('.nav') as HTMLElement
      Object.defineProperty(nav, 'clientWidth', { value: avail, configurable: true })
      return el
    }

    it('more 模式溢出：放不下的 tab 收进「更多」按钮触发的下拉', () => {
      // 8 个 tab ×100px = 800px，可用 400px → 约前 3~4 个可见，其余进更多
      const el = mountMore(8, 100, 400)
      ;(el as any).syncMore?.()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn')
      expect(moreBtn).not.toBeNull()
      expect(moreBtn!.hasAttribute('hidden')).toBe(false)
      // 可见区应隐藏部分 tab（收进下拉）
      const hiddenTabs = [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')].filter(
        (t) => t.hasAttribute('data-overflowed'),
      )
      expect(hiddenTabs.length).toBeGreaterThan(0)
    })

    it('more 不溢出：所有 tab 可见，无更多按钮', () => {
      const el = mountMore(3, 100, 1000)
      ;(el as any).syncMore?.()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn')
      expect(moreBtn === null || moreBtn.hasAttribute('hidden')).toBe(true)
    })

    it('点击更多按钮弹出下拉，下拉项点击切换到对应面板', async () => {
      const el = mountMore(8, 100, 400)
      ;(el as any).syncMore?.()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      moreBtn.click()
      await Promise.resolve()
      const dropdown = el.shadowRoot!.querySelector('.more-dropdown')
      expect(dropdown).not.toBeNull()
      expect(dropdown!.hasAttribute('hidden')).toBe(false)
      const items = dropdown!.querySelectorAll('[data-value]')
      expect(items.length).toBeGreaterThan(0)
      let changed = ''
      el.addEventListener('oas-change', (e) => (changed = (e as CustomEvent).detail.value))
      ;(items[0] as HTMLElement).click()
      await Promise.resolve()
      expect(changed).not.toBe('')
      expect(el.getAttribute('active')).toBe(changed)
    })

    // 注：原「选中项被收进更多时，更多按钮高亮」场景已被「激活项可见窗口」设计取代——
    // 激活 tab 永不收进「更多」（syncMore 窗口滑动保证激活项可见），该状态不再存在。
  })

  // ===== 批次 3a：panel-mode 面板显隐策略（keep/lazy/destroy） =====

  describe('panel-mode 面板显隐策略', () => {
    function mountMode(mode: string): OASTabs {
      const el = new OASTabs()
      el.setAttribute('panel-mode', mode)
      el.innerHTML = `
        <oas-tab-panel label="标签一" value="a"><p class="pa">内容一</p></oas-tab-panel>
        <oas-tab-panel label="标签二" value="b"><p class="pb">内容二</p></oas-tab-panel>
        <oas-tab-panel label="标签三" value="c"><p class="pc">内容三</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      return el
    }
    const panelOf = (el: OASTabs, v: string) =>
      el.querySelector(`oas-tab-panel[value="${v}"]`) as HTMLElement

    it('keep（默认）：未激活面板 hidden 但内容保留 DOM', () => {
      const el = mountMode('keep')
      expect(panelOf(el, 'b').hidden).toBe(true)
      expect(panelOf(el, 'b').querySelector('.pb')).not.toBeNull() // 内容保留
    })

    it('lazy：未访问的未激活面板子节点被暂存（不挂载）', () => {
      const el = mountMode('lazy')
      // 初始激活 a；b/c 未访问，子节点被暂存
      expect(panelOf(el, 'b').querySelector('.pb')).toBeNull()
      expect(panelOf(el, 'c').querySelector('.pc')).toBeNull()
      expect(panelOf(el, 'a').querySelector('.pa')).not.toBeNull() // 激活的正常
    })

    it('lazy：首次激活后面板内容挂载并保留（再次切走不卸载）', async () => {
      const el = mountMode('lazy')
      el.setAttribute('active', 'b')
      await Promise.resolve()
      expect(panelOf(el, 'b').querySelector('.pb')).not.toBeNull() // 首次激活挂载
      el.setAttribute('active', 'a')
      await Promise.resolve()
      expect(panelOf(el, 'b').querySelector('.pb')).not.toBeNull() // 访问过后保留
    })

    it('destroy：切走时卸载非激活面板子节点，切回时重挂', async () => {
      const el = mountMode('destroy')
      expect(panelOf(el, 'a').querySelector('.pa')).not.toBeNull()
      el.setAttribute('active', 'b')
      await Promise.resolve()
      expect(panelOf(el, 'a').querySelector('.pa')).toBeNull() // 切走卸载
      expect(panelOf(el, 'b').querySelector('.pb')).not.toBeNull()
      el.setAttribute('active', 'a')
      await Promise.resolve()
      expect(panelOf(el, 'a').querySelector('.pa')).not.toBeNull() // 切回重挂
      expect(panelOf(el, 'b').querySelector('.pb')).toBeNull()
    })

    it('非法 panel-mode 回落 keep 并告警', () => {
      const warn: unknown[][] = []
      const orig = console.warn
      console.warn = (...a: unknown[]) => warn.push(a)
      mountMode('bogus')
      console.warn = orig
      expect(warn.length).toBeGreaterThan(0)
    })
  })

  // ===== 批次 3b：activation 手动激活 =====

  describe('activation 激活模式', () => {
    it('auto（默认）：方向键立即切换面板', () => {
      const el = mount()
      el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      )
      expect(el.getAttribute('active')).toBe('b')
    })

    it('manual：方向键只移动焦点不切换，Enter 才切换', () => {
      const el = mount({ activation: 'manual' })
      const tablist = el.shadowRoot!.querySelector('[role="tablist"]')!
      tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      // 焦点移到 b 但 active 未变
      expect(el.getAttribute('active') ?? 'a').toBe('a')
      // 焦点在 b 上按 Enter 切换
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      tabB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      expect(el.getAttribute('active')).toBe('b')
    })
  })

  // ===== 批次 3c：animated 动画 =====

  describe('animated 动画', () => {
    it('animated 开启：标签选中态与面板过渡带 transition', () => {
      const el = mount({ animated: '' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(el.classList.contains('oas-tabs--animated')).toBe(true)
      expect(style).toMatch(/oas-tabs--animated[^{]*\.tab[^{]*\{[^}]*transition/)
    })
  })

  // ===== 批次 4a：oas-before-change 切换前拦截 =====

  describe('oas-before-change 拦截', () => {
    it('默认不拦截：before-change 派发后正常切换', () => {
      const el = mount()
      let beforeDetail: unknown
      el.addEventListener('oas-before-change', (e) => (beforeDetail = (e as CustomEvent).detail))
      ;(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!).click()
      expect(beforeDetail).toEqual({ value: 'b' })
      expect(el.getAttribute('active')).toBe('b')
    })

    it('preventDefault 拦截切换（active 不变、不派发 oas-change）', () => {
      const el = mount()
      el.addEventListener('oas-before-change', (e) => e.preventDefault())
      let changed = 0
      el.addEventListener('oas-change', () => changed++)
      ;(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!).click()
      expect(changed).toBe(0)
      expect(el.getAttribute('active')).toBeNull()
    })

    it('键盘切换同样可被拦截', () => {
      const el = mount()
      el.addEventListener('oas-before-change', (e) => e.preventDefault())
      el.shadowRoot!.querySelector('[role="tablist"]')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      )
      expect(el.getAttribute('active')).toBeNull()
    })
  })

  // ===== 批次 4b：editable 双击重命名 =====

  describe('editable 双击重命名', () => {
    function mountEditable(): OASTabs {
      const el = new OASTabs()
      el.innerHTML = `
        <oas-tab-panel label="文档一" value="a" editable><p>内容一</p></oas-tab-panel>
        <oas-tab-panel label="文档二" value="b"><p>内容二</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      return el
    }

    it('editable 标签双击进入编辑态（label 替换为 input）', () => {
      const el = mountEditable()
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input')
      expect(input).not.toBeNull()
      expect((input as HTMLInputElement).value).toBe('文档一')
    })

    it('非 editable 标签双击不进入编辑态', () => {
      const el = mountEditable()
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      tabB.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      expect(tabB.querySelector('.tab-rename-input')).toBeNull()
    })

    it('Enter 确认重命名，派发 oas-rename {value, label}', async () => {
      const el = mountEditable()
      let detail: unknown
      el.addEventListener('oas-rename', (e) => (detail = (e as CustomEvent).detail))
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      input.value = '重命名后'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await Promise.resolve()
      expect(detail).toEqual({ value: 'a', label: '重命名后' })
      // 编辑态退出：重建后的新标签无 input（label 已更新为新值）
      const tabNew = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabNew.querySelector('.tab-rename-input')).toBeNull()
      expect(tabNew.querySelector('.tab-label')!.textContent).toBe('重命名后')
    })

    it('Esc 取消重命名，不派发事件', async () => {
      const el = mountEditable()
      let fired = 0
      el.addEventListener('oas-rename', () => fired++)
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      input.value = '改了但取消'
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
      expect(fired).toBe(0)
      // 取消后恢复原 label，无 input
      const tabNew = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabNew.querySelector('.tab-rename-input')).toBeNull()
      expect(tabNew.querySelector('.tab-label')!.textContent).toBe('文档一')
    })

    it('失焦保存（commit on blur）：点击非编辑区域提交修改并派发 oas-rename', async () => {
      // 通用（通用编辑场景）：失焦默认保存，取消走 Esc 显式表达
      const el = mountEditable()
      let detail: unknown
      el.addEventListener('oas-rename', (e) => (detail = (e as CustomEvent).detail))
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      input.value = '失焦保存的新名'
      input.dispatchEvent(new FocusEvent('blur'))
      await Promise.resolve()
      expect(detail).toEqual({ value: 'a', label: '失焦保存的新名' })
      const tabNew = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabNew.querySelector('.tab-label')!.textContent).toBe('失焦保存的新名')
    })

    it('失焦时内容未变（或与原值相同）不派发事件', async () => {
      const el = mountEditable()
      let fired = 0
      el.addEventListener('oas-rename', () => fired++)
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      // 值未改，直接 blur——不应派发
      input.dispatchEvent(new FocusEvent('blur'))
      await Promise.resolve()
      expect(fired).toBe(0)
    })

    it('编辑框初始宽度贴合原标签宽度（不用 input 默认宽度，防布局跳动）', () => {
      const el = mountEditable()
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      const labelEl = tabA.querySelector('.tab-label') as HTMLElement
      // mock 原标签宽度（jsdom 无布局）
      Object.defineProperty(labelEl, 'offsetWidth', { value: 96, configurable: true })
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      // 初始宽度应贴合原标签（非默认 209px 输入框宽度）
      expect(input.style.width).toBe('96px')
    })

    it('编辑框高度贴合原标签高度（input 固有高度 ≠ span 行高，差值会致 tab 晃动）', () => {
      const el = mountEditable()
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      const labelEl = tabA.querySelector('.tab-label') as HTMLElement
      Object.defineProperty(labelEl, 'offsetWidth', { value: 96, configurable: true })
      Object.defineProperty(labelEl, 'offsetHeight', { value: 18, configurable: true })
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      expect(input.style.height).toBe('18px')
    })

    it('编辑框随输入内容自适应增长（input 事件更新宽度，不小于原标签宽）', () => {
      const el = mountEditable()
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      const labelEl = tabA.querySelector('.tab-label') as HTMLElement
      Object.defineProperty(labelEl, 'offsetWidth', { value: 96, configurable: true })
      tabA.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      const input = tabA.querySelector('.tab-rename-input') as HTMLInputElement
      // 输入更长内容，mock scrollWidth 增长
      input.value = '这是一个非常非常长的新标签名称'
      Object.defineProperty(input, 'scrollWidth', { value: 240, configurable: true })
      input.dispatchEvent(new Event('input', { bubbles: true }))
      expect(input.style.width).toBe('240px')
    })
  })

  // ===== 批次 4c：sortable 拖拽排序 =====

  describe('sortable 拖拽排序', () => {
    it('sortable 标签可拖拽（draggable 属性）', () => {
      const el = mount({ sortable: '' })
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t) => expect(t.getAttribute('draggable')).toBe('true'))
    })

    it('非 sortable 标签不可拖拽', () => {
      const el = mount()
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t) => expect(t.getAttribute('draggable')).not.toBe('true'))
    })

    it('拖拽落点换位后派发 oas-reorder {fromIndex, toIndex}', () => {
      const el = mount({ sortable: '' })
      let detail: unknown
      el.addEventListener('oas-reorder', (e) => (detail = (e as CustomEvent).detail))
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      const dataTransfer = {
        setData: () => {},
        getData: () => 'a',
        effectAllowed: '',
        dropEffect: '',
      } as unknown as DataTransfer
      // 拖 a 到 b 上
      tabs[0]!.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }))
      tabs[1]!.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }))
      tabs[1]!.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }))
      expect(detail).toEqual({ fromIndex: 0, toIndex: 1 })
    })
  })

  // ===== 批次 5a：嵌套 tabs =====

  describe('嵌套 tabs', () => {
    it('外层 tabs 只识别直接子面板，不抓嵌套 tabs 的面板', () => {
      const el = new OASTabs()
      el.innerHTML = `
        <oas-tab-panel label="外层一" value="outer-a"><p>外层内容一</p></oas-tab-panel>
        <oas-tab-panel label="外层二" value="outer-b">
          <oas-tabs active="inner-x">
            <oas-tab-panel label="内层甲" value="inner-x"><p>内层内容甲</p></oas-tab-panel>
            <oas-tab-panel label="内层乙" value="inner-y"><p>内层内容乙</p></oas-tab-panel>
          </oas-tabs>
        </oas-tab-panel>
      `
      document.body.appendChild(el)
      // 外层 tablist 只应有 2 个标签（不抓内层面板）
      const outerTabs = el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')
      expect(outerTabs.length).toBe(2)
      const values = [...outerTabs].map((t) => t.getAttribute('data-value'))
      expect(values).toEqual(['outer-a', 'outer-b'])
      // 内层 tabs 独立渲染自己的标签
      const inner = el.querySelector('oas-tab-panel[value="outer-b"] oas-tabs') as OASTabs
      const innerTabs = inner.shadowRoot!.querySelectorAll('[role="tab"][data-value]')
      expect(innerTabs.length).toBe(2)
      expect(inner.getAttribute('active')).toBe('inner-x')
    })
  })

  // ===== 批次 5b：slot="label" 自定义标签 =====

  describe('slot="label" 自定义标签', () => {
    it('面板直接子元素 slot="label" 克隆进标签位（替代默认文本）', () => {
      const el = new OASTabs()
      el.innerHTML = `
        <oas-tab-panel label="普通" value="a"><p>内容一</p></oas-tab-panel>
        <oas-tab-panel label="自定义" value="b"><span slot="label"><strong style="color:red">富文本标签</strong></span><p>内容二</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      const labelSlot = tabB.querySelector('.tab-label')
      // 自定义内容克隆进标签位（含富文本节点）
      expect(labelSlot!.querySelector('strong')).not.toBeNull()
      expect(labelSlot!.textContent).toContain('富文本标签')
      // 普通标签仍是纯文本
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabA.querySelector('.tab-label')!.textContent).toBe('普通')
    })
  })

  // ===== 批次 6a：滚轮横向滚动 + 新增自动滚到可见 =====

  describe('滚轮滑动标签', () => {
    function mountOverflow(): OASTabs {
      const el = new OASTabs()
      el.innerHTML = Array.from(
        { length: 10 },
        (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c${i}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', { value: 1200, configurable: true })
      Object.defineProperty(tablist, 'clientWidth', { value: 400, configurable: true })
      return el
    }

    it('溢出时滚轮纵向滚动转为横向滑动标签（deltaY → scrollLeft）', () => {
      const el = mountOverflow()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      let scrollLeftVal = 0
      Object.defineProperty(tablist, 'scrollLeft', {
        get: () => scrollLeftVal,
        set: (v) => (scrollLeftVal = v),
        configurable: true,
      })
      tablist.dispatchEvent(
        new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }),
      )
      expect(scrollLeftVal).toBeGreaterThan(0)
    })

    it('未溢出时滚轮不拦截（放行页面正常滚动）', () => {
      const el = mount()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', { value: 300, configurable: true })
      Object.defineProperty(tablist, 'clientWidth', { value: 300, configurable: true })
      const ev = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
      tablist.dispatchEvent(ev)
      // 未溢出：不 preventDefault，事件未被拦截
      expect(ev.defaultPrevented).toBe(false)
    })

    it('溢出时滚轮拦截（preventDefault 阻止页面纵向滚动）', () => {
      const el = mountOverflow()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollLeft', { value: 0, writable: true, configurable: true })
      const ev = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
      tablist.dispatchEvent(ev)
      expect(ev.defaultPrevented).toBe(true)
    })
  })

  describe('新增标签自动滚到可见', () => {
    it('新增标签（溢出时在最右）激活后自动滚动到可见区域', async () => {
      const el = new OASTabs()
      el.setAttribute('addable', '')
      el.innerHTML = Array.from(
        { length: 8 },
        (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c${i}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', { value: 1200, configurable: true })
      Object.defineProperty(tablist, 'clientWidth', { value: 400, configurable: true })
      // 追踪 scrollIntoView 调用
      const scrollCalls: string[] = []
      const origSIV = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element) {
        scrollCalls.push((this as HTMLElement).getAttribute?.('data-value') ?? 'unknown')
      }
      // 宿主新增一个面板（溢出时在最右）
      const p = document.createElement('oas-tab-panel')
      p.setAttribute('label', '新标签')
      p.setAttribute('value', 'new-9')
      el.appendChild(p)
      el.setAttribute('active', 'new-9')
      await Promise.resolve()
      Element.prototype.scrollIntoView = origSIV
      // 新激活的标签应被 scrollIntoView 滚到可见
      expect(scrollCalls).toContain('new-9')
    })
  })

  // ===== 批次 6c：more 下拉搜索 + 选中项定位 =====

  describe('more 下拉搜索与选中定位', () => {
    function mountMore(count = 10, eachWidth = 100, avail = 400): OASTabs {
      const el = new OASTabs()
      el.setAttribute('more', '')
      el.innerHTML = Array.from(
        { length: count },
        (_, i) => `<oas-tab-panel label="标签${i + 1}" value="t${i}"><p>内容${i + 1}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t) => Object.defineProperty(t, 'offsetWidth', { value: eachWidth, configurable: true }))
      const nav = el.shadowRoot!.querySelector('.nav') as HTMLElement
      Object.defineProperty(nav, 'clientWidth', { value: avail, configurable: true })
      ;(el as any).syncMore?.()
      return el
    }

    it('more 下拉含搜索框（溢出时）', () => {
      const el = mountMore()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      moreBtn.click()
      const search = el.shadowRoot!.querySelector('.more-search')
      expect(search).not.toBeNull()
      expect(search!.getAttribute('placeholder') ?? search!.getAttribute('aria-label')).toBeTruthy()
    })

    it('搜索过滤：输入关键字只显示匹配的收起项', async () => {
      const el = mountMore(10, 100, 300) // 可用 300px → 约前 2 个可见，8 个收进下拉
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      moreBtn.click()
      await Promise.resolve()
      const search = el.shadowRoot!.querySelector('.more-search') as HTMLInputElement
      const allItems = () => [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')].filter((i) => !i.hidden)
      const totalBefore = allItems().length
      expect(totalBefore).toBeGreaterThan(0)
      search.value = '标签9'
      search.dispatchEvent(new Event('input', { bubbles: true }))
      await Promise.resolve()
      const filtered = allItems()
      expect(filtered.length).toBe(1)
      expect(filtered[0]!.textContent).toContain('标签9')
    })

    it('搜索过滤的 hidden 项真正不渲染（CSS .more-item[hidden]{display:none}，防 display:flex 覆盖 UA hidden）', () => {
      // 缺陷固化：.more-item 的 display:flex 会覆盖 [hidden] 的 UA display:none，导致过滤后
      // 数据层 hidden=true 但视觉仍显示。必须显式 .more-item[hidden]{display:none}。
      const el = mountMore(10, 100, 300)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(/\.more-item\[hidden\]\s*\{[^}]*display:\s*none/)
    })

    // 注：原「打开下拉时选中项滚动到可见（scrollIntoView）且高亮」场景已被「激活项可见窗口」
    // 设计取代——激活 tab 永不收进「更多」，故无需在下拉里滚动定位选中项。

    it('激活收起项后：激活项从「更多」出来到可见区，且相邻项一起可见（窗口滑动）', () => {
      // 10 tab ×100px，avail 300-44=256：激活项 + 邻居构成可见窗口，窗口外收进更多
      const el = mountMore(10, 100, 300)
      el.setAttribute('active', 't8') // t8（标签9）原本在收起范围
      // update 重建丢 mock，重新 mock
      el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]').forEach((t) =>
        Object.defineProperty(t, 'offsetWidth', { value: 100, configurable: true }),
      )
      ;(el as any).syncMore?.()
      const isVisible = (v: string) =>
        !el.shadowRoot!.querySelector(`[role="tab"][data-value="${v}"]`)!.hasAttribute('data-overflowed')
      // 激活项 t8 必须可见（不藏在更多里）
      expect(isVisible('t8')).toBe(true)
      // 相邻项（t7 或 t9）也可见（上下文连贯）
      expect(isVisible('t7') || isVisible('t9')).toBe(true)
      // 窗口前面的项（t0）被收进更多
      expect(isVisible('t0')).toBe(false)
    })

    it('激活项在可见窗口内时，窗口前的项收进更多（more 下拉只含窗口外项）', () => {
      const el = mountMore(10, 100, 300)
      el.setAttribute('active', 't8')
      el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]').forEach((t) =>
        Object.defineProperty(t, 'offsetWidth', { value: 100, configurable: true }),
      )
      ;(el as any).syncMore?.()
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      // more 下拉项不应含激活项 t8（它已出来到可见区）
      const dropValues = [...el.shadowRoot!.querySelectorAll('.more-item')].map((i) =>
        i.getAttribute('data-value'),
      )
      expect(dropValues).not.toContain('t8')
      expect(dropValues.length).toBeGreaterThan(0)
    })
  })
})
