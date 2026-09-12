import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASSegmented } from './index.js'

const OPTIONS = JSON.stringify([
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
])

function mount(attrs: Record<string, string> = {}): OASSegmented {
  const el = new OASSegmented()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function items(el: OASSegmented): HTMLLabelElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.item')] as HTMLLabelElement[]
}

function inputs(el: OASSegmented): HTMLInputElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLInputElement>('.item input[type="radio"]')]
}

function group(el: OASSegmented): HTMLElement {
  return el.shadowRoot!.querySelector('.group')!
}

function key(el: OASSegmented, k: string): void {
  group(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
}

describe('OASSegmented', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染选项，默认选中第一项', () => {
    const el = mount()
    expect(items(el).length).toBe(3)
    expect(items(el)[0]!.querySelector('input')!.checked).toBe(true)
    expect(inputs(el)[0]!.checked).toBe(true)
  })

  it('点击切换 value 并派发 oas-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    items(el)[2]!.click()
    expect(detail).toEqual({ value: 'month' })
    expect(items(el)[2]!.querySelector('input')!.checked).toBe(true)
    expect(inputs(el)[2]!.checked).toBe(true)
    expect(el.getAttribute('value')).toBe('month')
  })

  it('value 属性控制选中', () => {
    const el = mount({ value: 'week' })
    expect(items(el)[1]!.querySelector('input')!.checked).toBe(true)
  })

  it('disabled 项不可选', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    items(el)[1]!.click()
    expect(fired).toBe(0)
    expect(items(el)[0]!.querySelector('input')!.checked).toBe(true)
  })

  // ===== 原生 radio 底座 + 键盘（本批新增） =====

  it('底层为隐藏的原生 radio input（同一 shadow root 内同名成组）', () => {
    const el = mount()
    const radios = inputs(el)
    expect(radios.length).toBe(3)
    for (const r of radios) expect(r.type).toBe('radio')
  })

  it('name 属性透传 radio 组；未设置时自动生成组名且多实例不冲突', () => {
    const a = mount({ name: 'view' })
    expect(inputs(a).every((r) => r.name === 'view')).toBe(true)
    const b = mount()
    const c = mount()
    const nb = inputs(b)[0]!.name
    const nc = inputs(c)[0]!.name
    expect(nb).not.toBe('')
    expect(nc).not.toBe('')
    expect(nb).not.toBe(nc)
  })

  it('ArrowRight 循环移动选中（wrap），每次移动派发 oas-change', () => {
    const el = mount()
    const values: string[] = []
    el.addEventListener('oas-change', (e: Event) => values.push((e as CustomEvent).detail.value))
    key(el, 'ArrowRight') // day → week
    key(el, 'ArrowRight') // week → month
    key(el, 'ArrowRight') // month → wrap day
    expect(values).toEqual(['week', 'month', 'day'])
    expect(items(el)[0]!.querySelector('input')!.checked).toBe(true)
  })

  it('ArrowLeft 反向循环移动', () => {
    const el = mount()
    key(el, 'ArrowLeft') // day → wrap month
    expect(el.getAttribute('value')).toBe('month')
  })

  it('Home/End 跳转首尾', () => {
    const el = mount({ value: 'week' })
    key(el, 'End')
    expect(el.getAttribute('value')).toBe('month')
    key(el, 'Home')
    expect(el.getAttribute('value')).toBe('day')
  })

  it('键盘移动跳过 disabled 项', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
        { label: 'c', value: 'c' },
      ]),
    })
    key(el, 'ArrowRight') // a → c（跳过 b）
    expect(el.getAttribute('value')).toBe('c')
  })

  it('纵向方向用 ArrowUp/ArrowDown；横向键不生效', () => {
    const el = mount({ direction: 'vertical' })
    key(el, 'ArrowDown')
    expect(el.getAttribute('value')).toBe('week')
    key(el, 'ArrowRight')
    expect(el.getAttribute('value')).toBe('week')
    key(el, 'ArrowUp')
    expect(el.getAttribute('value')).toBe('day')
  })

  it('roving tabindex：仅选中项可 Tab 停靠，键盘移动后焦点跟随', () => {
    const el = mount()
    expect(inputs(el)[0]!.tabIndex).toBe(0)
    expect(inputs(el)[1]!.tabIndex).toBe(-1)
    key(el, 'ArrowRight')
    expect(inputs(el)[1]!.tabIndex).toBe(0)
    expect(inputs(el)[0]!.tabIndex).toBe(-1)
    expect(el.shadowRoot!.activeElement).toBe(inputs(el)[1]!)
  })

  // ===== icon 字段（本批新增） =====

  it('icon 字段渲染 oas-icon 在文本前', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '列表', value: 'list', icon: 'menu' },
        { label: '分组', value: 'group', icon: 'organization' },
      ]),
    })
    const icon = items(el)[0]!.querySelector('.item-icon oas-icon')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('name')).toBe('menu')
  })

  it('仅图标（label 省略）：icon 名转可读文本作 input 的 aria-label', () => {
    const el = mount({
      options: JSON.stringify([
        { label: '', value: 'star', icon: 'star' },
        { label: '', value: 'filled', icon: 'star-filled' },
      ]),
    })
    expect(items(el)[0]!.classList.contains('icon-only')).toBe(true)
    expect(inputs(el)[0]!.getAttribute('aria-label')).toBe('star')
    expect(inputs(el)[1]!.getAttribute('aria-label')).toBe('star filled')
  })

  it('非法图标名不渲染图标节点', () => {
    const el = mount({
      options: JSON.stringify([{ label: 'x', value: 'x', icon: 'not-exist' }]),
    })
    expect(items(el)[0]!.querySelector('.item-icon')).toBeNull()
  })

  // ===== option slot 自定义渲染（本批新增） =====

  it('template[slot="option"] 克隆渲染，data-option-label 绑定选项文本', async () => {
    const el = mount()
    el.innerHTML = '<template slot="option"><b class="custom" data-option-label></b></template>'
    await new Promise((r) => setTimeout(r, 0))
    const lab = items(el)[0]!.querySelector('.item-label')!
    const custom = lab.querySelector<HTMLElement>('.custom')!
    expect(custom).not.toBeNull()
    expect(custom.textContent).toBe('日')
  })

  // ===== readonly（本批新增） =====

  it('readonly：点击不改选、不派发事件，input 保持可聚焦（未 disabled）', () => {
    const el = mount({ readonly: '' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    items(el)[2]!.click()
    expect(fired).toBe(0)
    expect(el.getAttribute('value') ?? items(el)[0]!.dataset.value).toBe('day')
    expect(inputs(el)[0]!.disabled).toBe(false)
    expect(group(el).getAttribute('aria-readonly')).toBe('true')
    key(el, 'ArrowRight')
    expect(fired).toBe(0)
  })

  // ===== 增量同步（库内自约：value 变化不重建） =====

  it('value 变化增量同步：不重建 .item 元素引用', () => {
    const el = mount()
    const before = items(el)
    el.setAttribute('value', 'month')
    const after = items(el)
    expect(after.length).toBe(3)
    for (let i = 0; i < 3; i++) expect(after[i]).toBe(before[i])
    expect(after[2]!.querySelector('input')!.checked).toBe(true)
  })

  it('options 变化重建选项', () => {
    const el = mount()
    const before = items(el)
    el.setAttribute(
      'options',
      JSON.stringify([
        { label: '一', value: '1' },
        { label: '二', value: '2' },
      ]),
    )
    const after = items(el)
    expect(after.length).toBe(2)
    expect(after[0]).not.toBe(before[0])
  })

  // ===== size / block / direction 镜像（本批新增） =====

  it('size 镜像 data-size（small/medium/large，默认 medium，非法回落）', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'huge')
    expect(el.getAttribute('data-size')).toBe('medium')
    const def = mount()
    expect(def.getAttribute('data-size')).toBe('medium')
  })

  it('direction 镜像 data-direction + group aria-orientation', () => {
    const el = mount({ direction: 'vertical' })
    expect(el.getAttribute('data-direction')).toBe('vertical')
    expect(group(el).getAttribute('aria-orientation')).toBe('vertical')
    el.setAttribute('direction', 'horizontal')
    expect(el.getAttribute('data-direction')).toBe('horizontal')
    expect(group(el).getAttribute('aria-orientation')).toBe('horizontal')
    el.setAttribute('direction', 'diagonal')
    expect(el.getAttribute('data-direction')).toBe('horizontal')
  })

  it('block 属性在场即生效（CSS 通道，宿主属性保留）', () => {
    const el = mount({ block: '' })
    expect(el.hasAttribute('block')).toBe(true)
  })

  // ===== 滑动指示器（本批新增；定位为视觉行为，机制断言可见性） =====

  it('选中时指示器可见，空 options 时隐藏', () => {
    const el = mount()
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('.indicator')!
    expect(indicator.hidden).toBe(false)
    el.setAttribute('options', '[]')
    expect(indicator.hidden).toBe(true)
  })

  it('容器 role=radiogroup，选项 checked/aria-disabled 同步（aria 语义由内部原生 radio 承载）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]),
    })
    expect(group(el).getAttribute('role')).toBe('radiogroup')
    expect(items(el)[1]!.getAttribute('aria-disabled')).toBe('true')
    expect(items(el)[0]!.getAttribute('aria-disabled')).toBe('false')
  })

  // ===== 指示器几何写入门禁（防 RO 回写回环，缺陷修复批新增） =====

  it('几何未变时重定位零写入（RO 回环结构性封死）；几何变化时正常写入', async () => {
    const el = mount()
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('.indicator')!
    const first = items(el)[0]!
    // happy-dom 无布局：stub 选中项几何，让门禁有可比对的实值
    const stubBox = (w: number, h: number, l: number, t: number) => {
      for (const [k, v] of Object.entries({
        offsetWidth: w,
        offsetHeight: h,
        offsetLeft: l,
        offsetTop: t,
      })) {
        Object.defineProperty(first, k, { value: v, configurable: true })
      }
    }
    stubBox(42, 32, 4, 4)
    el.setAttribute('value', 'day') // 触发 update → positionIndicator 写入
    await Promise.resolve()
    expect(indicator.style.width).toBe('42px')
    expect(indicator.style.transform).toBe('translate(4px, 4px)')

    // 监听指示器 style 属性写入
    const writes: string[] = []
    const mo = new MutationObserver((records) => writes.push(...records.map((r) => r.attributeName ?? '')))
    mo.observe(indicator, { attributes: true, attributeFilter: ['style'] })

    // 几何未变（选中项不变）的多次 update：门禁拦截，不写 style
    el.setAttribute('value', 'day')
    el.setAttribute('value', 'day')
    await new Promise((r) => setTimeout(r, 0))
    expect(writes).toHaveLength(0)
    expect(indicator.style.width).toBe('42px')

    // 几何变化（stub 变更）：正常写入，门禁不过度拦截
    stubBox(56, 32, 46, 4)
    el.setAttribute('value', 'day')
    await new Promise((r) => setTimeout(r, 0))
    expect(indicator.style.width).toBe('56px')
    expect(indicator.style.transform).toBe('translate(46px, 4px)')
    mo.disconnect()
  })

  it('空 options 归零门禁缓存：选项恢复后指示器重新定位', () => {
    const el = mount()
    const indicator = el.shadowRoot!.querySelector<HTMLElement>('.indicator')!
    el.setAttribute('options', '[]')
    expect(indicator.hidden).toBe(true)
    el.setAttribute('options', OPTIONS)
    expect(indicator.hidden).toBe(false)
    expect(indicator.style.width).not.toBe('')
  })
})
