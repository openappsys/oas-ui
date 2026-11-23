import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { OASQuestionnaire } from './index.js'
import type { QuestionnaireStep } from './oas-questionnaire.js'
import '../form/index.js'
import '../input/index.js'

const STEPS: QuestionnaireStep[] = [
  { key: 'a', title: '第一步' },
  { key: 'b', title: '第二步' },
]

/**
 * 契约实现体：非 oas-form 的 duck-typed 步骤内容（getValues/validate + oas-values-change）。
 * 用真实自定义元素模拟 schema-form 一类声明式表单容器。
 */
class FakeSchemaForm extends HTMLElement {
  values: Record<string, unknown> = { own: 'x' }
  valid = true

  getValues(): Record<string, unknown> {
    return this.values
  }

  async validate(): Promise<boolean> {
    return this.valid
  }

  setValues(patch: Record<string, unknown>): void {
    this.values = { ...this.values, ...patch }
    this.dispatchEvent(
      new CustomEvent('oas-values-change', { bubbles: true, composed: true, detail: { values: this.values } }),
    )
  }
}
if (!customElements.get('fake-schema-form')) customElements.define('fake-schema-form', FakeSchemaForm)

function mount(panels: string[], attrs: Record<string, string> = {}): OASQuestionnaire {
  const el = new OASQuestionnaire()
  el.setAttribute('steps', JSON.stringify(STEPS))
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  el.innerHTML = panels.join('')
  document.body.appendChild(el)
  return el
}

describe('OASQuestionnaire 步骤内容 duck-typed 发现（schema-form 组合契约）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非 oas-form 的契约元素被识别：getValues 进入跨步汇总', () => {
    const q = mount(['<fake-schema-form slot="step-a"></fake-schema-form>', '<div slot="step-b">第二步</div>'])
    const asset = q.querySelector('fake-schema-form') as FakeSchemaForm
    asset.values = { own: '来自声明式表单' }
    expect(q.getValues()).toEqual({ own: '来自声明式表单' })
  })

  it('契约元素的 validate() 参与单步门控（false 时 next 不放行）', async () => {
    const q = mount(['<fake-schema-form slot="step-a"></fake-schema-form>', '<div slot="step-b">第二步</div>'])
    const asset = q.querySelector('fake-schema-form') as FakeSchemaForm
    asset.valid = false
    await expect(q.next()).resolves.toBe(false)
    expect(q.getAttribute('current') ?? '0').toBe('0')

    asset.valid = true
    await expect(q.next()).resolves.toBe(true)
    expect(q.getAttribute('current')).toBe('1')
  })

  it('oas-form 步骤内容仍走既有通道（getValues 实时读取，零交互预填值也计入）', () => {
    const q = new OASQuestionnaire()
    q.setAttribute('steps', JSON.stringify(STEPS))
    const form = document.createElement('oas-form')
    form.setAttribute('slot', 'step-a')
    const input = document.createElement('oas-input')
    input.setAttribute('name', 'legacy')
    input.setAttribute('value', 'v')
    form.appendChild(input)
    q.appendChild(form)
    const other = document.createElement('div')
    other.setAttribute('slot', 'step-b')
    other.textContent = '第二步'
    q.appendChild(other)
    document.body.appendChild(q)
    expect(q.getValues()).toEqual({ legacy: 'v' })
  })

  it('reset() 委托契约元素自身的 reset()（若实现）', () => {
    let resetCount = 0
    class ResetForm extends FakeSchemaForm {
      reset(): void {
        resetCount += 1
      }
    }
    if (!customElements.get('fake-schema-form-reset')) {
      customElements.define('fake-schema-form-reset', ResetForm)
    }
    const q = mount([
      '<fake-schema-form-reset slot="step-a"></fake-schema-form-reset>',
      '<div slot="step-b">第二步</div>',
    ])
    q.reset()
    expect(resetCount).toBe(1)
  })
})
