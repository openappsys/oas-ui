import { test, expect, type Page } from '@playwright/test'

// 场景食谱页回归：曾经 guide 页零 e2e 覆盖，导致 recipes 的 <script setup> 被误放进
// DemoBlock 槽内（Vue 模板不执行）→ 三个 demo 全是死的、且用了不存在的 API
// （oas-dialog / form.validate）均未被发现。这里固化「demo 真可交互 + 零 console 报错」。
//
// 保存/取消用内层 button 派发合成 click——真实指针点击在「失焦→校验增删错误文案」时
// 页脚会瞬时位移导致命中落空（与 form.spec.ts 两段式用例同因，同款规避）。

async function clickInner(page: Page, hostSelector: string): Promise<void> {
  await page.evaluate((sel) => {
    const host = document.querySelector(sel) as HTMLElement
    const inner = host.shadowRoot!.querySelector('button, a') as HTMLElement
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  }, hostSelector)
}

test('recipes 表单食谱：行点击弹窗 → 校验失败留存 → 修正提交回写', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/recipes.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => customElements.get('oas-table') != null && customElements.get('oas-modal') != null,
    null,
    { timeout: 15000 },
  )

  const table = page.locator('#recipe-records')
  const modal = page.locator('#recipe-modal')
  await expect(table.locator('tbody tr')).toHaveCount(2)

  // 行点击（取非 link 列，避开原生交互宿主豁免）→ 弹窗打开 + 按行构建四个字段
  await table.locator('tbody tr').first().locator('td').nth(2).click()
  await expect(modal, '行点击应打开编辑弹窗').toHaveAttribute('visible', '')
  await expect(page.locator('#recipe-form oas-input')).toHaveCount(1)
  await expect(page.locator('#recipe-form oas-select')).toHaveCount(1)
  await expect(page.locator('#recipe-form oas-date-picker')).toHaveCount(1)
  await expect(page.locator('#recipe-form oas-switch')).toHaveCount(1)

  // 清空库存 → 保存 → 校验失败：弹窗保持打开、数据未回写
  const stock = page.locator('#recipe-form oas-input')
  await stock.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await expect(stock, '清空后 value 属性应同步为空').toHaveAttribute('value', '')
  await clickInner(page, '#recipe-save')
  await page.waitForTimeout(250)
  await expect(modal, '校验失败弹窗不关').toHaveAttribute('visible', '')
  expect(JSON.parse((await table.getAttribute('data'))!)[0].stock, '校验失败不回写').toBe(15230)

  // 填入合法库存 → 保存 → 校验通过：oas-submit 回写 + 关窗
  await stock.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('999')
  await expect(stock, '输入应同步到 value 属性').toHaveAttribute('value', '999')
  await clickInner(page, '#recipe-save')
  await page.waitForTimeout(300)
  await expect(modal, '校验通过应关窗').not.toHaveAttribute('visible', '')
  await expect(page.locator('#recipe-log')).toContainText('999')
  expect(JSON.parse((await table.getAttribute('data'))!)[0].stock, 'oas-submit 回写表格 data').toBe(999)

  // 画册与日历 demo 也应真实执行（页面级脚本整体运行）
  await expect(page.locator('#recipe-gallery > div')).toHaveCount(3)
  await expect(page.locator('#recipe-calendar .cell-dot').first()).toBeVisible()

  expect(errs, `guide/recipes console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})
