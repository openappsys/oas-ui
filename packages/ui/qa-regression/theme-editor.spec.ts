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

test('theme-editor 非预览导出与切到该主题后导出等价：primary 改动驱动 hover/active 派生值', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-in-cp')
  const values = await page.evaluate(() => {
    const cp = document.querySelector('#te-cp') as HTMLElement
    const editor = document.querySelector('#te-in-cp') as any
    cp.setAttribute('theme', 'light')
    editor.editingTheme = 'dark'
    editor.importJson({ '--oas-color-primary': '#334455' })
    const nonPreview = editor.exportThemes().dark
    cp.setAttribute('theme', 'dark')
    const preview = editor.exportThemes().dark
    return {
      nonPreviewPrimary: nonPreview['--oas-color-primary'],
      previewPrimary: preview['--oas-color-primary'],
      nonPreviewHover: nonPreview['--oas-color-primary-hover'],
      previewHover: preview['--oas-color-primary-hover'],
      nonPreviewActive: nonPreview['--oas-color-primary-active'],
      previewActive: preview['--oas-color-primary-active'],
    }
  })
  expect(values.nonPreviewPrimary).toBe('#334455')
  expect(values.previewPrimary).toBe('#334455')
  expect(values.nonPreviewHover).toBe(values.previewHover)
  expect(values.nonPreviewActive).toBe(values.previewActive)
  await page.locator('#te-cp').screenshot({ path: testInfo.outputPath('nonpreview-preview-equivalence.png') })
  expect(errors).toEqual([])
})

test('theme-editor 非预览派生缓存：目标桶写入与 reset 后均按新 primary/default 重算', async ({ page }) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-in-cp')
  const values = await page.evaluate(() => {
    const cp = document.querySelector('#te-cp') as HTMLElement
    const editor = document.querySelector('#te-in-cp') as any
    cp.setAttribute('theme', 'light')
    editor.editingTheme = 'dark'
    editor.importJson({ '--oas-color-primary': '#334455' })
    editor.exportThemes()
    editor.importJson({ '--oas-color-primary': '#445566' })
    const hoverInput = () =>
      [...editor.shadowRoot.querySelectorAll('[part="row"]')]
        .find((row: HTMLElement) => row.textContent.includes('--oas-color-primary-hover'))
        .querySelector('input.color-text').value
    const afterWriteUi = hoverInput()
    const afterWriteExport = editor.exportThemes().dark
    editor.reset('dark')
    const afterResetUi = hoverInput()
    const afterResetExport = editor.exportThemes().dark
    return {
      afterWriteUi,
      afterWriteHover: afterWriteExport['--oas-color-primary-hover'],
      afterResetUi,
      afterResetHover: afterResetExport['--oas-color-primary-hover'],
      afterResetPrimary: afterResetExport['--oas-color-primary'],
    }
  })
  expect(values.afterWriteUi).toBe(values.afterWriteHover)
  expect(values.afterResetUi).toBe(values.afterResetHover)
  expect(values.afterResetPrimary).toBe('#9ecdff')
})

test('theme-editor 非预览 probe 保留嵌套 provider/root 上下文，原属性/style 不变且同步清理', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent = `
      #ctx-outer[data-skin="brand"] > #ctx-root.context-root[data-skin="compact"] {
        --oas-color-primary: #010203;
      }
    `
    document.head.appendChild(style)
    const outer = document.createElement('oas-config-provider')
    outer.id = 'ctx-outer'
    outer.dataset.skin = 'brand'
    outer.setAttribute('theme', 'dark')
    const root = document.createElement('oas-config-provider')
    root.id = 'ctx-root'
    root.className = 'context-root'
    root.dataset.skin = 'compact'
    root.setAttribute('theme', 'light')
    root.style.setProperty('--oas-space-2', '11px')
    root.appendChild(document.createElement('oas-theme-editor'))
    outer.appendChild(root)
    document.body.appendChild(outer)
  })
  await up(page, '#ctx-root oas-theme-editor')
  const values = await page.evaluate(() => {
    const outer = document.querySelector('#ctx-outer') as HTMLElement
    const root = document.querySelector('#ctx-root') as HTMLElement
    const editor = root.querySelector('oas-theme-editor') as any
    const beforeAttributes = root.getAttributeNames().map((name) => [name, root.getAttribute(name)])
    const beforeStyle = root.style.cssText
    const beforeChildCount = outer.children.length
    const nonPreview = editor.exportThemes().dark
    const afterAttributes = root.getAttributeNames().map((name) => [name, root.getAttribute(name)])
    const result = {
      nonPreviewPrimary: nonPreview['--oas-color-primary'],
      nonPreviewSpace: nonPreview['--oas-space-2'],
      beforeAttributes,
      afterAttributes,
      beforeStyle,
      afterStyle: root.style.cssText,
      beforeChildCount,
      afterChildCount: outer.children.length,
      rootIdCount: document.querySelectorAll('#ctx-root').length,
    }
    root.setAttribute('theme', 'dark')
    const preview = editor.exportThemes().dark
    return { ...result, previewPrimary: preview['--oas-color-primary'], previewSpace: preview['--oas-space-2'] }
  })
  expect(values.nonPreviewPrimary).toBe('#010203')
  expect(values.previewPrimary).toBe('#010203')
  expect(values.nonPreviewSpace).toBe('11px')
  expect(values.previewSpace).toBe('11px')
  expect(values.afterAttributes).toEqual(values.beforeAttributes)
  expect(values.afterStyle).toBe(values.beforeStyle)
  expect(values.afterChildCount).toBe(values.beforeChildCount)
  expect(values.rootIdCount).toBe(1)
  await page.locator('#ctx-root').screenshot({ path: testInfo.outputPath('probe-root-context-dark.png') })
  expect(errors).toEqual([])
})

test('theme-editor 非法草稿：真实键盘切桶让 select 持焦也不重写颜色/数字中间输入', async ({ page }) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-default')
  const select = page.locator('#te-default .editing-theme')
  const colorText = page.locator('#te-default .color-text').first()
  await colorText.fill('not-a-color')
  await select.focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(() => (document.querySelector('#te-default') as any).editingTheme === 'dark')
  await expect(colorText).toHaveValue('not-a-color')
  await expect(colorText).toHaveClass(/is-invalid/)

  const numberInput = page.locator('#te-default input[type="number"]').first()
  await numberInput.fill('')
  await select.focus()
  await page.keyboard.press('ArrowUp')
  await page.waitForFunction(() => (document.querySelector('#te-default') as any).editingTheme === 'light')
  await expect(numberInput).toHaveValue('')
  await expect(numberInput).toHaveClass(/is-invalid/)
})

test('theme-editor 文档站 html.dark（无 data-theme 祖先）：双套导出不相等 + 编辑 dark 桶落预览', async ({
  page,
}, testInfo) => {
  // 回归：文档站暗色只切根 class（html.dark），没有 [data-theme] 祖先。previewTheme 只认
  // closest([data-theme]) 时会把暗色页当 light——双套导出两桶相同、编辑 dark 桶不落预览。
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-default')
  await page.evaluate(() => {
    document.documentElement.classList.add('dark')
    document.documentElement.removeAttribute('data-theme')
  })
  await page.waitForFunction(
    () => getComputedStyle(document.documentElement).getPropertyValue('--oas-color-bg').trim() === '#18181b',
    undefined,
    { timeout: 5000 },
  )

  const themes = await page.evaluate(() => {
    const editor = document.querySelector('#te-default') as any
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    const rgb = (value: string) => {
      probe.style.color = value
      return getComputedStyle(probe).color
    }
    const out = editor.exportThemes()
    const result = {
      lightPrimary: rgb(out.light['--oas-color-primary']),
      darkPrimary: rgb(out.dark['--oas-color-primary']),
      lightBg: rgb(out.light['--oas-color-bg']),
      darkBg: rgb(out.dark['--oas-color-bg']),
      sameRefresh: JSON.stringify(out.light) === JSON.stringify(out.dark),
    }
    probe.remove()
    return result
  })
  expect(themes.lightPrimary, 'light 桶应导出浅色默认值（不得复用暗色页面当前值）').toBe('rgb(11, 108, 255)')
  expect(themes.darkPrimary).toBe('rgb(158, 205, 255)')
  expect(themes.lightBg).toBe('rgb(255, 255, 255)')
  expect(themes.darkBg).toBe('rgb(24, 24, 27)')
  expect(themes.sameRefresh, 'html.dark 下双套导出不得退化为同一套').toBe(false)

  const preview = await page.evaluate(() => {
    const editor = document.querySelector('#te-default') as any
    editor.editingTheme = 'dark'
    editor.importJson({ '--oas-color-primary': '#334455' })
    const host = document.querySelector('#te-default') as HTMLElement
    const cs = getComputedStyle(host)
    return {
      inline: host.style.getPropertyValue('--oas-color-primary'),
      computed: cs.getPropertyValue('--oas-color-primary').trim(),
      editing: editor.editingTheme,
      bgToken: cs.getPropertyValue('--oas-color-bg').trim(),
      textColor: cs.color,
    }
  })
  expect(preview).toEqual({
    inline: '#334455',
    computed: '#334455',
    editing: 'dark',
    bgToken: '#18181b',
    textColor: 'rgb(250, 250, 250)',
  })
  await page.locator('#te-default').screenshot({ path: testInfo.outputPath('theme-editor-html-dark-preview.png') })

  // 编辑 light 桶不得污染暗色预览
  const lightIsolated = await page.evaluate(() => {
    const editor = document.querySelector('#te-default') as any
    editor.editingTheme = 'light'
    editor.importJson({ '--oas-color-primary': '#aabbcc' })
    const host = document.querySelector('#te-default') as HTMLElement
    return host.style.getPropertyValue('--oas-color-primary')
  })
  expect(lightIsolated, 'light 桶编辑不得覆盖暗色预览').toBe('#334455')

  await page.evaluate(() => {
    document.documentElement.classList.remove('dark')
  })
  expect(errors).toEqual([])
})

test('theme-editor 数字输入非法态真实可见（computed 红边，不是只加 class）', async ({ page }, testInfo) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-default')
  const input = page.locator('#te-default input[type="number"]').first()
  await input.fill('')
  const visible = await page.evaluate(() => {
    const el = document
      .querySelector('#te-default')!
      .shadowRoot!.querySelector<HTMLInputElement>('input[type="number"]')!
    const cs = getComputedStyle(el)
    const probe = document.createElement('span')
    document.body.appendChild(probe)
    probe.style.color = 'var(--oas-color-danger)'
    const danger = getComputedStyle(probe).color
    probe.remove()
    return {
      invalid: el.classList.contains('is-invalid'),
      borderColor: cs.borderTopColor,
      borderWidth: cs.borderTopWidth,
      boxShadow: cs.boxShadow,
      danger,
    }
  })
  expect(visible.invalid).toBe(true)
  expect(visible.danger, 'danger token 应可解析').toMatch(/^rgb\(/)
  expect(visible.borderColor, '非法态边框必须是可见 danger 色').toBe(visible.danger)
  expect(visible.borderWidth).toBe('1px')
  expect(visible.boxShadow, '1px 边框外再补内描边，保证真实可见').toContain('inset')
  await page
    .locator('#te-default input[type="number"]')
    .first()
    .screenshot({
      path: testInfo.outputPath('theme-editor-number-invalid.png'),
    })
})

test('theme-editor 同行合法写入清除胶粘草稿：色板/滑块写入后回填新值并清 is-invalid', async ({ page }, testInfo) => {
  await page.goto('/components/theme-editor.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#te-default')

  // 颜色行：非法文本草稿 → 同行色板写合法值
  const colorRow = page.locator('#te-default [part="row"]').first()
  const colorText = colorRow.locator('input.color-text')
  await colorText.fill('not-a-color')
  await expect(colorText).toHaveClass(/is-invalid/)
  await colorRow.locator('input[type="color"]').evaluate((el: HTMLInputElement) => {
    el.value = '#123456'
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(colorText).toHaveValue('#123456')
  await expect(colorText).not.toHaveClass(/is-invalid/)

  // 数字行：清空草稿 → 同行滑块写合法值
  const numberRow = page
    .locator('#te-default [part="row"]')
    .filter({ has: page.locator('input[type="number"]') })
    .first()
  const numberInput = numberRow.locator('input[type="number"]')
  await numberInput.fill('')
  await expect(numberInput).toHaveClass(/is-invalid/)
  const slider = numberRow.locator('input[type="range"]')
  const next = await slider.evaluate((el: HTMLInputElement) => {
    const target = String(Number(el.min || 0) + 8)
    el.value = target
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return target
  })
  await expect(numberInput).toHaveValue(next)
  await expect(numberInput).not.toHaveClass(/is-invalid/)
  await page.locator('#te-default').screenshot({ path: testInfo.outputPath('theme-editor-draft-cleared.png') })
})
