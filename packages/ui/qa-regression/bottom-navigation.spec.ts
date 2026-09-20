// 复核回归：bottom-navigation——移动端底部导航首份回归固化。
// 覆盖：点击 tab → aria-selected 选中态可见（选中/未选中颜色区分）+ 受控 value 写回 + oas-change
// demo 可见反馈、外部设 value 受控切换、禁用项点击不选中、badge 角标渲染（items 通道）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('bottom-navigation 点击选中：aria-selected 同步、选中色可见、value 写回 + oas-change 反馈', async ({ page }) => {
  await page.goto('/components/bottom-navigation.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bn-ctrl')
  const tabState = () =>
    page.evaluate(() => {
      const host = document.querySelector('#bn-ctrl') as HTMLElement
      const tabs = [...host.shadowRoot!.querySelectorAll<HTMLElement>('.tab')]
      const selected = tabs.find((t) => t.getAttribute('aria-selected') === 'true')
      return {
        value: host.getAttribute('value'),
        selectedText: selected?.textContent?.trim(),
        selectedColor: selected ? getComputedStyle(selected).color : '',
        unselectedColor: getComputedStyle(tabs.find((t) => t !== selected)!).color,
      }
    })
  const before = await tabState()
  expect(before.value).toBe('home')
  expect(before.selectedText).toBe('首页')

  // 点击「收藏」tab：选中态迁移 + 事件反馈可见
  await page.evaluate(() => {
    const host = document.querySelector('#bn-ctrl') as HTMLElement
    const tabs = [...host.shadowRoot!.querySelectorAll<HTMLElement>('.tab')]
    tabs.find((t) => t.textContent?.includes('收藏'))!.click()
  })
  await page.waitForFunction(() => document.querySelector('#bn-ctrl')?.getAttribute('value') === 'favorite')
  const after = await tabState()
  expect(after.selectedText, '点击后选中项应迁移到「收藏」').toBe('收藏')
  expect(after.selectedColor, '选中项主色（与未选中项颜色可区分的可见态）').not.toBe(after.unselectedColor)
  const feedback = await page.evaluate(() => (document.querySelector('#bn-out') as HTMLElement).textContent)
  expect(feedback, 'demo 事件反馈应显示 oas-change 明细').toContain('"favorite"')

  // 受控：外部设 value → 选中态跟随迁移
  await page.evaluate(() => (document.querySelector('#bn-ctrl') as HTMLElement).setAttribute('value', 'mine'))
  const controlled = await tabState()
  expect(controlled.selectedText, '外部设 value="mine" → 选中「我的」').toBe('我的')
})

test('bottom-navigation 禁用项：aria-disabled 同步，点击不选中不派发', async ({ page }) => {
  await page.goto('/components/bottom-navigation.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bn-decl')
  const state = await page.evaluate(() => {
    const host = document.querySelector('#bn-decl') as HTMLElement
    const tabs = [...host.shadowRoot!.querySelectorAll<HTMLElement>('.tab')]
    const disabled = tabs.find((t) => t.getAttribute('aria-disabled') === 'true')
    disabled!.click()
    return {
      disabledText: disabled?.textContent?.trim(),
      value: host.getAttribute('value'),
      selectedText: tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.textContent?.trim(),
    }
  })
  expect(state.disabledText, '禁用项应存在且为「发现」').toBe('发现')
  expect(state.value, '点击禁用项 value 不变').toBe('home')
  expect(state.selectedText, '点击禁用项选中态不迁移').toBe('首页')
})

test('bottom-navigation badge：items 通道角标渲染且文本正确', async ({ page }) => {
  await page.goto('/components/bottom-navigation.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bn-badge')
  const badges = await page.evaluate(() => {
    const host = document.querySelector('#bn-badge') as HTMLElement
    return [...host.shadowRoot!.querySelectorAll<HTMLElement>('[part="badge"]')].map((b) => ({
      text: b.textContent?.trim(),
      visible: !b.hasAttribute('hidden'),
    }))
  })
  expect(badges, '两个带 badge 的项应各渲染一个角标').toHaveLength(2)
  expect(
    badges.map((b) => b.text),
    '角标文本应与 items JSON 一致',
  ).toEqual(['5', '新'])
  expect(
    badges.every((b) => b.visible),
    '角标应可见',
  ).toBe(true)
})
