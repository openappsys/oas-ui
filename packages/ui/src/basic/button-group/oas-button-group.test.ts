import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASButtonGroup } from './index.js'
import { OASButtonGroupSeparator } from './oas-button-group-separator.js'
import '../button/index.js'

function makeButton(value?: string, text = ''): HTMLElement {
  const btn = document.createElement('oas-button')
  if (value != null) btn.setAttribute('value', value)
  btn.textContent = text || value || 'btn'
  return btn
}

function mountGroup(
  attrs: Record<string, string> = {},
  buttons: Array<[string?, string?]> = [['a'], ['b'], ['c']],
): OASButtonGroup {
  const el = new OASButtonGroup()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const [v, t] of buttons) el.appendChild(makeButton(v, t))
  document.body.appendChild(el)
  return el
}

function groupRoot(el: OASButtonGroup): HTMLElement {
  return el.shadowRoot!.querySelector('[part="group"]')!
}

function pressButton(el: OASButtonGroup, value: string): void {
  const btn = el.querySelector(`oas-button[value="${value}"]`)!
  const native = btn.shadowRoot!.querySelector('button')! as HTMLButtonElement
  native.click()
}

function pressButtonAt(el: OASButtonGroup, index: number): void {
  const btn = el.querySelectorAll('oas-button')[index]!
  const native = btn.shadowRoot!.querySelector('button')! as HTMLButtonElement
  native.click()
}

describe('OASButtonGroup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('容器 role="group" 且带默认 aria-label', () => {
    const el = mountGroup()
    const root = groupRoot(el)
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('aria-label')).toBeTruthy()
  })

  it('aria-label 属性可覆盖默认文案', () => {
    const el = mountGroup({ 'aria-label': '操作组' })
    expect(groupRoot(el).getAttribute('aria-label')).toBe('操作组')
  })

  it('type/size 透传给子按钮', () => {
    const el = mountGroup({ type: 'primary', size: 'large' })
    const btn = el.querySelector('oas-button')!
    expect(btn.getAttribute('type')).toBe('primary')
    expect(btn.getAttribute('size')).toBe('large')
  })

  it('单选：点击派发 oas-change detail { value }，选中项 aria-pressed=true', () => {
    const el = mountGroup({ value: 'a' })
    let detail: unknown
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    pressButton(el, 'b')
    expect(detail).toEqual({ value: 'b' })
    expect(el.getAttribute('value')).toBe('b')
    expect(el.querySelector('oas-button[value="b"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('单选：点击已选中项不重复派发', () => {
    const el = mountGroup({ value: 'a' })
    let count = 0
    el.addEventListener('oas-change', () => count++)
    pressButton(el, 'a')
    expect(count).toBe(0)
  })

  it('多选：detail { value: [] }，点击切换选中', () => {
    const el = mountGroup({ multiple: '' })
    let detail: unknown
    el.addEventListener('oas-change', (e) => {
      detail = (e as CustomEvent).detail
    })
    pressButton(el, 'a')
    expect(detail).toEqual({ value: ['a'] })
    pressButton(el, 'b')
    expect(detail).toEqual({ value: ['a', 'b'] })
    pressButton(el, 'a')
    expect(detail).toEqual({ value: ['b'] })
  })

  it('多选：初始 value 逗号分隔回显选中', () => {
    const el = mountGroup({ multiple: '', value: 'a,b' })
    expect(el.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="b"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="c"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('disabled 全组禁用', () => {
    const el = mountGroup({ disabled: '' })
    for (const btn of el.querySelectorAll('oas-button')) {
      expect(btn.hasAttribute('disabled')).toBe(true)
    }
  })

  it('零子按钮空组不报错', () => {
    const el = mountGroup({}, [])
    expect(el.querySelectorAll('oas-button').length).toBe(0)
    expect(groupRoot(el)).not.toBeNull()
  })

  it('无 value 属性的子按钮不参与选值', () => {
    const el = mountGroup({}, [[undefined, '操作']])
    let fired = false
    el.addEventListener('oas-change', () => (fired = true))
    pressButtonAt(el, 0)
    expect(fired).toBe(false)
    expect(el.querySelector('oas-button')!.hasAttribute('aria-pressed')).toBe(false)
  })
})

describe('OASButtonGroup 扩展：pill / 嵌套组 / 分隔符', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 读取组件 shadow 内联样式文本（happy-dom 不应用类样式，CSS 规则以文本断言） */
  function styleText(el: OASButtonGroup): string {
    return el.shadowRoot!.querySelector('style')!.textContent ?? ''
  }

  it('pill 进入 observedAttributes', () => {
    expect(OASButtonGroup.observedAttributes).toContain('pill')
  })

  it('pill 胶囊：首/尾按钮圆角用 --oas-radius-full（横向首左圆/尾右圆）', () => {
    const css = styleText(mountGroup({ pill: '' }))
    expect(css).toContain(':host([pill]) ::slotted(oas-button:first-child)')
    expect(css).toContain(
      '--oas-button-group-radius: var(--oas-radius-full, 999px) 0 0 var(--oas-radius-full, 999px)',
    )
    expect(css).toContain(
      '--oas-button-group-radius: 0 var(--oas-radius-full, 999px) var(--oas-radius-full, 999px) 0',
    )
    expect(css).toContain('--oas-button-group-start-radius: var(--oas-radius-full, 999px)')
  })

  it('pill + vertical：首上圆/尾下圆', () => {
    const css = styleText(mountGroup({ pill: '', vertical: '' }))
    expect(css).toContain(':host([vertical][pill])')
    expect(css).toContain(
      '--oas-button-group-radius: var(--oas-radius-full, 999px) var(--oas-radius-full, 999px) 0 0',
    )
    expect(css).toContain(
      '--oas-button-group-radius: 0 0 var(--oas-radius-full, 999px) var(--oas-radius-full, 999px)',
    )
  })

  it('嵌套组：CSS 与按钮同等处理（贴合/圆角合并），并经 start/end 变量穿透整体圆角', () => {
    const css = styleText(mountGroup())
    expect(css).toContain('::slotted(oas-button-group:not(:first-child))')
    expect(css).toContain('::slotted(oas-button-group:first-child)')
    expect(css).toContain('--oas-button-group-start-radius: var(--oas-radius-md)')
    expect(css).toContain('--oas-button-group-end-radius: var(--oas-radius-md)')
    expect(css).toContain('--oas-button-group-end-radius: 0')
  })

  it('嵌套组：作为整体一项，点击嵌套内按钮不改变外层选值', () => {
    const el = new OASButtonGroup()
    const sub = new OASButtonGroup()
    sub.appendChild(makeButton('a', '内层'))
    sub.appendChild(makeButton('b', '内层'))
    el.appendChild(sub)
    el.appendChild(makeButton('c', '外层'))
    document.body.appendChild(el)

    pressButton(sub, 'a')
    expect(sub.getAttribute('value')).toBe('a')
    expect(el.getAttribute('value')).toBeNull()
    expect(sub.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="c"]')!.getAttribute('aria-pressed')).toBe('false')
  })

  it('嵌套组：外层 type/size 不透传进嵌套组（嵌套组自行管理内部按钮）', () => {
    const el = new OASButtonGroup()
    el.setAttribute('type', 'primary')
    el.setAttribute('size', 'large')
    const sub = new OASButtonGroup()
    sub.appendChild(makeButton('a'))
    el.appendChild(sub)
    document.body.appendChild(el)

    const innerBtn = sub.querySelector('oas-button')!
    expect(innerBtn.getAttribute('type')).toBeNull()
    expect(innerBtn.getAttribute('size')).toBeNull()
  })

  it('嵌套组：外层 disabled 透传到嵌套组宿主，进而禁用内部按钮', () => {
    const el = new OASButtonGroup()
    el.setAttribute('disabled', '')
    const sub = new OASButtonGroup()
    sub.appendChild(makeButton('a'))
    el.appendChild(sub)
    document.body.appendChild(el)

    expect(sub.hasAttribute('disabled')).toBe(true)
    expect(sub.querySelector('oas-button')!.hasAttribute('disabled')).toBe(true)
  })

  it('分隔符：注册为自定义元素并渲染线节点', () => {
    expect(customElements.get('oas-button-group-separator')).toBe(OASButtonGroupSeparator)
    const sep = document.createElement('oas-button-group-separator')
    document.body.appendChild(sep)
    expect(sep.shadowRoot!.querySelector('[part="line"]')).not.toBeNull()
    expect(sep.shadowRoot!.querySelector('[part="line"]')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('分隔符：组 vertical 属性同步到分隔符（横向线），移除后恢复竖线', () => {
    const el = new OASButtonGroup()
    const sep = document.createElement('oas-button-group-separator')
    el.appendChild(sep)
    el.setAttribute('vertical', '')
    document.body.appendChild(el)
    expect(sep.hasAttribute('vertical')).toBe(true)
    el.removeAttribute('vertical')
    expect(sep.hasAttribute('vertical')).toBe(false)
  })

  it('分隔符：外层 vertical 不覆盖嵌套组内分隔符方向（各自同步）', () => {
    const el = new OASButtonGroup()
    el.setAttribute('vertical', '')
    const sub = new OASButtonGroup()
    const innerSep = document.createElement('oas-button-group-separator')
    sub.appendChild(makeButton('a'))
    sub.appendChild(innerSep)
    sub.appendChild(makeButton('b'))
    el.appendChild(sub)
    document.body.appendChild(el)
    expect(innerSep.hasAttribute('vertical')).toBe(false)
  })

  it('分隔符：CSS 贴合参与布局、不参与圆角合并', () => {
    const css = styleText(mountGroup())
    expect(css).toContain('::slotted(oas-button-group-separator)')
    expect(css).toContain('z-index: 2')
    // 分隔符不被首/尾圆角规则命中：无 --oas-button-group-radius 注入
    const sepRule = css.match(/::slotted\(oas-button-group-separator\)\s*{[^}]*}/)?.[0]
    expect(sepRule).toContain('position: relative')
    expect(sepRule).not.toContain('--oas-button-group-radius')
  })

  it('带分隔符的组：选值逻辑仍正常', () => {
    const el = new OASButtonGroup()
    el.appendChild(makeButton('a'))
    el.appendChild(document.createElement('oas-button-group-separator'))
    el.appendChild(makeButton('b'))
    document.body.appendChild(el)

    pressButton(el, 'b')
    expect(el.getAttribute('value')).toBe('b')
    expect(el.querySelector('oas-button[value="b"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(el.querySelector('oas-button[value="a"]')!.getAttribute('aria-pressed')).toBe('false')
  })
})

describe('OASButtonGroup 扩展：spread 均分 / variant·round 透传', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 读取组件 shadow 内联样式文本（happy-dom 不应用类样式，CSS 规则以文本断言） */
  function styleText(el: OASButtonGroup): string {
    return el.shadowRoot!.querySelector('style')!.textContent ?? ''
  }

  it('spread / variant / round 进入 observedAttributes', () => {
    expect(OASButtonGroup.observedAttributes).toContain('spread')
    expect(OASButtonGroup.observedAttributes).toContain('variant')
    expect(OASButtonGroup.observedAttributes).toContain('round')
  })

  it('spread：宿主占满父容器宽度、组内按钮 flex 等宽均分并拉满宿主', () => {
    const css = styleText(mountGroup({ spread: '' }))
    expect(css).toContain(':host([spread])')
    expect(css).toContain(":host([spread]) [part='group']")
    expect(css).toContain(':host([spread]) ::slotted(oas-button)')
    expect(css).toContain('flex: 1 1 0')
    expect(css).toContain('--oas-button-group-width: 100%')
  })

  it('spread：嵌套组作为整体一项等宽均分，不透传拉满到内部按钮', () => {
    const css = styleText(mountGroup({ spread: '' }))
    const nestedRule = css.match(
      /:host\(\[spread\]\) ::slotted\(oas-button-group\)\s*\{[^}]*}/,
    )?.[0]
    expect(nestedRule).toContain('flex: 1 1 0')
    expect(nestedRule).not.toContain('--oas-button-group-width')
  })

  it('variant/round 透传给子按钮（与 type/size 同构）', () => {
    const el = mountGroup({ variant: 'outlined', round: '' })
    for (const btn of el.querySelectorAll('oas-button')) {
      expect(btn.getAttribute('variant')).toBe('outlined')
      expect(btn.hasAttribute('round')).toBe(true)
    }
  })

  it('组未设 variant/round 时不覆盖子按钮自身设置', () => {
    const el = new OASButtonGroup()
    const btn = makeButton('a')
    btn.setAttribute('variant', 'link')
    btn.setAttribute('round', '')
    el.appendChild(btn)
    document.body.appendChild(el)
    expect(btn.getAttribute('variant')).toBe('link')
    expect(btn.hasAttribute('round')).toBe(true)
  })

  it('嵌套组：外层 variant/round 不透传进嵌套组内部按钮', () => {
    const el = new OASButtonGroup()
    el.setAttribute('variant', 'outlined')
    el.setAttribute('round', '')
    const sub = new OASButtonGroup()
    sub.appendChild(makeButton('a'))
    el.appendChild(sub)
    document.body.appendChild(el)

    const innerBtn = sub.querySelector('oas-button')!
    expect(innerBtn.getAttribute('variant')).toBeNull()
    expect(innerBtn.hasAttribute('round')).toBe(false)
  })
})
