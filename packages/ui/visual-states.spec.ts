import { expect, test } from '@playwright/test'

const PAGES = ['marquee', 'spin', 'carousel', 'notice-bar', 'number-animation'] as const
const NARROW_PAGES = ['button', 'input', 'select', 'tabs', 'menu', 'transfer', 'app-bar', 'table'] as const

test('Q09 reduced-motion：代表页面动画时长压到近零', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const name of PAGES) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(200)
    const violations = await page.evaluate(() => {
      const bad: string[] = []
      const walk = (root: Document | ShadowRoot): void => {
        for (const el of root.querySelectorAll('*')) {
          const style = getComputedStyle(el)
          if (style.animationName !== 'none') {
            const durations = style.animationDuration.split(',').map((d) => Number.parseFloat(d))
            if (durations.some((d) => Number.isFinite(d) && d > 0.02)) {
              bad.push(`${el.tagName}.${String(el.className)} ${style.animationName} ${style.animationDuration}`)
            }
          }
          if (el.shadowRoot) walk(el.shadowRoot)
        }
      }
      walk(document)
      return bad.slice(0, 10)
    })
    expect(violations, `${name} 在 reduced-motion 下仍有长动画`).toEqual([])
  }
})

test('Q09 high-contrast：主题 token 生效且页面无横向溢出', async ({ page }) => {
  for (const name of ['button', 'input', 'table', 'alert'] as const) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    const probe = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'high-contrast')
      const root = getComputedStyle(document.documentElement)
      return {
        bg: root.getPropertyValue('--oas-color-bg').trim(),
        text: root.getPropertyValue('--oas-color-text-primary').trim(),
        scheme: root.colorScheme,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    expect(probe.bg, `${name} 高对比背景 token 缺失`).not.toBe('')
    expect(probe.text, `${name} 高对比文字 token 缺失`).not.toBe('')
    expect(probe.scheme, `${name} 高对比应为 light color-scheme`).toContain('light')
    expect(probe.overflow, `${name} 高对比下横向溢出`).toBeLessThan(3)
  }
})

test('Q09 forced-colors：resource 条形图焦点环回退为可见 outline', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('/components/resource.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => (document.querySelector('oas-resource') as HTMLElement | null)?.shadowRoot != null)
  const result = await page.evaluate(async () => {
    const host = document.querySelector('oas-resource') as HTMLElement & { shadowRoot: ShadowRoot }
    const bar = host.shadowRoot.querySelector<HTMLElement>('[part="bar"]')
    if (!bar) return null
    bar.focus()
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    const cs = getComputedStyle(bar)
    return {
      matches: matchMedia('(forced-colors: active)').matches,
      focusVisible: bar.matches(':focus-visible'),
      outlineStyle: cs.outlineStyle,
      outlineWidth: Number.parseFloat(cs.outlineWidth),
    }
  })
  expect(result, 'resource 页未找到条形图').not.toBeNull()
  expect(result!.matches).toBe(true)
  expect(result!.focusVisible).toBe(true)
  expect(result!.outlineStyle).not.toBe('none')
  expect(result!.outlineWidth).toBeGreaterThanOrEqual(2)
})

test('Q09 narrow：320px 视口代表页面无页面级横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 })
  for (const name of NARROW_PAGES) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(100)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${name} 在 320px 视口横向溢出`).toBeLessThan(3)
  }
})
