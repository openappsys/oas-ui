import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASTabs } from './index.js'
// manager 能力包 import 即注册：本文件含 editable 双击重命名 / context-menu 右键菜单 /
// sortable 拖拽排序用例，需能力模块注入（core-only 的静默失效边界见 oas-tabs-manager-capability.test.ts）
import './manager/index.js'

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

  function mountMany(values: string[], attrs: Record<string, string> = {}): OASTabs {
    const el = new OASTabs()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = values
      .map((v) => `<oas-tab-panel label="标签${v}" value="${v}"><p>内容${v}</p></oas-tab-panel>`)
      .join('')
    document.body.appendChild(el)
    return el
  }

  function rightClickTab(el: OASTabs, value: string): void {
    const tab = el.shadowRoot!.querySelector(`[role="tab"][data-value="${value}"]`) as HTMLElement
    tab.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 100 }))
  }

  it('渲染标签栏，默认激活第一项', () => {
    const el = mount()
    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]')
    expect(tabs.length).toBe(2)
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
  })

  it('context-menu：右键标签弹菜单（6 项：新建/关闭/关闭其他/关闭左侧所有/关闭右侧所有/关闭全部，新建与关闭族间有分隔线）；无属性不弹', () => {
    const el = mountMany(['a', 'b', 'c'], { 'context-menu': '' })
    rightClickTab(el, 'b')
    const menu = el.shadowRoot!.querySelector('.ctx-menu') as HTMLElement
    expect(menu.hidden).toBe(false)
    expect(menu.getAttribute('part')).toBe('context-menu')
    const items = [...menu.querySelectorAll<HTMLElement>('.ctx-item')]
    expect(items.length).toBe(6)
    expect(items.map((i) => i.textContent)).toEqual([
      '新建',
      '关闭',
      '关闭其他',
      '关闭左侧所有',
      '关闭右侧所有',
      '关闭全部',
    ])
    expect(items[5]!.classList.contains('danger')).toBe(true)
    // 新建与关闭族之间的分隔线
    const divider = menu.querySelector('.ctx-divider')
    expect(divider?.getAttribute('role')).toBe('separator')
    // 无 context-menu 属性：右键不弹（先 blur 第一个实例的焦点元素——happy-dom 跨 shadow
    // activeElement 的 getter bug：焦点在 el1 shadow 时查询 el2 shadow.activeElement 会崩，
    // 真实浏览器无此问题，故此处仅测试环境失焦）
    ;(el.shadowRoot!.activeElement as HTMLElement | null)?.blur()
    const el2 = mountMany(['a', 'b'], {})
    rightClickTab(el2, 'b')
    expect(el2.shadowRoot!.querySelector('.ctx-menu')).toBeNull()
  })

  it('context-menu 关闭当前：仅对当前标签派发一次 oas-close', () => {
    const el = mountMany(['a', 'b', 'c'], { 'context-menu': '' })
    const keys: string[] = []
    el.addEventListener('oas-close', (e) => keys.push((e as CustomEvent).detail.key))
    rightClickTab(el, 'b')
    const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')]
    items[1]!.click() // 关闭
    expect(keys).toEqual(['b'])
    expect(el.shadowRoot!.querySelector('.ctx-menu')!.hasAttribute('hidden')).toBe(true)
  })

  it('context-menu 关闭其他/左侧所有/右侧所有/关闭全部：按目标集合逐个派发 oas-close', () => {
    const el = mountMany(['a', 'b', 'c', 'd'], { 'context-menu': '' })
    const keys: string[] = []
    el.addEventListener('oas-close', (e) => keys.push((e as CustomEvent).detail.key))
    // 关闭其他（对 b）
    rightClickTab(el, 'b')
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')][2]!.click()
    expect(keys).toEqual(['a', 'c', 'd'])
    // 关闭左侧所有（对 c）
    keys.length = 0
    rightClickTab(el, 'c')
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')][3]!.click()
    expect(keys).toEqual(['a', 'b'])
    // 关闭右侧所有（对 b）
    keys.length = 0
    rightClickTab(el, 'b')
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')][4]!.click()
    expect(keys).toEqual(['c', 'd'])
    // 关闭全部
    keys.length = 0
    rightClickTab(el, 'b')
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')][5]!.click()
    expect(keys).toEqual(['a', 'b', 'c', 'd'])
  })

  it('context-menu 新建：菜单项文案为中性「新建」；派发 oas-add（detail.label 走 locale 默认产物名，与 addable + 按钮同契约），菜单自闭合', () => {
    const el = mountMany(['a', 'b'], { 'context-menu': '' })
    const adds: unknown[] = []
    el.addEventListener('oas-add', (e) => adds.push((e as CustomEvent).detail))
    rightClickTab(el, 'b')
    ;[...el.shadowRoot!.querySelectorAll<HTMLElement>('.ctx-item')][0]!.click()
    expect(adds).toEqual([{ label: '新标签' }])
    expect(el.shadowRoot!.querySelector('.ctx-menu')!.hasAttribute('hidden')).toBe(true)
  })

  it('context-menu 键盘 roving：ArrowDown/ArrowUp/Home/End 在菜单项间移动焦点，循环回绕', () => {
    const el = mountMany(['a', 'b'], { 'context-menu': '' })
    rightClickTab(el, 'b')
    const menu = el.shadowRoot!.querySelector('.ctx-menu')!
    const items = [...menu.querySelectorAll<HTMLElement>('.ctx-item')]
    const active = (): string => el.shadowRoot!.activeElement?.textContent ?? ''
    expect(active()).toBe('新建') // 打开即聚焦首项
    items[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(active()).toBe('关闭')
    items[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(active()).toBe('关闭全部')
    ;[...menu.querySelectorAll<HTMLElement>('.ctx-item')][5]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    expect(active()).toBe('新建') // 末项 ArrowDown 循环回首项
    ;[...menu.querySelectorAll<HTMLElement>('.ctx-item')][0]!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    )
    expect(active()).toBe('关闭全部') // 首项 ArrowUp 循环到末项
  })

  it('context-menu 外部点击/Escape 关闭弹层', () => {
    const el = mountMany(['a', 'b'], { 'context-menu': '' })
    rightClickTab(el, 'b')
    const menu = el.shadowRoot!.querySelector('.ctx-menu') as HTMLElement
    expect(menu.hidden).toBe(false)
    document.body.click()
    expect(menu.hasAttribute('hidden')).toBe(true)
    rightClickTab(el, 'b')
    expect(menu.hidden).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(menu.hasAttribute('hidden')).toBe(true)
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

  it('badge 徽标带 part="badge"，颜色走 --oas-tabs-badge-bg/-color 变量开口（默认 danger）', () => {
    const el = new OASTabs()
    el.innerHTML = '<oas-tab-panel label="标签" value="a" badge="3"><p>c</p></oas-tab-panel>'
    document.body.appendChild(el)
    const badge = el.shadowRoot!.querySelector('.tab-badge')!
    expect(badge.getAttribute('part')).toBe('badge')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('var(--oas-tabs-badge-bg, var(--oas-color-danger))')
    expect(css).toContain('var(--oas-tabs-badge-color, var(--oas-color-text-on-danger))')
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

  it('回归：tab-position=left/right 纵向 nav 去掉底部横线（border-bottom:none），仅保留侧边竖线', () => {
    for (const pos of ['left', 'right']) {
      const el = mount({ 'tab-position': pos })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      const verticalRule = style.match(/:host\(\.oas-tabs--vertical\) \.nav\s*\{[^}]*\}/)?.[0] ?? ''
      const sideRule = style.match(new RegExp(`:host\\(\\.oas-tabs--${pos}\\) \\.nav\\s*\\{[^}]*\\}`))?.[0] ?? ''
      // 纵向 nav 必须去底边框（横向默认 border-bottom 在纵向会残留为最下一条横线）
      expect(verticalRule, `vertical(${pos}) .nav 应去掉 border-bottom`).toContain('border-bottom: none')
      // left → border-right / right → border-left
      expect(sideRule, `${pos} .nav 应有侧边竖线`).toContain(pos === 'left' ? 'border-right' : 'border-left')
    }
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
    expect(
      children.every((c) => c.getAttribute('role') === 'tab' && c.hasAttribute('data-value')),
    ).toBe(true)
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
      el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!.click()
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

  // ===== 批次 2b：more 视口外镜像下拉（滚动 + 视口外 tab 快捷跳转，通用） =====

  describe('more 视口外镜像下拉', () => {
    /**
     * mock 滚动几何（jsdom 无布局）：tablist scrollWidth/clientWidth/scrollLeft +
     * 各 tab offsetLeft/offsetWidth（每个 100px 宽，连续排布）
     */
    function mountMore(count = 10, eachWidth = 100, clientWidth = 400): OASTabs {
      const el = new OASTabs()
      el.setAttribute('more', '')
      el.innerHTML = Array.from(
        { length: count },
        (_, i) =>
          `<oas-tab-panel label="标签${i + 1}" value="t${i}"><p>内容${i + 1}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', {
        value: count * eachWidth,
        configurable: true,
      })
      Object.defineProperty(tablist, 'clientWidth', { value: clientWidth, configurable: true })
      Object.defineProperty(tablist, 'scrollLeft', { value: 0, writable: true, configurable: true })
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t, i) => {
        Object.defineProperty(t, 'offsetWidth', { value: eachWidth, configurable: true })
        Object.defineProperty(t, 'offsetLeft', { value: i * eachWidth, configurable: true })
      })
      return el
    }

    it('more 模式 tab 全部渲染不隐藏（无 data-overflowed display 收缩）', () => {
      const el = mountMore()
      ;(el as any).syncMore?.()
      const hidden = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')].filter((t) =>
        t.hasAttribute('data-overflowed'),
      )
      expect(hidden.length).toBe(0)
    })

    it('溢出时 more 按钮显示，不溢出时隐藏', () => {
      const el = mountMore(10, 100, 400) // 1000 > 400 溢出
      ;(el as any).syncMore?.()
      expect(el.shadowRoot!.querySelector('.more-btn')!.hasAttribute('hidden')).toBe(false)
      const el2 = mountMore(3, 100, 1000) // 300 < 1000 不溢出
      ;(el2 as any).syncMore?.()
      expect(el2.shadowRoot!.querySelector('.more-btn')!.hasAttribute('hidden')).toBe(true)
    })

    it('#18 部分滚出的 tab 也计入 offview 并进下拉（按钮显示、下拉非空）', () => {
      // overflow=400>391，t3 部分滚出（右缘 400 > 视口 390）→ 计入 offview；下拉含 t3，按钮显示
      const el = mountMore(4, 100, 390)
      ;(el as any).syncMore?.()
      expect(el.shadowRoot!.querySelector('.more-btn')!.hasAttribute('hidden')).toBe(false)
      const offview = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-offview]')].map((t) =>
        t.getAttribute('data-value'),
      )
      expect(offview).toEqual(['t3'])
      // 下拉非空：点开 more 应有条目
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      expect(el.shadowRoot!.querySelectorAll('.more-item').length).toBeGreaterThan(0)
    })

    it('#18 offview 判定为「不完全可见」：部分滚出右缘/左缘都计入，完全可见不计入', () => {
      // 视口 390，t3 右缘 400 超出 → offview；t0-t2 完全可见 → 不计入
      const el = mountMore(4, 100, 390)
      ;(el as any).updateMoreOffview?.()
      const offview = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-offview]')].map((t) =>
        t.getAttribute('data-value'),
      )
      expect(offview).toEqual(['t3'])
      // 滚出 50px：视口变 50~440，t0 左缘部分滚出（0<50）计入 offview；t3（300-400 全在视口内）不计入
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      ;(tablist as any).scrollLeft = 50
      ;(el as any).updateMoreOffview?.()
      const offview2 = [...el.shadowRoot!.querySelectorAll('[role="tab"][data-offview]')].map((t) =>
        t.getAttribute('data-value'),
      )
      expect(offview2).toEqual(['t0'])
    })

    it('more 下拉列出当前滚动视口之外的 tab', () => {
      const el = mountMore(10, 100, 400) // 视口 0~400，可见 t0-t3，视口外 t4-t9
      ;(el as any).syncMore?.()
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      const dropValues = [...el.shadowRoot!.querySelectorAll('.more-item')].map((i) =>
        i.getAttribute('data-value'),
      )
      // 视口外 t4-t9（下拉里），视口内 t0-t3 不在
      expect(dropValues).toContain('t9')
      expect(dropValues).not.toContain('t0')
      expect(dropValues).not.toContain('t3')
    })

    it('点选下拉项平滑滚动到可见区（scrollIntoView smooth）并激活', async () => {
      const el = mountMore(10, 100, 400)
      ;(el as any).syncMore?.()
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      const scrollCalls: { behavior?: string }[] = []
      const origSIV = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, opts?: ScrollIntoViewOptions) {
        scrollCalls.push(opts ?? {})
      }
      const item = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')].find(
        (i) => i.getAttribute('data-value') === 't9',
      )!
      item.click()
      await Promise.resolve()
      Element.prototype.scrollIntoView = origSIV
      // 点选后平滑滚动（smooth）到可见区 + 激活
      expect(scrollCalls.some((o) => o.behavior === 'smooth')).toBe(true)
      expect(el.getAttribute('active')).toBe('t9')
    })

    it('滚动后视口外集合更新（滚到中部后下拉内容变化）', async () => {
      const el = mountMore(10, 100, 400)
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      ;(el as any).syncMore?.()
      // 初始 scrollLeft=0：视口外 t4-t9
      const before = [
        ...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-offview]'),
      ].map((t) => t.getAttribute('data-value'))
      expect(before).toContain('t9')
      expect(before).not.toContain('t0')
      // 滚到最右（scrollLeft=600）：视口 600~1000，t0-t3 滚出视口（左），t6-t9 可见
      Object.defineProperty(tablist, 'scrollLeft', { value: 600, configurable: true })
      ;(el as any).updateMoreOffview?.()
      const after = [
        ...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-offview]'),
      ].map((t) => t.getAttribute('data-value'))
      expect(after).toContain('t0') // 左侧滚出
      expect(after).not.toContain('t9') // 右侧已在视口
    })

    it('键盘导航：moreBtn Enter/ArrowDown 打开并聚焦第一项；ArrowUp/Down/Home/End 遍历；Enter 激活；Escape 收起回焦 moreBtn（键盘可达溢出标签）', async () => {
      const el = mountMore(10, 100, 400)
      ;(el as any).syncMore?.()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      // moreBtn ArrowDown 打开下拉并聚焦第一项（非搜索框）
      moreBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')]
      expect(items.length).toBeGreaterThan(0)
      const activeEl = el.shadowRoot!.activeElement as HTMLElement
      expect(activeEl.classList.contains('more-item'), '打开后首焦点应落第一项').toBe(true)
      expect(activeEl.getAttribute('data-value')).toBe(items[0]!.getAttribute('data-value'))
      // ArrowDown 移到下一项
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
      expect(el.shadowRoot!.activeElement).toBe(items[1])
      // ArrowUp 回上一项
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      )
      expect(el.shadowRoot!.activeElement).toBe(items[0])
      // End 跳末项
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      )
      expect(el.shadowRoot!.activeElement).toBe(items[items.length - 1])
      // Home 回首项
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      )
      expect(el.shadowRoot!.activeElement).toBe(items[0])
      // Enter 激活当前项（等价点选：滚动 + 激活 value）
      const firstValue = items[0]!.getAttribute('data-value')!
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      )
      await Promise.resolve()
      expect(el.getAttribute('active')).toBe(firstValue)
      // 重新打开后 Escape 收起并回焦 moreBtn
      moreBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      el.shadowRoot!.querySelector('.more-dropdown')!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      expect(el.shadowRoot!.querySelector('.more-dropdown')!.hasAttribute('hidden')).toBe(true)
      expect(el.shadowRoot!.activeElement).toBe(moreBtn)
    })

    it('搜索框键盘：ArrowDown 从搜索进入第一项、Escape 从搜索收起（焦点不再卡死在搜索框）', () => {
      const el = mountMore(10, 100, 400)
      ;(el as any).syncMore?.()
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      const search = el.shadowRoot!.querySelector('.more-search') as HTMLInputElement
      if (search.hidden) return // 项 ≤5 无搜索框则跳过
      search.focus()
      const items = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')]
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      expect(el.shadowRoot!.activeElement).toBe(items[0])
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      expect(el.shadowRoot!.querySelector('.more-dropdown')!.hasAttribute('hidden')).toBe(true)
    })
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
      el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!.click()
      expect(beforeDetail).toEqual({ value: 'b' })
      expect(el.getAttribute('active')).toBe('b')
    })

    it('preventDefault 拦截切换（active 不变、不派发 oas-change）', () => {
      const el = mount()
      el.addEventListener('oas-before-change', (e) => e.preventDefault())
      let changed = 0
      el.addEventListener('oas-change', () => changed++)
      el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')[1]!.click()
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
      tabs[0]!.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }),
      )
      tabs[1]!.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }),
      )
      tabs[1]!.dispatchEvent(
        new DragEvent('drop', { bubbles: true, dataTransfer: dataTransfer as DataTransfer }),
      )
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

  describe('more 下拉搜索', () => {
    function mountMore(count = 10, eachWidth = 100, clientWidth = 400): OASTabs {
      const el = new OASTabs()
      el.setAttribute('more', '')
      el.innerHTML = Array.from(
        { length: count },
        (_, i) =>
          `<oas-tab-panel label="标签${i + 1}" value="t${i}"><p>内容${i + 1}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      Object.defineProperty(tablist, 'scrollWidth', {
        value: count * eachWidth,
        configurable: true,
      })
      Object.defineProperty(tablist, 'clientWidth', { value: clientWidth, configurable: true })
      Object.defineProperty(tablist, 'scrollLeft', { value: 0, writable: true, configurable: true })
      const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')
      tabs.forEach((t, i) => {
        Object.defineProperty(t, 'offsetWidth', { value: eachWidth, configurable: true })
        Object.defineProperty(t, 'offsetLeft', { value: i * eachWidth, configurable: true })
      })
      ;(el as any).syncMore?.()
      return el
    }

    it('more 下拉含搜索框（视口外项 >5 时）', () => {
      const el = mountMore()
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      moreBtn.click()
      const search = el.shadowRoot!.querySelector('.more-search')
      expect(search).not.toBeNull()
      expect(search!.getAttribute('placeholder') ?? search!.getAttribute('aria-label')).toBeTruthy()
    })

    it('搜索过滤：输入关键字只显示匹配的视口外项', async () => {
      const el = mountMore(10, 100, 300) // 视口 300 → 视口外 t3-t9（7 个）
      const moreBtn = el.shadowRoot!.querySelector('.more-btn') as HTMLElement
      moreBtn.click()
      await Promise.resolve()
      const search = el.shadowRoot!.querySelector('.more-search') as HTMLInputElement
      const allItems = () =>
        [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')].filter((i) => !i.hidden)
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

    it('点选视口外项后该项滚到可见（激活项+相邻项因连续排布一起进入视口）', async () => {
      // 通用机制：more 下拉是视口外 tab 的镜像，点选后 scrollIntoView 平滑滚动到可见区，
      // 激活项与相邻项因连续排布自然一起进入视口（无需 display 收缩 + 窗口滑动补丁）
      const el = mountMore(10, 100, 400)
      ;(el.shadowRoot!.querySelector('.more-btn') as HTMLElement).click()
      const scrollCalls: { behavior?: string }[] = []
      const origSIV = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, opts?: ScrollIntoViewOptions) {
        scrollCalls.push(opts ?? {})
      }
      const item = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.more-item')].find(
        (i) => i.getAttribute('data-value') === 't9',
      )!
      item.click()
      await Promise.resolve()
      Element.prototype.scrollIntoView = origSIV
      expect(scrollCalls.some((o) => o.behavior === 'smooth')).toBe(true)
      expect(el.getAttribute('active')).toBe('t9')
    })
  })

  // ===== 批次 7：trigger:hover / allow-deactivation / stacked / pageUp-Down / hide-indicator =====

  describe('trigger:hover 悬停切换', () => {
    it('默认 click：悬停不切换', () => {
      const el = mount()
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      tabB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      expect(el.getAttribute('active') ?? 'a').toBe('a')
    })

    it('trigger="hover"：悬停即切换并派发 oas-change', () => {
      const el = mount({ trigger: 'hover' })
      let changed = ''
      el.addEventListener('oas-change', (e) => (changed = (e as CustomEvent).detail.value))
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      tabB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      expect(el.getAttribute('active')).toBe('b')
      expect(changed).toBe('b')
    })

    it('trigger="hover"：悬停 disabled 标签不切换', () => {
      const el = new OASTabs()
      el.setAttribute('trigger', 'hover')
      el.innerHTML = `
        <oas-tab-panel label="A" value="a"><p>a</p></oas-tab-panel>
        <oas-tab-panel label="B" value="b" disabled><p>b</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      tabB.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      expect(el.getAttribute('active') ?? 'a').toBe('a')
    })
  })

  describe('allow-deactivation 取消激活', () => {
    it('默认：点击当前激活 tab 不取消（保持激活）', () => {
      const el = mount({ active: 'a' })
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      tabA.click()
      expect(el.getAttribute('active')).toBe('a')
      expect(tabA.getAttribute('aria-selected')).toBe('true')
    })

    it('allow-deactivation：点击当前激活 tab 取消激活（无选中态）', () => {
      const el = mount({ 'allow-deactivation': '', active: 'a' })
      el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!.click()
      expect(el.getAttribute('active')).toBe('')
      // update 重建后重新查询断言选中态
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabA.getAttribute('aria-selected')).toBe('false')
    })

    it('allow-deactivation：取消后点击其他 tab 正常激活', () => {
      const el = mount({ 'allow-deactivation': '', active: 'a' })
      el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!.click() // 取消 a
      expect(el.getAttribute('active')).toBe('')
      el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!.click()
      expect(el.getAttribute('active')).toBe('b')
    })
  })

  describe('stacked 图标上文字下', () => {
    it('stacked：标签 flex-direction: column（图标上文字下）', () => {
      const el = new OASTabs()
      el.setAttribute('stacked', '')
      el.innerHTML = '<oas-tab-panel label="消息" value="a" icon="mail"><p>内容</p></oas-tab-panel>'
      document.body.appendChild(el)
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(el.classList.contains('oas-tabs--stacked')).toBe(true)
      expect(style).toMatch(/oas-tabs--stacked[^{]*\.tab[^{]*\{[^}]*flex-direction:\s*column/)
    })
  })

  describe('hide-indicator 隐藏激活指示线', () => {
    it('hide-indicator：选中 tab 的 ::after 指示线隐藏', () => {
      const el = mount({ 'hide-indicator': '' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toMatch(
        /hide-indicator[^{]*::after[^{]*\{[^}]*display:\s*none|hide-indicator[^{]*\.tab::after/,
      )
    })
  })

  describe('PageUp/PageDown 键盘溢出滚动', () => {
    function mountOverflowKb(): OASTabs {
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

    it('PageDown：溢出时向后滚动一屏', () => {
      const el = mountOverflowKb()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      let scrolled = 0
      tablist.scrollBy = ((opts: ScrollToOptions) => {
        scrolled = (opts.left as number) ?? 0
      }) as typeof tablist.scrollBy
      tablist.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
      )
      expect(scrolled).toBeGreaterThan(0)
    })

    it('PageUp：溢出时向前滚动一屏', () => {
      const el = mountOverflowKb()
      const tablist = el.shadowRoot!.querySelector('.tablist') as HTMLElement
      let scrolled = 0
      tablist.scrollBy = ((opts: ScrollToOptions) => {
        scrolled = (opts.left as number) ?? 0
      }) as typeof tablist.scrollBy
      tablist.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }),
      )
      expect(scrolled).toBeLessThan(0)
    })
  })

  // ===== 批次 8：tab 即链接 + scroll-position =====

  describe('tab 即链接（href/target/rel）', () => {
    it('panel 设 href：tab 渲染为 <a> 链接（role=tab 保留）', () => {
      const el = new OASTabs()
      el.innerHTML = `
        <oas-tab-panel label="首页" value="a" href="/home"><p>内容</p></oas-tab-panel>
        <oas-tab-panel label="文档" value="b"><p>内容</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabA.tagName).toBe('A')
      expect(tabA.getAttribute('href')).toBe('/home')
      expect(tabA.getAttribute('role')).toBe('tab')
      // 无 href 的仍是 button
      const tabB = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!
      expect(tabB.tagName).toBe('BUTTON')
    })

    it('href 链接透传 target/rel', () => {
      const el = new OASTabs()
      el.innerHTML =
        '<oas-tab-panel label="外链" value="a" href="https://x.com" target="_blank" rel="noopener"><p>c</p></oas-tab-panel>'
      document.body.appendChild(el)
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabA.getAttribute('target')).toBe('_blank')
      expect(tabA.getAttribute('rel')).toBe('noopener')
    })
  })

  describe('scroll-position 激活滚动定位', () => {
    it('scroll-position="center"：激活滚动 inline 对齐 center', async () => {
      const el = new OASTabs()
      el.setAttribute('scroll-position', 'center')
      el.innerHTML = Array.from(
        { length: 8 },
        (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c${i}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const scrollCalls: ScrollIntoViewOptions[] = []
      const origSIV = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, opts?: ScrollIntoViewOptions) {
        scrollCalls.push(opts ?? {})
      }
      el.setAttribute('active', 't5')
      await Promise.resolve()
      Element.prototype.scrollIntoView = origSIV
      expect(scrollCalls.some((o) => o.inline === 'center')).toBe(true)
    })

    it('默认（未设 scroll-position）：激活滚动 inline nearest', async () => {
      const el = new OASTabs()
      el.innerHTML = Array.from(
        { length: 8 },
        (_, i) => `<oas-tab-panel label="标签${i}" value="t${i}"><p>c${i}</p></oas-tab-panel>`,
      ).join('')
      document.body.appendChild(el)
      const scrollCalls: ScrollIntoViewOptions[] = []
      const origSIV = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (this: Element, opts?: ScrollIntoViewOptions) {
        scrollCalls.push(opts ?? {})
      }
      el.setAttribute('active', 't5')
      await Promise.resolve()
      Element.prototype.scrollIntoView = origSIV
      expect(scrollCalls.some((o) => o.inline === 'nearest')).toBe(true)
    })
  })

  // ===== 批次 9：indicator 定制 + 增删图标 slot + 选中防抖 =====

  describe('indicator 指示条定制（CSS 变量开口）', () => {
    it('激活指示线 ::after 用 CSS 变量开口（--oas-tabs-indicator-color / -size）', () => {
      const el = mount()
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(style).toContain('var(--oas-tabs-indicator-color')
      expect(style).toContain('var(--oas-tabs-indicator-size')
    })
  })

  describe('增删图标 slot 可替换', () => {
    it('closable 关闭按钮支持 slot="close-icon" 自定义图标', () => {
      const el = new OASTabs()
      el.setAttribute('closable', '')
      el.innerHTML = `
        <oas-tab-panel label="标签一" value="a"><span slot="close-icon">✕✕</span><p>内容</p></oas-tab-panel>
        <oas-tab-panel label="标签二" value="b"><p>内容</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      const closeA = el.shadowRoot!.querySelector<HTMLElement>(
        '[role="tab"][data-value="a"] .tab-close',
      )!
      expect(closeA.textContent).toContain('✕✕')
      // 无 slot 的用默认 ×
      const closeB = el.shadowRoot!.querySelector<HTMLElement>(
        '[role="tab"][data-value="b"] .tab-close',
      )!
      expect(closeB.querySelector('svg')).not.toBeNull()
    })

    it('addable 新增按钮支持 slot="add-icon" 自定义图标', () => {
      const el = new OASTabs()
      el.setAttribute('addable', '')
      el.innerHTML = `
        <span slot="add-icon">＋＋</span>
        <oas-tab-panel label="标签一" value="a"><p>内容</p></oas-tab-panel>
      `
      document.body.appendChild(el)
      const add = el.shadowRoot!.querySelector<HTMLElement>('.tab-add')!
      expect(add.textContent).toContain('＋＋')
    })
  })

  describe('reserve-selected-space 选中加粗防抖', () => {
    it('reserve-selected-space：tab 用 ::before 预载选中态文字固定宽度（选中加粗不抖动）', () => {
      const el = mount({ 'reserve-selected-space': '' })
      const style = el.shadowRoot!.querySelector('style')!.textContent!
      expect(el.classList.contains('oas-tabs--reserve-space')).toBe(true)
      // 防抖机制：::before 预载 label 文字 + font-weight 500 固定宽度
      expect(style).toMatch(/reserve-space[^{]*\.tab/)
    })
  })

  // ===== 批次 10：纯导航模式 + items 数据驱动 + iconOnly =====

  describe('hide-content 纯导航模式', () => {
    it('hide-content：渲染标签栏但不渲染面板区（tabs 当导航条）', () => {
      const el = mount({ 'hide-content': '' })
      const panel = el.shadowRoot!.querySelector('.panel')
      expect(panel).toBeNull()
      // 标签栏仍正常渲染
      expect(el.shadowRoot!.querySelectorAll('[role="tab"]').length).toBe(2)
    })

    it('hide-content：切换仍派发 oas-change（宿主接管内容/路由）', () => {
      const el = mount({ 'hide-content': '' })
      let changed = ''
      el.addEventListener('oas-change', (e) => (changed = (e as CustomEvent).detail.value))
      el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="b"]')!.click()
      expect(changed).toBe('b')
    })

    it('默认（无 hide-content）：渲染面板区', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector('.panel')).not.toBeNull()
    })
  })

  describe('items 数据驱动', () => {
    it('items JSON 渲染标签 + 面板（无需 oas-tab-panel 子元素）', () => {
      const el = new OASTabs()
      el.setAttribute(
        'items',
        JSON.stringify([
          { label: '首页', value: 'home' },
          { label: '关于', value: 'about', icon: 'info' },
        ]),
      )
      document.body.appendChild(el)
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')
      expect(tabs.length).toBe(2)
      expect(tabs[0]!.getAttribute('data-value')).toBe('home')
      // items 生成的面板存在
      expect(el.querySelectorAll('oas-tab-panel').length).toBe(2)
    })

    it('items 数据驱动支持 icon/badge/disabled/href', () => {
      const el = new OASTabs()
      el.setAttribute(
        'items',
        JSON.stringify([
          { label: '首页', value: 'home', icon: 'mail', badge: '3' },
          { label: '外链', value: 'ext', href: 'https://x.com' },
          { label: '禁用', value: 'dis', disabled: true },
        ]),
      )
      document.body.appendChild(el)
      const home = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="home"]')!
      expect(home.querySelector('.tab-icon')).not.toBeNull()
      expect(home.querySelector('.tab-badge')).not.toBeNull()
      const ext = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="ext"]')!
      expect(ext.tagName).toBe('A')
      const dis = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="dis"]')!
      expect(dis.getAttribute('aria-disabled')).toBe('true')
    })

    it('items 与 oas-tab-panel 子元素并存时 items 优先（items 渲染，子元素忽略）', () => {
      const el = new OASTabs()
      el.setAttribute('items', JSON.stringify([{ label: 'A', value: 'a' }]))
      el.innerHTML = '<oas-tab-panel label="子元素" value="child"><p>c</p></oas-tab-panel>'
      document.body.appendChild(el)
      const tabs = el.shadowRoot!.querySelectorAll('[role="tab"][data-value]')
      expect(tabs.length).toBe(1)
      expect(tabs[0]!.getAttribute('data-value')).toBe('a')
    })
  })

  describe('icon-only 纯图标标签', () => {
    it('panel icon-only：标签只渲染图标无文字（需 aria-label 兜底）', () => {
      const el = new OASTabs()
      el.innerHTML =
        '<oas-tab-panel label="消息" value="a" icon="mail" icon-only><p>内容</p></oas-tab-panel>'
      document.body.appendChild(el)
      const tabA = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!
      expect(tabA.querySelector('.tab-icon')).not.toBeNull()
      expect(tabA.querySelector('.tab-label')).toBeNull() // 无文字
      expect(tabA.getAttribute('aria-label')).toBe('消息') // aria 兜底
    })
  })
})
