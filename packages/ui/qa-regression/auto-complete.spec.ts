// 复核回归：auto-complete——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

test('auto-complete 浮层定位：首开左缘对齐输入框且与再开一致', async ({ page }) => {
  // 曾现 bug：与 select 同根因——positionDropdown 先用面板固有宽度（未撑开）算 left，
  // 之后才把 style.width 设成输入框宽度 → 首开左缘偏右（实测 +70px），再开才对齐。
  // 不变量：面板左缘 == 输入框左缘，且首开/再开完全一致。
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-auto-complete')
  const g = await panelGeometryAcrossOpens(page, 'oas-auto-complete', async (host) => {
    await host.locator('input[part="input"]').click()
    await page.keyboard.press('ArrowDown')
  })
  expect(Math.abs(g.first.left - g.first.anchorLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})

test('auto-complete variant 三形态镜像 + focus/blur 事件可见反馈（PRD P1-18）', async ({ page }) => {
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-auto-complete')
  // variant：demo 三实例 data-variant 镜像正确
  for (const v of ['outlined', 'filled', 'borderless']) {
    const el = page.locator(`oas-auto-complete[variant="${v}"]`).first()
    await expect(el).toHaveAttribute('data-variant', v)
  }
  // focus/blur：聚焦/失焦后内联反馈更新（用户可见，不只 console）
  const ac = page.locator('#ac-focus-blur')
  await ac.locator('input[part="input"]').click()
  await expect(page.locator('#ac-focus-output')).toContainText('oas-focus')
  await page.locator('h1').first().click()
  await expect(page.locator('#ac-focus-output')).toContainText('oas-blur')
})

// ===== 能力缺口 P2：placement 12 向 + autofocus 转发 =====

test('auto-complete placement（P2）：Vue 下属性存活、展开后 data-placement 反映引擎落位（top-start）', async ({
  page,
}) => {
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-auto-complete[placement]')
  const ac = page.locator('oas-auto-complete[placement]')
  // 居中滚动：上下空间充足，top-start 不被翻转
  await ac.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await ac.locator('input[part="input"]').click()
  await ac.locator('input[part="input"]').fill('a')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-auto-complete[placement]')!
    const drop = el.shadowRoot!.querySelector<HTMLElement>('.dropdown')!
    return {
      attrSurvived: el.getAttribute('placement'),
      open: drop.classList.contains('open'),
      dp: drop.getAttribute('data-placement'),
    }
  })
  expect(r.attrSurvived, 'placement 被 Vue 剥离').toBe('top-start')
  expect(r.open, '输入后面板应展开').toBe(true)
  expect(r.dp, 'data-placement 应反映引擎落位 top-start').toBe('top-start')
})

test('auto-complete autofocus（P2）：demo 按钮重挂载后光标落入内部输入框', async ({ page }) => {
  await page.goto('/components/auto-complete.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ac-focus-btn')
  await page.locator('#ac-focus-btn').scrollIntoViewIfNeeded()
  await page.locator('#ac-focus-btn').click()
  await page.waitForFunction(
    () => {
      const ac = document.querySelector('#ac-focus-zone oas-auto-complete')
      const input = ac?.shadowRoot?.querySelector('input')
      return input != null && ac!.shadowRoot!.activeElement === input
    },
    undefined,
    { timeout: 5000 },
  )
  const focused = await page.evaluate(() => {
    const ac = document.querySelector('#ac-focus-zone oas-auto-complete')!
    return ac.hasAttribute('autofocus') && ac.shadowRoot!.activeElement === ac.shadowRoot!.querySelector('input')
  })
  expect(focused, 'autofocus 未转发到内部输入框（挂载后未聚焦）').toBe(true)
})
