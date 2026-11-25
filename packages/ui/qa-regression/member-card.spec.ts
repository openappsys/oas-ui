// 复核回归：member-card——等级徽章可见文本（不只靠颜色）、variant 档位与出口 token、操作区反馈、暗色。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('member-card：等级徽章可见文本 + aria-label 含等级（信息不只靠颜色通道）', async ({ page }) => {
  await page.goto('/components/member-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-member-card')
  const host = page.locator('oas-member-card').first()
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 宿主可访问名：会员卡：{grade}
  await expect(host).toHaveAttribute('aria-label', '会员卡：黄金会员')
  // 徽章可见文本即等级（sr-only 前缀 + 等级名都在文本里）
  const grade = host.locator('[part="grade"]')
  await expect(grade).toBeVisible()
  await expect(grade).toContainText('黄金会员')
  await expect(grade).toContainText('会员等级')
  // sr-only 前缀不可见但可读
  const labelVisible = await grade.evaluate((el) => {
    const sr = el.querySelector<HTMLElement>('[part="grade-label"]')!
    const cs = getComputedStyle(sr)
    return cs.position !== 'static' && (cs.width === '1px' || cs.clipPath !== 'none' || sr.offsetWidth === 0)
  })
  expect(labelVisible).toBe(true)
})

test('member-card：variant 两档 data-variant 反射 + 底色 token 化（gradient 与 solid 视觉可分）', async ({ page }) => {
  await page.goto('/components/member-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-member-card[variant="gradient"]')
  const solid = page.locator('oas-member-card').filter({ hasText: '黄金会员' }).first()
  const grad = page.locator('oas-member-card[variant="gradient"]').first()
  await solid.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await expect(solid).toHaveAttribute('data-variant', 'solid')
  await expect(grad).toHaveAttribute('data-variant', 'gradient')
  // 底色可分（gradient 是 linear-gradient，solid 是纯色）
  const solidBg = await solid.evaluate(
    (el) => getComputedStyle(el.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!).backgroundImage,
  )
  const gradBg = await grad.evaluate(
    (el) => getComputedStyle(el.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!).backgroundImage,
  )
  expect(gradBg).toContain('linear-gradient')
  expect(solidBg).toBe('none')
})

test('member-card：操作区插槽真点——宿主动作反馈可见（组件零事件协议）', async ({ page }) => {
  await page.goto('/components/member-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mc-actions')
  const host = page.locator('#mc-actions')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 操作区可见且按钮留在 light DOM（不搬运不包壳）
  await expect(host.locator('[part="actions"]')).toBeVisible()
  const btnInLight = await host.evaluate(
    (el) =>
      el.querySelector('[slot="actions"]')?.parentElement === el &&
      el.querySelectorAll('[slot="actions"]').length === 2,
  )
  expect(btnInLight).toBe(true)
  await host.locator('[data-demo-action]').first().click()
  await expect(page.locator('#mc-actions-out')).toContainText('宿主动作：续费')
})

test('member-card：暗色下卡面底色随主题翻转（token 驱动，on-primary 文字可读）', async ({ page }) => {
  await page.goto('/components/member-card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-member-card')
  const host = page.locator('oas-member-card').first()
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const readBg = (): Promise<string> =>
    host.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector<HTMLElement>('[part="card"]')!).backgroundColor)
  const lightBg = await readBg()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const darkBg = await readBg()
  // primary token 随暗色翻转为浅色变体（数值亮度上升）
  const lum = (bg: string): number => {
    const m = bg.match(/\d+/g) ?? ['0', '0', '0']
    return Number(m[0]) + Number(m[1]) + Number(m[2])
  }
  expect(darkBg).not.toBe(lightBg)
  expect(lum(darkBg)).toBeGreaterThan(lum(lightBg))
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
