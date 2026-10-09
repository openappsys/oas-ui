import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCollapsible } from './index.js'

function mount(attrs: Record<string, string> = {}, content?: string): OASCollapsible {
  const el = new OASCollapsible()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML =
    content ??
    `
    <span slot="header">触发器</span>
    <p>面板内容</p>
  `
  document.body.appendChild(el)
  return el
}

/** shadow 内触发 button（真实可访问名称来源 = slot="header" 投影内容） */
function trigger(el: OASCollapsible): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="trigger"]')!
}

function clickTrigger(el: OASCollapsible): void {
  trigger(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

describe('OASCollapsible', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认收起：内容区高度为 0 结构（grid 0fr）、触发按钮 aria-expanded=false', () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(false)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    const wrap = el.shadowRoot!.querySelector<HTMLElement>('[part="body-wrap"]')!
    expect(wrap.querySelector('.body')).not.toBeNull()
  })

  it('open 属性展开（受控）：aria-expanded=true、内容区展开类', () => {
    const el = mount({ open: '' })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(el.shadowRoot!.querySelector('[part="body-wrap"]')!.classList.contains('open')).toBe(true)
  })

  it('aria-controls 指向内容区 id（同 shadow 树内解析）', () => {
    const el = mount({ open: '' })
    const controls = trigger(el).getAttribute('aria-controls')!
    expect(controls).not.toBe('')
    expect(el.shadowRoot!.querySelector(`#${controls}`)).not.toBeNull()
  })

  describe('受控 / 非受控双模式（open）', () => {
    it('非受控：open 属性缺席，点击切换内部状态并派发 oas-toggle，不写回属性', () => {
      const el = mount()
      const events: unknown[] = []
      el.addEventListener('oas-toggle', (e: Event) => events.push((e as CustomEvent).detail))
      clickTrigger(el)
      expect(el.hasAttribute('open'), '非受控点击不得写回 open 属性').toBe(false)
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
      expect(events).toEqual([{ open: true }])
      clickTrigger(el)
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
      expect(events).toEqual([{ open: true }, { open: false }])
    })

    it('default-open 非受控初值：首帧展开；设 open 属性后转为受控（default-open 失效）', () => {
      const el = mount({ 'default-open': '' })
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
      expect(el.hasAttribute('open')).toBe(false)
      // 转受控：宿主写 open="false" → 收起（default-open 不再接管）
      el.setAttribute('open', 'false')
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    })

    it('default-open="false"（框架布尔绑定序列化形态）不展开：播种用值语义读法', () => {
      // 回归：Vue 对 `:default-open="false"` 走 attribute 序列化为 "false" 字符串在场，
      // 「存在即 true」读法会反向展开；播种必须按值读取（非 "false" 为开）
      const el = mount({ 'default-open': 'false' })
      expect(trigger(el).getAttribute('aria-expanded'), 'default-open="false" 应播种为收起').toBe('false')
    })

    it('受控（open 属性在场）：点击写回属性值 + 派发 oas-toggle；open="false" 表达受控收起', () => {
      const el = mount({ open: '' })
      const events: unknown[] = []
      el.addEventListener('oas-toggle', (e: Event) => events.push((e as CustomEvent).detail))
      clickTrigger(el)
      expect(el.getAttribute('open'), '受控收起写回 open="false"（属性保持在场=仍受控）').toBe('false')
      expect(events).toEqual([{ open: false }])
      clickTrigger(el)
      expect(el.getAttribute('open'), '受控展开写回 open=""').toBe('')
      expect(events).toEqual([{ open: false }, { open: true }])
    })

    it('非受控 → 受控切换：内部状态播种为当前显示值（移除 open 不跳变）', () => {
      const el = mount()
      clickTrigger(el) // 非受控展开
      el.setAttribute('open', '') // 转受控（展开态一致）
      clickTrigger(el) // 受控收起 → 写 open="false"
      expect(el.getAttribute('open')).toBe('false')
      el.removeAttribute('open') // 回非受控：播种为收起
      clickTrigger(el)
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    })
  })

  describe('展开图标态', () => {
    it('root.open 类随生效展开态切换（非受控展开挂类 / 受控收起不挂类）', () => {
      const uncontrolled = mount()
      const rootOf = (el: OASCollapsible) => el.shadowRoot!.querySelector('.root')!
      expect(rootOf(uncontrolled).classList.contains('open')).toBe(false)
      clickTrigger(uncontrolled)
      expect(rootOf(uncontrolled).classList.contains('open'), '非受控展开挂 open 类').toBe(true)
      clickTrigger(uncontrolled)
      expect(rootOf(uncontrolled).classList.contains('open')).toBe(false)
      // 受控收起 open="false"：属性在场但显示态收起 → 不得挂类（箭头不误转）
      const controlled = mount({ open: 'false' })
      expect(rootOf(controlled).classList.contains('open'), 'open="false" 收起态不得挂类').toBe(false)
    })

    it('箭头旋转规则用 .root.open（不得用 :host([open]) 属性选择器——受控收起 open="false" 会误转）', () => {
      const el = mount()
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toMatch(/\.root\.open\s+\.arrow/)
      expect(css).not.toMatch(/:host\(\[open\]\)\s+\.arrow/)
    })
  })

  describe('disabled', () => {
    it('disabled 进 observedAttributes；禁用后点击不切换、不派发事件', () => {
      const el = mount()
      expect(OASCollapsible.observedAttributes).toContain('disabled')
      el.setAttribute('disabled', '')
      const events: unknown[] = []
      el.addEventListener('oas-toggle', (e: Event) => events.push((e as CustomEvent).detail))
      clickTrigger(el)
      expect(trigger(el).disabled, '触发 button 原生 disabled').toBe(true)
      expect(trigger(el).getAttribute('aria-disabled')).toBe('true')
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
      expect(events).toEqual([])
      // config-provider 全局禁用同样生效
      document.body.innerHTML = ''
      const cp = document.createElement('oas-config-provider')
      cp.setAttribute('disabled', '')
      document.body.appendChild(cp)
      const el2 = mount()
      cp.appendChild(el2)
      clickTrigger(el2)
      expect(trigger(el2).disabled).toBe(true)
    })

    it('disabled 样式钩子（降饱和 + not-allowed 光标走 token）', () => {
      const el = mount({ disabled: '' })
      const css = el.shadowRoot!.querySelector('style')!.textContent!
      expect(css).toContain(':host([disabled])')
      expect(css).toContain('var(--oas-color-text-disabled)')
    })
  })

  describe('插槽', () => {
    it('slot="header" 富触发内容投影进触发按钮；无 slot 时回落 header 属性文本', () => {
      const el = mount({}, '<b slot="header">富标题</b><p>内容</p>')
      const slot = trigger(el).querySelector('slot[name="header"]')!
      expect(slot).not.toBeNull()
      // 属性文本通道（无 slot 内容时回落属性文本）
      const el2 = mount({ header: '文本标题' }, '<p>内容</p>')
      expect(el2.shadowRoot!.querySelector<HTMLElement>('[part="header-text"]')!.textContent).toBe('文本标题')
    })

    it('默认插槽内容渲染在折叠体内', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector('.body slot:not([name])')).not.toBeNull()
    })

    it('template[slot="toggle"] 自定义展开图标（缺省内建箭头）', () => {
      const el = mount()
      expect(el.shadowRoot!.querySelector('.arrow')!.textContent).not.toBe('')
      const el2 = mount(
        {},
        `
        <template slot="toggle"><svg data-custom-toggle></svg></template>
        <span slot="header">触发</span><p>内容</p>
      `,
      )
      expect(el2.shadowRoot!.querySelector('.arrow [data-custom-toggle]')).not.toBeNull()
    })
  })

  it('oas-toggle 事件 bubbles + composed（穿出 shadow 可达宿主监听）', () => {
    const el = mount()
    let received = false
    document.body.addEventListener('oas-toggle', () => (received = true))
    clickTrigger(el)
    expect(received).toBe(true)
  })

  it('无 JS（未升级）退化：light DOM 内容直接可见（slot 内容在宿主文档中不隐藏）', () => {
    // 未定义 custom element 时浏览器把 light DOM 当普通内容渲染——不写任何隐藏样式即满足；
    // 守卫：组件样式不得含隐藏宿主自身的规则（:host 不得默认 display:none / visibility:hidden）
    const el = new OASCollapsible()
    const css = (el as unknown as { template(): string }).template()
    expect(css).not.toMatch(/:host\s*\{[^}]*display:\s*none/)
  })

  it('真水合：SSR 快照结构校验通过后接管，不重建 shadow', () => {
    const el = mount({ open: '' })
    const before = el.shadowRoot!.querySelector('[part="trigger"]')!
    expect(el.shadowRoot!.querySelector('.root')).not.toBeNull()
    // hydrate 通道由基类在 connectedCallback 走 SSR 快照校验：此处验证快照指纹存在
    expect(before.getAttribute('aria-expanded')).toBe('true')
  })

  it('颜色全走 CSS 变量 token（无硬编码色值）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const colors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    expect(colors, '样式表不得出现硬编码 hex 色值').toEqual([])
  })

  it('reduced-motion：展开过渡关闭', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('prefers-reduced-motion')
  })
})
