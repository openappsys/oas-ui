// 复核回归：schema-form——渲染 / whenSchema 联动 / 错误注入 / 数组增删 / 嵌套数组 / 空态 / 宿主桥接。
// 全部走真实指针点击（helpers.realClick）+ 用户可见反馈断言（demo 输出区），不只看 console。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

async function pickOption(page: import('@playwright/test').Page, selectSel: string, label: string): Promise<void> {
  await page.locator(`${selectSel} [part="trigger"]`).click()
  await page.locator(`${selectSel} [role="option"]`).filter({ hasText: label }).first().click()
}

test('schema-form 渲染：字段/初始值/值契约（叶子字符串）与提交回显', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-basic')

  // 5 个字段按默认映射渲染
  await expect(page.locator('#sf-basic oas-form-item')).toHaveCount(5)
  await expect(page.locator('#sf-basic oas-input[name="name"]')).toBeVisible()
  await expect(page.locator('#sf-basic oas-input-number[name="age"]')).toBeVisible()
  // 初始值写入：switch 选中、枚举选中 basic
  expect(await page.locator('#sf-basic oas-switch[name="vip"]').evaluate((el) => el.hasAttribute('checked'))).toBe(true)
  await expect(page.locator('#sf-basic oas-select[name="plan"]')).toHaveAttribute('value', 'basic')

  // 必填未填 → submit 拦截并给出可见反馈
  await page.locator('#sf-basic-submit').click()
  await expect(page.locator('#sf-basic-output')).toContainText('oas-validate-fail')
  await expect(page.locator('#sf-basic oas-input[name="name"]')).toHaveAttribute('aria-invalid', 'true')

  // 填对后提交：detail.values 为字符串语义
  await page.fill('#sf-basic oas-input[name="name"] input', '张三')
  await page.fill('#sf-basic oas-input[name="mail"] input', 'zhang@example.com')
  await page.locator('#sf-basic-submit').click()
  await expect(page.locator('#sf-basic-output')).toContainText('oas-submit')
  const text = await page.locator('#sf-basic-output').textContent()
  expect(text).toContain('"name":"张三"')
  expect(text).toContain('"vip":"true"')
})

test('schema-form whenSchema 联动：切换国家 → 字段卸载/复显与 required 同步', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-react')

  // CN：state 卸载、province 必填
  await expect(page.locator('#sf-react oas-input[name="state"]')).toHaveCount(0)
  const provinceItem = page.locator('#sf-react oas-form-item:has(oas-input[name="province"])')
  const stateItem = page.locator('#sf-react oas-form-item:has(oas-input[name="state"])')
  await expect(provinceItem).toHaveAttribute('required', '')

  // 切到 US：province 卸载、state 出现且必填
  await pickOption(page, '#sf-react oas-select[name="country"]', 'US')
  await expect(page.locator('#sf-react oas-input[name="province"]')).toHaveCount(0)
  await expect(page.locator('#sf-react oas-input[name="state"]')).toBeVisible()
  await expect(stateItem).toHaveAttribute('required', '')
  // 依赖图联动反馈（demo 输出当前值）
  await expect(page.locator('#sf-react-output')).toContainText('"country":"US"')

  // free 套餐：note 禁用
  await expect(page.locator('#sf-react oas-input[name="note"]')).toHaveAttribute('disabled', '')
})

test('schema-form 数组：初始行 / 真实增删 / 值随行号重绑 / 数组级错误条', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-array')

  const list = page.locator('#sf-array oas-form-list')
  await expect(list.locator('[data-oas-form-list-item]')).toHaveCount(1)
  await expect(page.locator('#sf-array oas-input[name="users.0.nick"]')).toHaveAttribute('value', '张三')

  // 真实点击「添加一项」→ 2 行，新增行按行号命名
  await page.locator('#sf-array oas-form-list [part="add"]').click()
  await expect(list.locator('[data-oas-form-list-item]')).toHaveCount(2)
  await expect(page.locator('#sf-array oas-input[name="users.1.nick"]')).toBeVisible()

  // 第二行必填未填 → submit 拦截，错误上屏
  await page.locator('#sf-array-submit').click()
  await expect(page.locator('#sf-array oas-input[name="users.1.nick"]')).toHaveAttribute('aria-invalid', 'true')

  // 删除第二行后只剩 1 行（错误态随元素移除）
  await page.locator('#sf-array oas-form-list [part="remove"]').nth(1).click()
  await expect(list.locator('[data-oas-form-list-item]')).toHaveCount(1)
  await expect(page.locator('#sf-array oas-input[name="users.0.nick"]')).not.toHaveAttribute('aria-invalid')

  // reset 回初始行数
  await page.locator('#sf-array-reset').click()
  await expect(list.locator('[data-oas-form-list-item]')).toHaveCount(1)
})

test('schema-form 数组级校验：空数组 + minItems → 错误条上屏，添加行后提交通过', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-array-required')
  const host = page.locator('#sf-array-required')
  const error = host.locator('[part="array-error"]')

  await expect(error).toBeHidden()
  await page.locator('#sf-array-required-submit').click()
  await expect(error).toBeVisible()
  await expect(error).toContainText('至少需要 1 项')
  await expect(page.locator('#sf-array-required-output')).toContainText('users=')

  // 添加一行并填写 → 提交通过，错误条隐藏
  await host.locator('oas-form-list [part="add"]').click()
  await page.fill('#sf-array-required oas-input[name="users.0.nick"] input', '李四')
  await page.locator('#sf-array-required-submit').click()
  await expect(page.locator('#sf-array-required-output')).toContainText('oas-submit')
  await expect(error).toBeHidden()
})

test('schema-form 嵌套数组：内层行命名 users.N.matrix.M.label 且值可读', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-nested')

  await expect(page.locator('#sf-nested oas-input[name="users.0.matrix.0.label"]')).toHaveAttribute('value', 'A')
  await expect(page.locator('#sf-nested oas-input[name="users.0.matrix.1.label"]')).toHaveAttribute('value', 'B')
  await page.locator('#sf-nested-values').click()
  await expect(page.locator('#sf-nested-output')).toContainText('matrix')
  await expect(page.locator('#sf-nested-output')).toContainText('B')
})

test('schema-form 错误注入：服务端 error / warning 双态 / clearErrors', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-errors')

  // 注入服务端错误 → 对应 form-item 错误位可见
  await page.locator('#sf-errors-server').click()
  const accountItem = page.locator('#sf-errors oas-form-item', { hasText: '账号' }).first()
  await expect(accountItem.locator('[part="error"]')).toBeVisible()
  await expect(accountItem.locator('[part="error"]')).toContainText('已被占用')
  await expect(page.locator('#sf-errors oas-input[name="account"]')).toHaveAttribute('aria-invalid', 'true')

  // 改值 → 回落（注入错误清除）
  await page.fill('#sf-errors oas-input[name="account"] input', 'alice2')
  await page.locator('#sf-errors oas-input[name="account"] input').blur()
  await expect(accountItem.locator('[part="error"]')).toBeHidden()

  // warning：role=status 可见、不阻断 validate
  await page.locator('#sf-errors-warning').click()
  const mailItem = page.locator('#sf-errors oas-form-item', { hasText: '邮箱' }).first()
  await expect(mailItem.locator('[part="warning"]')).toBeVisible()
  await expect(mailItem.locator('[part="warning"]')).toHaveAttribute('role', 'status')
  await expect(page.locator('#sf-errors oas-input[name="mail"]')).not.toHaveAttribute('aria-invalid')
  await page.locator('#sf-errors-validate').click()
  await expect(page.locator('#sf-errors-output')).toContainText('通过')

  // 清空注入
  await page.locator('#sf-errors-clear').click()
  await expect(mailItem.locator('[part="warning"]')).toBeHidden()
})

test('schema-form 空态：无 schema / 非法 schema / 零字段均有可见占位', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-empty-none')
  await expect(page.locator('#sf-empty-none [part="empty"]')).toBeVisible()
  await expect(page.locator('#sf-empty-bad [part="empty"]')).toBeVisible()
  await expect(page.locator('#sf-empty-fields [part="empty"]')).toBeVisible()
})

test('schema-form 标签页键盘可达：方向键切换 aria-selected 与面板', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-layout')
  const tabs = page.locator('#sf-layout [role="tab"]')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'false')
  await expect(page.locator('#sf-layout [role="tabpanel"]').nth(1)).toBeVisible()

  // 栅格 span 生效：两个 span=12 容器并排（同顶、左右分布；body 不得成为中间层占列）
  const geom = await page.evaluate(() => {
    const host = document.getElementById('sf-layout')!
    const group = host.shadowRoot!.querySelector('[part="group"]')!.getBoundingClientRect()
    const tabsBox = host.shadowRoot!.querySelector('[part="tabs"]')!.getBoundingClientRect()
    return { groupTop: group.top, groupRight: group.right, tabsTop: tabsBox.top, tabsLeft: tabsBox.left }
  })
  expect(Math.abs(geom.groupTop - geom.tabsTop)).toBeLessThan(4)
  expect(geom.tabsLeft).toBeGreaterThanOrEqual(geom.groupRight - 1)
})

test('schema-form 宿主桥接：Vue 下 schema/uiSchema 走 property 通道（未被序列化成 attribute）', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-basic')
  const bridge = await page.evaluate(() => {
    const el = document.getElementById('sf-basic') as HTMLElement & { schema?: unknown; uiSchema?: unknown }
    return {
      schemaIsObject: typeof el.schema === 'object' && el.schema !== null,
      schemaAttr: el.getAttribute('schema'),
      formItemCount: el.shadowRoot?.querySelectorAll('oas-form-item').length ?? 0,
    }
  })
  expect(bridge.schemaIsObject, 'property 通道持有对象').toBe(true)
  expect(bridge.schemaAttr, '对象未被 Vue 序列化进 attribute').toBeNull()
  expect(bridge.formItemCount).toBe(5)
})

test('schema-form 联动 required 参与校验：province 未填时 validate() 返回 false 且 aria-invalid 上屏', async ({
  page,
}) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-react')
  // demo 默认 CN：reaction fulfill required:true → province 必填
  await expect(page.locator('#sf-react oas-input[name="province"]')).toHaveAttribute('aria-required', 'true')
  const ok = await page.evaluate(async () => {
    const host = document.getElementById('sf-react') as HTMLElement & { validate?: () => Promise<boolean> }
    return host.validate!()
  })
  expect(ok, '联动必填必须真拦截（不只加星号）').toBe(false)
  await expect(page.locator('#sf-react oas-input[name="province"]')).toHaveAttribute('aria-invalid', 'true')
  // 填上后通过（plan=free 时 note 仅禁用，不参与校验）
  await page.fill('#sf-react oas-input[name="province"] input', 'CA')
  const okAfter = await page.evaluate(async () => {
    const host = document.getElementById('sf-react') as HTMLElement & { validate?: () => Promise<boolean> }
    return host.validate!()
  })
  expect(okAfter, '填上必填项后校验通过').toBe(true)
})

test('schema-form RTL：标签页顺序镜像 + 联动复显字段继承逻辑方向', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-layout')
  await up(page, '#sf-react')

  const tabLefts = (): Promise<number[]> =>
    page.evaluate(() =>
      [...document.getElementById('sf-layout')!.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"]')].map((tab) =>
        Math.round(tab.getBoundingClientRect().left),
      ),
    )

  // LTR 基线：文档序第一个 tab 在左
  const ltr = await tabLefts()
  expect(ltr, 'LTR 下应渲染 2 个标签页按钮').toHaveLength(2)
  expect(ltr[0]!, 'LTR 下首个标签页在左').toBeLessThan(ltr[1]!)

  await page.evaluate(() => {
    document.documentElement.dir = 'rtl'
  })
  // RTL：flex 行随方向镜像——文档序首个 tab 落到最右（容器未被物理 left/right 锁死）
  await expect.poll(async () => (await tabLefts())[0]! - (await tabLefts())[1]!, { timeout: 5000 }).toBeGreaterThan(0)

  // 联动卸载区（#sf-react）：切到 US 复显的 state 字段继承 RTL 方向，且保持文档序在 country 之后
  await pickOption(page, '#sf-react oas-select[name="country"]', 'US')
  await expect(page.locator('#sf-react oas-input[name="state"]')).toBeVisible()
  const remounted = await page.evaluate(() => {
    const host = document.getElementById('sf-react')!
    const root = host.shadowRoot!
    const stateWidget = root.querySelector<HTMLElement>('[name="state"]')!
    const stateItem = stateWidget.closest('oas-form-item') as HTMLElement
    const countryItem = root.querySelector<HTMLElement>('[name="country"]')!.closest('oas-form-item') as HTMLElement
    return {
      direction: getComputedStyle(stateItem).direction,
      widgetDirection: getComputedStyle(stateWidget).direction,
      stateTop: Math.round(stateItem.getBoundingClientRect().top),
      countryTop: Math.round(countryItem.getBoundingClientRect().top),
    }
  })
  expect(remounted.direction, '复显字段容器必须继承 RTL 方向（逻辑属性，无物理锁死）').toBe('rtl')
  expect(remounted.widgetDirection, '复显字段控件同样继承 RTL').toBe('rtl')
  expect(remounted.stateTop, 'RTL 下纵向流不变：state 仍在 country 之后').toBeGreaterThan(remounted.countryTop)

  await page.evaluate(() => {
    document.documentElement.dir = 'ltr'
  })
})
