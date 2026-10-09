// 复核回归：questionnaire——多步推进 / 单步门控拦截 / before-change 否决 / 跳过 / 提交汇总。
// 全部走真实指针点击（helpers.realClick）+ 用户可见反馈断言（demo 输出区），不只看 console。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

test('questionnaire 门控拦截：未填点下一步留在本步、错误上屏、拦截反馈可见', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-gate')
  const q = page.locator('#q-gate')

  // 未填：点下一步 → 留在本步（current 不前进）、输入框 aria-invalid、demo 输出门控拦截文案
  await realClick(page, '#q-gate', '[part="next"]')
  const current = await q.evaluate((el) => el.getAttribute('current'))
  expect(current === null || current === '0').toBe(true)
  await expect(q.locator('oas-input[name="phone"]')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#q-gate-output')).toContainText('门控拦截')

  // 填对后放行：前进到第 2 步
  await page.fill('#q-gate oas-input[name="phone"] input', '13800138000')
  await realClick(page, '#q-gate', '[part="next"]')
  await expect(q).toHaveAttribute('current', '1')
  await expect(page.locator('#q-gate-output')).toContainText('校验通过')
})
test('questionnaire 多步推进 + 提交：三步真点推进、进度 aria 同步、完成按钮回显跨步汇总值', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-basic')
  const q = page.locator('#q-basic')
  const current = () => q.evaluate((el) => el.getAttribute('current'))

  // 步 1：填必填收货人 → 下一步
  await page.fill('#q-basic oas-input[name="receiver"] input', '张三')
  await realClick(page, '#q-basic', '[part="next"]')
  expect(await current()).toBe('1')
  await expect(q.locator('.progress')).toHaveAttribute('aria-valuenow', '2')

  // 步 2：radio 默认已选（无校验）→ 下一步
  await realClick(page, '#q-basic', '[part="next"]')
  expect(await current()).toBe('2')
  await expect(q.locator('.progress')).toHaveAttribute('aria-valuenow', '3')

  // 末步主按钮 = 完成 → submit → demo 输出跨步汇总（含步 1 与步 2 字段）
  await expect(q.locator('[part="next"]')).toHaveText('完成')
  await realClick(page, '#q-basic', '[part="next"]')
  await expect(page.locator('#q-basic-output')).toContainText('oas-submit')
  const payload = await page.locator('#q-basic-output').textContent()
  expect(payload).toContain('receiver')
  expect(payload).toContain('channel')
})

test('questionnaire getValues：宿主经 property 绑定的 initial-values 进跨步汇总（回归）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-ctrl')

  // 模拟 Vue/React 经 property 通道绑定 initial-values（不回写 attribute）——只读 attribute 的旧实现会丢基线
  await page.evaluate(() => {
    const form = document.querySelector('#q-ctrl oas-form[slot="step-a"]') as HTMLElement & {
      initialValues?: unknown
    }
    form.initialValues = { va: 'property 基线' }
  })
  expect(
    await page.evaluate(() =>
      document.querySelector('#q-ctrl oas-form[slot="step-a"]')!.getAttribute('initial-values'),
    ),
  ).toBeNull()

  await realClick(page, '#q-ctrl-values', null)
  await expect(page.locator('#q-ctrl-output')).toContainText('property 基线')

  // value 属性预填（零交互、面板处于 hidden）也进汇总——实时读取根治回归
  await page.evaluate(() => {
    document.querySelector('#q-ctrl oas-input[name="vc"]')!.setAttribute('value', '属性预填C')
  })
  await realClick(page, '#q-ctrl-values', null)
  await expect(page.locator('#q-ctrl-output')).toContainText('属性预填C')
})

test('questionnaire 在途竞态：validator 落地时已离开发起步则放弃推进（回归）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-ctrl')
  const q = page.locator('#q-ctrl')

  // 直跳步 1（goto 不校验），给步 1 form 挂慢 validator（200ms）
  await page.evaluate(() => {
    const qEl = document.querySelector('#q-ctrl') as HTMLElement & { goto: (i: number) => boolean }
    qEl.goto(1)
    const form = document.querySelector('#q-ctrl oas-form[slot="step-b"]') as HTMLElement & { rules: unknown }
    form.rules = { vb: [{ validator: () => new Promise((r) => setTimeout(() => r(true), 200)) }] }
  })
  await expect(q).toHaveAttribute('current', '1')

  // 启动 next（validator 在途）→ 在途窗口内回退 → 落地后不得被拉到步 2。
  // prev 用 evaluate 驱动：realClick 内置 defocus + 滚动静默（约 400ms+）会晚于 200ms
  // validator 窗口，等不到竞态场景——此处的断言对象是时序机制本身（方法链路同源）。
  const nextResult = q.evaluate((el) => (el as HTMLElement & { next(): Promise<boolean> }).next())
  await page.waitForTimeout(50)
  await q.evaluate((el) => (el as HTMLElement & { prev(): boolean }).prev())
  await expect(q).toHaveAttribute('current', '0')
  expect(await nextResult).toBe(false)
  await expect(q).toHaveAttribute('current', '0')
})

test('questionnaire 字段 oas-change 冒泡不被当作切步（回归：曾弹「已到第 NaN 步」）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-basic')

  // 真实键入收货人后 blur：内层字段 oas-change 冒泡穿出，demo 的切步监听不得把它当切步事件
  await page.fill('#q-basic oas-input[name="receiver"] input', '张三')
  await page.locator('#q-basic oas-input[name="receiver"] input').blur()

  // 全树（含 shadow）不得出现 NaN 文案
  const nanCount = await page.evaluate(() => {
    let n = 0
    const walk = (root: Document | ShadowRoot): void => {
      for (const el of root.querySelectorAll('*')) {
        if ((el.textContent ?? '').includes('NaN')) n++
        const sr = (el as HTMLElement).shadowRoot
        if (sr) walk(sr)
      }
    }
    walk(document)
    return n
  })
  expect(nanCount).toBe(0)
})

test('questionnaire 头部列表语义：<ol> 直接子为 <li>、可点项为内层原生 button（axe list 回归）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-veto')

  const res = await page.evaluate(() => {
    const ol = document.querySelector('#q-veto')!.shadowRoot!.querySelector('ol.steps')!
    return {
      children: [...ol.children].map((c) => c.tagName),
      roles: [...ol.querySelectorAll('.item')].map((li) => li.getAttribute('role')),
      btnCount: ol.querySelectorAll('button').length,
    }
  })
  expect(res.children.length).toBeGreaterThan(0)
  expect(res.children.every((t) => t === 'LI')).toBe(true)
  expect(res.roles.every((r) => r === null)).toBe(true)
  expect(res.btnCount).toBeGreaterThan(0)
})

test('questionnaire 头部项键盘可达：聚焦原生 button 按 Enter 由浏览器原生触发跳步（回归）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-basic')
  await page.fill('#q-basic oas-input[name="receiver"] input', '张三')
  await realClick(page, '#q-basic', '[part="next"]')
  await expect(page.locator('#q-basic')).toHaveAttribute('current', '1')

  // 步 0 成「已过步」→ 可点：聚焦其内层原生 button，Enter 由浏览器原生激活
  await page.locator('#q-basic [part="item-button"]').first().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#q-basic')).toHaveAttribute('current', '0')
})

test('questionnaire before-change 否决：linear=false 点击未来步被宿主 preventDefault 拦下', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-veto')
  const q = page.locator('#q-veto')

  // 点击确认页头部项（未来步）：宿主否决 → current 不变、反馈文案可见
  await realClick(page, '#q-veto', '.steps .item:last-child')
  const current = await q.evaluate((el) => el.getAttribute('current'))
  expect(current === null || current === '0').toBe(true)
  await expect(page.locator('#q-veto-output')).toContainText('宿主已否决')
})

test('questionnaire 条件分支：按答案翻转 hidden → 头部收缩、next 自动跳过、恢复显示、汇总值跟随', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-cond')
  const q = page.locator('#q-cond')
  const headerCount = () => q.evaluate((el) => el.shadowRoot!.querySelectorAll('.steps .item').length)

  // 初始三步可见；选「不需要」→ 宿主翻转 hidden → 头部 3 → 2、反馈可见
  expect(await headerCount()).toBe(3)
  await page.locator('#q-cond oas-radio[value="no"]').click()
  await expect(page.locator('#q-cond-output')).toContainText('已隐藏')
  expect(await headerCount()).toBe(2)
  await expect(q.locator('.progress')).toHaveAttribute('aria-valuemax', '2')

  // next 自动跳过被隐藏步：直达确认提交（current=2）
  await realClick(page, '#q-cond', '[part="next"]')
  await expect(q).toHaveAttribute('current', '2')

  // 回到第一步选回「需要开票」→ 步骤恢复、头部回到 3
  await realClick(page, '#q-cond', '[part="item-button"]')
  await expect(q).toHaveAttribute('current', '0')
  await page.locator('#q-cond oas-radio[value="yes"]').click()
  await expect(page.locator('#q-cond-output')).toContainText('已恢复')
  expect(await headerCount()).toBe(3)
  await expect(q.locator('.progress')).toHaveAttribute('aria-valuemax', '3')
})

test('questionnaire animated：开启后切步面板带方向标记、首帧与默认关无标记（动画视觉待人工核对）', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-anim')
  const q = page.locator('#q-anim')
  const animOf = (step: number) =>
    q.evaluate((el, s) => el.shadowRoot!.querySelector(`.panel[data-step="${s}"]`)!.getAttribute('data-anim'), step)

  // 首帧不动画；前进切步 → 新面板 forward 标记
  expect(await animOf(0)).toBeNull()
  await realClick(page, '#q-anim', '[part="next"]')
  await expect(q).toHaveAttribute('current', '1')
  expect(await animOf(1)).toBe('forward')

  // 后退 → backward 标记；非切步重渲染不重复触发
  await realClick(page, '#q-anim', '[part="prev"]')
  await expect(q).toHaveAttribute('current', '0')
  expect(await animOf(0)).toBe('backward')
})

test('questionnaire 跳过：optional 步点跳过按钮不校验直接前进', async ({ page }) => {
  await page.goto('/components/questionnaire.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#q-skip')
  const q = page.locator('#q-skip')

  // 第一步必填昵称未填：下一步被拦；跳过按钮只在 optional 步出现（第 2 步）
  await realClick(page, '#q-skip', '[part="next"]')
  await expect(q.locator('[part="skip"]')).toBeHidden()

  // 编辑字段（仍未切步）：字段 oas-change 冒泡不得误显「已进入下一步」（同名事件过滤回归）
  await page.fill('#q-skip oas-input[name="nickname"] input', '小明')
  await page.locator('#q-skip oas-input[name="nickname"] input').blur()
  await expect(page.locator('#q-skip-output')).toHaveText('')

  await realClick(page, '#q-skip', '[part="next"]')
  await expect(q).toHaveAttribute('current', '1')
  await expect(q.locator('[part="skip"]')).toBeVisible()

  // 跳过：invite 留空直接前进，不触发校验
  await realClick(page, '#q-skip', '[part="skip"]')
  await expect(q).toHaveAttribute('current', '2')
  await expect(q.locator('oas-input[name="invite"]')).not.toHaveAttribute('aria-invalid')

  // 跳过反馈可见且不被紧随的切步事件覆盖（demo oas-change 过滤 + skip 保留回归）
  await expect(page.locator('#q-skip-output')).toContainText('已跳过第 2 步')

  // 参与步口径回归：被跳过的步（invite）退出取值集合——getValues 只含已答的 nickname
  const values = await q.evaluate((el) =>
    (el as HTMLElement & { getValues: () => Record<string, unknown> }).getValues(),
  )
  expect(Object.keys(values)).not.toContain('invite')
  expect(values).toHaveProperty('nickname')
})
