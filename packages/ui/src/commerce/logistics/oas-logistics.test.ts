import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASLogistics, type LogisticsStep } from './index.js'

const STEPS = JSON.stringify([
  { title: '包裹已签收', time: '11-24 18:20', desc: '签收人：本人' },
  { title: '正在派送', time: '11-24 08:05', desc: '派送员：张师傅 138****0000' },
  { title: '到达转运中心', time: '11-23 21:40' },
  { title: '商家已发货', time: '11-22 12:00' },
] satisfies LogisticsStep[])

function mount(attrs: Record<string, string> = {}): OASLogistics {
  const el = new OASLogistics()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASLogistics, name: string): HTMLElement | null {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)
}

function items(el: OASLogistics): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="item"]')]
}

function toggleOf(el: OASLogistics): HTMLButtonElement {
  return el.shadowRoot!.querySelector<HTMLButtonElement>('[part="toggle"]')!
}

describe('oas-logistics', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // —— 数据渲染 ——

  it('steps 渲染 li 条目数与 title/time/desc 字段；容器为 ol 时间线语义（aria-label i18n）', () => {
    const el = mount({ steps: STEPS })
    const list = part(el, 'timeline')!
    expect(list.tagName).toBe('OL')
    expect(list.getAttribute('aria-label')).toBe('物流跟踪')
    const lis = items(el)
    expect(lis).toHaveLength(4)
    expect(lis[0]!.textContent).toContain('包裹已签收')
    expect(lis[0]!.textContent).toContain('11-24 18:20')
    expect(lis[0]!.textContent).toContain('签收人：本人')
    // 无 desc 的条目不渲染空节点
    expect(lis[2]!.textContent).toContain('到达转运中心')
  })

  it('缺省 state 推导：首条 current（aria-current="step"）、其余 done（aria-label 含状态文本）', () => {
    const el = mount({ steps: STEPS })
    const lis = items(el)
    expect(lis[0]!.getAttribute('data-state')).toBe('current')
    expect(lis[0]!.getAttribute('aria-current')).toBe('step')
    for (let i = 1; i < lis.length; i++) {
      expect(lis[i]!.getAttribute('data-state')).toBe('done')
      expect(lis[i]!.getAttribute('aria-current')).toBeNull()
    }
    // 状态文本进可访问名（不只靠颜色）
    expect(lis[0]!.getAttribute('aria-label')).toContain('进行中')
    expect(lis[1]!.getAttribute('aria-label')).toContain('已完成')
  })

  it('显式 state：done/current/pending 逐条生效；未声明条目按「首个未完成条目」分界推导', () => {
    const steps = JSON.stringify([
      { title: '节点一' },
      { title: '节点二', state: 'done' },
      { title: '节点三' },
      { title: '节点四', state: 'current' },
      { title: '节点五' },
      { title: '节点六', state: 'pending' },
    ])
    const el = mount({ steps })
    const states = items(el).map((li) => li.getAttribute('data-state'))
    // 节点一：首个显式未完成（current @ idx3）之前 → done；节点三同理；节点五在 current 之后 → pending
    expect(states).toEqual(['done', 'done', 'done', 'current', 'pending', 'pending'])
  })

  it('只声明 done 时未声明条目按 done 推导；非法 state 值视同未声明并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps = JSON.stringify([{ title: 'A', state: 'done' }, { title: 'B' }, { title: 'C', state: 'weird' }])
    const el = mount({ steps })
    const states = items(el).map((li) => li.getAttribute('data-state'))
    expect(states).toEqual(['done', 'done', 'done'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0])).toContain('weird')
  })

  // —— reverse ——

  it('reverse 翻转渲染序（时间正序时间线），aria-current 跟随语义节点而非位置', () => {
    const el = mount({ steps: STEPS, reverse: '' })
    const titles = items(el).map((li) => li.textContent)
    expect(titles[0]).toContain('商家已发货')
    expect(titles[3]).toContain('包裹已签收')
    // current 挂在语义首条（数据最新），reverse 后它在 DOM 末位
    const lis = items(el)
    expect(lis[3]!.getAttribute('aria-current')).toBe('step')
    expect(lis[0]!.getAttribute('aria-current')).toBeNull()
  })

  // —— 折叠 ——

  it('collapsed 折叠：只显示最新 2 条 + 展开钮文案含总数；点击展开派 oas-toggle 并回写 attribute', () => {
    const el = mount({ steps: STEPS, collapsed: '' })
    expect(items(el)).toHaveLength(2)
    // 折叠显示的是数据前 2 条（最新）
    expect(items(el)[0]!.textContent).toContain('包裹已签收')
    expect(items(el)[1]!.textContent).toContain('正在派送')
    const toggle = toggleOf(el)
    expect(toggle.hidden).toBe(false)
    expect(toggle.textContent).toContain('展开全部 4 条')

    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-toggle', (e) => detail.push((e as CustomEvent).detail))
    toggle.click()
    expect(items(el)).toHaveLength(4)
    expect(el.hasAttribute('collapsed')).toBe(false)
    expect(detail).toEqual([{ collapsed: false }])
    // 展开态按钮变「收起」
    expect(toggle.textContent).toContain('收起')
  })

  it('展开态点收起回写 collapsed；steps ≤2 条时不显示切换钮（无可折叠内容）', () => {
    const el = mount({ steps: STEPS })
    expect(items(el)).toHaveLength(4)
    const toggle = toggleOf(el)
    expect(toggle.textContent).toContain('收起')
    const detail: Array<Record<string, unknown>> = []
    el.addEventListener('oas-toggle', (e) => detail.push((e as CustomEvent).detail))
    toggle.click()
    expect(items(el)).toHaveLength(2)
    expect(el.hasAttribute('collapsed')).toBe(true)
    expect(detail).toEqual([{ collapsed: true }])

    // 短列表无切换钮
    const short = mount({ steps: JSON.stringify([{ title: 'A' }, { title: 'B' }]), collapsed: '' })
    expect(items(short)).toHaveLength(2)
    expect(toggleOf(short).hidden).toBe(true)
  })

  it('collapsed 为 property 双通道（setter 反射 attribute）', () => {
    const el = mount({ steps: STEPS })
    el.collapsed = true
    expect(el.hasAttribute('collapsed')).toBe(true)
    expect(el.collapsed).toBe(true)
    expect(items(el)).toHaveLength(2)
    el.collapsed = false
    expect(el.collapsed).toBe(false)
    expect(items(el)).toHaveLength(4)
  })

  // —— 空态与健壮性 ——

  it('steps 非法 JSON：告警一次 + 空态文案；空数组渲染空态', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = mount({ steps: '{oops' })
    expect(items(bad)).toHaveLength(0)
    expect(part(bad, 'empty')!.hidden).toBe(false)
    expect(part(bad, 'empty')!.textContent).toContain('暂无物流信息')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()

    const empty = mount({ steps: '[]' })
    expect(part(empty, 'empty')!.hidden).toBe(false)
  })

  it('缺 title 与 desc 的条目被忽略（无可识别内容不渲染空 li）', () => {
    const steps = JSON.stringify([{ title: '有效条目' }, { time: '11-20 10:00' }, { desc: '' }])
    const el = mount({ steps })
    expect(items(el)).toHaveLength(1)
  })

  it('steps property 双通道：数组或 JSON 字符串 setter 等价', () => {
    const el = mount()
    el.steps = [{ title: '甲' }, { title: '乙' }]
    expect(items(el)).toHaveLength(2)
    el.steps = JSON.stringify([{ title: '丙' }])
    expect(items(el)).toHaveLength(1)
    expect(JSON.parse(el.getAttribute('steps')!)).toEqual([{ title: '丙' }])
  })

  // —— actions 插槽 ——

  it('actions 插槽：有内容时显示动作区（aria-label i18n），无内容隐藏', async () => {
    const el = mount({ steps: STEPS })
    const actions = part(el, 'actions')!
    expect(actions.hidden).toBe(true)
    expect(actions.getAttribute('aria-label')).toBe('相关操作')

    const btn = document.createElement('button')
    btn.slot = 'actions'
    btn.textContent = '复制单号'
    el.appendChild(btn)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    expect(actions.hidden).toBe(false)
  })

  it('断开重连后交互恢复（折叠切换仍可用）', async () => {
    const el = mount({ steps: STEPS, collapsed: '' })
    el.remove()
    document.body.appendChild(el)
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    toggleOf(el).click()
    expect(items(el)).toHaveLength(4)
    expect(el.hasAttribute('collapsed')).toBe(false)
  })
})
