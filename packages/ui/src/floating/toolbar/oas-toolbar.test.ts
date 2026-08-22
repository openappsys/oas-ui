import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import {
  OASToolbar,
  OASToolbarToggle,
  OASToolbarSeparator,
  OASToolbarInput,
} from './index.js'
import '../../basic/button/index.js'

function mount(innerHTML = ''): OASToolbar {
  const el = new OASToolbar()
  el.innerHTML = innerHTML
  document.body.appendChild(el)
  return el
}

/** 把 `<oas-xxx attr="v" bare>` 字符串转成可控创建的 widget（attrs 逐个 setAttribute 后 append） */
function mountWidget<T extends HTMLElement>(cls: new () => T, tag: string, attrs: string, items?: string): T {
  const el = new cls()
  if (items != null) el.setAttribute('items', items)
  for (const m of attrs.matchAll(/([a-z-]+)="([^"]*)"/g)) {
    el.setAttribute(m[1]!, m[2]!)
  }
  // 裸布尔属性（无 = 值）
  for (const m of attrs.matchAll(/(?:^|\s)([a-z-]+)(?=\s|$)/g)) {
    const name = m[1]!
    if (name !== tag && !attrs.includes(`${name}=`)) el.setAttribute(name, '')
  }
  document.body.appendChild(el)
  return el
}

function buttons(el: OASToolbar): HTMLButtonElement[] {
  return [...el.querySelectorAll<HTMLButtonElement>('button')]
}

describe('OASToolbar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('宿主 role=toolbar + aria-label（locale 默认）', () => {
    const el = mount('<button>加粗</button><button>斜体</button>')
    expect(el.getAttribute('role')).toBe('toolbar')
    expect(el.getAttribute('aria-label')).toBe('工具栏')
  })

  it('aria-label 随 locale 切换', () => {
    const el = mount('<button>加粗</button>')
    setLocale(en)
    expect(el.getAttribute('aria-label')).toBe('Toolbar')
    setLocale('zh-CN')
    expect(el.getAttribute('aria-label')).toBe('工具栏')
  })

  it('roving tabindex：仅首项可 Tab 到达', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    expect(btns[0]!.getAttribute('tabindex')).toBe('0')
    expect(btns[1]!.getAttribute('tabindex')).toBe('-1')
    expect(btns[2]!.getAttribute('tabindex')).toBe('-1')
  })

  it('ArrowRight 移动焦点到下一按钮，ArrowLeft 回退', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[1])
    expect(btns[1]!.getAttribute('tabindex')).toBe('0')
    expect(btns[0]!.getAttribute('tabindex')).toBe('-1')
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(document.activeElement).toBe(btns[0])
  })

  it('ArrowRight 到末尾循环到第一项', () => {
    const el = mount('<button>加粗</button><button>斜体</button>')
    const btns = buttons(el)
    btns[1]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[0])
  })

  it('Home / End 跳转', () => {
    const el = mount('<button>加粗</button><button>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    btns[1]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }))
    expect(document.activeElement).toBe(btns[0])
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('禁用按钮不参与 roving', () => {
    const el = mount('<button>加粗</button><button disabled>斜体</button><button>下划线</button>')
    const btns = buttons(el)
    expect(btns[0]!.getAttribute('tabindex')).toBe('0')
    expect(btns[2]!.getAttribute('tabindex')).toBe('-1')
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('data-toolbar-ignore 排除项不参与', () => {
    const el = mount(
      '<button>加粗</button><button data-toolbar-ignore>忽略</button><button>斜体</button>',
    )
    const btns = buttons(el)
    expect(btns[1]!.getAttribute('tabindex')).toBeNull()
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[2])
  })

  it('自定义元素（oas-button）参与 roving', () => {
    const el = mount('<oas-button>加粗</oas-button><oas-button>斜体</oas-button>')
    const items = [...el.children] as HTMLElement[]
    expect(items[0]!.getAttribute('tabindex')).toBe('0')
    expect(items[1]!.getAttribute('tabindex')).toBe('-1')
    ;(items[0] as HTMLElement).focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(items[1])
    expect(items[1]!.getAttribute('tabindex')).toBe('0')
  })

  it('slotchange 后新增按钮自动参与 roving', () => {
    const el = mount('<button>加粗</button>')
    const btn = document.createElement('button')
    btn.textContent = '斜体'
    el.appendChild(btn)
    // slotchange 异步触发，需微任务等待
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        expect(btn.getAttribute('tabindex')).toBe('-1')
        resolve()
      })
    })
  })

  it('空工具栏不报错', () => {
    const el = mount()
    expect(el.getAttribute('role')).toBe('toolbar')
  })
})

// ============ 增强：orientation / loop / disabled / size / far / 链接 part ============

describe('OASToolbar 属性增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('orientation="vertical"：aria-orientation + vertical class', () => {
    const el = mount('<button>一</button>')
    el.setAttribute('orientation', 'vertical')
    expect(el.getAttribute('aria-orientation')).toBe('vertical')
    expect(el.classList.contains('vertical')).toBe(true)
  })

  it('默认 orientation：aria-orientation=horizontal', () => {
    const el = mount('<button>一</button>')
    expect(el.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('loop 默认开（false 关闭）：loop="false" 时末尾 ArrowRight 不循环、首项 ArrowLeft 不循环', () => {
    const el = mount('<button>一</button><button>二</button>')
    el.setAttribute('loop', 'false')
    const btns = buttons(el)
    btns[1]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[1])
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(document.activeElement).toBe(btns[0])
  })

  it('disabled：宿主 aria-disabled + inert，按钮不参与 roving', () => {
    const el = mount('<button>一</button><button>二</button>')
    el.setAttribute('disabled', '')
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.hasAttribute('inert')).toBe(true)
    expect(buttons(el)[0]!.hasAttribute('tabindex')).toBe(false)
  })

  it('disabled + focusable-when-disabled：项保持可聚焦（aria-disabled）且点击被拦截', () => {
    const el = mount('<button>一</button><button>二</button>')
    const btn = buttons(el)[0]!
    let clicks = 0
    btn.addEventListener('click', () => clicks++)
    el.setAttribute('disabled', '')
    el.setAttribute('focusable-when-disabled', '')
    expect(el.hasAttribute('inert')).toBe(false)
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.getAttribute('tabindex')).toBe('0')
    btn.click()
    expect(clicks).toBe(0)
  })

  it('disabled 解除后恢复 aria-disabled', () => {
    const el = mount('<button>一</button>')
    el.setAttribute('disabled', '')
    el.setAttribute('focusable-when-disabled', '')
    const btn = buttons(el)[0]!
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    el.removeAttribute('disabled')
    expect(btn.getAttribute('aria-disabled')).toBeNull()
  })

  it('size：宿主 CSS 变量 + 每个子项 data-size', () => {
    const el = mount('<button>一</button><oas-toolbar-toggle items=\'[{"label":"A","value":"a"}]\'></oas-toolbar-toggle>')
    el.setAttribute('size', 'small')
    expect(el.style.getPropertyValue('--oas-toolbar-size')).toBe('small')
    for (const c of [...el.children]) {
      expect(c.getAttribute('data-size')).toBe('small')
    }
  })

  it('is-attached：贴边形态样式规则存在（边框/圆角/底色/内边距走 token，dark 自动跟随）', () => {
    const el = mount('<button>一</button>')
    el.setAttribute('is-attached', '')
    const style = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // happy-dom 不解析 var() 计算值，断言规则存在且引用语义 token：
    // dark 下 --oas-color-border/--oas-color-bg-elevated 由主题表切变体，贴边形态自动跟随
    const rule = style.split(':host([is-attached]) {')[1]?.split('}')[0] ?? ''
    expect(rule, 'is-attached 贴边形态规则必须存在').not.toBe('')
    expect(rule).toContain('border: 1px solid var(--oas-color-border)')
    expect(rule).toContain('border-radius: var(--oas-radius-md)')
    expect(rule).toContain('background: var(--oas-color-bg-elevated)')
    expect(rule).toContain('padding: var(--oas-space-1)')
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('oas-toolbar-separator：role=separator + 自动 data-toolbar-ignore，不参与 roving', () => {
    const el = mount(
      '<button>一</button><oas-toolbar-separator></oas-toolbar-separator><button>二</button>',
    )
    const sep = el.querySelector('oas-toolbar-separator')!
    expect(sep.hasAttribute('data-toolbar-ignore')).toBe(true)
    expect(sep.hasAttribute('tabindex')).toBe(false)
    const btns = buttons(el)
    btns[0]!.focus()
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).toBe(btns[1])
  })

  it('data-toolbar-far：首个 far 项 margin-inline-start:auto（其余不设）', () => {
    const el = mount('<button>一</button><button data-toolbar-far>二</button><button>三</button>')
    const btns = buttons(el)
    expect(btns[1]!.style.getPropertyValue('margin-inline-start')).toBe('auto')
    expect(btns[0]!.style.getPropertyValue('margin-inline-start')).not.toBe('auto')
    expect(btns[2]!.style.getPropertyValue('margin-inline-start')).not.toBe('auto')
  })

  it('vertical + data-toolbar-far：margin-block-start:auto', () => {
    const el = mount('<button>一</button><button data-toolbar-far>二</button>')
    el.setAttribute('orientation', 'vertical')
    expect(buttons(el)[1]!.style.getPropertyValue('margin-block-start')).toBe('auto')
  })

  it('a[href] 链接项获得 part="link"', () => {
    const el = mount('<a href="#">帮助</a><button>一</button>')
    const link = el.querySelector('a')!
    expect(link.getAttribute('part')).toBe('link')
    expect(link.getAttribute('tabindex')).toBe('0')
  })

  it('焦点在 oas-toolbar-input 内部时方向键不移动工具栏焦点（文本编辑豁免）', () => {
    const el = mount('<oas-toolbar-input></oas-toolbar-input><button>一</button>')
    const host = el.querySelector('oas-toolbar-input')!
    const inner = host.shadowRoot!.querySelector('input') as HTMLInputElement
    inner.focus()
    expect(host.shadowRoot!.activeElement).toBe(inner)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).not.toBe(buttons(el)[0])
    expect(host.shadowRoot!.activeElement).toBe(inner)
  })

  it('焦点在 oas-toolbar-toggle 内部时方向键不移动工具栏焦点（复合组件接管）', () => {
    const el = mount(
      '<oas-toolbar-toggle items=\'[{"label":"A","value":"a"},{"label":"B","value":"b"}]\'></oas-toolbar-toggle><button>一</button>',
    )
    const tg = el.querySelector('oas-toolbar-toggle')!
    const btnA = tg.shadowRoot!.querySelectorAll('button')[0] as HTMLButtonElement
    btnA.focus()
    expect(tg.shadowRoot!.activeElement).toBe(btnA)
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(document.activeElement).not.toBe(buttons(el)[0])
    expect(tg.shadowRoot!.activeElement).toBe(btnA)
  })

  it('overflow：窄容器溢出项收进「···」，镜像项点击派发到原控件', () => {
    const el = mount('<button>一</button><button>二</button><button>三</button>')
    const btns = buttons(el)
    let clicked = 0
    btns[1]!.addEventListener('click', () => clicked++)
    Object.defineProperty(el, 'clientWidth', { value: 130, configurable: true })
    // 溢出判定走 scrollWidth > clientWidth（真实溢出，防 shrink-to-fit 假溢出），mock 之
    Object.defineProperty(el, 'scrollWidth', { value: 192, configurable: true })
    for (const b of btns) Object.defineProperty(b, 'offsetWidth', { value: 60, configurable: true })
    const moreBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="more"]')!
    Object.defineProperty(moreBtn, 'offsetWidth', { value: 20, configurable: true })
    el.syncOverflow()
    expect(moreBtn.hidden).toBe(false)
    expect(btns[0]!.hasAttribute('data-collapsed')).toBe(false)
    expect(btns[1]!.hasAttribute('data-collapsed')).toBe(true)
    expect(btns[2]!.hasAttribute('data-collapsed')).toBe(true)
    // 打开弹层
    moreBtn.click()
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!
    expect(panel.hidden).toBe(false)
    const mirrors = panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(mirrors.length).toBe(2)
    mirrors[0]!.click()
    expect(clicked).toBe(1)
  })

  it('overflow：无溢出时「···」隐藏', () => {
    const el = mount('<button>一</button>')
    const moreBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="more"]')!
    expect(moreBtn.hidden).toBe(true)
  })

  it('overflow：点「···」再点一次收起，Esc 关闭', () => {
    const el = mount('<button>一</button>')
    const moreBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="more"]')!
    const panel = el.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!
    moreBtn.click()
    expect(panel.hidden).toBe(false)
    moreBtn.click()
    expect(panel.hidden).toBe(true)
    moreBtn.click()
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(panel.hidden).toBe(true)
  })
})

// ============ oas-toolbar-toggle 切换组 ============

const TOGGLE_ITEMS =
  '[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'

describe('OASToolbarToggle', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认单选：value 驱动 aria-pressed，点击切换 + oas-change', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', 'value="bold"', TOGGLE_ITEMS)
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    expect(btns.length).toBe(3)
    expect(btns[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(btns[1]!.getAttribute('aria-pressed')).toBe('false')
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('italic')
    expect(detail).toEqual({ value: 'italic' })
    expect(btns[1]!.getAttribute('aria-pressed')).toBe('true')
    expect(btns[0]!.getAttribute('aria-pressed')).toBe('false')
  })

  it('单选点已选中项不变更、不派发事件', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', 'value="bold"', TOGGLE_ITEMS)
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btns[0]!.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBe('bold')
  })

  it('multiple：多选切换 + value 为 JSON 数组', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', 'multiple', TOGGLE_ITEMS)
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('["bold","italic"]')
    expect(detail).toEqual({ value: ['bold', 'italic'] })
    btns[0]!.click()
    expect(el.getAttribute('value')).toBe('["italic"]')
  })

  it('disabled 项不参与选择', () => {
    const el = mountWidget(
      OASToolbarToggle,
      'oas-toolbar-toggle',
      '',
      '[{"label":"A","value":"a"},{"label":"B","value":"b","disabled":true}]',
    )
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    expect(btns[1]!.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btns[1]!.click()
    expect(fired).toBe(0)
  })

  it('单选内部键盘：方向键移动并选中；多选方向键只移动、Space 切换', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', '', TOGGLE_ITEMS)
    const group = el.shadowRoot!.querySelector('.group')!
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    btns[0]!.focus()
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('italic')

    const el2 = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', 'multiple', TOGGLE_ITEMS)
    const group2 = el2.shadowRoot!.querySelector('.group')!
    const b2 = el2.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    b2[0]!.focus()
    group2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el2.getAttribute('value')).toBeNull()
    group2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(el2.getAttribute('value')).toBe('["italic"]')
  })

  it('宿主聚焦转发到内部按钮（复合组件单 Tab 停靠）', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', '', TOGGLE_ITEMS)
    const btns = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
    btns[1]!.focus()
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
  })

  it('容器 role=group + aria-label（locale）', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', '', TOGGLE_ITEMS)
    const group = el.shadowRoot!.querySelector('.group')!
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-label')).toBe('切换组')
  })

  it('选中态样式走 primary token 体系（light/dark 主题切换生效的先决条件，禁硬编码色值）', () => {
    const el = mountWidget(OASToolbarToggle, 'oas-toolbar-toggle', 'value="bold"', TOGGLE_ITEMS)
    const style = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    // happy-dom 不解析 var() 计算值，断言规则存在且引用语义 token：
    // dark 下 --oas-color-primary/--oas-color-text-on-primary 由主题表切变体，选中态自动跟随
    const rule = style.split(".item[aria-pressed='true'] {")[1]?.split('}')[0] ?? ''
    expect(rule, '选中态规则必须存在').not.toBe('')
    expect(rule).toContain('background: var(--oas-color-primary)')
    expect(rule).toContain('border-color: var(--oas-color-primary)')
    expect(rule).toContain('color: var(--oas-color-text-on-primary)')
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    // hover 态同样走 primary-hover token（dark 反转为提亮）
    const hoverRule = style.split(".item[aria-pressed='true']:hover {")[1]?.split('}')[0] ?? ''
    expect(hoverRule).toContain('background: var(--oas-color-primary-hover)')
  })
})

// ============ oas-toolbar-separator 分隔符 ============

describe('OASToolbarSeparator', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('role=separator + 自动 data-toolbar-ignore', () => {
    const sep = new OASToolbarSeparator()
    document.body.appendChild(sep)
    expect(sep.getAttribute('role')).toBe('separator')
    expect(sep.hasAttribute('data-toolbar-ignore')).toBe(true)
  })

  it('横向工具栏内：aria-orientation=vertical（竖线）', () => {
    const tb = new OASToolbar()
    document.body.appendChild(tb)
    tb.innerHTML = '<oas-toolbar-separator></oas-toolbar-separator>'
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const sep = tb.querySelector('oas-toolbar-separator')!
        expect(sep.getAttribute('aria-orientation')).toBe('vertical')
        resolve()
      })
    })
  })

  it('纵向工具栏内：aria-orientation=horizontal + vertical class', () => {
    const tb = new OASToolbar()
    tb.setAttribute('orientation', 'vertical')
    document.body.appendChild(tb)
    tb.innerHTML = '<oas-toolbar-separator></oas-toolbar-separator>'
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        const sep = tb.querySelector('oas-toolbar-separator')!
        expect(sep.getAttribute('aria-orientation')).toBe('horizontal')
        expect(sep.classList.contains('vertical')).toBe(true)
        resolve()
      })
    })
  })
})

// ============ oas-toolbar-input 输入框部件 ============

describe('OASToolbarInput', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('placeholder / value 同步到内部 input', () => {
    const el = new OASToolbarInput()
    el.setAttribute('placeholder', '搜索')
    el.setAttribute('value', 'abc')
    document.body.appendChild(el)
    const inner = el.shadowRoot!.querySelector('input')!
    expect(inner.getAttribute('placeholder')).toBe('搜索')
    expect(inner.value).toBe('abc')
  })

  it('输入派发 oas-input，Enter 派发 oas-change', () => {
    const el = new OASToolbarInput()
    document.body.appendChild(el)
    const inner = el.shadowRoot!.querySelector('input') as HTMLInputElement
    let inputDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-input', (e) => (inputDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e) => (changeDetail = (e as CustomEvent).detail))
    inner.value = '你好'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    expect(inputDetail).toEqual({ value: '你好' })
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(changeDetail).toEqual({ value: '你好' })
  })

  it('disabled：内部 input disabled', () => {
    const el = new OASToolbarInput()
    el.setAttribute('disabled', '')
    document.body.appendChild(el)
    const inner = el.shadowRoot!.querySelector('input') as HTMLInputElement
    expect(inner.disabled).toBe(true)
  })

  it('宿主聚焦转发到内部 input', () => {
    const el = new OASToolbarInput()
    document.body.appendChild(el)
    const inner = el.shadowRoot!.querySelector('input')!
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(inner)
  })
})
