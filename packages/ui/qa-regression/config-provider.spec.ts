// 复核回归：config-provider——全局配置注入入口首份回归固化。
// 覆盖：size 注入就近生效且显式属性胜出、provider 属性变化经 notifyConfigProviders 真实下发、
// disabled 注入三通道（普通继承 / disabled-skip 单个逃逸 / disabledExempt 整类豁免）、
// theme 写 data-theme 后子树 token 真实翻转、direction 写宿主 dir。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('config-provider size 注入：包裹内未显式设 size 的按钮跟随注入档位，显式 size 者不受影响', async ({ page }) => {
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-size')
  const innerBtn = () =>
    page.evaluate(() => {
      const btn = document.querySelector('#cp-size oas-button:not([size])') as HTMLElement
      return getComputedStyle(btn.shadowRoot!.querySelector('button')!).height
    })
  // 初始注入 medium → 控高 32px（--oas-control-height-md）
  expect(await innerBtn(), '初始注入 medium → 内部按钮控高 32px').toBe('32px')

  // provider 改 size="large" → 注入值下发，未显式设置的按钮跟随变 40px
  await page.evaluate(() => (document.querySelector('#cp-size') as HTMLElement).setAttribute('size', 'large'))
  await page.waitForFunction(() => {
    const btn = document.querySelector('#cp-size oas-button:not([size])') as HTMLElement
    return getComputedStyle(btn.shadowRoot!.querySelector('button')!).height === '40px'
  })
  const explicit = await page.evaluate(() => {
    const btn = document.querySelector('#cp-size oas-button[size="small"]') as HTMLElement
    return getComputedStyle(btn.shadowRoot!.querySelector('button')!).height
  })
  expect(explicit, '显式 size="small" 的按钮不受注入影响（24px）').toBe('24px')
})

test('config-provider disabled 注入：普通控件继承禁用、disabled-skip 单个逃逸、disabledExempt 整类豁免', async ({
  page,
}) => {
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-disabled')
  await up(page, '#cp-skip')
  await up(page, '#cp-exempt')

  const innerDisabled = (host: string, inner: string) =>
    page.evaluate(
      ({ host, inner }) => {
        const el = document.querySelector(`${host} ${inner}`) as HTMLElement
        return (el.shadowRoot!.querySelector('button, input') as HTMLButtonElement | HTMLInputElement).disabled
      },
      { host, inner },
    )

  // 普通通道：provider 设 disabled → 无显式 disabled 的控件继承禁用
  await page.evaluate(() => (document.querySelector('#cp-disabled') as HTMLElement).setAttribute('disabled', ''))
  expect(await innerDisabled('#cp-disabled', 'oas-button:not([disabled-skip])'), '继承禁用').toBe(true)

  // disabled-skip：provider 禁用时单个控件保持可用
  await page.evaluate(() => (document.querySelector('#cp-skip') as HTMLElement).setAttribute('disabled', ''))
  expect(await innerDisabled('#cp-skip', 'oas-button[disabled-skip]'), 'disabled-skip 逃逸保持可用').toBe(false)
  expect(await innerDisabled('#cp-skip', 'oas-button:not([disabled-skip])'), '同组无豁免控件仍禁用').toBe(true)

  // disabledExempt：config JSON 整类豁免 oas-button，input 仍禁用
  await page.evaluate(() => (document.querySelector('#cp-exempt') as HTMLElement).setAttribute('disabled', ''))
  expect(await innerDisabled('#cp-exempt', 'oas-button'), 'disabledExempt 整类豁免按钮').toBe(false)
  expect(await innerDisabled('#cp-exempt', 'oas-input'), '非豁免的 input 仍继承禁用').toBe(true)
})

test('config-provider theme 与 direction：theme 翻转子树 token（背景色真实变化），direction 写宿主 dir', async ({
  page,
}) => {
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-theme')
  const bg = () =>
    page.evaluate(() => getComputedStyle(document.querySelector('#cp-theme') as HTMLElement).backgroundColor)
  const before = await bg()
  await page.evaluate(() => (document.querySelector('#cp-theme') as HTMLElement).setAttribute('theme', 'dark'))
  await page.waitForFunction(() => (document.querySelector('#cp-theme') as HTMLElement).dataset.theme === 'dark')
  const after = await bg()
  expect(after, 'theme="dark" 后子树 --oas-color-bg 翻转（背景色变化可见）').not.toBe(before)

  await up(page, '#cp-direction')
  await page.evaluate(() => (document.querySelector('#cp-direction') as HTMLElement).setAttribute('direction', 'rtl'))
  const dir = await page.evaluate(() => document.querySelector('#cp-direction')!.getAttribute('dir'))
  expect(dir, 'direction="rtl" → 宿主 dir 属性（CSS 方向沿子树继承）').toBe('rtl')
})
