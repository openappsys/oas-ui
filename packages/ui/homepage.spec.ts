import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 官网首页（home 布局）专属 e2e
// 自动收集型 spec（smoke/visual 等）只扫 components 目录，不含首页
// qa-regression.spec.ts 不另加断言：防复发铁律针对「修的 bug」，本 spec 即固化载体
const stats = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../docs/docs/.vitepress/generated/stats.json'),
    'utf8',
  ),
)

test.describe.configure({ mode: 'parallel' })

test.describe('官网首页 v2', () => {
  test('hero 渲染：标题/双 CTA/console 零告警', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPHero h1')).toContainText('OAS-UI')
    await expect(page.locator('.VPHero .actions a')).toHaveCount(2)
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })

  test('HeroTableDemo 标志性大件：表格 + 4 个状态切换控件', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const demo = page.locator('.hero-table-demo')
    await expect(demo).toBeAttached()
    // oas-table 在数据前后各加一个 .spacer 行（吸顶布局占位）；数据行 class="row"、空态占位行无 class
    await expect(demo.locator('oas-table tbody tr.row')).toHaveCount(5, { timeout: 5000 })
    const controls = demo.locator('oas-button').filter({ hasText: /排序|分页|空态|loading/i })
    await expect(controls).toHaveCount(4)
    await demo.getByRole('button', { name: /loading/i }).click()
    await expect(demo.locator('oas-table')).toHaveAttribute('loading', 'true')
    await demo.getByRole('button', { name: /空态/i }).click()
    await expect(demo.locator('oas-table tbody tr.row')).toHaveCount(0)
  })

  test('StatsBar 数字与 stats.json 一致', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bar = page.locator('.stats-bar')
    await expect(bar).toBeAttached()
    await expect(bar.locator('oas-statistic')).toHaveCount(4)
    await expect(bar).toContainText(String(stats.components))
    await expect(bar).toContainText(String(stats.cdnGzipKB))
    await expect(bar).toContainText(`v${stats.version}`)
    await expect(bar).toContainText('组件')
    await expect(bar).toContainText('CDN gzip')
    await expect(bar).toContainText('测试用例')
  })

  test('SceneShowcase 三张场景卡，每卡嵌迷你 demo', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.scene-showcase')
    await expect(sec).toBeAttached()
    const cards = sec.locator('.scene-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0).locator('oas-form')).toBeAttached()
    await expect(cards.nth(1).locator('oas-statistic').first()).toBeAttached()
    await expect(cards.nth(2).locator('oas-button')).toHaveCount(3, { timeout: 10000 })
    // 等 oas-ui chunk 异步加载（theme/index.ts 动态 import）
    await page.waitForFunction(
      () => typeof window.message !== 'undefined',
      null,
      { timeout: 15000 },
    )
    await cards.nth(2).locator('oas-button').first().click()
    await expect(page.locator('oas-message').first()).toBeAttached({ timeout: 10000 })
  })

  test('CodeShowcase HTML 单例 + 4 个框架桥接图标卡', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.code-showcase')
    await expect(sec).toBeAttached()
    await expect(sec.locator('pre code')).toContainText('oas-button')
    const bridges = sec.locator('.code-showcase__bridge')
    await expect(bridges).toHaveCount(4)
  })

  test('PerfSection 3 个真实数字 + perf-baseline 链接', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.perf-section')
    await expect(sec).toBeAttached()
    await expect(sec.locator('oas-statistic')).toHaveCount(3)
    await expect(sec).toContainText(String(stats.perf.cdnGzipKB))
    await expect(sec).toContainText(String(stats.perf.buttonChainKB))
    await expect(sec).toContainText(String(stats.perf.fullEntryKB))
    await expect(sec.locator('a[href*="/guide"]')).toBeAttached()
  })

  test('CtaBand 收尾横幅 + 双按钮', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const band = page.locator('.cta-band')
    await expect(band).toBeAttached()
    await expect(band.locator('a').first()).toHaveAttribute('href', /guide\/getting-started/)
    await expect(band.locator('a[href*="github.com"]')).toBeAttached()
  })

  test('三层范式：每个新区段有标题', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.stats-bar__title')).toContainText('数字一览')
    await expect(page.locator('.scene-showcase__title')).toContainText('核心场景')
    await expect(page.locator('.code-showcase__title')).toContainText('代码速览')
    await expect(page.locator('.perf-section__title')).toContainText('性能速览')
    await expect(page.locator('.cta-band__title')).toBeAttached()
  })

  test('版心对齐回归：所有区段容器与 hero 容器左缘一致', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const edges = await page.evaluate(() => {
      const pick = (sel: string) =>
        Math.round(document.querySelector(sel)?.getBoundingClientRect().left ?? -1)
      return {
        hero: pick('.VPHero .container'),
        stats: pick('.stats-bar'),
        scene: pick('.scene-showcase'),
        code: pick('.code-showcase'),
        perf: pick('.perf-section'),
        cta: pick('.cta-band'),
      }
    })
    expect(edges.stats).toBe(edges.hero)
    expect(edges.scene).toBe(edges.hero)
    expect(edges.code).toBe(edges.hero)
    expect(edges.perf).toBe(edges.hero)
    expect(edges.cta).toBe(edges.hero)
  })

  test('页脚：中英双版版权与许可', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPFooter')).toBeVisible()
    await expect(page.locator('.VPFooter')).toContainText('MIT OR Apache-2.0')
    await expect(page.locator('.VPFooter')).toContainText('OpenAppSys')
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPFooter')).toContainText('MIT OR Apache-2.0')
  })

  test('英文首页 hero 渲染', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPHero h1')).toContainText('OAS-UI')
    await expect(page.locator('.VPHero .actions a')).toHaveCount(2)
  })

  test('SPA 路由切换 GA page_view 补发（onAfterRouteChanged 回归）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Array.isArray(window.dataLayer))
    await page.click('.VPHero .actions a.brand')
    await page.waitForURL(/guide\/getting-started/)
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const dl = window.dataLayer as unknown as Array<Record<string, unknown>>
          return dl.some(
            (entry) =>
              entry[0] === 'config' &&
              typeof entry[2] === 'object' &&
              entry[2] !== null &&
              'page_path' in (entry[2] as object),
          )
        }),
      )
      .toBe(true)
  })
})