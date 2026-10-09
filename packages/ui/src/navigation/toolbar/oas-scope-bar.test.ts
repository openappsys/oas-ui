import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASScopeBar, OASToolbar } from './index.js'

const ITEMS = '[{"label":"全部","value":"all"},{"label":"进行中","value":"active"},{"label":"已完成","value":"done"}]'

/** 以 items 数据通道挂载一个 oas-scope-bar，附加宿主属性 */
function mount(items = ITEMS, attrs: Record<string, string> = {}): OASScopeBar {
  const el = new OASScopeBar()
  el.setAttribute('items', items)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function buttons(el: OASScopeBar): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.item')]
}

function group(el: OASScopeBar): HTMLElement {
  return el.shadowRoot!.querySelector('.group') as HTMLElement
}

describe('OASScopeBar', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('items 数据通道渲染药丸（数量 + 文案 + part）', () => {
    const el = mount()
    const btns = buttons(el)
    expect(btns.length).toBe(3)
    expect(btns.map((b) => b.textContent)).toEqual(['全部', '进行中', '已完成'])
    expect(btns[0]!.getAttribute('part')).toBe('item')
    expect(btns[0]!.dataset.value).toBe('all')
  })

  it('json 非法 / 空 items 容错为空态，不抛错', () => {
    const bad = mount('not-json')
    expect(buttons(bad).length).toBe(0)
    const empty = mount('[]')
    expect(buttons(empty).length).toBe(0)
  })

  it('items property setter 接受数组并反射 attribute', () => {
    const el = new OASScopeBar()
    document.body.appendChild(el)
    el.items = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ]
    expect(JSON.parse(el.getAttribute('items')!)).toEqual([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ])
    expect(buttons(el).map((b) => b.textContent)).toEqual(['A', 'B'])
  })

  it('单选缺省：value 驱动 aria-pressed，点击切换 + oas-change', () => {
    const el = mount(ITEMS, { value: 'all' })
    const btns = buttons(el)
    expect(btns[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(btns[1]!.getAttribute('aria-pressed')).toBe('false')
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('active')
    expect(detail).toEqual({ value: 'active' })
    expect(btns[1]!.getAttribute('aria-pressed')).toBe('true')
    expect(btns[0]!.getAttribute('aria-pressed')).toBe('false')
  })

  it('单选点已选中项不变更、不派发事件', () => {
    const el = mount(ITEMS, { value: 'all' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    buttons(el)[0]!.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBe('all')
  })

  it('multiple：多选切换 + value 为 JSON 数组', () => {
    const el = mount(ITEMS, { multiple: '' })
    const btns = buttons(el)
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    btns[0]!.click()
    btns[1]!.click()
    expect(el.getAttribute('value')).toBe('["all","active"]')
    expect(detail).toEqual({ value: ['all', 'active'] })
    btns[0]!.click()
    expect(el.getAttribute('value')).toBe('["active"]')
  })

  it('disabled 项不可选（aria-disabled + 点击拦截 + 方向键跳过）', () => {
    const el = mount('[{"label":"A","value":"a"},{"label":"B","value":"b","disabled":true},{"label":"C","value":"c"}]')
    const btns = buttons(el)
    expect(btns[1]!.getAttribute('aria-disabled')).toBe('true')
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btns[1]!.click()
    expect(fired).toBe(0)
    // 方向键从 A 直接跳到 C（跳过禁用项 B）
    btns[0]!.focus()
    group(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('c')
  })

  it('整组 disabled：所有项 aria-disabled 且不参与键盘/点击', () => {
    const el = mount(ITEMS, { disabled: '' })
    const btns = buttons(el)
    for (const b of btns) {
      expect(b.getAttribute('aria-disabled')).toBe('true')
      expect(b.tabIndex).toBe(-1)
    }
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    btns[1]!.click()
    group(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(fired).toBe(0)
    expect(el.getAttribute('value')).toBeNull()
  })

  it('最近 oas-toolbar 的 disabled 令 scope-bar 一并禁用', () => {
    const tb = new OASToolbar()
    tb.setAttribute('disabled', '')
    document.body.appendChild(tb)
    const el = new OASScopeBar()
    el.setAttribute('items', ITEMS)
    tb.appendChild(el)
    expect(buttons(el)[0]!.getAttribute('aria-disabled')).toBe('true')
    expect(buttons(el)[0]!.tabIndex).toBe(-1)
  })

  it('宿主聚焦转发到内部当前药丸（复合组件单 Tab 停靠）', () => {
    const el = mount(ITEMS, { value: 'active' })
    const btns = buttons(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(btns[1])
  })

  it('role=group + aria-label 来自 label 属性（无 label 则不设）', () => {
    const el = mount(ITEMS, { label: '按状态筛选' })
    expect(group(el).getAttribute('role')).toBe('group')
    expect(group(el).getAttribute('aria-label')).toBe('按状态筛选')
    const noLabel = mount(ITEMS)
    expect(group(noLabel).hasAttribute('aria-label')).toBe(false)
    // label 运行时更新
    el.setAttribute('label', '筛选器')
    expect(group(el).getAttribute('aria-label')).toBe('筛选器')
  })

  it('单选键盘：方向键移动即选中；Home/End 跳转首末', () => {
    const el = mount(ITEMS)
    const g = group(el)
    const btns = buttons(el)
    btns[0]!.focus()
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('active')
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('value')).toBe('all')
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(el.getAttribute('value')).toBe('done')
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.getAttribute('value')).toBe('all')
  })

  it('多选键盘：方向键只移动焦点不选中，Space 切换焦点项', () => {
    const el = mount(ITEMS, { multiple: '' })
    const g = group(el)
    const btns = buttons(el)
    btns[0]!.focus()
    g.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBeNull()
    g.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(el.getAttribute('value')).toBe('["active"]')
  })

  it('方向键事件不冒泡到宿主（避免与 oas-toolbar roving 双处理）', () => {
    const el = mount(ITEMS)
    let seen = 0
    el.addEventListener('keydown', () => seen++)
    buttons(el)[0]!.focus()
    group(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(seen).toBe(0)
  })

  it('RTL 镜像：水平方向键换向（ArrowRight 视觉右移 = 前一项，单选回绕选中末项）', () => {
    const el = mount(ITEMS, { dir: 'rtl' })
    group(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(el.getAttribute('value')).toBe('done')
    group(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(el.getAttribute('value')).toBe('all')
  })

  it('size 自身档位打类标记', () => {
    const small = mount(ITEMS, { size: 'small' })
    expect(small.classList.contains('oas-sb-small')).toBe(true)
    const large = mount(ITEMS, { size: 'large' })
    expect(large.classList.contains('oas-sb-large')).toBe(true)
  })

  it('size 缺省跟随最近 oas-toolbar 的 size', () => {
    const tb = new OASToolbar()
    document.body.appendChild(tb)
    tb.setAttribute('size', 'small')
    const el = new OASScopeBar()
    el.setAttribute('items', ITEMS)
    tb.appendChild(el)
    expect(el.classList.contains('oas-sb-small')).toBe(true)
  })

  it('selectValue 程序化选择：单选选中、多选切换，未知值忽略', () => {
    const single = mount(ITEMS)
    single.selectValue('done')
    expect(single.getAttribute('value')).toBe('done')
    single.selectValue('nope')
    expect(single.getAttribute('value')).toBe('done')

    const multi = mount(ITEMS, { multiple: '' })
    multi.selectValue('all')
    expect(multi.getAttribute('value')).toBe('["all"]')
    multi.selectValue('all')
    expect(multi.getAttribute('value')).toBe('[]')
  })

  it('选中态 active 填充全走 token（color-mix primary + primary-text，无硬编码色值）', () => {
    const el = mount(ITEMS, { value: 'all' })
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    const rule = css.split(".item[aria-pressed='true'] {")[1]?.split('}')[0] ?? ''
    expect(rule, 'active 填充规则必须存在').not.toBe('')
    expect(rule).toContain('color-mix(in srgb, var(--oas-color-primary)')
    expect(rule).toContain('color: var(--oas-color-primary-text)')
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    // 容器/轨道底色走 token
    const groupRule = css.split('.group {')[1]?.split('}')[0] ?? ''
    expect(groupRule).toContain('background: var(--oas-color-bg-hover)')
    const hoverRule = css.split('.item:hover {')[1]?.split('}')[0] ?? ''
    expect(hoverRule).toContain('background: var(--oas-color-bg-elevated)')
  })

  it('coarse pointer 媒体查询抬升药丸最小高度到 --oas-touch-target-min', () => {
    const el = mount(ITEMS)
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('@media (pointer: coarse)')
    expect(css).toContain('var(--oas-touch-target-min, 44px)')
  })

  it('items 变化重建、value 变化只增量同步（不重建 DOM）', () => {
    const el = mount(ITEMS, { value: 'all' })
    const firstBtn = buttons(el)[0]!
    el.setAttribute('value', 'done')
    expect(buttons(el)[0]).toBe(firstBtn)
    el.setAttribute('items', '[{"label":"X","value":"x"}]')
    expect(buttons(el).length).toBe(1)
    expect(buttons(el)[0]!.textContent).toBe('X')
  })
})
