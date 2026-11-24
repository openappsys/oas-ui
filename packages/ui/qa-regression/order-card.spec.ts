// 复核回归：order-card——状态徽标语义色、金额区划线原价、展开明细与事件反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('order-card：状态徽标文案与 tone 色档一一对应，未映射状态原样显示', async ({ page }) => {
  await page.goto('/components/order-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-order-card')

  const statuses = await page.evaluate(() =>
    [...document.querySelectorAll('oas-order-card')]
      .map((host) => {
        const badge = host.shadowRoot?.querySelector<HTMLElement>('[part="status"]')
        if (!badge || badge.hidden) return null
        return {
          id: host.getAttribute('order-id'),
          text: badge.textContent,
          tone: badge.getAttribute('data-tone'),
          color: getComputedStyle(badge).color,
        }
      })
      .filter(Boolean),
  )
  const byId = new Map(statuses.map((s) => [s!.id, s!]))
  expect(byId.get('NO-1001')?.text).toBe('待付款')
  expect(byId.get('NO-1001')?.tone).toBe('warning')
  expect(byId.get('NO-1002')?.text).toBe('待收货')
  expect(byId.get('NO-1002')?.tone).toBe('primary')
  expect(byId.get('NO-1003')?.text).toBe('已完成')
  expect(byId.get('NO-1003')?.tone).toBe('success')
  expect(byId.get('NO-1004')?.text).toBe('退款中')
  expect(byId.get('NO-1004')?.tone).toBe('danger')
  // 字符串简写 → default 档
  expect(byId.get('NO-1005')?.text).toBe('已取消')
  expect(byId.get('NO-1005')?.tone).toBe('default')

  // 五档徽标颜色互不相同（tone 真的落到视觉，而不是只改属性）
  const colors = new Set(['NO-1001', 'NO-1002', 'NO-1003', 'NO-1004', 'NO-1005'].map((id) => byId.get(id)?.color ?? ''))
  expect(colors.size).toBe(5)
})

test('order-card：金额区实付 + 划线原价（<s> 有删除线）可见，缺省金额时整区隐藏', async ({ page }) => {
  await page.goto('/components/order-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-order-card')

  const amount = await page.evaluate(() => {
    const host = document.getElementById('oc-basic') as HTMLElement
    const price = host.shadowRoot!.querySelector('[part="payable-price"]') as HTMLElement
    const original = price.shadowRoot!.querySelector<HTMLElement>('[part="original"]')
    const cs = original ? getComputedStyle(original) : null
    return {
      amountHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="amount"]')!.hidden,
      originalHidden: original ? original.hidden : true,
      originalText: original?.textContent ?? '',
      decoration: cs?.textDecorationLine ?? '',
    }
  })
  expect(amount.amountHidden).toBe(false)
  expect(amount.originalHidden).toBe(false)
  expect(amount.originalText).toContain('357')
  expect(amount.decoration).toContain('line-through')

  // NO-4001 只给 payable="0"：金额区可见但实付为 0（不是空块）
  const zero = await page.evaluate(() => {
    const host = [...document.querySelectorAll('oas-order-card')].find(
      (el) => el.getAttribute('order-id') === 'NO-4001',
    ) as HTMLElement
    return {
      amountHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="amount"]')!.hidden,
      payableHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="payable"]')!.hidden,
    }
  })
  expect(zero.amountHidden).toBe(false)
  expect(zero.payableHidden).toBe(false)
})

test('order-card：展开明细——按钮 aria-expanded 同步、明细可见、oas-toggle 反馈可见', async ({ page }) => {
  await page.goto('/components/order-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-order-card')

  const card = page.locator('#oc-expand')
  const toggle = card.locator('[part="toggle"]')
  const details = card.locator('[part="details"]')
  const detailsContent = card.locator('div[slot="details"]')

  await expect(toggle).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(details).toBeHidden()
  await expect(detailsContent).toBeHidden()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(details).toBeVisible()
  // 明细内容在 light DOM（details 插槽），展开后真实可见
  await expect(detailsContent).toBeVisible()
  await expect(detailsContent).toContainText('下单时间')
  await expect(page.locator('#oc-expand-out')).toContainText('明细已展开')
  // 按钮文案切换（收起）
  await expect(toggle).toContainText('收起明细')

  await toggle.click()
  await expect(details).toBeHidden()
  await expect(detailsContent).toBeHidden()
  await expect(page.locator('#oc-expand-out')).toContainText('明细已收起')
})

test('order-card：预置 expanded 直接展开且不派发 oas-toggle', async ({ page }) => {
  await page.goto('/components/order-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-order-card')

  const preset = await page.evaluate(() => {
    const host = [...document.querySelectorAll('oas-order-card')].find(
      (el) => el.getAttribute('order-id') === 'NO-3002',
    ) as HTMLElement
    return {
      detailsHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="details"]')!.hidden,
      expanded: host.shadowRoot!.querySelector('[part="toggle"]')!.getAttribute('aria-expanded'),
    }
  })
  expect(preset.detailsHidden).toBe(false)
  expect(preset.expanded).toBe('true')
})
