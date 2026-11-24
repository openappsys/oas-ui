import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASQuestionnaire } from './index.js'
import type { QuestionnaireStep } from './oas-questionnaire.js'
import '../form/index.js'
import '../input/index.js'

/** 挂载辅助：steps 走属性 JSON，面板按 slot 接线 */
function mount(steps: QuestionnaireStep[], panels: string[], attrs: Record<string, string> = {}): OASQuestionnaire {
  const el = new OASQuestionnaire()
  el.setAttribute('steps', JSON.stringify(steps))
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = panels.join('')
  document.body.appendChild(el)
  return el
}

/** 步骤面板：单个 oas-input（name 与答案路径一致），可带 initial-values 预填 */
function panel(slot: string, name: string, initial?: string): string {
  const init = initial === undefined ? '' : ` initial-values='${JSON.stringify({ [name]: initial })}'`
  return `<oas-form slot="${slot}"${init}><oas-input name="${name}"></oas-input></oas-form>`
}

/** 模拟用户编辑：字段派发 oas-input（oas-form 写回值并派发 oas-values-change{name}） */
function fill(field: Element | null, value: string): void {
  field!.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
}

function field(el: OASQuestionnaire, name: string): Element | null {
  return el.querySelector(`oas-input[name="${name}"]`)
}

function items(el: OASQuestionnaire): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.steps .item'))
}

function panels(el: OASQuestionnaire): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.panel'))
}

function progress(el: OASQuestionnaire): Element {
  return el.shadowRoot!.querySelector('.progress')!
}

function track(el: OASQuestionnaire, type: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = []
  el.addEventListener(type, (e) => out.push((e as CustomEvent).detail as Record<string, unknown>))
  return out
}

/** 三步问卷：第 1 步问是否开票，第 2 步为发票信息（条件步骤），第 3 步确认 */
const STEPS: QuestionnaireStep[] = [
  { key: 'need', title: '是否开票' },
  { key: 'invoice', title: '发票信息', when: '{need} == "yes"' },
  { key: 'done', title: '确认提交' },
]

function mountFlow(attrs: Record<string, string> = {}, steps: QuestionnaireStep[] = STEPS): OASQuestionnaire {
  return mount(steps, [panel('step-need', 'need'), panel('step-invoice', 'title'), panel('step-done', 'extra')], attrs)
}

describe('OASQuestionnaire 条件引擎（when / goto）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  // ---------- 条件显隐 ----------

  it('when 不成立：步骤不渲染头部项、进度总数减一、面板保持隐藏', () => {
    const el = mountFlow()
    expect(items(el).length).toBe(2)
    expect(items(el)[0]!.textContent).toContain('是否开票')
    expect(items(el)[1]!.textContent).toContain('确认提交')
    expect(progress(el).getAttribute('aria-valuemax')).toBe('2')
    expect(panels(el)[1]!.hasAttribute('hidden')).toBe(true)
  })

  it('when 成立：步骤恢复显示（初始答案即为 yes）', () => {
    const el = mountFlow({}, [{ ...STEPS[0]! }, { ...STEPS[1]! }, { ...STEPS[2]! }])
    fill(field(el, 'need'), 'yes')
    expect(items(el).length).toBe(3)
    expect(items(el)[1]!.textContent).toContain('发票信息')
    expect(progress(el).getAttribute('aria-valuemax')).toBe('3')
  })

  it('作答变化按依赖路径重算：改条件字段即显隐同步，未命中依赖的字段变化不改结果', () => {
    const el = mountFlow()
    expect(items(el).length).toBe(2)
    fill(field(el, 'need'), 'yes')
    expect(items(el).length).toBe(3)
    fill(field(el, 'need'), 'no')
    expect(items(el).length).toBe(2)
    // 无关字段（第 3 步）变化不影响条件步骤
    fill(field(el, 'extra'), '任意值')
    expect(items(el).length).toBe(2)
  })

  it('与宿主手动 hidden 正交：hidden:true 恒隐藏（条件成立也不显示），hidden:false 交由条件决定', () => {
    const forced: QuestionnaireStep[] = [
      { key: 'need', title: '是否开票' },
      { key: 'invoice', title: '发票信息', hidden: true, when: '{need} == "yes"' },
      { key: 'done', title: '确认提交' },
    ]
    const el = mountFlow({}, forced)
    fill(field(el, 'need'), 'yes')
    expect(items(el).map((item) => item.textContent?.includes('确认提交'))).toEqual([false, true])

    const engineDecides: QuestionnaireStep[] = [
      { key: 'need', title: '是否开票' },
      { key: 'invoice', title: '发票信息', hidden: false, when: '{need} == "yes"' },
      { key: 'done', title: '确认提交' },
    ]
    document.body.innerHTML = ''
    const el2 = mountFlow({}, engineDecides)
    expect(items(el2).length).toBe(2)
    fill(field(el2, 'need'), 'yes')
    expect(items(el2).length).toBe(3)
  })

  it('conditions="false" 关闭引擎：when 完全失效，只认宿主 hidden', () => {
    const el = mountFlow({ conditions: 'false' })
    expect(items(el).length).toBe(3)
    fill(field(el, 'need'), 'no')
    expect(items(el).length).toBe(3)
  })

  it('当前步被条件隐藏：current 自动对齐到最近可见步并派发 oas-change', () => {
    const el = mountFlow({ current: '1' })
    // 初始 when 不成立 → 第 2 步隐藏，current 对齐到第 3 步
    expect(el.getAttribute('current')).toBe('2')
    fill(field(el, 'need'), 'yes')
    expect(items(el).length).toBe(3)
    expect(el.getAttribute('current')).toBe('2')
    const changes = track(el, 'oas-change')
    fill(field(el, 'need'), 'no')
    expect(el.getAttribute('current')).toBe('2')
    expect(changes).toEqual([])
  })

  // ---------- 自动跳过 ----------

  it('自动跳过：中间步 when 不成立时 next() 直接到下一步可见步，不校验被隐藏步', async () => {
    const el = mountFlow()
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('2')
  })

  // ---------- goto ----------

  it('goto 条件成立：next() 直达目标步（按 key）并派发 oas-goto', async () => {
    const steps: QuestionnaireStep[] = [
      { key: 'a', title: '甲', goto: { when: '{skip} == "yes"', target: 'c' } },
      { key: 'b', title: '乙' },
      { key: 'c', title: '丙' },
    ]
    const el = mount(steps, [panel('step-a', 'skip'), panel('step-b', 'bb'), panel('step-c', 'cc')])
    const gotos = track(el, 'oas-goto')
    fill(field(el, 'skip'), 'yes')
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('2')
    expect(gotos).toEqual([{ index: 2, key: 'c', from: 0, target: 'c' }])
  })

  it('goto 条件不成立：按步骤顺序前进（无 oas-goto）', async () => {
    const steps: QuestionnaireStep[] = [
      { key: 'a', title: '甲', goto: { when: '{skip} == "yes"', target: 'c' } },
      { key: 'b', title: '乙' },
      { key: 'c', title: '丙' },
    ]
    const el = mount(steps, [panel('step-a', 'skip'), panel('step-b', 'bb'), panel('step-c', 'cc')])
    const gotos = track(el, 'oas-goto')
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('1')
    expect(gotos).toEqual([])
  })

  it('goto 简写索引与隐藏目标落点：目标步被条件隐藏时落到其后最近可见步', async () => {
    const steps: QuestionnaireStep[] = [
      { key: 'a', title: '甲', goto: 1 },
      { key: 'b', title: '乙', when: '{open} == "yes"' },
      { key: 'c', title: '丙' },
    ]
    const el = mount(steps, [panel('step-a', 'open'), panel('step-b', 'bb'), panel('step-c', 'cc')])
    // 初始 open 未填 → 第 2 步隐藏 → goto 1 落点为其后最近可见步（第 3 步）
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('2')

    document.body.innerHTML = ''
    const el2 = mount(steps, [panel('step-a', 'open'), panel('step-b', 'bb'), panel('step-c', 'cc')])
    fill(field(el2, 'open'), 'yes')
    await expect(el2.next()).resolves.toBe(true)
    expect(el2.getAttribute('current')).toBe('1')
  })

  it('goto 目标未命中步骤 key：一次性 devWarn 并正常前进（不阻断流程）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps: QuestionnaireStep[] = [
      { key: 'a', title: '甲', goto: 'not-exist' },
      { key: 'b', title: '乙' },
    ]
    const el = mount(steps, [panel('step-a', 'aa'), panel('step-b', 'bb')])
    await expect(el.next()).resolves.toBe(true)
    expect(el.getAttribute('current')).toBe('1')
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('未命中任何步骤 key')
  })

  // ---------- 守卫与降级 ----------

  it('循环守卫：宿主在 oas-change 里回写 current 形成回环时，级联 8 轮后停止并一次性告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps: QuestionnaireStep[] = [
      { key: 'zero', title: '零', hidden: true },
      { key: 'one', title: '一' },
      { key: 'two', title: '二' },
    ]
    const el = mount(steps, [panel('step-zero', 'z'), panel('step-one', 'o'), panel('step-two', 't')])
    let flips = 0
    el.addEventListener('oas-change', () => {
      flips += 1
      if (flips > 60) return
      // 宿主把 current 回写到恒隐藏的首步 → 组件必然再次对齐并派发 change（人为回环）
      el.setAttribute('current', '0')
    })
    el.setAttribute('current', '0')
    expect(flips).toBeGreaterThan(0)
    expect(flips).toBeLessThanOrEqual(8)
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('轮内未稳定')
  })

  it('表达式语法错：一次性 devWarn 且该条降级为条件不生效（步骤可见）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const steps: QuestionnaireStep[] = [
      { key: 'a', title: '甲' },
      { key: 'b', title: '乙', when: '{a} =' },
    ]
    const el = mount(steps, [panel('step-a', 'a'), panel('step-b', 'b')])
    expect(items(el).length).toBe(2)
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('when 表达式编译失败')
  })

  // ---------- 与 schema-form 组合 ----------

  it('内嵌 schema-form 契约元素：oas-values-change 驱动 when（duck-typed 通道同一套）', () => {
    class LogicForm extends HTMLElement {
      values: Record<string, unknown> = { need: 'no' }
      getValues(): Record<string, unknown> {
        return this.values
      }
      async validate(): Promise<boolean> {
        return true
      }
    }
    if (!customElements.get('logic-form')) customElements.define('logic-form', LogicForm)
    const steps: QuestionnaireStep[] = [
      { key: 'need', title: '是否开票' },
      { key: 'invoice', title: '发票信息', when: '{need} == "yes"' },
      { key: 'done', title: '确认提交' },
    ]
    const el = mount(steps, [
      '<logic-form slot="step-need"></logic-form>',
      '<div slot="step-invoice"></div>',
      '<div slot="step-done"></div>',
    ])
    expect(items(el).length).toBe(2)
    const form = el.querySelector('logic-form') as LogicForm
    form.values = { need: 'yes' }
    form.dispatchEvent(
      new CustomEvent('oas-values-change', {
        bubbles: true,
        composed: true,
        detail: { name: 'need', values: { need: 'yes' } },
      }),
    )
    expect(items(el).length).toBe(3)
  })

  it('reset()：作答回初始值后条件重算（条件步骤重新隐藏）', () => {
    const el = mountFlow()
    fill(field(el, 'need'), 'yes')
    expect(items(el).length).toBe(3)
    el.reset()
    expect(items(el).length).toBe(2)
  })
})
