// 复核回归：equation——浏览器级固化断言（P1/P2 批次「编辑实时预览」）。
// 覆盖：editable 展示态可聚焦（role=button）→ 点击进入编辑态（编辑框带源码聚焦）
// → 输入实时预览（提交前 code 属性不变）→ Enter 提交写回 code + oas-change + demo 反馈
// → Esc 取消恢复原值 + oas-cancel；默认（无 editable）无编辑区、无交互属性（零变化）。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

const PAGE = '/components/equation.html'
const HOST = 'oas-equation#eq-editable'

test('equation editable：点击进编辑 → 输入实时预览 → Enter 提交写回 code + oas-change + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, HOST)
  await expect(page.locator('#eq-editable-output')).toBeAttached()

  // 展示态：编辑入口语义（role=button + 可聚焦）
  const displayState = await page.evaluate(() => {
    const eq = document
      .querySelector('oas-equation#eq-editable')!
      .shadowRoot!.querySelector<HTMLElement>('[part="equation"]')!
    return { role: eq.getAttribute('role'), tabindex: eq.getAttribute('tabindex') }
  })
  expect(displayState.role, 'editable 展示态应为编辑入口（role=button）').toBe('button')
  expect(displayState.tabindex, 'editable 展示态应可聚焦').toBe('0')

  await realClick(page, HOST, '[part="equation"]')
  const field = page.locator(`${HOST} [part="field"]`)
  await expect(field, '编辑态应出现源码编辑框').toBeVisible()
  expect(await field.inputValue(), '编辑框应带当前源码').toBe('x^2 + y_1 = z_{max}')

  // 输入实时预览：预览区跟随输入渲染，提交前 code 属性不变
  await field.fill('\\alpha + \\beta')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('oas-equation#eq-editable')!.shadowRoot!.querySelector('[part="equation"]')!
            .textContent,
      ),
    )
    .toContain('α')
  const midCommit = await page.evaluate(() => document.querySelector('oas-equation#eq-editable')!.getAttribute('code'))
  expect(midCommit, '实时预览期间受控 code 属性不变').toBe('x^2 + y_1 = z_{max}')

  // Enter 提交：code 回写 + demo 反馈
  await field.press('Enter')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('oas-equation#eq-editable')!.getAttribute('code')))
    .toBe('\\alpha + \\beta')
  await expect(page.locator('#eq-editable-output')).toHaveText('oas-change: \\alpha + \\beta')
  await expect(field, '提交后编辑框隐藏').toBeHidden()
})

test('equation editable：Esc 取消恢复原值 + oas-cancel，code 属性不被写入', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, HOST)
  await realClick(page, HOST, '[part="equation"]')
  const field = page.locator(`${HOST} [part="field"]`)
  await expect(field).toBeVisible()
  await field.fill('\\gamma')
  await field.press('Escape')
  const after = await page.evaluate(() => ({
    code: document.querySelector('oas-equation#eq-editable')!.getAttribute('code'),
    editing: document.querySelector('oas-equation#eq-editable')!.hasAttribute('data-editing'),
    out: document.querySelector('#eq-editable-output')!.textContent,
  }))
  expect(after.code, 'Esc 取消不写受控值').toBe('x^2 + y_1 = z_{max}')
  expect(after.editing, '取消后退出编辑态').toBe(false)
  expect(after.out, 'demo 反馈 oas-cancel').toBe('oas-cancel: 已恢复原值')
})

test('equation 默认零变化：无 editable 的公式无编辑区、无交互属性', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  // 页面首个非 editable 公式（上下标 demo）
  await up(page, 'oas-equation')
  const state = await page.evaluate(() => {
    const el = document.querySelector('oas-equation')!
    const eq = el.shadowRoot!.querySelector<HTMLElement>('[part="equation"]')!
    return {
      editor: el.shadowRoot!.querySelector('[part="editor"]') !== null,
      role: eq.hasAttribute('role'),
      tabindex: eq.hasAttribute('tabindex'),
      sup: el.shadowRoot!.querySelectorAll('.sup').length,
    }
  })
  expect(state.editor, '默认不渲染编辑区').toBe(false)
  expect(state.role, '默认无 role').toBe(false)
  expect(state.tabindex, '默认不可聚焦').toBe(false)
  expect(state.sup, '默认渲染与纯展示一致（上标照常）').toBeGreaterThanOrEqual(1)
})
