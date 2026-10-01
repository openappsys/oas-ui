// 复核回归：form——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('form-item label 点击聚焦 oas-input 的 shadow 内 input（focus 委托链）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form-item[label] oas-input')
  // 限定到基础用法 demo 块（页面后续新增 demo 的 form-item 也在首位竞争）
  const item = page.locator('#form-grid oas-form-item[label]').first()
  await item.locator('[part="label"]').click()
  await page.waitForTimeout(100)
  const r = await page.evaluate(() => {
    const item = document.querySelector<HTMLElement>('#form-grid oas-form-item[label]')!
    const control = item.querySelector('oas-input')
    const inner = control?.shadowRoot?.activeElement
    return {
      hostFocused: document.activeElement === control,
      innerTag: inner?.tagName ?? null,
      sameAsInput: inner === control?.shadowRoot?.querySelector('input'),
    }
  })
  expect(r.hostFocused).toBe(true)
  expect(r.innerTag).toBe('INPUT')
  expect(r.sameAsInput).toBe(true)
})

test('form inline：表单项水平排列（同一行）、label 在控件左侧、空提交必填错误在控件下方', async ({ page }) => {
  // 曾现风险：inline 仅声明属性但无视觉效果（form 未切 flex / form-item 未感知行内）
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-form[inline] oas-form-item oas-input')
  const r = await page.evaluate(() => {
    const form = document.querySelector('#form-inline-login')!
    const formEl = form.shadowRoot!.querySelector('form')!
    const items = [...form.querySelectorAll('oas-form-item')].filter((i) => i.querySelector('oas-input, oas-select'))
    const first = items[0]!
    const second = items[1]!
    const a = first.getBoundingClientRect()
    const b = second.getBoundingClientRect()
    const labelBox = first.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect()
    const controlBox = first.querySelector<HTMLElement>('oas-input')!.getBoundingClientRect()
    return {
      flex: getComputedStyle(formEl).display,
      wrap: getComputedStyle(formEl).flexWrap,
      sameRow: Math.abs(a.top - b.top) < 4 && b.left > a.right,
      labelLeftOfControl: labelBox.right <= controlBox.left + 1,
      labelWidth: first.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect().width,
    }
  })
  expect(r.flex).toBe('flex')
  expect(r.wrap).toBe('wrap')
  expect(r.sameRow).toBe(true)
  expect(r.labelLeftOfControl).toBe(true)
  expect(r.labelWidth).toBeLessThan(96) // label-width 自动：不加固定 96px 列宽

  // 空表单提交 → 必填错误写入 form-item 错误位（控件下方红字）
  await page.locator('#form-inline-login oas-form-item:last-child oas-button').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')
    const err = item?.shadowRoot?.querySelector<HTMLElement>('[part="error"]')
    return err != null && !err.hidden && (err.textContent?.length ?? 0) > 0
  })
  const err = await page.evaluate(() => {
    const item = document.querySelector('#form-inline-login oas-form-item')!
    const err = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    const input = item.querySelector('oas-input')!.getBoundingClientRect()
    const errBox = err.getBoundingClientRect()
    return {
      text: err.textContent,
      belowInput: errBox.top >= input.bottom - 1,
      labelLeftOfInput:
        item.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!.getBoundingClientRect().right <= input.left + 1,
    }
  })
  expect(err.text).toContain('请输入用户名')
  expect(err.belowInput).toBe(true)
  expect(err.labelLeftOfInput).toBe(true)
})

// ---- P2 批次：表级 size / colon / help / status-icon / validate-messages ----

test('form 表级 size：下发 data-form-size 且字段 data-size 镜像；冒号开关 data-colon 即时翻转', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-size-colon oas-checkbox, #form-size-colon oas-input')
  const r1 = await page.evaluate(() => {
    const form = document.getElementById('form-size-colon')!
    const bio = form.querySelector('oas-textarea[name="sc-bio"]')!
    const cbA = form.querySelector('oas-checkbox[name="sc-a"]')!
    const cbB = form.querySelector('oas-checkbox[name="sc-b"]')!
    return {
      bioFormSize: bio.getAttribute('data-form-size'),
      bioSize: bio.getAttribute('data-size'),
      cbAFormSize: cbA.getAttribute('data-form-size'),
      cbASize: cbA.getAttribute('data-size'),
      cbBFormSize: cbB.getAttribute('data-form-size'),
      cbBSize: cbB.getAttribute('data-size'),
    }
  })
  // 表级 large 下发：已接通道的组件拿 large 并镜像 data-size；自身 size=medium 优先于表级
  expect(r1.bioFormSize).toBe('large')
  expect(r1.bioSize).toBe('large')
  expect(r1.cbAFormSize).toBe('large')
  expect(r1.cbASize).toBe('large')
  expect(r1.cbBFormSize).toBe(null)
  expect(r1.cbBSize).toBe('medium')
  // colon 开关：点击后 form-item data-colon 翻转
  const r2 = await page.evaluate(() => {
    const form = document.getElementById('form-size-colon')!
    const item = form.querySelector('oas-form-item')!
    const before = item.hasAttribute('data-colon')
    form.removeAttribute('colon')
    const afterRemove = item.hasAttribute('data-colon')
    form.setAttribute('colon', '')
    const afterSet = item.hasAttribute('data-colon')
    return { before, afterRemove, afterSet }
  })
  expect(r2.before).toBe(true)
  expect(r2.afterRemove).toBe(false)
  expect(r2.afterSet).toBe(true)
})

test('form help + status-icon：帮助文案常驻，提交失败后 danger 图标可见、修正后隐藏', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-help-icon oas-form-item oas-input')
  // 提交空表单：错误文本 + 状态图标出现，help 仍在
  await page.locator('#form-help-icon oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector('[part="status-icon"]')!
    return icon.hasAttribute('hidden') === false
  })
  const r1 = await page.evaluate(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector<HTMLElement>('[part="status-icon"]')!
    const help = item.shadowRoot!.querySelector<HTMLElement>('[part="help"]')!
    const err = item.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!
    return {
      iconVisible: !icon.hasAttribute('hidden'),
      hasSvg: icon.querySelector('svg') != null,
      helpVisible: !help.hasAttribute('hidden'),
      helpText: help.textContent,
      errText: item.shadowRoot!.querySelector('.error-msg')!.textContent,
    }
  })
  expect(r1.iconVisible).toBe(true)
  expect(r1.hasSvg).toBe(true)
  expect(r1.helpVisible).toBe(true)
  expect(r1.helpText).toBe('用于接收登录验证码')
  expect(r1.errText).toBe('请输入邮箱')
  // 修正后重新提交：图标随错误一起隐藏
  await page.evaluate(() => {
    const input = document.querySelector('#form-help-icon oas-input')!
    input.setAttribute('value', 'user@example.com')
  })
  await page.locator('#form-help-icon oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-help-icon oas-form-item')!
    const icon = item.shadowRoot!.querySelector('[part="status-icon"]')!
    return icon.hasAttribute('hidden') === true
  })
})

test('form validate-messages：property 模板覆盖 locale 默认错误文案（可见反馈）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-vmessages oas-form-item oas-input')
  await page.locator('#form-vmessages oas-button[type="primary"]').click()
  await page.waitForFunction(() => {
    const item = document.querySelector('#form-vmessages oas-form-item')!
    return item.shadowRoot!.querySelector('[part="error"]')!.hasAttribute('hidden') === false
  })
  const msg = await page.evaluate(() => {
    const item = document.querySelector('#form-vmessages oas-form-item')!
    return item.shadowRoot!.querySelector('.error-msg')!.textContent
  })
  expect(msg, 'validate-messages.required 模板应覆盖 locale 默认').toBe('用户名不能为空')
})

// ---- D10 批次：嵌套 name 路径 + oas-form-list 动态字段组 ----

test('form 嵌套 name 路径：输入后提交 values 组装嵌套对象（demo 可见回显）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-nested oas-input')
  const city = page.locator('#form-nested oas-input[name="profile.city"] input')
  await city.scrollIntoViewIfNeeded()
  await city.fill('杭州')
  const name = page.locator('#form-nested oas-input[name="name"] input')
  await name.fill('张三')
  await page.locator('#form-nested oas-button[type="primary"]').click()
  await page.waitForFunction(() => (document.getElementById('form-nested-output')?.textContent?.length ?? 0) > 0)
  const out = await page.evaluate(() => document.getElementById('form-nested-output')!.textContent)
  expect(out, '提交回显应为嵌套 JSON').toContain('"profile":{"city":"杭州"}')
  expect(out).toContain('"name":"张三"')
})

test('form-list 动态字段组：add/remove 真实点击，行值随行保留、删除后重新编号、提交嵌套数组', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-list-demo-list')
  const list = page.locator('#form-list-demo-list')
  // min=1：初始 1 行；添加到 2 行
  expect(await list.locator('[data-oas-form-list-item]').count()).toBe(1)
  await list.locator('[part="add"]').click()
  await page.waitForFunction(
    () => document.querySelectorAll('#form-list-demo-list [data-oas-form-list-item]').length === 2,
  )
  // 两行分别填写（行内字段 name 已被索引化为 members.N.*）
  await page.locator('#form-list-demo-list oas-input[name="members.0.name"] input').fill('张三')
  await page.locator('#form-list-demo-list oas-input[name="members.0.role"] input').fill('本人')
  await page.locator('#form-list-demo-list oas-input[name="members.1.name"] input').fill('李四')
  // 提交 → 嵌套数组回显（可见反馈）
  await page.locator('#form-list-demo oas-button[type="primary"]').click()
  await page.waitForFunction(() => (document.getElementById('form-list-output')?.textContent ?? '').includes('members'))
  let out = await page.evaluate(() => document.getElementById('form-list-output')!.textContent)
  expect(out).toContain('"members":[{"name":"张三","role":"本人"},{"name":"李四","role":""}]')
  // 删除第一行：剩余行重编号，值随行保留（李四从 members.1 变 members.0）
  await list.locator('[part="remove"]').first().click()
  await page.waitForFunction(() =>
    (document.getElementById('form-list-output')?.textContent ?? '').includes('oas-remove'),
  )
  expect(await list.locator('[data-oas-form-list-item]').count()).toBe(1)
  const remainingName = page.locator('#form-list-demo-list oas-input[name="members.0.name"] input')
  expect(await remainingName.inputValue(), '删除后剩余行的值应保留且重新编号').toBe('李四')
  // 再提交：members 数组只剩原第二行
  await page.locator('#form-list-demo oas-button[type="primary"]').click()
  await page.waitForFunction(() =>
    (document.getElementById('form-list-output')?.textContent ?? '').startsWith('oas-submit'),
  )
  out = await page.evaluate(() => document.getElementById('form-list-output')!.textContent)
  expect(out).toContain('"members":[{"name":"李四","role":""}]')
})

test('form 两段式提交：校验失败 → 修正 → 再提交应派发 oas-submit（demands 登记回归——2.5.7 起 validate-trigger=change 与提交时序的互斥疑案）', async ({
  page,
}) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => customElements.get('oas-form') != null, null, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const dialog = document.createElement('oas-dialog')
    dialog.id = 'qa-2stage-dialog'
    dialog.setAttribute('title', '编辑分类')
    const form = document.createElement('oas-form') as HTMLElement & { submit(): void }
    form.id = 'qa-2stage-form'
    form.setAttribute('rules', JSON.stringify({ name: [{ required: true, message: '名称必填' }] }))
    const input = document.createElement('oas-input')
    input.setAttribute('name', 'name')
    input.setAttribute('label', '名称')
    form.appendChild(input)
    const btn = document.createElement('oas-button')
    btn.setAttribute('type', 'primary')
    btn.textContent = '保存'
    btn.addEventListener('oas-click', () => {
      ;(window as unknown as { __qa2clicks?: number }).__qa2clicks =
        ((window as unknown as { __qa2clicks?: number }).__qa2clicks ?? 0) + 1
      form.submit()
    })
    form.appendChild(btn)
    dialog.appendChild(form)
    ;(document.querySelector('.vp-doc') ?? document.body).appendChild(dialog)
  })
  await page.evaluate(() => {
    const form = document.querySelector('#qa-2stage-form')!
    const dialog = document.querySelector('#qa-2stage-dialog')!
    const out: string[] = []
    // 挂 window：evaluate 返回值是序列化快照，后续事件 push 需要共享引用
    ;(window as unknown as { __qa2stage: string[] }).__qa2stage = out
    form.addEventListener('oas-submit', () => {
      out.push('submit')
      dialog.removeAttribute('open')
    })
    form.addEventListener('oas-validate-fail', () => out.push('fail'))
  })
  await page.evaluate(() => {
    ;(document.querySelector('#qa-2stage-dialog') as HTMLElement).setAttribute('open', '')
    ;(document.querySelector('#qa-2stage-form') as unknown as { submit(): void }).submit()
  })
  await page.waitForTimeout(300)
  const events1 = await page.evaluate(() => (window as unknown as { __qa2stage: string[] }).__qa2stage.join(','))
  expect(events1, '空提交触发 validate-fail').toContain('fail')

  // 真实输入修正（fill → blur 触发 change 提交链）
  const input = page.locator('#qa-2stage-form oas-input')
  await input.click()
  await page.keyboard.type('修正名称')
  // 提交（合成 click 直派 shadow 内 button——oas-click → form.submit() → 校验 → oas-submit
  // 的完整链路；真实指针命中与本用例验证的提交链语义无关，排除命中层不稳定因素）
  await page.evaluate(() => {
    const btn = document.querySelector('#qa-2stage-form oas-button')!
    const inner = btn.shadowRoot!.querySelector('button[part="button"], a[part="button"]') as HTMLElement
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  await page.waitForTimeout(400)
  const events2 = await page.evaluate(() => (window as unknown as { __qa2stage: string[] }).__qa2stage.join(','))
  expect(events2, '修正后再提交应派发 oas-submit').toContain('submit')
  const dialogOpen = await page.evaluate(() => document.querySelector('#qa-2stage-dialog')!.hasAttribute('open'))
  expect(dialogOpen, 'oas-submit 后宿主关闭弹窗').toBe(false)
})
