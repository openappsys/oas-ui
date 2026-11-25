// 复核回归：search-bar——demo 页真实交互搜索反馈、取消清空、面板聚焦显隐与插槽分组、暗色。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('search-bar：输入 + Enter 触发搜索——demo 可见反馈（非 console）', async ({ page }) => {
  await page.goto('/components/search-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-basic')
  const host = page.locator('#sb-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 输入实时通道：value attribute 同帧回写
  await host.evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!
    input.focus()
    input.value = '卫衣'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(host).toHaveJSProperty('value', '卫衣')
  // Enter 触发 oas-search → demo 输出可见反馈
  await host.evaluate((el) => {
    el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  await expect(page.locator('#sb-basic-out')).toContainText('oas-search：卫衣')
})

test('search-bar：取消钮清空 + oas-cancel 反馈；hide-cancel 与 disabled 实例形态正确', async ({ page }) => {
  await page.goto('/components/search-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-cancel')
  const host = page.locator('#sb-cancel')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await host.locator('[part="cancel"]').click()
  // 组件清空 value attribute（用户可见：输入框空）
  await expect(host).toHaveJSProperty('value', '')
  await expect(page.locator('#sb-cancel-out')).toContainText('oas-cancel')
  await expect(page.locator('#sb-cancel-out')).toContainText('蓝牙耳机')

  // hide-cancel 实例：取消钮隐藏
  const noCancel = page.locator('oas-search-bar[hide-cancel]')
  await up(page, 'oas-search-bar[hide-cancel]')
  await expect(noCancel.locator('[part="cancel"]')).toBeHidden()
  // disabled 实例：输入框与搜索钮禁用
  const disabled = page.locator('oas-search-bar[disabled]')
  await expect(disabled.locator('[part="input"]')).toBeDisabled()
  await expect(disabled.locator('[part="go"]')).toBeDisabled()
})

test('search-bar：聚焦展开历史词面板 + 点历史词回填 + Esc 收起（真交互可见）', async ({ page }) => {
  await page.goto('/components/search-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-panel')
  const host = page.locator('#sb-panel')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // 聚焦展开面板（history 插槽有内容）
  await host.evaluate((el) => el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!.focus())
  await expect(host.locator('[part="panel"]')).toBeVisible()
  await expect(host.locator('[data-slot-group="history"]')).toBeVisible()
  // 空值时联想组隐藏
  await expect(host.locator('[data-slot-group="suggestions"]')).toBeHidden()
  // 点历史词回填（面板 pointerdown 保焦点设计——click 后值落盘）
  await host.locator('[slot="history"]').first().click()
  const filled = await host.evaluate((el) => el.getAttribute('value'))
  expect(filled).not.toBe('')
  // Esc 收起
  await host.evaluate((el) => {
    el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })
  await expect(host.locator('[part="panel"]')).toBeHidden()
})

test('search-bar：搜索钮为可见图标按钮（非空白胶囊）；联想词点击后 demo 反馈更新（I4）', async ({ page }) => {
  await page.goto('/components/search-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-basic')
  const host = page.locator('#sb-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  // C1：搜索钮内有可见 svg（尺寸可测且非空白），非 16×32 空白蓝条
  await expect(host.locator('[part="go"] svg')).toHaveCount(1)
  const goBox = await host.locator('[part="go"] svg').boundingBox()
  expect(goBox!.width).toBeGreaterThan(10)
  expect(goBox!.height).toBeGreaterThan(10)

  // I4：联想位 demo——输入触发联想渲染后，点联想词应回填并给出可见反馈（此前宿主元素派 KeyboardEvent 穿不进 shadow，静默空操作）
  const suggest = page.locator('#sb-suggest')
  await suggest.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await suggest.evaluate((el) => {
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!
    input.focus()
    input.value = '鞋'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const chip = suggest.locator('[slot="suggestions"]').first()
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page.locator('#sb-suggest-out')).toContainText('oas-search')
})

test('search-bar：暗色下输入行 / 搜索钮配色随主题翻转（token 非硬编码）', async ({ page }) => {
  await page.goto('/components/search-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sb-basic')
  const host = page.locator('#sb-basic')
  await host.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const readFieldBg = (): Promise<string> =>
    host.evaluate(
      (el) => getComputedStyle(el.shadowRoot!.querySelector<HTMLElement>('[part="field"]')!).backgroundColor,
    )
  const lightBg = await readFieldBg()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const darkBg = await readFieldBg()
  // 颜色随主题变化（走 token），且暗色下仍可读（不是全黑）
  expect(darkBg).not.toBe(lightBg)
  expect(darkBg).not.toBe('rgba(0, 0, 0, 0)')
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})
