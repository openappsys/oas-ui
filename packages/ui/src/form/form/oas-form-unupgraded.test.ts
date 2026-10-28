import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { OASForm } from './index.js'
// 显式副作用导入：只注册 oas-form（绝不 import combobox——本文件契约即「combobox 未升级」）
import './index.js'

// 只注册 oas-form（本文件不 import combobox）——复现真实 CDN 升级顺序场景：
// oas-form 的升级/取值先于子级 combobox 升级执行，collectFields 会遇到「已定义
// （registered tag）但尚未升级」的 combobox，其 el.value 为 undefined。
// 历史缺陷：combobox 读取器 JSON.stringify(undefined) 得 undefined 进入 normalizeValue
// → raw.startsWith 抛 TypeError（浏览器端挂载即崩、模板 e2e 实抓；happy-dom 下抛错点
// 随微任务时序在「升级」或「取值/校验」间摆动，故整体包进断言，两种形态都算 RED；
// 浏览器挂载崩溃由 qa-regression/form-unupgraded-combobox.spec.ts 锁定）。
// 契约：未升级/无 value property 的注册控件按空值处理，取值与校验零抛错。
describe('OASForm × 未升级 combobox（只注册 oas-form）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('升级+getValues 零抛错，未升级 combobox 按空值处理且不影响其他字段', () => {
    let values: Record<string, unknown> | null = null
    expect(() => {
      document.body.innerHTML =
        '<oas-form id="f"><oas-combobox name="category"></oas-combobox><oas-input name="company" value="ACME"></oas-input></oas-form>'
      customElements.upgrade(document)
      const form = document.querySelector('#f') as OASForm
      values = form.getValues()
    }).not.toThrow()
    expect(values).toEqual({ category: '', company: 'ACME' })
  })

  it('校验零抛错：required 规则下未升级 combobox 视为空值（校验不通过而非崩溃）', async () => {
    const run = async (): Promise<boolean> => {
      document.body.innerHTML =
        `<oas-form id="f" rules='{"category":[{"required":true,"message":"请选择"}]}'>` +
        `<oas-combobox name="category"></oas-combobox></oas-form>`
      customElements.upgrade(document)
      const form = document.querySelector('#f') as OASForm
      return form.validate()
    }
    await expect(run()).resolves.toBe(false)
  })
})
