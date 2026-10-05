import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import zhCN from '@oas-ui/i18n/zh-CN'
import '@oas-ui/i18n'
import { OASPicker } from './index.js'

const COLUMNS = JSON.stringify([
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

const TREE = JSON.stringify([
  {
    label: '浙江',
    value: 'zj',
    children: [
      { label: '杭州', value: 'hz' },
      { label: '宁波', value: 'nb' },
    ],
  },
  {
    label: '江苏',
    value: 'js',
    children: [
      { label: '南京', value: 'nj' },
      { label: '苏州', value: 'sz' },
    ],
  },
])

function mount(attrs: Record<string, string> = {}): OASPicker {
  const el = new OASPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function cols(el: OASPicker): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.column')]
}
function items(col: HTMLElement): HTMLElement[] {
  return [...col.querySelectorAll<HTMLElement>('.item')]
}
/** happy-dom 无滚动吸附：直接写 scrollTop 并派发 scroll 驱动逻辑（组件不得依赖真实布局） */
function scrollTo(el: OASPicker, colIdx: number, itemIdx: number, itemHeight = 36): void {
  const col = cols(el)[colIdx]!
  col.scrollTop = itemIdx * itemHeight
  col.dispatchEvent(new Event('scroll'))
}
async function settle(ms = 140): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

describe('OASPicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale(zhCN)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('结构与渲染', () => {
    it('columns 渲染：每列 listbox + items option + 上下占位 + 选中行高亮', () => {
      const el = mount({ columns: COLUMNS })
      expect(cols(el).length).toBe(2)
      const c0 = cols(el)[0]!
      expect(c0.getAttribute('role')).toBe('listbox')
      expect(c0.getAttribute('tabindex')).toBe('0')
      expect(items(c0).length).toBe(3)
      expect(items(c0)[0]!.getAttribute('role')).toBe('option')
      // 占位：visible-count=5 → (5-1)/2 * itemHeight = 72px
      const spacers = c0.querySelectorAll('.spacer')
      expect(spacers.length).toBe(2)
      expect((spacers[0] as HTMLElement).style.height).toBe('72px')
      // 无覆盖式指示带：选中行自带高亮（防 absolute 覆盖物回归）
      expect(el.shadowRoot!.querySelector('.band')).toBeNull()
    })

    it('item-height / visible-count 定制：占位与轮高随档位（偶数 count 归奇）', () => {
      const el = mount({ columns: COLUMNS, 'item-height': '40', 'visible-count': '4' })
      const c0 = cols(el)[0]!
      // count 4 → 归奇 5 → 占位 (5-1)/2*40=80
      expect((c0.querySelector('.spacer') as HTMLElement).style.height).toBe('80px')
      expect(c0.style.height).toBe('200px')
    })

    it('列 aria-label：label 字段优先，缺省走 i18n 序号', () => {
      const el = mount({ columns: COLUMNS })
      expect(cols(el)[0]!.getAttribute('aria-label')).toBe('水果')
      const bare = mount({ columns: JSON.stringify([{ items: [{ label: 'x' }] }]) })
      expect(cols(bare)[0]!.getAttribute('aria-label')).toBeTruthy()
    })

    it('非法/空 JSON：空列容错不渲染', () => {
      const el = mount({ columns: '{bad json' })
      expect(cols(el).length).toBe(0)
    })
  })

  describe('选中与事件', () => {
    it('初始 value：对应项 aria-selected + 滚动位落定', async () => {
      const el = mount({ columns: COLUMNS, value: '["banana","二"]' })
      await settle()
      expect(items(cols(el)[0]!)[1]!.getAttribute('aria-selected')).toBe('true')
      expect(items(cols(el)[1]!)[1]!.getAttribute('aria-selected')).toBe('true')
      expect(cols(el)[0]!.scrollTop).toBe(36)
    })

    it('滚动落停：值回写 value 属性 + 派发 oas-change（detail.value/labels）', async () => {
      const el = mount({ columns: COLUMNS })
      const events: Array<{ value: string[]; labels: string[] }> = []
      el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
      scrollTo(el, 0, 2)
      await settle()
      expect(events.length).toBe(1)
      expect(events[0]!.value).toEqual(['orange', '一'])
      expect(events[0]!.labels).toEqual(['橙子', '一'])
      expect(el.getAttribute('value')).toBe('["orange","一"]')
    })

    it('程序性 value 写入只滚动不派发事件（受控语义）', async () => {
      const el = mount({ columns: COLUMNS })
      const events: unknown[] = []
      el.addEventListener('oas-change', (e) => events.push(e))
      el.setAttribute('value', '["banana","三"]')
      await settle()
      expect(cols(el)[0]!.scrollTop).toBe(36)
      expect(cols(el)[1]!.scrollTop).toBe(72)
      expect(events.length).toBe(0)
    })

    it('value 缺省：默认选中每列第一项（初始不派发）', async () => {
      const el = mount({ columns: COLUMNS })
      await settle()
      expect(items(cols(el)[0]!)[0]!.getAttribute('aria-selected')).toBe('true')
      expect(items(cols(el)[1]!)[0]!.getAttribute('aria-selected')).toBe('true')
    })
  })

  describe('禁用项与键盘', () => {
    it('落停到 disabled 项：吸附到最近可用项并照常提交', async () => {
      const el = mount({
        columns: JSON.stringify([{ items: [{ label: 'a' }, { label: 'b', disabled: true }, { label: 'c' }] }]),
      })
      scrollTo(el, 0, 1)
      await settle()
      expect(items(cols(el)[0]!)[2]!.getAttribute('aria-selected')).toBe('true')
      expect(el.getAttribute('value')).toBe('["c"]')
    })

    it('键盘 ArrowUp/ArrowDown 移动选中并派发 oas-change；Home/End 跳首尾', async () => {
      const el = mount({ columns: COLUMNS })
      const events: Array<{ value: string[] }> = []
      el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
      cols(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      await settle()
      // 提交触发整体重建：断言一律重查询（旧引用已脱离文档）
      expect(items(cols(el)[0]!)[1]!.getAttribute('aria-selected')).toBe('true')
      cols(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await settle()
      expect(items(cols(el)[0]!)[2]!.getAttribute('aria-selected')).toBe('true')
      expect(events.length).toBe(2)
      cols(el)[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      await settle()
      expect(items(cols(el)[0]!)[0]!.getAttribute('aria-selected')).toBe('true')
    })
  })

  describe('级联（options 树）', () => {
    it('options 树：列数随选中路径派生；父列变更重建子列并复位', async () => {
      const el = mount({ options: TREE, value: '["zj","hz"]' })
      await settle()
      expect(cols(el).length).toBe(2)
      expect(items(cols(el)[1]!).map((i) => i.textContent)).toEqual(['杭州', '宁波'])
      // 改父列 → 子列重建为江苏城市并选中首项
      const events: Array<{ value: string[] }> = []
      el.addEventListener('oas-change', (e) => events.push((e as CustomEvent).detail))
      scrollTo(el, 0, 1)
      await settle()
      expect(items(cols(el)[1]!).map((i) => i.textContent)).toEqual(['南京', '苏州'])
      expect(events[events.length - 1]!.value).toEqual(['js', 'nj'])
    })
  })

  describe('级联深度与防御（review 回归）', () => {
    it('三级及以上级联 + 深层初始 value：首帧即渲全列数且值正确（C1 回归：曾少渲一列并把缺失级错报为第 0 项）', async () => {
      const el = mount({
        options: JSON.stringify([
          {
            label: 'A',
            value: 'a',
            children: [
              {
                label: 'A1',
                value: 'a1',
                children: [
                  { label: 'A1x', value: 'a1x' },
                  { label: 'A1y', value: 'a1y' },
                ],
              },
            ],
          },
        ]),
        value: '["a","a1","a1y"]',
      })
      await settle()
      expect(cols(el).length, '三级全列').toBe(3)
      expect(items(cols(el)[2]!).map((i) => i.textContent)).toEqual(['A1x', 'A1y'])
      expect(el.value).toEqual(['a', 'a1', 'a1y'])
      expect(items(cols(el)[2]!)[1]!.getAttribute('aria-selected')).toBe('true')
    })

    it('合法 JSON 但非法元素（null/数字/缺 label）一律过滤不抛错（I2 回归）', async () => {
      const el = mount({ columns: '[{"items":[null,1,{"label":"x"}]}]' })
      await settle()
      expect(items(cols(el)[0]!).map((i) => i.textContent)).toEqual(['x'])
      const tree = mount({ options: '[null,{"label":"A","children":[null,5,{"label":"A1"}]}]' })
      await settle()
      expect(items(cols(tree)[0]!).map((i) => i.textContent)).toEqual(['A'])
      expect(items(cols(tree)[1]!).map((i) => i.textContent)).toEqual(['A1'])
    })

    it('混合全禁用列：value 位置语义完整（三轮 C1 回退固化——禁用项读取路径保位置，写入路径由 commit 守卫拦）', async () => {
      const el = mount({
        columns: JSON.stringify([
          {
            items: [
              { label: 'a', disabled: true },
              { label: 'b', disabled: true },
            ],
          },
          {
            items: [
              { label: 'X', value: 'x' },
              { label: 'Y', value: 'y' },
            ],
          },
        ]),
      })
      await settle()
      // 读取路径保位置：第 0 位对应第 0 列（含禁用项），后续列不前移
      expect(el.value).toEqual(['a', 'x'])
      // 交互路径：滚第 1 列到 Y，commit 正常提交且位置不错位
      scrollTo(el, 1, 1)
      await settle()
      expect(el.getAttribute('value')).toBe('["a","y"]')
      expect(items(cols(el)[1]!)[1]!.getAttribute('aria-selected')).toBe('true')
    })

    it('全禁用列：吸附无可用项时静默不提交（M4 回归：禁用项不得进 value）', async () => {
      const el = mount({
        columns: JSON.stringify(
          [
            [
              { label: 'a', disabled: true },
              { label: 'b', disabled: true },
            ],
          ].map((items) => ({ items })),
        ),
      })
      await settle()
      const before = el.getAttribute('value')
      scrollTo(el, 0, 1)
      await settle()
      expect(el.getAttribute('value'), '全禁用列不写禁用项进 value').toBe(before)
    })

    it('required：空数据驱动 valueMissing；有值即通过（I1 回归；happy-dom 无 internals，fakeInternals 惯例探针）', async () => {
      const fakeOf = (el: OASPicker) => {
        const fake = { setFormValue: () => {}, setValidity: vi.fn() }
        ;(el as unknown as { internals_: unknown }).internals_ = fake
        return fake
      }
      const empty = mount({ columns: '{bad', required: '', name: 'x' })
      const fakeEmpty = fakeOf(empty)
      empty.setAttribute('columns', '{bad2') // 触发 update → syncValidity
      await settle()
      expect(fakeEmpty.setValidity.mock.calls.at(-1)?.[0]).toMatchObject({ valueMissing: true })
      const ok = mount({ columns: COLUMNS, required: '', name: 'x' })
      const fakeOk = fakeOf(ok)
      scrollTo(ok, 0, 1)
      await settle()
      expect(fakeOk.setValidity.mock.calls.at(-1)?.[0]).toEqual({})
    })
  })

  describe('表单集成（form-associated）', () => {
    it('getFormValue：JSON 数组字符串；空选 null（happy-dom 无 ElementInternals，fakeInternals 惯例探针）', async () => {
      const el = mount({ columns: COLUMNS, name: 'pick' })
      await settle()
      const calls: Array<string | null> = []
      ;(el as unknown as { internals_: unknown }).internals_ = {
        setFormValue: (v: string | null) => calls.push(v),
        setValidity: () => {},
      }
      scrollTo(el, 0, 2)
      await settle()
      expect(calls[calls.length - 1]).toBe('["orange","一"]')
      const bare = mount({ columns: '{bad' })
      expect((bare as unknown as { value: string[] }).value).toEqual([])
    })

    it('form.reset()：回初始值不派发事件（happy-dom 不联 custom element 回调，直调 formResetCallback 惯例）', async () => {
      const el = mount({ columns: COLUMNS, value: '["banana","二"]' })
      await settle()
      const events: unknown[] = []
      el.addEventListener('oas-change', (e) => events.push(e))
      scrollTo(el, 0, 0)
      await settle()
      expect(events.length).toBe(1)
      el.formResetCallback()
      await settle()
      expect(items(cols(el)[0]!)[1]!.getAttribute('aria-selected')).toBe('true')
      expect(events.length).toBe(1)
    })
  })

  describe('disabled 与 SSR', () => {
    it('disabled：滚动落停不改值不派发；列 aria-disabled', async () => {
      const el = mount({ columns: COLUMNS, disabled: '' })
      expect(cols(el)[0]!.getAttribute('aria-disabled')).toBe('true')
      const events: unknown[] = []
      el.addEventListener('oas-change', (e) => events.push(e))
      scrollTo(el, 0, 2)
      await settle()
      expect(events.length).toBe(0)
      expect(items(cols(el)[0]!)[0]!.getAttribute('aria-selected')).toBe('true')
    })

    it('进 ssr 注册（Node 环境可安全导入类）', async () => {
      const ssr = await import('../../ssr.js')
      expect((ssr as Record<string, unknown>).OASPicker).toBeTruthy()
      // 全量并发下动态导入整包 ssr 聚合口偶超 5s 默认超时（二轮 review 实抓）
    }, 15000)
  })
})
