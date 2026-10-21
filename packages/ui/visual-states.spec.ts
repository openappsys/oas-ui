import { expect, test } from '@playwright/test'

const PAGES = ['marquee', 'spin', 'carousel', 'notice-bar', 'number-animation'] as const
const NARROW_PAGES = ['button', 'input', 'select', 'tabs', 'menu', 'transfer', 'app-bar', 'table'] as const

async function waitUp(page: import('@playwright/test').Page, name: string): Promise<void> {
  const tag = `oas-${name}`
  await page.waitForFunction(
    (t) => {
      const el = document.querySelector(t) as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null
      return customElements.get(t) != null && el?.shadowRoot != null
    },
    tag,
    { timeout: 15000 },
  )
}

test('Q09 reduced-motion：代表页面动画时长压到近零', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const name of PAGES) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await waitUp(page, name)
    const result = await page.evaluate(() => {
      const bad: string[] = []
      let shadows = 0
      const walk = (root: Document | ShadowRoot): void => {
        for (const el of root.querySelectorAll('*')) {
          const style = getComputedStyle(el)
          if (style.animationName !== 'none') {
            const durations = style.animationDuration.split(',').map((d) => Number.parseFloat(d))
            if (durations.some((d) => Number.isFinite(d) && d > 0.02)) {
              bad.push(`${el.tagName}.${String(el.className)} ${style.animationName} ${style.animationDuration}`)
            }
          }
          if (el.shadowRoot) {
            shadows++
            walk(el.shadowRoot)
          }
        }
      }
      walk(document)
      return { bad: bad.slice(0, 10), shadows }
    })
    expect(result.shadows, `${name} 未扫描到 shadow 树（组件未升级）`).toBeGreaterThan(0)
    expect(result.bad, `${name} 在 reduced-motion 下仍有长动画`).toEqual([])
  }
})

test('Q09 high-contrast：主题 token 生效且页面无横向溢出', async ({ page }) => {
  for (const name of ['button', 'input', 'table', 'alert'] as const) {
    await page.goto(`/components/${name}.html`, { waitUntil: 'domcontentloaded' })
    await waitUp(page, name)
    const probe = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'high-contrast')
      const root = getComputedStyle(document.documentElement)
      return {
        bg: root.getPropertyValue('--oas-color-bg').trim(),
        text: root.getPropertyValue('--oas-color-text-primary').trim(),
        border: root.getPropertyValue('--oas-color-border').trim(),
        scheme: root.colorScheme,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    expect(probe.text, `${name} 高对比主文字应为纯黑`).toMatch(/^#000(?:000)?$|^rgb\(0, 0, 0\)$/)
    expect(probe.border, `${name} 高对比边框应为纯黑`).toMatch(/^#000(?:000)?$|^rgb\(0, 0, 0\)$/)
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
    await waitUp(page, name)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${name} 在 320px 视口横向溢出`).toBeLessThan(3)
  }
})
