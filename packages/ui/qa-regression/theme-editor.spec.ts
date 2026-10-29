// 复核回归：theme-editor——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('theme-editor 颜色函数值：rgb() 色板非黑 hex + 文本框编辑写回不破坏原值 + color-mix 色板禁用', async ({
  page,
}) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-fn')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#te-fn') as HTMLElement
    const rowOf = (name: string) =>
      [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')].find((x) => x.textContent!.includes(name))!
    const rgbRow = rowOf('--demo-color-rgb')
    const mixRow = rowOf('--demo-color-mix')
    const swatch = rgbRow.querySelector<HTMLInputElement>('input[type="color"]')!
    const text = rgbRow.querySelector<HTMLInputElement>('input[type="text"]')!
    const mixSwatch = mixRow.querySelector<HTMLInputElement>('input[type="color"]')!
    const beforeSwatch = swatch.value
    const beforeText = text.value
    text.value = 'rgb(1, 2, 3)'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    return {
      beforeSwatch,
      beforeText,
      written: el.style.getPropertyValue('--demo-color-rgb'),
      afterSwatch: swatch.value,
      mixDisabled: mixSwatch.disabled,
      mixText: mixRow.querySelector<HTMLInputElement>('input[type="text"]')!.value,
    }
  })
  expect(r.beforeSwatch, 'rgb() 值色板应解析为非黑 hex').not.toBe('#000000')
  expect(r.beforeText, '文本框应显示原始函数值').toContain('rgb(')
  expect(r.written, '文本框编辑应写回原函数值').toBe('rgb(1, 2, 3)')
  expect(r.afterSwatch, '写回后色板应同步为非黑 hex').toBe('#010203')
  expect(r.mixDisabled, '含 var() 的 color-mix 值色板应禁用').toBe(true)
  expect(r.mixText, 'color-mix 值文本框应保留原始字符串').toContain('color-mix(')
})

test('theme-editor 双套 demo：导出/原子导入按钮有可见 JSON 反馈且当前桶真实写入', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-default')

  await page.getByRole('button', { name: '导出双套 JSON', exact: true }).click()
  await expect(page.locator('#te-json')).toContainText('"light"')
  await expect(page.locator('#te-json')).toContainText('"dark"')

  await page.getByRole('button', { name: '导入双套示例', exact: true }).click()
  await expect(page.locator('#te-json')).toContainText('已原子导入双套')
  const imported = await page.evaluate(() => {
    const editor = document.querySelector('#te-default') as any
    return {
      inline: editor.style.getPropertyValue('--oas-color-primary'),
      light: editor.exportThemes().light['--oas-color-primary'],
      dark: editor.exportThemes().dark['--oas-color-primary'],
    }
  })
  expect(imported).toEqual({ inline: '#7c3aed', light: '#7c3aed', dark: '#c4b5fd' })
  expect(errors).toEqual([])
})

test('theme-editor 双套导出：未访问 dark 也读取真实 dark 默认值而非复用当前 light', async ({ page }) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-in-cp')
  await page.evaluate(() => document.querySelector('#te-cp')!.setAttribute('theme', 'light'))
  const values = await page.evaluate(() => {
    const editor = document.querySelector('#te-in-cp') as any
    const themes = editor.exportThemes()
    return {
      lightPrimary: themes.light['--oas-color-primary'],
      darkPrimary: themes.dark['--oas-color-primary'],
      lightSuccess: themes.light['--oas-color-success'],
      darkSuccess: themes.dark['--oas-color-success'],
      effective: document.querySelector('#te-cp')!.getAttribute('data-theme'),
    }
  })
  expect(values).toEqual({
    lightPrimary: '#0b6cff',
    darkPrimary: '#9ecdff',
    lightSuccess: '#16a34a',
    darkSuccess: '#4ade80',
    effective: 'light',
  })
})

test('theme-editor 双套编辑：键盘切桶不劫持预览、provider 应用对应桶、非法双套导入零部分写入', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  const unexpectedWarnings: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
    if (
      message.type() === 'warning' &&
      !message.text().includes('[oas-theme-editor] importThemes') &&
      !message.text().includes('scroll-linked positioning effect')
    ) {
      unexpectedWarnings.push(message.text())
    }
  })
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-in-cp')
  await page.evaluate(() => document.querySelector('#te-cp')!.setAttribute('theme', 'light'))

  const primaryText = page.locator('#te-in-cp .color-text').first()
  await primaryText.fill('#112233')
  const themeSelect = page.locator('#te-in-cp .editing-theme')
  await themeSelect.focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => (document.querySelector('#te-in-cp') as any).editingTheme === 'dark')
  await primaryText.fill('#334455')

  const lightPreview = await page.evaluate(() => {
    const cp = document.querySelector('#te-cp') as HTMLElement
    return {
      inline: cp.style.getPropertyValue('--oas-color-primary'),
      computed: getComputedStyle(cp).getPropertyValue('--oas-color-primary').trim(),
      effective: cp.dataset.theme,
      editing: (document.querySelector('#te-in-cp') as any).editingTheme,
    }
  })
  expect(lightPreview).toEqual({ inline: '#112233', computed: '#112233', effective: 'light', editing: 'dark' })

  await page.evaluate(() => document.querySelector('#te-cp')!.setAttribute('theme', 'dark'))
  await page.waitForFunction(
    () => (document.querySelector('#te-cp') as HTMLElement).style.getPropertyValue('--oas-color-primary') === '#334455',
  )
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.querySelector('#te-cp') as HTMLElement)
        .getPropertyValue('--oas-color-primary')
        .trim(),
    ),
  ).toBe('#334455')
  await page.locator('#te-cp').screenshot({ path: testInfo.outputPath('dual-theme-dark.png') })

  const atomic = await page.evaluate(() => {
    const cp = document.querySelector('#te-cp') as HTMLElement
    const editor = document.querySelector('#te-in-cp') as any
    const beforeThemes = JSON.stringify(editor.exportThemes())
    const beforeInline = cp.style.cssText
    editor.importThemes({
      light: { '--oas-color-primary': '#abcdef' },
      dark: { '--oas-space-2': { nested: '18px' } },
    })
    return {
      beforeThemes,
      afterThemes: JSON.stringify(editor.exportThemes()),
      beforeInline,
      afterInline: cp.style.cssText,
      editing: editor.editingTheme,
      effective: cp.dataset.theme,
    }
  })
  expect(atomic.afterThemes).toBe(atomic.beforeThemes)
  expect(atomic.afterInline).toBe(atomic.beforeInline)
  expect(atomic.editing).toBe('dark')
  expect(atomic.effective).toBe('dark')
  expect(errors).toEqual([])
  expect(unexpectedWarnings).toEqual([])
})
