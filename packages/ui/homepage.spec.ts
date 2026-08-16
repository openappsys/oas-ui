import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 官网首页（home 布局）专属 e2e：自动收集型 spec（smoke/visual 等）只扫 components 目录，不含首页。
// qa-regression.spec.ts 不另加断言：防复发铁律针对「修的 bug」，首页为新增功能，本 spec 即固化载体。
const stats = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../docs/docs/.vitepress/generated/stats.json'),
    'utf8',
  ),
)

test.describe.configure({ mode: 'parallel' })

test.describe('官网首页', () => {
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

  test('三层范式：各区段有标题/说明/内容', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    // 统计条：标题 + 一句话导言
    await expect(page.locator('.stats-bar__title')).toContainText('数字一览')
    await expect(page.locator('.stats-bar__intro')).toContainText('真实快照')
    // 特性卡：标题 + 一句话导言
    await expect(page.locator('.feature-grid__title')).toContainText('核心特性')
    await expect(page.locator('.feature-grid__intro')).toContainText('工程决策')
    // Hero 组件墙角标：可交互预览
    await expect(page.locator('.hero-playground__badge')).toContainText('可交互预览')
  })

  test('组件墙可交互：按钮出 message、switch 翻转、segmented 切换', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const hero = page.locator('.hero-playground')
    await expect(hero).toBeAttached()
    // ui 包在 theme/index.ts 里懒加载（import('@oas-ui/ui')）后才挂载 window.message；
    // domcontentloaded 时 chunk 可能未就绪，点击前等命令式 API 就绪（否则 hi() 静默失败）
    await page.waitForFunction(() => {
      const w = window as unknown as { message?: { info?: unknown } }
      return typeof w.message?.info === 'function'
    })
    // 按钮点击 → message 出现（文本在 oas-message 的 shadow 内，用 host 定位断言）
    await hero.locator('oas-button').first().click()
    const msg = page.locator('oas-message')
    await expect(msg).toBeVisible()
    await expect(msg).toContainText('来自 OAS-UI 的问候')
    // switch 翻转：role=switch + aria-checked 在 shadow 内 button 上（host 只反射 checked 布尔属性）
    const sw = hero.locator('oas-switch')
    await sw.click()
    await expect(sw.locator('[role="switch"]')).toHaveAttribute('aria-checked', 'true')
    // segmented 切换：value 反射到 host 属性，radio 选项在 shadow 内
    const seg = hero.locator('oas-segmented')
    await seg.locator('[role="radio"]').nth(1).click()
    await expect(seg).toHaveAttribute('value', 'week')
  })

  test('StatsBar 数字与 stats.json 一致', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bar = page.locator('.stats-bar')
    await expect(bar).toBeAttached()
    await expect(bar.locator('oas-statistic')).toHaveCount(4)
    await expect(bar).toContainText(String(stats.components))
    await expect(bar).toContainText(String(stats.cdnGzipKB))
    await expect(bar).toContainText(`v${stats.version}`)
    // 标签防剥离回归：Element.prototype.prefix 是只读 getter，Vue 走 DOM prop 赋值会静默丢标签
    // （prod 构建无 warn），必须断言标签文本真实渲染
    await expect(bar).toContainText('组件')
    await expect(bar).toContainText('CDN gzip')
    await expect(bar).toContainText('测试用例')
  })

  test('FeatureGrid 六卡且链接非空', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const links = page.locator('.feature-grid a[href]')
    await expect(links).toHaveCount(6)
    for (let i = 0; i < 6; i++) {
      await expect(links.nth(i)).toHaveAttribute('href', /.+/)
    }
    // 版心对齐回归：slot 节点是 .VPHome 裸子节点，无容器约束会顶满屏宽；
    // 统计条/特性卡必须与 hero 容器左右边缘一致（1440 视口下 left=144）
    const edges = await page.evaluate(() => {
      const pick = (sel: string) => Math.round(document.querySelector(sel)?.getBoundingClientRect().left ?? -1)
      return { hero: pick('.VPHero .container'), stats: pick('.stats-bar'), feature: pick('.feature-grid') }
    })
    expect(edges.stats).toBe(edges.hero)
    expect(edges.feature).toBe(edges.hero)
  })

  test('英文首页 hero 渲染', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPHero h1')).toContainText('OAS-UI')
    await expect(page.locator('.VPHero .actions a')).toHaveCount(2)
  })

  test('页脚：中英双版版权与许可', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPFooter')).toBeVisible()
    await expect(page.locator('.VPFooter')).toContainText('MIT OR Apache-2.0')
    await expect(page.locator('.VPFooter')).toContainText('OpenAppSys')
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPFooter')).toContainText('MIT OR Apache-2.0')
  })

  test('SPA 路由切换 GA page_view 补发（onAfterRouteChanged 回归）', async ({ page }) => {
    // 回归：v1.9.1 起补发注册误写为 onAfterRouteChange?.(cb) 方法调用——属性不存在，
    // 可选链静默短路，SPA 补发从未生效；正确写法是给实例属性 onAfterRouteChanged 赋值
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
