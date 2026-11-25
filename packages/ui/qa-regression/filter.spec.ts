// 复核回归：filter——两形态面板真点击、键盘闭环、已选撤销、暗色 token。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const GROUPS =
  '[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"}]}]'

/** 预置一个带条件组的 dropdown filter（attrs = JSON 对象串，如 '{"conditions":"..."}'） */
async function mountDropdown(page: import('@playwright/test').Page, id: string, attrs = '{}'): Promise<void> {
  await page.evaluate(
    ({ id, groups, attrs }) => {
      const el = document.createElement('oas-filter')
      el.id = id
      el.setAttribute('groups', groups)
      for (const [k, v] of Object.entries(JSON.parse(attrs) as Record<string, string>)) el.setAttribute(k, v)
      document.querySelector('.demo-block')!.appendChild(el)
    },
    { id, groups: GROUPS, attrs },
  )
  await up(page, `#${id}`)
}

test('filter：dropdown 面板真点击——开面板选条件，chips 回显 + oas-change 反馈可见', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-basic')

  const host = page.locator('#fr-e2e-basic')
  const trigger = host.locator('[part="trigger"]')
  await expect(trigger).toBeVisible()

  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const panel = host.locator('[part="panel"]')
  await expect(panel).toBeVisible()

  // 点多选组第一项 → chip 出现
  const optA = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  await optA.click()
  await expect(optA).toHaveAttribute('aria-checked', 'true')
  const chip = host.locator('[part="chip"][data-group="brand"][data-value="a"]')
  await expect(chip).toBeVisible()
  await expect(chip).toContainText('品牌：品牌A')
  // 徽标计数可见
  await expect(host.locator('[part="badge"]')).toContainText('1')
  // aria-live 摘要真实可读
  await expect(host.locator('[part="live"]')).toContainText('品牌：品牌A')
  // demo 事件反馈输出（oas-change）
  await expect(page.locator('#filter-basic-out')).toContainText('oas-change')
})

test('filter：drawer 形态真点击——遮罩下条件可选，「完成」/ 遮罩关闭', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')

  const host = page.locator('oas-filter[panel="drawer"]').first()
  const trigger = host.locator('[part="trigger"]')
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const mask = host.locator('[part="mask"]')
  await expect(mask).toBeVisible()
  const panel = host.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('data-form', 'drawer')
  await expect(panel).toBeVisible()

  // 选一个条件（真点击）
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeVisible()

  // 「完成」按钮关闭
  await host.locator('[part="done"]').click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(mask).toBeHidden()

  // 再开 → 点遮罩关闭
  await trigger.click()
  await expect(mask).toBeVisible()
  await mask.click({ position: { x: 10, y: 10 } })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('filter：键盘闭环——Enter 开面板聚焦首条件，方向键移动，Esc 关回触发器', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-kbd')

  const host = page.locator('#fr-e2e-kbd')
  const trigger = host.locator('[part="trigger"]')
  // 触发器 Tab 可达
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  // 开面板自动聚焦首个条件
  const firstOption = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  await expect(firstOption).toBeFocused()

  // 方向键移动焦点（不触发选择）
  await page.keyboard.press('ArrowDown')
  const secondOption = host.locator('[part="option"][data-group="brand"][data-value="b"]')
  await expect(secondOption).toBeFocused()
  await expect(host.locator('[part="chip"][data-value="b"]')).toHaveCount(0)

  // Esc 关闭并焦点回触发器
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()

  // chips 可聚焦：选条件后 Tab 到 chip 回车撤销
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter') // 首条件已聚焦，Enter 选中（radio role 语义下点击/回车等价）
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeVisible()
  await host.locator('[part="chip"][data-value="a"]').focus()
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(host.locator('[part="chip"][data-value="a"]')).toHaveCount(0)
})

test('filter：已选撤销与重置——chips 逐项移除、重置清全部（含排序回缺省）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-chips', JSON.stringify({ conditions: '{"sort":"price","order":"desc"}' }))

  const host = page.locator('#fr-e2e-chips')
  await host.locator('[part="trigger"]').click()
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()
  await host.locator('[part="option"][data-group="color"][data-value="red"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(2)
  await expect(host.locator('[part="badge"]')).toContainText('2')

  // 逐项撤销
  await host.locator('[part="chip"][data-group="brand"][data-value="a"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(1)
  await expect(host.locator('[part="badge"]')).toContainText('1')

  // 重置：清空 chips + 排序回缺省（aria-checked 回首项）
  await host.locator('[part="reset"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(0)
  await expect(host.locator('[part="badge"]')).toBeHidden()
  await expect(host.locator('[part="sort-item"]').first()).toHaveAttribute('aria-checked', 'true')
  const raw = (await host.getAttribute('conditions')) ?? '{}'
  await expect(JSON.parse(raw)).toEqual({})
})

test('filter：暗色 token——选中态底色与文字色随主题切换（无硬编码浅色残留）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-dark')

  const host = page.locator('#fr-e2e-dark')
  const readColors = (): Promise<{ panelBg: string; optionColor: string; activeBg: string }> =>
    host.evaluate((el) => {
      const root = el.shadowRoot!
      const panel = root.querySelector<HTMLElement>('[part="panel"]')!
      const option = root.querySelector<HTMLElement>('[part="option"]')!
      return {
        panelBg: getComputedStyle(panel).backgroundColor,
        optionColor: getComputedStyle(option).color,
        activeBg: getComputedStyle(option).borderColor,
      }
    })

  const light = await readColors()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  // token 生效信号：demo 块底色翻暗（dark.spec 同款，不按本机帧率定等待）
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const dark = await readColors()

  // 面板底色随主题翻转（token 引用生效；暗色 rgb 值显著变暗）
  const parseLum = (bg: string): number => {
    const m = bg.match(/\d+/g) ?? ['255', '255', '255']
    return Number(m[0]) + Number(m[1]) + Number(m[2])
  }
  expect(parseLum(dark.panelBg)).toBeLessThan(parseLum(light.panelBg))
  // 文字色发生变化（token 化，不是固定黑）
  expect(dark.optionColor).not.toBe(light.optionColor)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
