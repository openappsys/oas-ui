// 回归固化：form-associated（原生表单集成）——label for 关联 / FormData 收集 / reset / fieldset disabled。
// 背景：自定义元素默认非 labelable，消费侧 <label for> 对 oas-input 完全不生效（下游 42 处 a11y 告警根因）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('form-associated：label for 关联 + 焦点转递 + FormData + reset + fieldset disabled（pilot: oas-input）', async ({
  page,
}) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <fieldset id="fa-fieldset">
        <label for="fa-input">姓名</label>
        <oas-input id="fa-input" name="username" value="初始值"></oas-input>
        <oas-input id="fa-noname" value="不应提交"></oas-input>
      </fieldset>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaInput extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      form: HTMLFormElement | null
    }
    const el = document.getElementById('fa-input') as unknown as FaInput
    const inner = el.shadowRoot.querySelector('input')!
    const label = document.querySelector('label[for="fa-input"]') as HTMLLabelElement
    const noName = document.getElementById('fa-noname') as unknown as FaInput

    // 1. 原生 label 关联
    const labelsLen = el.labels?.length ?? -1
    const formOk = el.form === form

    // 2. label 点击 → 焦点转递到 shadow 内真实 input
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const hostFocused = document.activeElement === el
    const innerFocused = el.shadowRoot.activeElement === inner

    // 3. 输入 → FormData 收集
    inner.value = 'typed-value'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdTyped = new FormData(form).get('username')
    const fdNoName = new FormData(form).has('不应提交') || new FormData(form).has('')

    // 4. reset → 回初始值，FormData 同步回初始
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const resetValue = inner.value
    const fdReset = new FormData(form).get('username')

    // 5. fieldset disabled → formDisabledCallback 同步（不回写 disabled 属性防自锁；注入态经 data-disabled 镜像）
    const fieldset = document.getElementById('fa-fieldset') as HTMLFieldSetElement
    fieldset.disabled = true
    await new Promise((res) => setTimeout(res, 0))
    const disabledAttr = el.hasAttribute('disabled')
    const disabledDataAttr = el.hasAttribute('data-disabled')
    const disabledInner = inner.disabled
    fieldset.disabled = false
    await new Promise((res) => setTimeout(res, 0))
    const enabledAgain = !el.hasAttribute('data-disabled') && !inner.disabled

    // 6. 无 name 不进 FormData
    noName.shadowRoot.querySelector('input')!.value = 'x'
    noName.shadowRoot.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }))
    const noNameExcluded = new FormData(form).get('不应提交') === null

    form.remove()
    return {
      labelsLen,
      formOk,
      hostFocused,
      innerFocused,
      fdTyped,
      fdNoName,
      resetValue,
      fdReset,
      disabledAttr,
      disabledDataAttr,
      disabledInner,
      enabledAgain,
      noNameExcluded,
    }
  })

  expect(r.labelsLen, 'label for 原生关联（labels.length === 1）').toBe(1)
  expect(r.formOk, 'el.form 指向所在原生表单').toBe(true)
  expect(r.hostFocused, 'label 点击后宿主成为 activeElement').toBe(true)
  expect(r.innerFocused, 'label 点击后焦点落在 shadow 内真实 input').toBe(true)
  expect(r.fdTyped, '输入后 FormData 收集到当前值').toBe('typed-value')
  expect(r.fdNoName, 'FormData 不应收集无 name 控件的值').toBe(false)
  expect(r.resetValue, 'reset 后内层 input 回到初始值').toBe('初始值')
  expect(r.fdReset, 'reset 后 FormData 回到初始值').toBe('初始值')
  expect(r.disabledAttr, '表单链路禁用不回写 disabled 属性（防自锁）').toBe(false)
  expect(r.disabledDataAttr, '表单链路禁用经注入态镜像到 data-disabled').toBe(true)
  expect(r.disabledInner, '表单链路禁用同步到内层 input').toBe(true)
  expect(r.enabledAgain, '解除 fieldset disabled 后恢复').toBe(true)
  expect(r.noNameExcluded, '无 name 控件不进入 FormData').toBe(true)
})

test('form-associated 校验链路：required 空值进入原生约束校验（checkValidity / :invalid / invalid 事件）', async ({
  page,
}) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = '<oas-input id="fa-req" name="req" required></oas-input>'
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaInput extends HTMLElement {
      shadowRoot: ShadowRoot
      validity: ValidityState | null
      willValidate: boolean
      checkValidity(): boolean
      reportValidity(): boolean
    }
    const el = document.getElementById('fa-req') as unknown as FaInput
    const inner = el.shadowRoot.querySelector('input')!

    // required + 空值 → 原生约束校验
    const willValidate = el.willValidate
    const invalidEmpty = el.checkValidity()
    const formInvalid = form.checkValidity()
    const valueMissing = el.validity?.valueMissing ?? null
    const invalidPseudo = el.matches(':invalid')

    // reportValidity → false 且派发 invalid 事件
    let invalidFired = 0
    el.addEventListener('invalid', () => invalidFired++)
    const reported = el.reportValidity()

    // 填入值 → 恢复合法
    inner.value = 'x'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const validAfter = el.checkValidity()
    const validPseudo = el.matches(':valid')

    // 清空（reset 语义外）→ 重新 valueMissing
    inner.value = ''
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const invalidAgain = el.checkValidity()

    form.remove()
    return {
      willValidate,
      invalidEmpty,
      formInvalid,
      valueMissing,
      invalidPseudo,
      reported,
      invalidFired,
      validAfter,
      validPseudo,
      invalidAgain,
    }
  })

  expect(r.willValidate, 'required 控件参与校验').toBe(true)
  expect(r.invalidEmpty, 'required 空值 checkValidity 为 false').toBe(false)
  expect(r.formInvalid, '所在表单 checkValidity 同步为 false').toBe(false)
  expect(r.valueMissing, 'validity.valueMissing 为 true').toBe(true)
  expect(r.invalidPseudo, '宿主匹配 :invalid 伪类').toBe(true)
  expect(r.reported, 'reportValidity 为 false').toBe(false)
  expect(r.invalidFired, 'reportValidity 派发 invalid 事件').toBeGreaterThan(0)
  expect(r.validAfter, '填入值后 checkValidity 恢复 true').toBe(true)
  expect(r.validPseudo, '填入值后宿主匹配 :valid 伪类').toBe(true)
  expect(r.invalidAgain, '再次清空后回到 invalid').toBe(false)
})
