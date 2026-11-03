import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core/oas-element'
import { OASInput } from './input/index.js'
import { OASTextarea } from './textarea/index.js'
import { OASCheckbox, OASCheckboxGroup } from './checkbox/index.js'
import { OASRadio, OASRadioGroup } from './radio/index.js'
import { OASSwitch } from './switch/index.js'
import { OASSlider } from './slider/index.js'
import { OASInputNumber } from './input-number/index.js'
import { OASRate } from './rate/index.js'
import { OASAutoComplete } from './auto-complete/index.js'
import { OASCombobox } from './combobox/index.js'
import { OASCascader } from './cascader/index.js'
import { OASTreeSelect } from './tree-select/index.js'
import { OASMentions } from './mentions/index.js'
import { OASDatePicker } from './date-picker/index.js'
import { OASTimePicker } from './time-picker/index.js'
import { OASCalendar } from './calendar/index.js'
import { OASUpload } from './upload/index.js'
import { OASTransfer } from './transfer/index.js'
import { OASColorPicker } from './color-picker/index.js'
import { OASToggleButton } from './toggle-button/index.js'
import { OASToggleGroup } from './toggle-group/index.js'
import { OASPinInput } from './pin-input/index.js'
import { OASDynamicInput } from './dynamic-input/index.js'
import { OASDynamicTags } from './dynamic-tags/index.js'
import { OASEditable } from './editable/index.js'
import { OASForm } from './form/index.js'
import { OASFormItem } from './form-item/index.js'
import { OASSwatch } from './swatch/index.js'
import { OASPicker } from './picker/index.js'

/**
 * form 组件 DSD 真水合批次 1 单测（对应 SSR 白名单化改造）。
 *
 * 验证三件事：
 * 1. 真水合接管：注入「真实 template 渲染出的快照 + 指纹 meta」后 upgrade，
 *    hydrate() 直接接管——style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. 数据通道（transfer data / toggle-group items）：property setter 单向反射 attribute，
 *    attribute 为唯一权威数据源，非法 JSON 容错空态。
 *
 * 快照用「先渲染参照实例再取其 shadow.innerHTML」的方式构造，保证与组件 template() 严格一致，
 * 不手拼 HTML（template 变更时用例自动跟随）。
 */

type Fixture = {
  name: string
  cls: new () => OASElement
  /** 在参照渲染与水合实例上施加相同初始属性/light DOM */
  setup?: (el: OASElement) => void
  /** 水合接管后应存在的关键结构选择器 */
  probe: string
}

const OPTIONS = JSON.stringify([
  { label: '苹果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
])
const TREE_OPTIONS = JSON.stringify([
  { label: '节点 A', value: 'a', children: [{ label: '子节点 1', value: 'a-1' }] },
  { label: '节点 B', value: 'b' },
])
const PICKER_COLUMNS = JSON.stringify([
  {
    key: 'fruit',
    label: '水果',
    items: [
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
      { label: '橙子', value: 'orange' },
    ],
  },
  { key: 'num', label: '数量', items: [{ label: '一' }, { label: '二' }, { label: '三' }] },
])

const FIXTURES: Fixture[] = [
  {
    name: 'input',
    cls: OASInput,
    setup: (e) => e.setAttribute('value', 'hello'),
    probe: 'input[part="input"]',
  },
  {
    name: 'textarea',
    cls: OASTextarea,
    setup: (e) => e.setAttribute('value', '多行文本'),
    probe: 'textarea[part="textarea"]',
  },
  {
    name: 'checkbox',
    cls: OASCheckbox,
    setup: (e) => e.setAttribute('checked', ''),
    probe: 'input[part="checkbox"]',
  },
  {
    name: 'checkbox-group',
    cls: OASCheckboxGroup,
    setup: (e) => {
      e.setAttribute('value', '["a"]')
      e.innerHTML = '<oas-checkbox value="a">A</oas-checkbox><oas-checkbox value="b">B</oas-checkbox>'
    },
    probe: 'fieldset',
  },
  {
    name: 'radio',
    cls: OASRadio,
    setup: (e) => e.setAttribute('checked', ''),
    probe: 'input[part="radio"]',
  },
  {
    name: 'radio-group',
    cls: OASRadioGroup,
    setup: (e) => {
      e.setAttribute('value', 'a')
      e.innerHTML = '<oas-radio value="a">A</oas-radio><oas-radio value="b">B</oas-radio>'
    },
    probe: 'fieldset',
  },
  {
    name: 'switch',
    cls: OASSwitch,
    setup: (e) => e.setAttribute('checked', ''),
    probe: 'button[part="switch"]',
  },
  {
    name: 'slider',
    cls: OASSlider,
    setup: (e) => e.setAttribute('value', '60'),
    probe: 'input[part="track"]',
  },
  {
    name: 'input-number',
    cls: OASInputNumber,
    setup: (e) => e.setAttribute('value', '12'),
    probe: 'input[part="input"]',
  },
  { name: 'rate', cls: OASRate, setup: (e) => e.setAttribute('value', '4'), probe: '.slider' },
  {
    name: 'auto-complete',
    cls: OASAutoComplete,
    setup: (e) => {
      e.setAttribute('options', OPTIONS)
      e.setAttribute('value', 'apple')
    },
    probe: 'input',
  },
  {
    name: 'combobox',
    cls: OASCombobox,
    setup: (e) => {
      e.setAttribute('options', OPTIONS)
      e.setAttribute('value', 'apple')
    },
    probe: 'input',
  },
  {
    name: 'cascader',
    cls: OASCascader,
    setup: (e) => {
      e.setAttribute('options', TREE_OPTIONS)
      e.setAttribute('value', '["a","a-1"]')
    },
    probe: '.trigger',
  },
  {
    name: 'tree-select',
    cls: OASTreeSelect,
    setup: (e) => {
      e.setAttribute('options', TREE_OPTIONS)
      e.setAttribute('value', 'a')
    },
    probe: '.trigger',
  },
  {
    name: 'mentions',
    cls: OASMentions,
    setup: (e) => e.setAttribute('options', OPTIONS),
    probe: 'textarea',
  },
  {
    name: 'date-picker',
    cls: OASDatePicker,
    setup: (e) => e.setAttribute('value', '2024-01-15'),
    probe: '[part="trigger"]',
  },
  {
    name: 'time-picker',
    cls: OASTimePicker,
    setup: (e) => e.setAttribute('value', '12:30:00'),
    probe: '[part="trigger"]',
  },
  {
    name: 'calendar',
    cls: OASCalendar,
    setup: (e) => e.setAttribute('value', '2024-02-10'),
    probe: '[part="grid"]',
  },
  { name: 'upload', cls: OASUpload, probe: '.zone' },
  {
    name: 'transfer',
    cls: OASTransfer,
    setup: (e) =>
      e.setAttribute(
        'data',
        JSON.stringify([
          { key: 'a', label: '苹果' },
          { key: 'b', label: '香蕉' },
        ]),
      ),
    probe: '.listbox.left',
  },
  {
    name: 'color-picker',
    cls: OASColorPicker,
    setup: (e) => e.setAttribute('value', '#0b6cff'),
    probe: '.trigger',
  },
  {
    name: 'toggle-button',
    cls: OASToggleButton,
    setup: (e) => e.setAttribute('pressed', ''),
    probe: 'button[part="button"]',
  },
  {
    name: 'toggle-group',
    cls: OASToggleGroup,
    setup: (e) => {
      e.setAttribute(
        'items',
        JSON.stringify([
          { label: '日', value: 'day' },
          { label: '周', value: 'week' },
        ]),
      )
      e.setAttribute('value', 'week')
    },
    probe: '.group',
  },
  {
    name: 'pin-input',
    cls: OASPinInput,
    setup: (e) => e.setAttribute('value', '123'),
    probe: '.container',
  },
  {
    name: 'dynamic-input',
    cls: OASDynamicInput,
    setup: (e) => e.setAttribute('model-value', '["a","b"]'),
    probe: '.rows',
  },
  {
    name: 'dynamic-tags',
    cls: OASDynamicTags,
    setup: (e) => e.setAttribute('model-value', '["标签1"]'),
    probe: '.tags',
  },
  {
    name: 'editable',
    cls: OASEditable,
    setup: (e) => e.setAttribute('value', '可编辑'),
    probe: '.display',
  },
  { name: 'form', cls: OASForm, probe: 'form[part="form"]' },
  {
    name: 'form-item',
    cls: OASFormItem,
    setup: (e) => e.setAttribute('label', '姓名'),
    probe: '.field',
  },
  // —— SSR 白名单收口：swatch / picker ——
  {
    name: 'swatch',
    cls: OASSwatch,
    setup: (e) => {
      e.setAttribute('color', 'blue')
      e.setAttribute('size', 'large')
      e.setAttribute('shape', 'circle')
      e.setAttribute('selected', '')
    },
    probe: '[part="swatch"]',
  },
  {
    name: 'picker',
    cls: OASPicker,
    setup: (e) => {
      e.setAttribute('columns', PICKER_COLUMNS)
      e.setAttribute('value', '["banana","二"]')
    },
    probe: '.wheels',
  },
]

/** 渲染一个参照实例并返回其 shadow 快照（SSR 场景等价物） */
function captureSnapshot(cls: new () => OASElement, setup?: (el: OASElement) => void): string {
  const el = new cls()
  setup?.(el)
  document.body.appendChild(el)
  const html = el.shadowRoot!.innerHTML
  el.remove()
  return html
}

/** 注入快照 + 指纹后升级（模拟浏览器 DSD upgrade） */
function upgradeFromSnapshot(
  cls: new () => OASElement,
  shadowHtml: string,
  setup?: (el: OASElement) => void,
): { el: OASElement; styleRef: Element | null } {
  const el = new cls()
  const tag = el.tagName.toLowerCase()
  el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${shadowHtml}`
  setup?.(el)
  const styleRef = el.shadowRoot!.querySelector('style')
  document.body.appendChild(el)
  return { el, styleRef }
}

describe('form 组件 DSD 真水合批次 1', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  for (const f of FIXTURES) {
    it(`真水合接管：${f.name} hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持`, () => {
      const snap = captureSnapshot(f.cls, f.setup)
      const { el, styleRef } = upgradeFromSnapshot(f.cls, snap, f.setup)

      // hydrate 接管：style 为同一 DOM 对象（shadow 未重建）
      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      // 指纹 meta 已移除
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      // 关键结构仍在
      expect(el.shadowRoot!.querySelectorAll(f.probe).length).toBeGreaterThanOrEqual(1)
      // 快照确实含 style 与关键结构（保证用例在测真水合而非空快照）
      expect(snap).toContain('<style>')
      expect(snap).not.toContain('data-oas-ssr')
    })

    it(`回退：${f.name} 快照缺关键结构时 hydrate 返回 false → render 全量重建`, () => {
      const el = new f.cls()
      const tag = el.tagName.toLowerCase()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1"><span>broken</span>`
      f.setup?.(el)
      document.body.appendChild(el)
      // render 重建出完整结构，指纹被重建清掉
      expect(el.shadowRoot!.querySelectorAll(f.probe).length).toBeGreaterThanOrEqual(1)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    })
  }

  it('回归：rate 水合后星数不翻倍（采纳快照已有星星）、dynamic-input 行数不翻倍（采纳快照已有行）', () => {
    // oas-rate：快照含 5 颗星，水合后 ensureStars 不得重复追加
    const rateSnap = captureSnapshot(OASRate, (e) => e.setAttribute('value', '4'))
    const rate = upgradeFromSnapshot(OASRate, rateSnap, (e) => e.setAttribute('value', '4')).el
    expect(rate.shadowRoot!.querySelectorAll('.star').length).toBe(5)

    // oas-dynamic-input：快照按 model-value 渲染 2 行，水合后 syncRows 不得重复追加
    const diSnap = captureSnapshot(OASDynamicInput, (e) => e.setAttribute('model-value', '["a","b"]'))
    const di = upgradeFromSnapshot(OASDynamicInput, diSnap, (e) => e.setAttribute('model-value', '["a","b"]')).el
    expect(di.shadowRoot!.querySelectorAll('.row').length).toBe(2)
  })

  it('radio-group：互斥 name 不进快照（SSR 口径）但水合后恢复——子项 input.name 非空且组内单选互斥生效', () => {
    // 方案 F 回归（维护批 M2 fix round）：radio-group 的互斥 name（运行时唯一值）不进
    // SSR 快照——这里手工构造「无 name」的快照模拟真实 SSR 输出
    const setup = (e: OASElement) => {
      e.setAttribute('value', 'a')
      e.innerHTML = '<oas-radio value="a">A</oas-radio><oas-radio value="b">B</oas-radio>'
    }
    const snap = captureSnapshot(OASRadioGroup, setup).replace(/ name="[^"]*"/g, '')
    expect(snap, 'SSR 快照口径：子项不含互斥 name').not.toContain('name=')
    const { el } = upgradeFromSnapshot(OASRadioGroup, snap, setup)

    // 水合后 radio-group 把运行时唯一 name 写回子项（radio observedAttributes 含 name → input.name 同步）
    const radios = el.querySelectorAll('oas-radio')
    expect(radios.length).toBe(2)
    const names = [...radios].map((r) => r.getAttribute('name'))
    expect(names[0], '子项 name 已恢复且同组同名').toBe(names[1])
    expect(names[0], '同组子项同名（互斥组）').toBe(names[1])

    // 组内单选互斥生效（组件链路：radio 按 name 文档级清同组 + 组 update 重下发 checked，
    // 非浏览器跨 shadow 同名分组——后者在 shadow 场景本就失效）：点击第二个子项的内部
    // input → 第一个子项 checked 取消、value 切到 b
    const inputB = (radios[1] as OASRadio & { shadowRoot: ShadowRoot }).shadowRoot!.querySelector('input')!
    inputB.click()
    expect(radios[1]!.hasAttribute('checked'), '点击后 B 选中').toBe(true)
    expect(radios[0]!.hasAttribute('checked'), '原生同名互斥：A 取消').toBe(false)
  })
  it('交互可触发：水合后 oas-input 输入派发 oas-input / oas-switch 点击切换 / oas-toggle-button 切换 aria-pressed', () => {
    // oas-input
    const inputSnap = captureSnapshot(OASInput, (e) => e.setAttribute('value', ''))
    const input = upgradeFromSnapshot(OASInput, inputSnap).el
    let inputDetail: unknown = null
    input.addEventListener('oas-input', (e: Event) => (inputDetail = (e as CustomEvent).detail))
    const native = input.shadowRoot!.querySelector('input')!
    native.value = 'typed'
    native.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    expect(inputDetail).toEqual({ value: 'typed' })

    // oas-switch
    const switchSnap = captureSnapshot(OASSwitch)
    const sw = upgradeFromSnapshot(OASSwitch, switchSnap).el
    sw.shadowRoot!.querySelector<HTMLButtonElement>('button[part="switch"]')!.click()
    expect(sw.hasAttribute('checked')).toBe(true)

    // oas-toggle-button
    const tbSnap = captureSnapshot(OASToggleButton)
    const tb = upgradeFromSnapshot(OASToggleButton, tbSnap).el
    tb.shadowRoot!.querySelector<HTMLButtonElement>('button[part="button"]')!.click()
    expect(tb.hasAttribute('pressed')).toBe(true)
  })

  it('交互可触发：水合后 oas-transfer 选项可选中、oas-toggle-group 点击可选中', () => {
    // oas-transfer
    const transferData = JSON.stringify([
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
    ])
    const tfSnap = captureSnapshot(OASTransfer, (e) => e.setAttribute('data', transferData))
    const tf = upgradeFromSnapshot(OASTransfer, tfSnap, (e) => e.setAttribute('data', transferData)).el
    const firstLeft = tf.shadowRoot!.querySelector<HTMLElement>('.listbox.left .option')!
    firstLeft.click()
    // renderPanel 重建行：重新查询而非读已分离的旧引用
    const freshLeft = tf.shadowRoot!.querySelector<HTMLElement>('.listbox.left .option')!
    expect(freshLeft.getAttribute('aria-selected')).toBe('true')

    // oas-toggle-group
    const items = JSON.stringify([
      { label: '日', value: 'day' },
      { label: '周', value: 'week' },
    ])
    const tgSnap = captureSnapshot(OASToggleGroup, (e) => e.setAttribute('items', items))
    const tg = upgradeFromSnapshot(OASToggleGroup, tgSnap, (e) => e.setAttribute('items', items)).el
    tg.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="item"]')[1]!.click()
    expect(tg.getAttribute('value')).toBe('week')
  })
})

describe('SSR 白名单收口：swatch / picker 真水合契约', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('swatch：水合后单次点击只派发一次 oas-click，属性更新复用同一按钮节点', () => {
    const setup = FIXTURES.find((f) => f.name === 'swatch')!.setup!
    const snap = captureSnapshot(OASSwatch, setup)
    const { el } = upgradeFromSnapshot(OASSwatch, snap, setup)
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="swatch"]')!

    el.setAttribute('selected', '')
    expect(el.shadowRoot!.querySelector('[part="swatch"]')).toBe(button)

    const colors: string[] = []
    el.addEventListener('oas-click', (e: Event) => colors.push((e as CustomEvent).detail.color))
    button.click()
    expect(colors).toEqual(['blue'])
  })

  it('picker：水合采纳快照列节点（不重建）、初始滚动位由 value 属性决定', () => {
    const setup = FIXTURES.find((f) => f.name === 'picker')!.setup!
    const snap = captureSnapshot(OASPicker, setup)

    const el = new OASPicker()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-picker" data-oas-ssr-v="1">${snap}`
    setup(el)
    // 注入后、连接前：快照列节点即为水合应采纳的节点
    const snapshotCols = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
    expect(snapshotCols.length).toBe(2)

    document.body.appendChild(el)

    const cols = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
    expect(cols[0]).toBe(snapshotCols[0])
    expect(cols[1]).toBe(snapshotCols[1])
    // value=["banana","二"] → 两列均落停在索引 1（item-height 36）
    expect(cols[0]!.scrollTop).toBe(36)
    expect(cols[1]!.scrollTop).toBe(36)
    expect(cols[0]!.querySelectorAll('[role="option"]')[1]!.getAttribute('aria-selected')).toBe('true')
  })

  it('picker：水合后单次滚动落定只派发一次 oas-change（监听不重复绑定）', async () => {
    const setup = FIXTURES.find((f) => f.name === 'picker')!.setup!
    const snap = captureSnapshot(OASPicker, setup)
    const { el } = upgradeFromSnapshot(OASPicker, snap, setup)
    const changes: unknown[] = []
    el.addEventListener('oas-change', (e: Event) => changes.push((e as CustomEvent).detail))

    const col = el.shadowRoot!.querySelectorAll<HTMLElement>('.column')[0]!
    col.scrollTop = 72
    col.dispatchEvent(new Event('scroll'))
    await new Promise((r) => setTimeout(r, 160))
    expect(changes).toHaveLength(1)
    expect(el.getAttribute('value')).toBe('["orange","二"]')
  })

  // —— fix round 2：swatch 关键子结构校验（只验 part 命中会接管非按钮残破快照） ——

  it('swatch：快照 part="swatch" 挂在非 button 元素上时回退 render（否则 bind 空引用、点击无事件）', () => {
    const el = new OASSwatch()
    el.setAttribute('color', 'blue')
    el.setAttribute('selected', '')
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-swatch" data-oas-ssr-v="1"><style></style><div part="swatch"></div>'
    document.body.appendChild(el)

    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('button[part="swatch"]')
    expect(button?.tagName, '回退后应为真实 button 骨架').toBe('BUTTON')
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    // 关键属性同步只在 bind 成功后才成立
    expect(button!.getAttribute('aria-pressed')).toBe('true')
    const colors: string[] = []
    el.addEventListener('oas-click', (e: Event) => colors.push((e as CustomEvent).detail.color))
    button!.click()
    expect(colors).toEqual(['blue'])
  })
})

describe('数据组件 JSON attribute 数据通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('transfer.data：property setter 单向反射 attribute，getter 返回解析数组', () => {
    const el = new OASTransfer()
    document.body.appendChild(el)
    const items = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
    ]
    el.data = items
    expect(el.getAttribute('data')).toBe(JSON.stringify(items))
    expect(el.data).toEqual(items)
    expect(el.shadowRoot!.querySelectorAll('.listbox.left .option').length).toBe(2)
  })

  it('transfer.data：非法 JSON 容错为空数据，不抛错', () => {
    const el = new OASTransfer()
    el.setAttribute('data', '[{bad json')
    document.body.appendChild(el)
    expect(el.data).toEqual([])
    expect(el.shadowRoot!.querySelectorAll('.listbox.left .option').length).toBe(0)
  })

  it('toggle-group.items：property setter 单向反射 attribute，getter 返回解析数组', () => {
    const el = new OASToggleGroup()
    document.body.appendChild(el)
    const items = [
      { label: '日', value: 'day' },
      { label: '周', value: 'week' },
    ]
    el.items = items
    expect(el.getAttribute('items')).toBe(JSON.stringify(items))
    expect(el.items).toEqual(items)
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(2)
  })

  it('toggle-group.items：非法 JSON 容错为空列表，不抛错', () => {
    const el = new OASToggleGroup()
    el.setAttribute('items', 'not-json')
    document.body.appendChild(el)
    expect(el.items).toEqual([])
    expect(el.shadowRoot!.querySelectorAll('[part="item"]').length).toBe(0)
  })
})
