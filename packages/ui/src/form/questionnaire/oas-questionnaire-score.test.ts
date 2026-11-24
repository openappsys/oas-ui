import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASQuestionnaire } from './index.js'
import type { QuestionnaireStep } from './oas-questionnaire.js'
import { compileScoreRules, computeScore } from './score-engine.js'
import '../form/index.js'
import '../input/index.js'

const STEPS: QuestionnaireStep[] = [
  { key: 'need', title: '是否开票' },
  { key: 'invoice', title: '发票信息', when: '{need} == "yes"' },
  { key: 'done', title: '确认提交' },
]

function panel(slot: string, name: string, initial?: string): string {
  const init = initial === undefined ? '' : ` initial-values='${JSON.stringify({ [name]: initial })}'`
  return `<oas-form slot="${slot}"${init}><oas-input name="${name}"></oas-input></oas-form>`
}

function mount(steps: QuestionnaireStep[], panels: string[], attrs: Record<string, string> = {}): OASQuestionnaire {
  const el = new OASQuestionnaire()
  el.setAttribute('steps', JSON.stringify(steps))
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = panels.join('')
  document.body.appendChild(el)
  return el
}

function mountFlow(rules: unknown, attrs: Record<string, string> = {}): OASQuestionnaire {
  return mount(STEPS, [panel('step-need', 'need'), panel('step-invoice', 'title'), panel('step-done', 'extra')], {
    'score-rules': typeof rules === 'string' ? rules : JSON.stringify(rules),
    ...attrs,
  })
}

function fill(field: Element | null, value: string): void {
  field!.dispatchEvent(new CustomEvent('oas-input', { bubbles: true, composed: true, detail: { value } }))
}

function field(el: OASQuestionnaire, name: string): Element | null {
  return el.querySelector(`oas-input[name="${name}"]`)
}

/** 推进防抖窗口（真实计时器 + 显式等待） */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 120))
}

describe('score-engine 规则编译与求和', () => {
  it('合法规则编译产出程序 / 分值 / 静态依赖', () => {
    const compiled = compileScoreRules([
      { when: '{a} >= 4', score: 5 },
      { when: '{b} == "yes"', score: 2.5 },
    ])
    expect(compiled.warnings).toEqual([])
    expect(compiled.rules.map((rule) => [rule.score, rule.deps])).toEqual([
      [5, ['a']],
      [2.5, ['b']],
    ])
  })

  it('非法形态逐条跳过并返回告警（非数组 / 缺 when / score 非数值 / 语法错）', () => {
    expect(compileScoreRules('x').warnings.join('\n')).toContain('必须是数组')
    const compiled = compileScoreRules([
      { score: 1 },
      { when: '{a} == 1', score: '5' },
      { when: '{a} =', score: 1 },
      { when: '{a} == 1', score: 3 },
    ])
    expect(compiled.rules).toHaveLength(1)
    expect(compiled.rules[0]!.score).toBe(3)
    expect(compiled.warnings.filter((line) => line.includes('已忽略'))).toHaveLength(3)
  })

  it('求和：只累加条件成立的规则，浮点残差归一', () => {
    const { rules } = compileScoreRules([
      { when: '{a} == "yes"', score: 0.1 },
      { when: '{a} == "yes"', score: 0.2 },
      { when: '{b} == "yes"', score: 10 },
    ])
    expect(computeScore(rules, { a: 'yes', b: 'no' }).score).toBe(0.3)
    expect(computeScore(rules, { a: 'no', b: 'yes' }).score).toBe(10)
    expect(computeScore(rules, {}).score).toBe(0)
  })
})

describe('OASQuestionnaire 评分汇总（score-rules）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('score property 只读：按当前答案即时求和（含隐藏步答案）', () => {
    const el = mountFlow([
      { when: '{need} == "yes"', score: 10 },
      { when: '{title} == "x"', score: 4 },
    ])
    expect(el.score).toBe(0)
    fill(field(el, 'need'), 'yes')
    // 条件步骤已显示（need == yes），同时计分 10
    expect(el.score).toBe(10)
    fill(field(el, 'title'), 'x')
    expect(el.score).toBe(14)
    fill(field(el, 'need'), 'no')
    // 第 2 步被条件隐藏：need 规则失配（-10），但隐藏步的答案仍在（面板常驻）→ title 规则继续计 4
    expect(el.score).toBe(4)
  })

  it('作答变化后派发 oas-score（防抖：连续作答只派发一次，值为最终结果）', async () => {
    const el = mountFlow([
      { when: '{need} == "yes"', score: 10 },
      { when: '{title} == "x"', score: 4 },
    ])
    const scores: Array<Record<string, unknown>> = []
    el.addEventListener('oas-score', (e) => scores.push((e as CustomEvent).detail as Record<string, unknown>))
    fill(field(el, 'need'), 'yes')
    fill(field(el, 'title'), 'x')
    expect(scores).toEqual([])
    await settle()
    expect(scores).toEqual([{ score: 14 }])
  })

  it('分数未变化时不派发（重复作答相同值）', async () => {
    const el = mountFlow([{ when: '{need} == "yes"', score: 10 }])
    const scores: Array<Record<string, unknown>> = []
    el.addEventListener('oas-score', (e) => scores.push((e as CustomEvent).detail as Record<string, unknown>))
    fill(field(el, 'need'), 'yes')
    await settle()
    expect(scores).toEqual([{ score: 10 }])
    fill(field(el, 'need'), 'no')
    await settle()
    fill(field(el, 'need'), 'no')
    await settle()
    expect(scores).toEqual([{ score: 10 }, { score: 0 }])
  })

  it('无 score-rules：分数恒 0 且零事件（零行为漂移）', async () => {
    const el = mount(STEPS, [panel('step-need', 'need'), panel('step-invoice', 'title'), panel('step-done', 'extra')])
    const scores: unknown[] = []
    el.addEventListener('oas-score', () => scores.push(1))
    fill(field(el, 'need'), 'yes')
    await settle()
    expect(el.score).toBe(0)
    expect(scores).toEqual([])
  })

  it('非法 score-rules / 坏规则：一次性 devWarn，坏规则跳过（不连坐）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mountFlow('not-json')
    expect(el.score).toBe(0)
    let messages = warn.mock.calls.map((call) => String(call[0])).join('\n')
    expect(messages).toContain('score-rules 不是合法 JSON')

    document.body.innerHTML = ''
    const el2 = mountFlow({ bad: true })
    expect(el2.score).toBe(0)
    messages = warn.mock.calls.map((call) => String(call[0])).join('\n')
    expect(messages).toContain('必须是数组')

    document.body.innerHTML = ''
    const el3 = mountFlow([
      { when: '{need} == "yes"', score: 2 },
      { when: '{need} == "yes"', score: 'x' },
    ])
    expect(el3.score).toBe(0)
    fill(field(el3, 'need'), 'yes')
    expect(el3.score).toBe(2)
  })

  it('reset()：分数回初始值并派发（防抖链路照常）', async () => {
    const el = mountFlow([{ when: '{need} == "yes"', score: 10 }])
    const scores: Array<Record<string, unknown>> = []
    el.addEventListener('oas-score', (e) => scores.push((e as CustomEvent).detail as Record<string, unknown>))
    fill(field(el, 'need'), 'yes')
    await settle()
    el.reset()
    await settle()
    expect(el.score).toBe(0)
    expect(scores).toEqual([{ score: 10 }, { score: 0 }])
  })

  it('规则变更静默：改 score-rules 不派发事件，property 即时反映新规则', () => {
    const el = mountFlow([{ when: '{need} == "yes"', score: 10 }])
    const scores: unknown[] = []
    el.addEventListener('oas-score', () => scores.push(1))
    fill(field(el, 'need'), 'yes')
    expect(el.score).toBe(10)
    el.setAttribute('score-rules', JSON.stringify([{ when: '{need} == "yes"', score: 100 }]))
    expect(el.score).toBe(100)
    expect(scores).toEqual([])
  })

  it('宿主函数抛错：按条件不成立处理并一次性 devWarn（不抛断评分）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // 未知函数在编译期即失败 → 降级该条规则
    const el = mountFlow([{ when: 'nope()', score: 5 }])
    expect(el.score).toBe(0)
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('表达式编译失败')
  })
})
