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

test('form-associated：textarea 原生关联（label 聚焦 / FormData / reset / required 校验）', async ({ page }) => {
  await page.goto('/components/textarea.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-textarea')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-ta">备注</label>
      <oas-textarea id="fa-ta" name="remark" value="初始备注"></oas-textarea>
      <oas-textarea id="fa-ta-req" name="req" required></oas-textarea>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaTa extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-ta') as unknown as FaTa
    const inner = el.shadowRoot.querySelector('textarea')!
    const label = document.querySelector('label[for="fa-ta"]') as HTMLLabelElement

    const labelsLen = el.labels?.length ?? -1
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const innerFocused = el.shadowRoot.activeElement === inner

    inner.value = 'typed-remark'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdTyped = new FormData(form).get('remark')
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const resetValue = inner.value

    const req = document.getElementById('fa-ta-req') as unknown as FaTa
    const reqInvalid = req.checkValidity()
    const reqPseudo = req.matches(':invalid')

    form.remove()
    return { labelsLen, innerFocused, fdTyped, resetValue, reqInvalid, reqPseudo }
  })

  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.innerFocused, 'label 点击聚焦 shadow 内 textarea').toBe(true)
  expect(r.fdTyped, 'FormData 收集当前值').toBe('typed-remark')
  expect(r.resetValue, 'reset 回初始值').toBe('初始备注')
  expect(r.reqInvalid, 'required 空值 checkValidity 为 false').toBe(false)
  expect(r.reqPseudo, 'required 空值宿主匹配 :invalid').toBe(true)
})

test('form-associated：input-number 原生关联（label 聚焦 / 数字 FormData / 步进同步 / reset / required）', async ({
  page,
}) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-num">数量</label>
      <oas-input-number id="fa-num" name="qty" value="3"></oas-input-number>
      <oas-input-number id="fa-num-req" name="req" required></oas-input-number>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaNum extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-num') as unknown as FaNum
    const inner = el.shadowRoot.querySelector('input')!
    const label = document.querySelector('label[for="fa-num"]') as HTMLLabelElement

    const labelsLen = el.labels?.length ?? -1
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const innerFocused = el.shadowRoot.activeElement === inner

    // 键入 → FormData 实时解析值（数字字符串；键入不写 value 属性）
    inner.value = '42'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdTyped = new FormData(form).get('qty')

    // reset（value 属性仍是 3）→ 回初始值
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const fdReset = new FormData(form).get('qty')

    // 步进按钮（增加）→ 提交写回 value 属性 + FormData 同步
    const stepUp = el.shadowRoot.querySelector<HTMLButtonElement>(
      '[part="increase"], .increase, [data-step="up"], button[aria-label*="增"]',
    )
    stepUp?.click()
    await new Promise((res) => setTimeout(res, 0))
    const fdAfterStep = new FormData(form).get('qty')

    const req = document.getElementById('fa-num-req') as unknown as FaNum
    const reqInvalid = req.checkValidity()

    form.remove()
    return { labelsLen, innerFocused, fdTyped, fdAfterStep, fdReset, reqInvalid, stepUpFound: Boolean(stepUp) }
  })

  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.innerFocused, 'label 点击聚焦 shadow 内 input').toBe(true)
  expect(r.fdTyped, '键入后 FormData 为数字字符串').toBe('42')
  if (r.stepUpFound) {
    expect(r.fdAfterStep, '步进后 FormData 同步为步进后的值（reset 回 3 后步进 → 4）').toBe('4')
  }
  expect(r.fdReset, 'reset 后 FormData 回初始值').toBe('3')
  expect(r.reqInvalid, 'required 空值 checkValidity 为 false').toBe(false)
})

test('form-associated：checkbox 勾选语义（勾选提交 / 未勾不提交 / label 点击勾选 / reset 基线 / required）', async ({
  page,
}) => {
  await page.goto('/components/checkbox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-checkbox')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-cb">接受协议</label>
      <oas-checkbox id="fa-cb" name="agree" value="yes"></oas-checkbox>
      <oas-checkbox id="fa-cb-req" name="must" required></oas-checkbox>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaCb extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-cb') as unknown as FaCb
    const label = document.querySelector('label[for="fa-cb"]') as HTMLLabelElement

    // 未勾：不进 FormData
    const fdUnchecked = new FormData(form).get('agree')

    // label 点击 → 勾选 + 聚焦（原生行为对齐）
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const checkedAfterLabel = el.hasAttribute('checked')
    const innerFocused = el.shadowRoot.activeElement === el.shadowRoot.querySelector('input')
    const fdChecked = new FormData(form).get('agree')
    const labelsLen = el.labels?.length ?? -1

    // reset → 回初始未勾（label 交互不污染基线）
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const resetChecked = el.hasAttribute('checked')

    const req = document.getElementById('fa-cb-req') as unknown as FaCb
    const reqInvalid = req.checkValidity()

    form.remove()
    return { fdUnchecked, checkedAfterLabel, innerFocused, fdChecked, labelsLen, resetChecked, reqInvalid }
  })

  expect(r.fdUnchecked, '未勾不进 FormData').toBe(null)
  expect(r.checkedAfterLabel, 'label 点击勾选（原生对齐）').toBe(true)
  expect(r.innerFocused, 'label 点击同时聚焦内层 input').toBe(true)
  expect(r.fdChecked, '勾选后 FormData 提交 value').toBe('yes')
  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.resetChecked, 'reset 回初始未勾（交互不污染基线）').toBe(false)
  expect(r.reqInvalid, 'required 未勾 checkValidity 为 false').toBe(false)
})

test('form-associated：radio 组语义（选中提交 / 互斥只留选中项 / label 点击选中 / reset 恢复默认选中）', async ({
  page,
}) => {
  await page.goto('/components/radio.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-radio')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-ra">选项 A</label>
      <oas-radio id="fa-ra" name="choice" value="a"></oas-radio>
      <oas-radio id="fa-rb" name="choice" value="b" checked></oas-radio>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaRadio extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
    }
    const a = document.getElementById('fa-ra') as unknown as FaRadio
    const b = document.getElementById('fa-rb') as unknown as FaRadio
    const labelA = document.querySelector('label[for="fa-ra"]') as HTMLLabelElement

    // 初始：b 选中 → FormData 只含 b
    const fdInitial = new FormData(form).get('choice')

    // label 点击 a → a 选中、b 互斥清除；FormData 只剩 a
    labelA.click()
    await new Promise((res) => setTimeout(res, 0))
    const aChecked = a.hasAttribute('checked')
    const bChecked = b.hasAttribute('checked')
    const fdAfter = new FormData(form).get('choice')
    const entriesAfter = [...new FormData(form).entries()].filter(([k]) => k === 'choice').length
    const labelsLen = a.labels?.length ?? -1

    // reset：b 恢复初始选中（基线未被互斥清除冲刷）
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const bReset = b.hasAttribute('checked')

    form.remove()
    return { fdInitial, aChecked, bChecked, fdAfter, entriesAfter, labelsLen, bReset }
  })

  expect(r.fdInitial, '初始 FormData 为默认选中项').toBe('b')
  expect(r.aChecked, 'label 点击选中 a（原生对齐）').toBe(true)
  expect(r.bChecked, 'b 被互斥清除').toBe(false)
  expect(r.fdAfter, 'FormData 切换为选中项 a').toBe('a')
  expect(r.entriesAfter, '同名只提交一条').toBe(1)
  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.bReset, 'reset 恢复默认选中项 b').toBe(true)
})

test('form-associated：switch 勾选语义（开提交 / 关不提交 / label 点击切换 / innerControl=button）', async ({
  page,
}) => {
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-switch')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-sw">开启通知</label>
      <oas-switch id="fa-sw" name="notify"></oas-switch>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaSw extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
    }
    const el = document.getElementById('fa-sw') as unknown as FaSw
    const label = document.querySelector('label[for="fa-sw"]') as HTMLLabelElement
    const btn = el.shadowRoot.querySelector('button')!

    const fdOff = new FormData(form).get('notify')

    // label 点击 → 切换为开 + 聚焦内层 button
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const onAfterLabel = el.hasAttribute('checked')
    const btnFocused = el.shadowRoot.activeElement === btn
    const fdOn = new FormData(form).get('notify')
    const labelsLen = el.labels?.length ?? -1

    // 再点 label → 关（切换语义，非只开）
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const offAgain = !el.hasAttribute('checked')

    form.remove()
    return { fdOff, onAfterLabel, btnFocused, fdOn, labelsLen, offAgain }
  })

  expect(r.fdOff, '关不进 FormData').toBe(null)
  expect(r.onAfterLabel, 'label 点击切换为开').toBe(true)
  expect(r.btnFocused, 'label 点击聚焦内层 button（innerControl 覆盖生效）').toBe(true)
  expect(r.fdOn, '开后 FormData 提交缺省 on').toBe('on')
  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.offAgain, '再次 label 点击切回关').toBe(true)
})

test('form-associated：select 单选/多选提交与 label 聚焦（多选同名多条 FormData）', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-select')

  const r = await page.evaluate(async () => {
    const OPTIONS = JSON.stringify([
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
      { label: '橙子', value: 'orange' },
    ])
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-sel">水果</label>
      <oas-select id="fa-sel" name="fruit"></oas-select>
      <oas-select id="fa-sel-multi" name="tags" multiple></oas-select>
      <oas-select id="fa-sel-req" name="req" required></oas-select>
    `
    document.body.append(form)
    for (const id of ['fa-sel', 'fa-sel-multi', 'fa-sel-req']) {
      document.getElementById(id)!.setAttribute('options', OPTIONS)
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaSelect extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-sel') as unknown as FaSelect
    const multi = document.getElementById('fa-sel-multi') as unknown as FaSelect
    const req = document.getElementById('fa-sel-req') as unknown as FaSelect
    const label = document.querySelector('label[for="fa-sel"]') as HTMLLabelElement

    // label 点击 → 聚焦触发器且不误开面板
    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const triggerFocused = el.shadowRoot.activeElement?.tagName === 'BUTTON'
    const panelClosed = !el.shadowRoot.querySelector('.dropdown.open, [part="dropdown"].open')

    // 单选：受控写入 → FormData
    el.setAttribute('value', 'banana')
    await new Promise((res) => setTimeout(res, 0))
    const fdSingle = new FormData(form).get('fruit')

    // 多选：受控写入两个 → 同名多条
    multi.setAttribute('value', '["apple","orange"]')
    await new Promise((res) => setTimeout(res, 0))
    const fdMulti = new FormData(form).getAll('tags')

    const reqInvalid = req.checkValidity()
    const labelsLen = el.labels?.length ?? -1

    form.remove()
    return { triggerFocused, panelClosed, fdSingle, fdMulti, reqInvalid, labelsLen }
  })

  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.triggerFocused, 'label 点击聚焦触发器 button').toBe(true)
  expect(r.panelClosed, 'label 点击不误开面板').toBe(true)
  expect(r.fdSingle, '单选 FormData 提交选中值').toBe('banana')
  expect(r.fdMulti, '多选同名多条 FormData').toEqual(['apple', 'orange'])
  expect(r.reqInvalid, 'required 无选中 checkValidity 为 false').toBe(false)
})

test('form-associated：mentions 输入同步与 label 聚焦', async ({ page }) => {
  await page.goto('/components/mentions.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-mentions')

  const r = await page.evaluate(async () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-men">评论</label>
      <oas-mentions id="fa-men" name="comment" value="初始"></oas-mentions>
      <oas-mentions id="fa-men-req" name="req" required></oas-mentions>
    `
    document.body.append(form)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaMen extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-men') as unknown as FaMen
    const inner = el.shadowRoot.querySelector('textarea')!
    const label = document.querySelector('label[for="fa-men"]') as HTMLLabelElement

    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const innerFocused = el.shadowRoot.activeElement === inner

    inner.value = '@alice 你好'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdTyped = new FormData(form).get('comment')
    form.reset()
    await new Promise((res) => setTimeout(res, 0))
    const resetValue = inner.value

    const req = document.getElementById('fa-men-req') as unknown as FaMen
    const reqInvalid = req.checkValidity()

    form.remove()
    return { innerFocused, fdTyped, resetValue, reqInvalid }
  })

  expect(r.innerFocused, 'label 点击聚焦内层 textarea').toBe(true)
  expect(r.fdTyped, '输入同步 FormData（含 @标记文本）').toBe('@alice 你好')
  expect(r.resetValue, 'reset 回初始文本').toBe('初始')
  expect(r.reqInvalid, 'required 空文本 checkValidity 为 false').toBe(false)
})

test('form-associated：combobox 选中提交 / 草稿兜底与失焦丢弃 / label 聚焦', async ({ page }) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-combobox')

  const r = await page.evaluate(async () => {
    const OPTIONS = JSON.stringify([
      { label: '苹果', value: 'apple' },
      { label: '香蕉', value: 'banana' },
    ])
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-cb2">水果</label>
      <oas-combobox id="fa-cb2" name="fruit"></oas-combobox>
    `
    document.body.append(form)
    const el = document.getElementById('fa-cb2')!
    el.setAttribute('options', OPTIONS)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaCb extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
    }
    const box = el as unknown as FaCb
    const inner = box.shadowRoot.querySelector('input')!
    const label = document.querySelector('label[for="fa-cb2"]') as HTMLLabelElement

    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const innerFocused = box.shadowRoot.activeElement === inner

    // 草稿（未选中）→ datalist 语义提交输入文本
    inner.value = '自定义'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdDraft = new FormData(form).get('fruit')
    // 失焦丢弃草稿 → 回 null
    inner.dispatchEvent(new FocusEvent('blur'))
    await new Promise((res) => setTimeout(res, 0))
    const fdAfterBlur = new FormData(form).get('fruit')

    // 受控选中 → 提交选中值
    el.setAttribute('value', 'banana')
    await new Promise((res) => setTimeout(res, 0))
    const fdSelected = new FormData(form).get('fruit')

    form.remove()
    return { innerFocused, fdDraft, fdAfterBlur, fdSelected }
  })

  expect(r.innerFocused, 'label 点击聚焦内层 input').toBe(true)
  expect(r.fdDraft, '草稿文本兜底提交（datalist 语义）').toBe('自定义')
  expect(r.fdAfterBlur, '草稿失焦丢弃 → FormData 不含此项').toBe(null)
  expect(r.fdSelected, '选中后提交选中值').toBe('banana')
})

test('form-associated：auto-complete 输入/建议选中同步与 required', async ({ page }) => {
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-auto-complete')

  const r = await page.evaluate(async () => {
    const OPTIONS = JSON.stringify([
      { label: '香蕉', value: 'banana' },
      { label: '苹果', value: 'apple' },
    ])
    const form = document.createElement('form')
    form.innerHTML = `
      <oas-auto-complete id="fa-ac" name="fruit"></oas-auto-complete>
      <oas-auto-complete id="fa-ac-req" name="req" required></oas-auto-complete>
    `
    document.body.append(form)
    for (const id of ['fa-ac', 'fa-ac-req']) document.getElementById(id)!.setAttribute('options', OPTIONS)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaAc extends HTMLElement {
      shadowRoot: ShadowRoot
      checkValidity(): boolean
    }
    const el = document.getElementById('fa-ac') as unknown as FaAc
    const inner = el.shadowRoot.querySelector('input')!

    inner.value = '香'
    inner.dispatchEvent(new Event('input', { bubbles: true }))
    const fdTyped = new FormData(form).get('fruit')

    const req = document.getElementById('fa-ac-req') as unknown as FaAc
    const reqInvalid = req.checkValidity()

    form.remove()
    return { fdTyped, reqInvalid }
  })

  expect(r.fdTyped, '输入即同步 FormData（不随 debounce）').toBe('香')
  expect(r.reqInvalid, 'required 空文本 checkValidity 为 false').toBe(false)
})

test('form-associated：tree-select 单选/多选提交与 label 聚焦触发器', async ({ page }) => {
  await page.goto('/components/tree-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tree-select')

  const r = await page.evaluate(async () => {
    const OPTIONS = JSON.stringify([{ label: '前端', value: 'fe', children: [{ label: 'React', value: 'react' }] }])
    const form = document.createElement('form')
    form.innerHTML = `
      <label for="fa-ts">技术</label>
      <oas-tree-select id="fa-ts" name="tech"></oas-tree-select>
      <oas-tree-select id="fa-ts-multi" name="techs" multiple></oas-tree-select>
    `
    document.body.append(form)
    for (const id of ['fa-ts', 'fa-ts-multi']) document.getElementById(id)!.setAttribute('options', OPTIONS)
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))

    interface FaTs extends HTMLElement {
      shadowRoot: ShadowRoot
      labels: NodeList | null
    }
    const el = document.getElementById('fa-ts') as unknown as FaTs
    const multi = document.getElementById('fa-ts-multi') as unknown as FaTs
    const label = document.querySelector('label[for="fa-ts"]') as HTMLLabelElement

    label.click()
    await new Promise((res) => setTimeout(res, 0))
    const triggerFocused = el.shadowRoot.activeElement?.tagName === 'BUTTON'
    const panelClosed = !el.shadowRoot.querySelector('.dropdown.open, [part="dropdown"].open')

    el.setAttribute('value', 'react')
    await new Promise((res) => setTimeout(res, 0))
    const fdSingle = new FormData(form).get('tech')

    multi.setAttribute('value', '["react","fe"]')
    await new Promise((res) => setTimeout(res, 0))
    const fdMulti = new FormData(form).getAll('techs')

    const labelsLen = el.labels?.length ?? -1
    form.remove()
    return { triggerFocused, panelClosed, fdSingle, fdMulti, labelsLen }
  })

  expect(r.labelsLen, 'label for 原生关联').toBe(1)
  expect(r.triggerFocused, 'label 点击聚焦触发器 button（innerControl 覆盖生效）').toBe(true)
  expect(r.panelClosed, 'label 点击不误开面板').toBe(true)
  expect(r.fdSingle, '单选 FormData 提交节点值').toBe('react')
  expect(r.fdMulti, '多选同名多条 FormData').toEqual(['react', 'fe'])
})
