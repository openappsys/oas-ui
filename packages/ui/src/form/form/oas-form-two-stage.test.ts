// 复现：oas-form 两段式提交——校验失败 → 修正 → 再提交，oas-submit 应派发（demands 登记回归）
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import { OASForm } from './index.js'
import '../../form/input/index.js'
import '../../basic/button/index.js'

describe('oas-form 两段式提交（校验失败 → 修正 → 再提交）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  const mount = (): { form: OASForm; input: HTMLElement; btn: HTMLElement } => {
    const form = new OASForm()
    form.setAttribute('rules', JSON.stringify({ name: [{ required: true, message: '名称必填' }] }))
    const input = document.createElement('oas-input')
    input.setAttribute('name', 'name')
    form.appendChild(input)
    const btn = document.createElement('oas-button')
    btn.setAttribute('type', 'primary')
    btn.textContent = '提交'
    // 提交按钮的真实用法（对齐 form.md demo）：oas-form 的 submit() 方法入口——
    // oas-button 的 submit 属性桥接服务「原生 <form> 祖先」场景，oas-form light DOM 无该祖先
    btn.addEventListener('oas-click', () => form.submit())
    form.appendChild(btn)
    document.body.appendChild(form)
    return { form, input, btn }
  }

  it('空值提交 → validate-fail → 输入修正 → 再提交 → oas-submit 派发', async () => {
    const { form, input, btn } = mount()
    let submits = 0
    let fails = 0
    form.addEventListener('oas-submit', () => submits++)
    form.addEventListener('oas-validate-fail', () => fails++)

    // 第一次：空值提交 → 校验失败
    form.submit()
    await new Promise((r) => setTimeout(r, 50))
    expect(fails, '空值触发 validate-fail').toBe(1)
    expect(submits).toBe(0)

    // 修正：输入值（驱动 oas-input 真实输入链 → change 同步 attribute）
    const inner = input.shadowRoot!.querySelector('input')!
    inner.value = '修正后的名称'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    inner.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 50))

    // 第二次提交 → 应通过并派发 oas-submit
    let oasClicks = 0
    btn.addEventListener('oas-click', () => oasClicks++)
    let shadowSubmits = 0
    ;(form.shadowRoot!.querySelector('form') as HTMLFormElement).addEventListener('submit', () => shadowSubmits++)
    // happy-dom 下须点 shadow 内 button（host.click() 只在宿主元素上派 click，不进 shadow——
    // oas-click 在内部按钮的 click 监听上）；真实用户点击走的正是内部按钮
    ;(btn.shadowRoot!.querySelector('[part="button"]') as HTMLElement).click()
    await new Promise((r) => setTimeout(r, 50))
    // 诊断与断言合一：失败时逐字段打印断点（oasClicks=按钮事件链 / shadowSubmits=shadow form 提交
    // / inputAttrValue=change 值同步 / submits=最终 oas-submit）
    expect(
      { oasClicks, shadowSubmits, inputAttrValue: input.getAttribute('value'), submits },
      '第二次提交链路逐段',
    ).toEqual({ oasClicks: 1, shadowSubmits: 1, inputAttrValue: '修正后的名称', submits: 1 })
  })
})
