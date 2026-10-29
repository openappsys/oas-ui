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

test('config-provider 嵌套 dark → 局部 light/system=light 的真实 computed token 回到浅色', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-theme')
  await page.evaluate(() => {
    const outer = document.createElement('div')
    outer.id = 'theme-dark-outer'
    outer.dataset.theme = 'dark'
    const explicit = document.createElement('oas-config-provider')
    explicit.id = 'theme-light-inner'
    explicit.setAttribute('theme', 'light')
    const system = document.createElement('oas-config-provider')
    system.id = 'theme-system-light-inner'
    system.setAttribute('theme', 'system')
    outer.append(explicit, system)
    document.body.appendChild(outer)
  })
  await up(page, '#theme-light-inner')
  await up(page, '#theme-system-light-inner')

  const tokens = await page.evaluate(() => {
    const read = (selector: string) => {
      const el = document.querySelector(selector)!
      const style = getComputedStyle(el)
      return {
        requested: el.getAttribute('theme'),
        effective: el.getAttribute('data-theme'),
        bg: style.getPropertyValue('--oas-color-bg').trim(),
        text: style.getPropertyValue('--oas-color-text-primary').trim(),
        scheme: style.colorScheme,
      }
    }
    return {
      outer: read('#theme-dark-outer'),
      explicit: read('#theme-light-inner'),
      system: read('#theme-system-light-inner'),
    }
  })
  expect(tokens.outer.bg).not.toBe('#ffffff')
  for (const value of [tokens.explicit, tokens.system]) {
    expect(value.effective).toBe('light')
    expect(['#fff', '#ffffff']).toContain(value.bg)
    expect(value.text).toBe('#18181b')
    expect(value.scheme).toBe('light')
  }
  expect(errors).toEqual([])
})

test('config-provider system/storage：emulateMedia 实时切换、显式存储优先、重选 system 与 reload 恢复', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const warnings: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
    if (message.type() === 'warning' && !message.text().includes('scroll-linked positioning effect')) {
      warnings.push(message.text())
    }
  })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const cp = document.createElement('oas-config-provider')
      cp.id = 'cp-system-storage'
      cp.setAttribute('theme', 'system')
      cp.setAttribute('theme-storage-key', 'qa-system-theme')
      cp.style.cssText =
        'display:block;position:fixed;inset:0;z-index:10000;padding:24px;background:var(--oas-color-bg);color:var(--oas-color-text-primary)'
      cp.textContent = 'System theme storage fixture'
      document.body.appendChild(cp)
    })
  })
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-system-storage')
  const effective = () => page.locator('#cp-system-storage').getAttribute('data-theme')
  expect(await effective()).toBe('light')
  expect(await page.locator('#cp-system-storage').getAttribute('theme')).toBe('system')
  await expect(page.locator('#cp-system-storage')).toHaveText('System theme storage fixture')
  await page.locator('#cp-system-storage').screenshot({ path: testInfo.outputPath('system-light.png') })

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.querySelector('#cp-system-storage')?.getAttribute('data-theme') === 'dark')
  expect(await effective()).toBe('dark')
  await page.locator('#cp-system-storage').screenshot({ path: testInfo.outputPath('system-dark.png') })

  await page.evaluate(() => document.querySelector('#cp-system-storage')!.setAttribute('theme', 'light'))
  expect(await effective()).toBe('light')
  expect(await page.evaluate(() => localStorage.getItem('qa-system-theme'))).toBe(JSON.stringify({ theme: 'light' }))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await up(page, '#cp-system-storage')
  expect(await effective(), 'reload 后显式 light 存储覆盖 system 默认值').toBe('light')

  await page.evaluate(() => document.querySelector('#cp-system-storage')!.setAttribute('theme', 'system'))
  expect(await page.evaluate(() => localStorage.getItem('qa-system-theme'))).toBe(JSON.stringify({ theme: 'system' }))
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForFunction(() => document.querySelector('#cp-system-storage')?.getAttribute('data-theme') === 'dark')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await up(page, '#cp-system-storage')
  expect(await effective(), '重选 system 后 reload 继续跟随系统而非旧显式值').toBe('dark')
  expect(errors).toEqual([])
  expect(warnings).toEqual([])
})

test('config-provider 主题 demo：System 点击与 Light 键盘操作有真实可见 token 反馈', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/components/config-provider.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-theme')

  // 先制造真实 light 初态，再仅切系统偏好（此时显式 light 不跟随），最后点击 System → dark。
  const light = page.getByRole('button', { name: '浅色', exact: true })
  await light.click()
  await page.waitForFunction(() => document.querySelector('#cp-theme')?.getAttribute('data-theme') === 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await page.locator('#cp-theme').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  )

  await page.getByRole('button', { name: '跟随系统', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('#cp-theme')?.getAttribute('data-theme') === 'dark')
  expect(await page.locator('#cp-theme').getAttribute('theme')).toBe('system')
  expect(await page.evaluate(() => localStorage.getItem('oas-docs-config-theme'))).toBe(
    JSON.stringify({ theme: 'system' }),
  )
  expect(await page.locator('#cp-theme').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(24, 24, 27)')
  await page.locator('#cp-theme').screenshot({ path: testInfo.outputPath('demo-system-dark.png') })

  await light.focus()
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => document.querySelector('#cp-theme')?.getAttribute('data-theme') === 'light')
  expect(await page.locator('#cp-theme').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  )
  expect(errors).toEqual([])
})
