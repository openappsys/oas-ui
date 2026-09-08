import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCollapse, OASCollapseItem } from './index.js'

function mount(attrs: Record<string, string> = {}, items?: string): OASCollapse {
  const el = new OASCollapse()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML =
    items ??
    `
    <oas-collapse-item name="a" header="面板一"><p>内容一</p></oas-collapse-item>
    <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
  `
  document.body.appendChild(el)
  return el
}

function head(item: OASCollapseItem): HTMLButtonElement {
  return item.shadowRoot!.querySelector<HTMLButtonElement>('[part="head"]')!
}

function clickHead(item: OASCollapseItem): void {
  head(item).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

function press(item: OASCollapseItem, key: string): void {
  head(item).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }),
  )
}

function items(el: OASCollapse): OASCollapseItem[] {
  return Array.from(el.querySelectorAll(':scope > oas-collapse-item')) as OASCollapseItem[]
}

describe('OASCollapse', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认收起', () => {
    const el = mount()
    expect(items(el)[0]!.getAttribute('open')).toBeNull()
  })

  it('active 受控展开并派发 oas-change', () => {
    const el = mount()
    el.setAttribute('active', 'a')
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    expect(items(el)[0]!.getAttribute('open')).not.toBeNull()
    clickHead(items(el)[0]!)
    expect(detail).toEqual({ active: [] })
  })

  it('手风琴：展开新的收起旧的，再点已展开项全部收起', () => {
    const el = mount({ accordion: '', active: 'a' })
    clickHead(items(el)[1]!)
    expect(el.getAttribute('active')).toBe('b')
    clickHead(items(el)[1]!)
    expect(el.getAttribute('active')).toBe('')
  })

  describe('default-active 非受控', () => {
    it('无 active 属性时按 default-active 初值展开，且不写回 active 属性', () => {
      const el = mount({ 'default-active': 'a,b' })
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
      expect(items(el)[1]!.hasAttribute('open')).toBe(true)
      expect(el.hasAttribute('active')).toBe(false)
    })

    it('非受控下点击切换内部状态并派 oas-change', () => {
      const el = mount({ 'default-active': 'a' })
      let detail: unknown
      el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
      clickHead(items(el)[1]!)
      expect(detail).toEqual({ active: ['a', 'b'] })
      expect(items(el)[1]!.hasAttribute('open')).toBe(true)
      expect(el.hasAttribute('active')).toBe(false)
    })

    it('active 属性在场则受控，default-active 不生效', () => {
      const el = mount({ active: 'a', 'default-active': 'b' })
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
      expect(items(el)[1]!.hasAttribute('open')).toBe(false)
    })

    it('手风琴下 default-active 初值收敛为首个', () => {
      const el = mount({ accordion: '', 'default-active': 'a,b' })
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
      expect(items(el)[1]!.hasAttribute('open')).toBe(false)
    })
  })

  describe('variant 无边框', () => {
    it('borderless：CSS 去掉组边框圆角与项分隔线', () => {
      const el = mount({ variant: 'borderless' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[variant="borderless"\]\)\s*\.group\s*\{[^}]*border:\s*none/)
      expect(css).toMatch(
        /:host\(\[variant="borderless"\]\)\s*\.item\s*\{[^}]*border-bottom:\s*none/,
      )
    })

    it('默认 outlined 保留组边框', () => {
      const el = mount()
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.group\s*\{[^}]*border:\s*1px solid var\(--oas-color-border\)/)
    })
  })

  describe('icon-placement 图标位置', () => {
    it('容器级 start 传播到各 item（item 未自定义时）', () => {
      const el = mount({ 'icon-placement': 'start' })
      for (const it of items(el)) expect(it.getAttribute('icon-placement')).toBe('start')
    })

    it('item 自定义 icon-placement 不被容器覆盖', () => {
      const el = mount(
        { 'icon-placement': 'start' },
        `
        <oas-collapse-item name="a" header="面板一" icon-placement="end"><p>内容一</p></oas-collapse-item>
      `,
      )
      expect(items(el)[0]!.getAttribute('icon-placement')).toBe('end')
    })

    it('start 时箭头 order 左置的 CSS 规则存在', () => {
      const el = mount({ 'icon-placement': 'start' })
      const css = items(el)[0]!.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[icon-placement="start"\]\)\s*\.arrow\s*\{[^}]*order:\s*0/)
    })
  })

  describe('键盘 roving', () => {
    it('初始首个可用头 button tabindex=0，其余 -1', () => {
      const el = mount()
      expect(head(items(el)[0]!).getAttribute('tabindex')).toBe('0')
      expect(head(items(el)[1]!).getAttribute('tabindex')).toBe('-1')
    })

    it('ArrowDown/ArrowUp 移动 roving 焦点与 tabindex', () => {
      const el = mount()
      press(items(el)[0]!, 'ArrowDown')
      expect(head(items(el)[1]!).getAttribute('tabindex')).toBe('0')
      expect(head(items(el)[0]!).getAttribute('tabindex')).toBe('-1')
      expect(items(el)[1]!.shadowRoot!.activeElement ?? document.activeElement).toBe(
        head(items(el)[1]!),
      )
      press(items(el)[1]!, 'ArrowUp')
      expect(head(items(el)[0]!).getAttribute('tabindex')).toBe('0')
    })

    it('Home/End 跳到首尾', () => {
      const el = mount()
      press(items(el)[0]!, 'End')
      expect(head(items(el)[1]!).getAttribute('tabindex')).toBe('0')
      press(items(el)[1]!, 'Home')
      expect(head(items(el)[0]!).getAttribute('tabindex')).toBe('0')
    })

    it('disabled 项不参与 roving（恒 -1，方向键跳过）', () => {
      const el = mount(
        {},
        `
        <oas-collapse-item name="a" header="面板一" disabled><p>内容一</p></oas-collapse-item>
        <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
      `,
      )
      expect(head(items(el)[0]!).getAttribute('tabindex')).toBe('-1')
      expect(head(items(el)[1]!).getAttribute('tabindex')).toBe('0')
    })
  })

  describe('disabled 面板', () => {
    it('点击 disabled 项不切换、不派 oas-change', () => {
      const el = mount(
        { active: 'a' },
        `
        <oas-collapse-item name="a" header="面板一" disabled><p>内容一</p></oas-collapse-item>
        <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
      `,
      )
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      clickHead(items(el)[0]!)
      expect(el.getAttribute('active')).toBe('a')
      expect(fired).toBe(0)
    })

    it('disabled：头 button 带 disabled 与 aria-disabled，置灰样式走 token', () => {
      const el = mount(
        {},
        `
        <oas-collapse-item name="a" header="面板一" disabled><p>内容一</p></oas-collapse-item>
      `,
      )
      const btn = head(items(el)[0]!)
      expect(btn.disabled).toBe(true)
      expect(btn.getAttribute('aria-disabled')).toBe('true')
      const css = items(el)[0]!.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/:host\(\[disabled\]\)[\s\S]{0,200}opacity:\s*0?\.6/)
      expect(css).toContain('var(--oas-color-text-disabled)')
    })
  })

  describe('no-collapse 强锁', () => {
    it('展开后点自身不收，也不派 oas-change', () => {
      const el = mount(
        { active: 'a' },
        `
        <oas-collapse-item name="a" header="面板一" no-collapse><p>内容一</p></oas-collapse-item>
        <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
      `,
      )
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      clickHead(items(el)[0]!)
      expect(el.getAttribute('active')).toBe('a')
      expect(fired).toBe(0)
    })

    it('强锁项关闭时仍可正常展开', () => {
      const el = mount(
        {},
        `
        <oas-collapse-item name="a" header="面板一" no-collapse><p>内容一</p></oas-collapse-item>
      `,
      )
      let detail: unknown
      el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
      clickHead(items(el)[0]!)
      expect(detail).toEqual({ active: ['a'] })
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
    })
  })

  describe('oas-before-collapse 可取消事件', () => {
    it('detail 携带 { name, next }', () => {
      const el = mount({ active: 'a' })
      let detail: unknown
      el.addEventListener('oas-before-collapse', (e: Event) => (detail = (e as CustomEvent).detail))
      clickHead(items(el)[1]!)
      expect(detail).toEqual({ name: 'b', next: ['a', 'b'] })
    })

    it('preventDefault 阻止收起', () => {
      const el = mount({ active: 'a' })
      el.addEventListener('oas-before-collapse', (e: Event) => e.preventDefault())
      let fired = 0
      el.addEventListener('oas-change', () => fired++)
      clickHead(items(el)[0]!)
      expect(el.getAttribute('active')).toBe('a')
      expect(fired).toBe(0)
    })

    it('未拦截时正常切换', () => {
      const el = mount({ active: 'a' })
      clickHead(items(el)[0]!)
      expect(el.getAttribute('active')).toBe('')
    })
  })

  describe('expandAll / collapseAll 方法', () => {
    it('expandAll 展开全部可用项并派 oas-change', () => {
      const el = mount()
      let detail: unknown
      el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
      el.expandAll()
      expect(detail).toEqual({ active: ['a', 'b'] })
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
      expect(items(el)[1]!.hasAttribute('open')).toBe(true)
    })

    it('expandAll 跳过 disabled 项', () => {
      const el = mount(
        {},
        `
        <oas-collapse-item name="a" header="面板一" disabled><p>内容一</p></oas-collapse-item>
        <oas-collapse-item name="b" header="面板二"><p>内容二</p></oas-collapse-item>
      `,
      )
      el.expandAll()
      expect(items(el)[0]!.hasAttribute('open')).toBe(false)
      expect(items(el)[1]!.hasAttribute('open')).toBe(true)
    })

    it('手风琴下 expandAll 语义为只展开第一项', () => {
      const el = mount({ accordion: '' })
      el.expandAll()
      expect(items(el)[0]!.hasAttribute('open')).toBe(true)
      expect(items(el)[1]!.hasAttribute('open')).toBe(false)
    })

    it('collapseAll 收起全部', () => {
      const el = mount({ active: 'a,b' })
      el.collapseAll()
      expect(el.getAttribute('active')).toBe('')
      expect(items(el)[0]!.hasAttribute('open')).toBe(false)
    })
  })

  describe('嵌套面板', () => {
    it('内层面板切换不干扰外层 active', () => {
      const el = mount(
        { active: 'outer' },
        `
        <oas-collapse-item name="outer" header="外层">
          <oas-collapse id="inner">
            <oas-collapse-item name="in-a" header="内层 A"><p>内容</p></oas-collapse-item>
            <oas-collapse-item name="in-b" header="内层 B"><p>内容</p></oas-collapse-item>
          </oas-collapse>
        </oas-collapse-item>
      `,
      )
      const inner = el.querySelector<OASCollapse>('#inner')!
      clickHead(items(inner)[0]!)
      expect(items(inner)[0]!.hasAttribute('open')).toBe(true)
      expect(el.getAttribute('active')).toBe('outer')
      // 外层 item 同步只作用于直接子项，内层 item 不被外层误设 open
      expect(items(inner)[0]!.hasAttribute('open')).toBe(true)
    })
  })

  describe('heading-level 标题语义', () => {
    it('容器级 heading-level 传播到 item，标题区带 role=heading + aria-level', () => {
      const el = mount({ 'heading-level': '3' })
      const heading = items(el)[0]!.shadowRoot!.querySelector<HTMLElement>('[part="heading"]')!
      expect(heading.getAttribute('role')).toBe('heading')
      expect(heading.getAttribute('aria-level')).toBe('3')
    })

    it('默认无 heading 语义（role 缺席）', () => {
      const el = mount()
      const heading = items(el)[0]!.shadowRoot!.querySelector<HTMLElement>('[part="heading"]')!
      expect(heading.hasAttribute('role')).toBe(false)
    })
  })
  it('item 未升级窗口（define 顺序）：容器方法调用可空防御不抛错，requestSync 重同步', () => {
    // 回归：曾现 item 升级晚于容器时容器 update→syncRoving 调 isDisabled 抛 TypeError（页面 16 处 pageerror）。
    // 未升级元素无类方法：用无方法替身直接喂给容器私有路径（绕开已注册标签的自动升级与生命周期联动）。
    const el = mount({ active: 'a' })
    const fake = document.createElement('div')
    const origItems = (el as unknown as { items: () => unknown[] }).items
    ;(el as unknown as { items: () => unknown[] }).items = () => [fake]
    expect(() => el.requestSync()).not.toThrow()
    expect(() => el.expandAll()).not.toThrow()
    ;(el as unknown as { items: () => unknown[] }).items = origItems
    // 复原后重同步（替身期间命令式方法改写过 active，重置回受控初值）：open 反射与 roving 恢复一致
    el.setAttribute('active', 'a')
    el.requestSync()
    expect(items(el)[0]!.getAttribute('open')).not.toBeNull()
  })
})

describe('OASCollapseItem', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountItem(html: string, attrs: Record<string, string> = {}): OASCollapseItem {
    const el = new OASCollapseItem()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = html
    document.body.appendChild(el)
    return el
  }

  it('header 属性渲染标题文本，button 带 aria-expanded 随 open 同步', () => {
    const el = mountItem('<p>内容</p>', { header: '标题' })
    expect(el.shadowRoot!.querySelector('[part="header"]')!.textContent).toBe('标题')
    const btn = head(el)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    el.setAttribute('open', '')
    expect(btn.getAttribute('aria-expanded')).toBe('true')
  })

  it('slot="header" 富标题优先于 header 属性', () => {
    const el = mountItem('<span slot="header"><b>富</b>标题</span><p>内容</p>', {
      header: '属性标题',
    })
    expect(el.hasAttribute('has-header-slot')).toBe(true)
    const slotEl = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="header"]')!
    const assigned = slotEl.assignedNodes().map((n) => n.textContent).join('')
    expect(assigned).toContain('富')
    expect(el.shadowRoot!.querySelector('[part="header"]')!.textContent).not.toContain('属性标题')
  })

  it('slot="extra" 渲染操作区，点击不触发展开（组件内 stopPropagation）', () => {
    const el = mountItem('<p>内容</p><button slot="extra" id="x">操作</button>', {
      header: '标题',
    })
    expect(el.hasAttribute('has-extra')).toBe(true)
    const extra = el.shadowRoot!.querySelector<HTMLElement>('[part="extra"]')!
    expect(extra.querySelector('slot')!.getAttribute('name')).toBe('extra')
    let clicked = 0
    el.addEventListener('oas-collapse-item-click', () => clicked++)
    // happy-dom 不把 slotted 事件投递进 shadow 路径，直接验证宿主侧：extra 点击不派 item-click
    el.querySelector('#x')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(clicked).toBe(0)
    // 机制验证：shadow 内 .extra 上的 stopPropagation 真实存在且拦截冒泡（真实浏览器中 slotted 点击走同一条路径）
    let bubbled = 0
    el.addEventListener('click', () => bubbled++)
    extra.querySelector('slot')!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(bubbled).toBe(0)
  })

  it('自定义展开图标：template[slot="toggle"] 克隆进箭头位', () => {
    const el = mountItem(
      '<template slot="toggle"><svg id="my-icon" viewBox="0 0 16 16"></svg></template><p>内容</p>',
      { header: '标题' },
    )
    expect(el.shadowRoot!.querySelector('#my-icon')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="arrow"]')!.textContent).not.toContain('›')
  })

  it('无自定义图标时箭头渲染默认字符', () => {
    const el = mountItem('<p>内容</p>', { header: '标题' })
    expect(el.shadowRoot!.querySelector('[part="arrow"]')!.textContent).toContain('›')
  })

  describe('渲染策略', () => {
    it('destroy-on-collapse：收起时默认 slot 不渲染，展开后恢复', () => {
      const el = mountItem('<p id="c">内容</p>', {
        header: '标题',
        'destroy-on-collapse': '',
      })
      expect(el.shadowRoot!.querySelector('slot:not([name])')).toBeNull()
      el.setAttribute('open', '')
      expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull()
      el.removeAttribute('open')
      expect(el.shadowRoot!.querySelector('slot:not([name])')).toBeNull()
    })

    it('默认策略：内容常驻 DOM（收起时 slot 仍在）', () => {
      const el = mountItem('<p>内容</p>', { header: '标题' })
      expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull()
    })

    it('force-render 优先于 destroy-on-collapse：收起时仍渲染', () => {
      const el = mountItem('<p>内容</p>', {
        header: '标题',
        'destroy-on-collapse': '',
        'force-render': '',
      })
      expect(el.shadowRoot!.querySelector('slot:not([name])')).not.toBeNull()
    })
  })

  describe('展开动画', () => {
    it('body 走 grid-template-rows 0fr→1fr 过渡，含 prefers-reduced-motion 停用', () => {
      const el = mountItem('<p>内容</p>', { header: '标题' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.body-wrap\s*\{[^}]*grid-template-rows:\s*0fr/)
      expect(css).toMatch(/:host\(\[open\]\)\s*\.body-wrap\s*\{[^}]*grid-template-rows:\s*1fr/)
      expect(css).toMatch(/grid-template-rows[^;]*var\(--oas-transition-base\)/)
      expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    })
  })

  it('focus-visible 焦点环走 --oas-focus-ring', () => {
    const el = mountItem('<p>内容</p>', { header: '标题' })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.head:focus-visible\s*\{[^}]*var\(--oas-focus-ring\)/)
  })
})
