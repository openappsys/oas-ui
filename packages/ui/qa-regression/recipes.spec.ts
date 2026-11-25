import { test, expect, type Page } from '@playwright/test'
import { up } from './helpers'

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
  // 校验失败拦截为同步判定：toHaveAttribute 自带自动等待
  await expect(modal, '校验失败弹窗不关').toHaveAttribute('visible', '')
  expect(JSON.parse((await table.getAttribute('data'))!)[0].stock, '校验失败不回写').toBe(15230)

  // 填入合法库存 → 保存 → 校验通过：oas-submit 回写 + 关窗
  await stock.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('999')
  await expect(stock, '输入应同步到 value 属性').toHaveAttribute('value', '999')
  await clickInner(page, '#recipe-save')
  // 校验通过关窗为同步判定：not.toHaveAttribute 自带自动等待
  await expect(modal, '校验通过应关窗').not.toHaveAttribute('visible', '')
  await expect(page.locator('#recipe-log')).toContainText('999')
  expect(JSON.parse((await table.getAttribute('data'))!)[0].stock, 'oas-submit 回写表格 data').toBe(999)

  // 画册与日历 demo 也应真实执行（页面级脚本整体运行）
  await expect(page.locator('#recipe-gallery > div')).toHaveCount(3)
  await expect(page.locator('#recipe-calendar .cell-dot').first()).toBeVisible()

  expect(errs, `guide/recipes console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

// —— 电商配方批（guide/flash-sale、guide/coupon-center、guide/stock-alert）：固化动态浮层生命周期与动态弱态回落 ——

test('coupon-center 领取抽屉：动态创建唯一性 + 确认后移除 + 券位置灰 + 取消路径', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })

  await page.goto('/guide/coupon-center.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-coupon')
  // 抽屉是动态创建（关闭态不在 DOM），不能 up 等它——确认按钮随抽屉创建，组件注册由页面脚本保证

  // 关闭态抽屉不在 DOM——「关闭即移除」是 Tab 不可达的物理保证（I2 修复固化）
  await expect(page.locator('oas-bottom-sheet')).toHaveCount(0)

  // 打开：全页唯一且 open；确认：移除 + 券位置灰 + 状态行反馈
  await page.locator('.cc-claim').first().click()
  const sheet = page.locator('oas-bottom-sheet[open]')
  await expect(sheet, '点领取后应恰好一个打开的抽屉').toHaveCount(1)
  await sheet.locator('.cc-confirm').click()
  await expect(page.locator('oas-bottom-sheet'), '确认后应自 DOM 移除').toHaveCount(0)
  const first = page.locator('.cc-claim').first()
  await expect(first).toHaveText('已领取')
  // oas-button 宿主无原生 disabled 语义，toBeDisabled 不可靠——断言 presence 属性
  await expect(first, '已领取按钮应置灰').toHaveAttribute('disabled', '')

  // 取消路径：关闭且不改券位状态
  await page.locator('.cc-claim').nth(1).click()
  await expect(page.locator('oas-bottom-sheet[open]')).toHaveCount(1)
  await page.locator('oas-bottom-sheet .cc-cancel').click()
  await expect(page.locator('oas-bottom-sheet')).toHaveCount(0)
  await expect(page.locator('.cc-claim').nth(1), '取消不应置态').toHaveText('领取')

  expect(errs, `coupon-center console 报错:\n${[...new Set(errs)].slice(0, 5).join('\n')}`).toEqual([])
})

test('flash-sale 售罄：状态 tag 动态回落浅底（variant 移除）+ 按钮禁用 + 重置恢复实底', async ({ page }) => {
  await page.goto('/guide/flash-sale.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-submit-bar')

  const state = page.locator('#fs-state')
  const bar = page.locator('#fs-bar')
  await expect(state, '进行中强态初始实底').toHaveAttribute('variant', 'solid')

  // 连买 5 件至售罄（每轮等 loading 解除再点下一轮）
  for (let i = 0; i < 5; i++) {
    await page.locator('#fs-bar >> text=立即抢购').click()
    await page.waitForFunction(() => !document.getElementById('fs-bar')?.hasAttribute('loading'), null, {
      timeout: 5000,
    })
  }
  await expect(state).toHaveText('已售罄')
  await expect(state, '售罄弱态应移除 variant 回落浅底（I5 固化）').not.toHaveAttribute('variant', /.*/)
  await expect(bar, '售罄后主按钮应禁用（presence 属性值为空串）').toHaveAttribute('disabled', '')
  await expect(bar).toHaveAttribute('action-text', '已售罄')

  // 重置：回到进行中强态，实底恢复
  await page.locator('#fs-reset').click()
  await expect(state).toHaveText('秒杀中')
  await expect(state, '重置后强态应恢复实底').toHaveAttribute('variant', 'solid')
  await expect(bar, '重置后按钮应恢复可用（disabled 移除）').not.toHaveAttribute('disabled', '')
})

test('stock-alert 阈值联动：售罄弱态回落浅底、回货强态恢复实底（variant 动态管理固化）', async ({ page }) => {
  await page.goto('/guide/stock-alert.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-input-number')

  const tag = page.locator('#sa-tag')
  await expect(tag, '现货强态初始实底').toHaveAttribute('variant', 'solid')

  await page.locator('.sa-quick-btn[data-stock="0"]').click()
  await expect(tag).toHaveText('已售罄')
  await expect(tag, '售罄弱态应移除 variant（I5 固化）').not.toHaveAttribute('variant', /.*/)

  await page.locator('.sa-quick-btn[data-stock="3"]').click()
  await expect(tag, '告急强态应恢复实底').toHaveAttribute('variant', 'solid')
  await expect(tag).toHaveText('仅剩 3 件')
})
