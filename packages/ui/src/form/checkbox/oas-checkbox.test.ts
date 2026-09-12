import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASCheckbox, OASCheckboxGroup } from './index.js'
import '../../framework/config-provider/index.js'

function mountCheckbox(attrs: Record<string, string> = {}, slot = '选项'): OASCheckbox {
  const el = new OASCheckbox()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.textContent = slot
  document.body.appendChild(el)
  return el
}

function native(el: OASCheckbox): HTMLInputElement {
  return el.shadowRoot!.querySelector('input')!
}

describe('OASCheckbox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染原生 checkbox，label 关联', async () => {
    const el = mountCheckbox({}, '记住我')
    const input = native(el)
    await Promise.resolve()
    expect(input.type).toBe('checkbox')
    expect(el.textContent).toContain('记住我')
    expect(input.id).toBeTruthy()
    expect(el.shadowRoot!.querySelector('label')!.getAttribute('for')).toBe(input.id)
  })

  it('checked 受控同步，点击切换并派发 oas-change', () => {
    const el = mountCheckbox({ checked: '' })
    expect(native(el).checked).toBe(true)
    el.addEventListener('oas-change', () => undefined)
    native(el).click()
    expect(native(el).checked).toBe(false)
  })

  it('外部改 checked 属性增量同步', () => {
    const el = mountCheckbox()
    const input = native(el)
    el.setAttribute('checked', '')
    expect(native(el)).toBe(input)
    expect(input.checked).toBe(true)
  })

  it('indeterminate 半选状态', () => {
    const el = mountCheckbox({ indeterminate: '' })
    expect(native(el).indeterminate).toBe(true)
  })

  it('disabled 不可交互', () => {
    const el = mountCheckbox({ disabled: '', checked: '' })
    const input = native(el)
    input.click()
    expect(input.checked).toBe(true)
    expect(input.disabled).toBe(true)
  })
})

describe('OASCheckbox 尺寸档（size）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 镜像 data-size，默认 medium', () => {
    const el = mountCheckbox()
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('size=small/large 镜像对应档', () => {
    expect(mountCheckbox({ size: 'small' }).getAttribute('data-size')).toBe('small')
    expect(mountCheckbox({ size: 'large' }).getAttribute('data-size')).toBe('large')
  })

  it('非法 size 静默回落 medium', () => {
    expect(mountCheckbox({ size: 'huge' }).getAttribute('data-size')).toBe('medium')
  })

  it('外部改 size 属性增量同步 data-size', () => {
    const el = mountCheckbox()
    el.setAttribute('size', 'small')
    expect(el.getAttribute('data-size')).toBe('small')
  })
})

describe('OASCheckbox 只读（readonly）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('readonly 可聚焦不切换，aria-readonly 同步', () => {
    const el = mountCheckbox({ readonly: '' })
    const input = native(el)
    expect(input.getAttribute('aria-readonly')).toBe('true')
    input.click()
    expect(input.checked).toBe(false)
    // 可聚焦：focus 委托仍生效（disabled 才不可聚焦）
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(input)
  })

  it('readonly 已选项点击保持勾选', () => {
    const el = mountCheckbox({ readonly: '', checked: '' })
    const input = native(el)
    input.click()
    expect(input.checked).toBe(true)
    expect(el.hasAttribute('checked')).toBe(true)
  })

  it('移除 readonly 恢复可切换', () => {
    const el = mountCheckbox({ readonly: '' })
    el.removeAttribute('readonly')
    native(el).click()
    expect(native(el).checked).toBe(true)
  })
})

describe('OASCheckbox 校验态（status）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('status 镜像 data-status', () => {
    expect(mountCheckbox({ status: 'error' }).getAttribute('data-status')).toBe('error')
    expect(mountCheckbox({ status: 'warning' }).getAttribute('data-status')).toBe('warning')
    expect(mountCheckbox({ status: 'success' }).getAttribute('data-status')).toBe('success')
  })

  it('status=error 联动 aria-invalid，清理时移除', () => {
    const el = mountCheckbox({ status: 'error' })
    expect(el.getAttribute('aria-invalid')).toBe('true')
    el.setAttribute('status', 'success')
    expect(el.getAttribute('aria-invalid')).toBe(null)
  })

  it('移除 status 属性清空 data-status', () => {
    const el = mountCheckbox({ status: 'error' })
    el.removeAttribute('status')
    expect(el.getAttribute('data-status')).toBe(null)
  })

  it('非法 status 静默回落（无 data-status）', () => {
    expect(mountCheckbox({ status: 'fatal' }).getAttribute('data-status')).toBe(null)
  })
})

describe('OASCheckbox 自定义指示器插槽', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('checked-icon 插槽内容在场时镜像 data-custom-checked-icon', () => {
    const el = new OASCheckbox()
    el.textContent = '收藏'
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'checked-icon')
    tpl.innerHTML = '<svg>♡</svg>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    expect(el.getAttribute('data-custom-checked-icon')).toBe('')
  })

  it('template[slot] 指示器内容克隆展开进指示器容器', () => {
    const el = new OASCheckbox()
    el.textContent = '收藏'
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'checked-icon')
    tpl.innerHTML = '<span class="fav">♥</span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    const holder = el.shadowRoot!.querySelector('.indicator-checked')!.querySelector('.indicator-tpl')
    expect(holder).not.toBeNull()
    expect(holder!.querySelector('.fav')).not.toBeNull()
  })

  it('indeterminate-icon 插槽同理', () => {
    const el = new OASCheckbox()
    el.textContent = '全选'
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'indeterminate-icon')
    tpl.innerHTML = '<span>—</span>'
    el.appendChild(tpl)
    document.body.appendChild(el)
    expect(el.getAttribute('data-custom-indeterminate-icon')).toBe('')
  })

  it('无插槽时不镜像（回落原生 input 显示）', () => {
    const el = mountCheckbox()
    expect(el.hasAttribute('data-custom-checked-icon')).toBe(false)
  })
})

describe('OASCheckbox 辅助文本（description）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('description 属性渲染为次要文本', () => {
    const el = mountCheckbox({}, '主文案')
    el.setAttribute('description', '副文本说明')
    const desc = el.shadowRoot!.querySelector('.description')!
    expect(desc).not.toBeNull()
    expect(desc.textContent).toContain('副文本说明')
  })

  it('无 description 时隐藏次要文本容器', () => {
    const el = mountCheckbox()
    const desc = el.shadowRoot!.querySelector('.description') as HTMLElement
    expect(desc.hidden).toBe(true)
  })

  it('slot="description" 分发优先于属性（.desc-text 让位）', () => {
    const el = new OASCheckbox()
    el.setAttribute('description', '属性文本')
    el.innerHTML = '主文案<span slot="description">插槽文本</span>'
    document.body.appendChild(el)
    const desc = el.shadowRoot!.querySelector('.description') as HTMLElement
    expect(desc.hidden).toBe(false)
    const descSlot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="description"]')!
    expect(descSlot.assignedElements().some((n) => (n.textContent ?? '').includes('插槽文本'))).toBe(true)
    // 有分发时属性文本节点让位隐藏
    expect((desc.querySelector('.desc-text') as HTMLElement).hidden).toBe(true)
  })

  it('组件永不写 description slot 的子树（slotchange 自激死循环回归防护）', () => {
    const el = mountCheckbox({}, '主文案')
    el.setAttribute('description', '副文本')
    el.setAttribute('description', '再改一次')
    const descSlot = el.shadowRoot!.querySelector('slot[name="description"]')!
    expect(descSlot.childNodes.length).toBe(0)
  })
})

describe('OASCheckbox label 位置（label-position）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('label-position 属性透传存活（视觉由 CSS row-reverse 切换）', () => {
    const el = mountCheckbox({ 'label-position': 'start' })
    expect(el.getAttribute('label-position')).toBe('start')
  })
})

describe('OASCheckbox 卡片形态（variant=card）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('variant 镜像 data-variant，非法值回落 default', () => {
    expect(mountCheckbox({ variant: 'card' }).getAttribute('data-variant')).toBe('card')
    expect(mountCheckbox().getAttribute('data-variant')).toBe('default')
    expect(mountCheckbox({ variant: 'pill' }).getAttribute('data-variant')).toBe('default')
  })
})

describe('OASCheckbox focus / blur 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('input 聚焦/失焦派发 oas-focus / oas-blur', () => {
    const el = mountCheckbox()
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    native(el).focus()
    native(el).blur()
    expect(events).toEqual(['focus', 'blur'])
  })
})

describe('OASCheckboxGroup', () => {
  function mountGroup(): OASCheckboxGroup {
    const el = new OASCheckboxGroup()
    el.setAttribute('value', '["a"]')
    el.innerHTML = `
      <oas-checkbox value="a">A</oas-checkbox>
      <oas-checkbox value="b">B</oas-checkbox>
      <oas-checkbox value="c">C</oas-checkbox>
    `
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('用原生 fieldset + legend 组织，value 数组驱动子项勾选', async () => {
    const el = mountGroup()
    await Promise.resolve()
    const fieldset = el.shadowRoot!.querySelector('fieldset')
    expect(fieldset).not.toBeNull()
    const checkbox = el.querySelector('oas-checkbox')!
    expect(checkbox.hasAttribute('checked')).toBe(true)
  })

  it('子项变化同步 group 的 value', () => {
    const el = mountGroup()
    const b = el.querySelector('oas-checkbox[value="b"]')!
    ;(b.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(el.getAttribute('value')).toContain('"b"')
  })
})

describe('OASCheckboxGroup 组级能力', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountGroup(attrs: Record<string, string> = {}): OASCheckboxGroup {
    const el = new OASCheckboxGroup()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = `
      <oas-checkbox value="a">A</oas-checkbox>
      <oas-checkbox value="b">B</oas-checkbox>
      <oas-checkbox value="c">C</oas-checkbox>
    `
    document.body.appendChild(el)
    return el
  }

  function itemInput(el: OASCheckboxGroup, value: string): HTMLInputElement {
    const item = el.querySelector(`oas-checkbox[value="${value}"]`)!
    return item.shadowRoot!.querySelector('input')!
  }

  it('子项点击只派发一次组 oas-change（重复挂监听债修复）', () => {
    const el = mountGroup({ value: '["a"]' })
    let count = 0
    // 只计组自身派发的 oas-change（子项事件 bubbles 穿过组 host，属正常传播不算）
    el.addEventListener('oas-change', (e) => {
      if (e.target === el) count++
    })
    // 多轮 attribute 变化触发 collect 重跑（历史债场景）
    el.setAttribute('value', '["a","b"]')
    el.setAttribute('value', '["a"]')
    itemInput(el, 'b').click()
    expect(count).toBe(1)
  })

  it('组级 disabled 不抹掉子项自身 disabled（豁免语义分立）', () => {
    const el = mountGroup()
    const b = el.querySelector('oas-checkbox[value="b"]')!
    b.setAttribute('disabled', '')
    expect(itemInput(el, 'b').disabled).toBe(true)
    expect(itemInput(el, 'a').disabled).toBe(false)
    // 组级 disabled 下发时全部禁用
    el.setAttribute('disabled', '')
    expect(itemInput(el, 'a').disabled).toBe(true)
  })

  it('组级 size/status/readonly 下发子项（data-group-* 镜像）', () => {
    const el = mountGroup({ size: 'small', status: 'error', readonly: '' })
    const a = el.querySelector('oas-checkbox[value="a"]')!
    expect(a.getAttribute('data-group-size')).toBe('small')
    expect(a.getAttribute('data-group-status')).toBe('error')
    expect(a.getAttribute('data-group-readonly')).toBe('')
    // 子项显式 size 优先于组下发
    a.setAttribute('size', 'large')
    expect(a.getAttribute('data-size')).toBe('large')
  })

  it('direction 镜像 data-direction，默认 vertical', () => {
    expect(mountGroup().getAttribute('data-direction')).toBe('vertical')
    expect(mountGroup({ direction: 'horizontal' }).getAttribute('data-direction')).toBe('horizontal')
    expect(mountGroup({ direction: 'diagonal' }).getAttribute('data-direction')).toBe('vertical')
  })

  it('options 数据通道渲染子项并可交互', () => {
    const el = mountGroup({
      value: '["x"]',
      options: JSON.stringify([
        { label: '选项X', value: 'x' },
        { label: '选项Y', value: 'y', description: 'Y 的说明' },
        { label: '选项Z', value: 'z', disabled: true },
      ]),
    })
    const options = el.shadowRoot!.querySelector('.options')!
    expect(options).not.toBeNull()
    const items = [...options.querySelectorAll('oas-checkbox')]
    expect(items.length).toBe(3)
    expect(items[0]!.hasAttribute('checked')).toBe(true)
    expect(items[1]!.getAttribute('description')).toBe('Y 的说明')
    expect(items[2]!.hasAttribute('disabled')).toBe(true)
    // 点击 options 渲染的子项同步组 value
    ;(items[1]!.shadowRoot!.querySelector('input')! as HTMLInputElement).click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['x', 'y'])
  })

  it('options 属性在场时忽略子元素声明', () => {
    const el = mountGroup({ options: JSON.stringify([{ label: 'X', value: 'x' }]) })
    const fieldset = el.shadowRoot!.querySelector('fieldset')!
    const light = el.querySelector('oas-checkbox[value="a"]') as HTMLElement
    expect(fieldset.querySelectorAll('oas-checkbox').length).toBe(1)
    expect(light.hasAttribute('hidden')).toBe(false) // light 子项不删（仅视觉让位）
  })

  it('max 达上限未选项拦截并派发 oas-exceed-limit，已选项仍可取消', () => {
    const el = mountGroup({ value: '["a","b"]', max: '2' })
    // 未选项 c 被 limit 拦截
    const c = el.querySelector('oas-checkbox[value="c"]')!
    expect(c.hasAttribute('data-limit-blocked')).toBe(true)
    const events: unknown[] = []
    el.addEventListener('oas-exceed-limit', (e) => events.push((e as CustomEvent).detail))
    itemInput(el, 'c').click()
    expect(itemInput(el, 'c').checked).toBe(false)
    expect(events).toEqual([{ value: 'c', max: 2 }])
    // 已选项 b 可取消，取消后 c 解锁
    itemInput(el, 'b').click()
    expect(c.hasAttribute('data-limit-blocked')).toBe(false)
  })

  it('min 保底：≤min 时已选项拦截取消', () => {
    const el = mountGroup({ value: '["a"]', min: '1' })
    const a = el.querySelector('oas-checkbox[value="a"]')!
    expect(a.hasAttribute('data-limit-blocked')).toBe(true)
    itemInput(el, 'a').click()
    expect(itemInput(el, 'a').checked).toBe(true)
    // 未选项不受 min 影响
    itemInput(el, 'b').click()
    expect(itemInput(el, 'b').checked).toBe(true)
  })

  it('非法 max/min 忽略', () => {
    const el = mountGroup({ value: '["a"]', max: 'abc', min: '-1' })
    expect(el.querySelector('oas-checkbox')!.hasAttribute('data-limit-blocked')).toBe(false)
  })

  it('组级 readonly 下发后子项不可切换', () => {
    const el = mountGroup({ readonly: '' })
    itemInput(el, 'a').click()
    expect(itemInput(el, 'a').checked).toBe(false)
  })
})

describe('OASCheckboxGroup 全选联动（check-all）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountCheckAll(attrs: Record<string, string> = {}): OASCheckboxGroup {
    const el = new OASCheckboxGroup()
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.innerHTML = `
      <oas-checkbox value="a">A</oas-checkbox>
      <oas-checkbox value="b">B</oas-checkbox>
      <oas-checkbox value="c" disabled>C（禁用）</oas-checkbox>
    `
    const all = document.createElement('oas-checkbox')
    all.setAttribute('check-all', '')
    all.textContent = '全选'
    el.prepend(all)
    document.body.appendChild(el)
    return el
  }

  function allItem(el: OASCheckboxGroup): OASCheckbox {
    return el.querySelector('oas-checkbox[check-all]')! as OASCheckbox
  }

  function itemInput(el: OASCheckboxGroup, value: string): HTMLInputElement {
    const item = el.querySelector(`oas-checkbox[value="${value}"]`)!
    return item.shadowRoot!.querySelector('input')!
  }

  it('子项部分选中时全选项呈半选', () => {
    const el = mountCheckAll({ value: '["a"]' })
    const all = allItem(el)
    expect(all.hasAttribute('checked')).toBe(false)
    expect(all.hasAttribute('indeterminate')).toBe(true)
  })

  it('子项全选中（跳过禁用项）时全选项勾选', () => {
    const el = mountCheckAll({ value: '["a","b"]' })
    const all = allItem(el)
    expect(all.hasAttribute('checked')).toBe(true)
    expect(all.hasAttribute('indeterminate')).toBe(false)
  })

  it('无选中时全选项空态', () => {
    const el = mountCheckAll()
    const all = allItem(el)
    expect(all.hasAttribute('checked')).toBe(false)
    expect(all.hasAttribute('indeterminate')).toBe(false)
  })

  it('点击全选项选中全部可选项，再点取消', () => {
    const el = mountCheckAll()
    const allInput = allItem(el).shadowRoot!.querySelector('input')!
    allInput.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['a', 'b'])
    expect(allItem(el).hasAttribute('checked')).toBe(true)
    allInput.click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual([])
    expect(allItem(el).hasAttribute('checked')).toBe(false)
  })

  it('子项变化回写全选项半选态', () => {
    const el = mountCheckAll()
    itemInput(el, 'a').click()
    expect(allItem(el).hasAttribute('indeterminate')).toBe(true)
    itemInput(el, 'b').click()
    expect(allItem(el).hasAttribute('checked')).toBe(true)
    expect(allItem(el).hasAttribute('indeterminate')).toBe(false)
  })

  it('check-all 项不参与组 value', () => {
    const el = mountCheckAll()
    const all = allItem(el)
    expect(all.getAttribute('value')).toBe(null)
    itemInput(el, 'a').click()
    expect(JSON.parse(el.getAttribute('value')!)).toEqual(['a'])
  })

  it('与 max 组合：全选受上限截断且呈半选', () => {
    const el = mountCheckAll({ max: '1' })
    const allInput = allItem(el).shadowRoot!.querySelector('input')!
    allInput.click()
    expect(JSON.parse(el.getAttribute('value')!).length).toBe(1)
    expect(allItem(el).hasAttribute('indeterminate')).toBe(true)
  })
})

describe('OASCheckboxGroup focus / blur 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('子项聚焦派发组 oas-focus，离开派发 oas-blur', () => {
    const el = new OASCheckboxGroup()
    el.innerHTML = `<oas-checkbox value="a">A</oas-checkbox>`
    document.body.appendChild(el)
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    const input = el.querySelector('oas-checkbox')!.shadowRoot!.querySelector('input')!
    input.focus()
    expect(events).toEqual(['focus'])
    input.blur()
    expect(events).toEqual(['focus', 'blur'])
  })

  it('组内子项间转移不误报（relatedTarget 在组内）', () => {
    const el = new OASCheckboxGroup()
    el.innerHTML = `<oas-checkbox value="a">A</oas-checkbox><oas-checkbox value="b">B</oas-checkbox>`
    document.body.appendChild(el)
    const events: string[] = []
    el.addEventListener('oas-focus', () => events.push('focus'))
    el.addEventListener('oas-blur', () => events.push('blur'))
    const [a, b] = [...el.querySelectorAll('oas-checkbox')]
    const ia = a!.shadowRoot!.querySelector('input')!
    const ib = b!.shadowRoot!.querySelector('input')!
    ia.focus()
    // 手动派发带 relatedTarget 的 focusout（模拟浏览器焦点转移）
    ia.dispatchEvent(new FocusEvent('focusout', { bubbles: true, composed: true, relatedTarget: ib }))
    ib.dispatchEvent(new FocusEvent('focusin', { bubbles: true, composed: true }))
    expect(events).toEqual(['focus'])
  })
})

describe('OASCheckbox focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内原生 checkbox', () => {
    const el = new OASCheckbox()
    el.textContent = '记住我'
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector('input'))
  })
})

describe('OASCheckbox 全局禁用注入（config-provider disabled）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('provider disabled：checkbox 无显式 disabled 时继承禁用 + 宿主 data-disabled 镜像', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASCheckbox()
    el.textContent = '选项'
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(native(el).disabled).toBe(true)
    expect(el.hasAttribute('data-disabled')).toBe(true)
  })

  it('provider disabled + disabled-skip：checkbox 保持可交互（不镜像）', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASCheckbox()
    el.setAttribute('disabled-skip', '')
    el.textContent = '选项'
    cp.appendChild(el)
    document.body.appendChild(cp)

    expect(native(el).disabled).toBe(false)
    expect(el.hasAttribute('data-disabled')).toBe(false)
  })

  it('provider disabled 时点击不改变勾选态', () => {
    const cp = document.createElement('oas-config-provider')
    cp.setAttribute('disabled', '')
    const el = new OASCheckbox()
    el.textContent = '选项'
    cp.appendChild(el)
    document.body.appendChild(cp)

    const i = native(el)
    i.click()
    expect(i.checked).toBe(false)
  })
})
