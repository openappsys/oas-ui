import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// window 全局扩展（theme/index.ts 异步挂 message/notification；GA 注入 dataLayer）
declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

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

test.describe('官网首页（重设计版）', () => {
  test('hero 渲染：品牌名/主副标题/双 CTA/console 零告警', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const hero = page.locator('.home-hero')
    await expect(hero).toBeAttached()
    await expect(hero.locator('.hh-eyebrow')).toContainText('OAS-UI')
    await expect(hero.locator('.hh-title')).toContainText('框架无关的')
    await expect(hero.locator('.hh-glow')).toContainText('Web Components')
    await expect(hero.locator('oas-button')).toHaveCount(2, { timeout: 5000 })
    await page.waitForTimeout(300)
    expect(errors).toEqual([])
  })

  test('hero 数字条与 stats.json 一致', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const statsBar = page.locator('.hh-stats')
    await expect(statsBar).toBeAttached()
    await expect(statsBar).toContainText(String(stats.components))
    await expect(statsBar).toContainText(String(stats.cdnGzipKB))
    await expect(statsBar).toContainText(`v${stats.version}`)
    await expect(statsBar).toContainText('组件总数')
    await expect(statsBar).toContainText('CDN gzip')
    await expect(statsBar).toContainText('自动化测试')
  })

  test('使用场景 4 卡 + 为谁而生人群带', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.home-cases')
    await expect(sec).toBeAttached()
    await expect(sec.locator('.hc-case')).toHaveCount(4)
    await expect(sec.locator('.hc-who-pill')).toHaveCount(4)
    await expect(sec.locator('.hc-title')).toContainText('使用场景')
  })

  test('代码窗 6 框架 tab 可切换，桥接卡 6 张', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.home-code')
    await expect(sec).toBeAttached()
    const tabs = sec.locator('.hcode-tab')
    await expect(tabs).toHaveCount(6)
    // 初始 HTML tab 展示 oas-button 代码
    await expect(sec.locator('.hcode-pre')).toContainText('oas-button')
    // 切到 Vue tab，代码更新（v-html 渲染后 <template> 为文本节点）
    await tabs.filter({ hasText: 'Vue' }).click()
    await expect(sec.locator('.hcode-pre')).toContainText('template>')
    // 桥接卡 6 张（a.hcode-bridge 卡片）
    await expect(sec.locator('.hcode-bridge')).toHaveCount(6)
  })

  test('性能标尺 3 个真实体积 + perf 链接', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const sec = page.locator('.home-perf')
    await expect(sec).toBeAttached()
    await expect(sec).toContainText(String(stats.perf.cdnGzipKB))
    await expect(sec).toContainText(String(stats.perf.buttonChainKB))
    await expect(sec).toContainText(String(stats.perf.fullEntryKB))
    await expect(sec.locator('a[href*="/guide"]')).toBeAttached()
  })

  test('CTA 终端 + 双按钮', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const cta = page.locator('.home-cta')
    await expect(cta).toBeAttached()
    await expect(cta.locator('.hcta-term')).toBeAttached()
    await expect(cta.locator('oas-button')).toHaveCount(2, { timeout: 5000 })
  })

  // 回归：性能速览与「三行代码」屏之间曾缺渐变分隔线（home-cta 两个伪元素被
  // 网格/光晕占用，挂不了 .home-section::before，改显式 .home-divider 元素承载）
  test('各屏分隔光带齐全：含性能速览→三行代码交界（.home-divider 回归）', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const divider = page.locator('.home-cta > .home-divider')
    await expect(divider).toBeAttached()
    await expect(divider).toHaveCSS('height', '1px')
    // 位置：贴 home-cta 顶部（与其他屏 .home-section::before 的 top:0 同位）
    const box = await divider.boundingBox()
    const ctaTop = await page.evaluate(
      () => document.querySelector('.home-cta')!.getBoundingClientRect().top + window.scrollY,
    )
    expect(Math.abs(box!.y - ctaTop), '分隔线应贴 CTA 屏顶').toBeLessThan(1)
    // 渐变线本体非透明（品牌蓝渐变 + 光晕）
    const bg = await divider.evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(bg).toContain('linear-gradient')
    const shadow = await divider.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(shadow).not.toBe('none')
  })

  test('英文首页渲染 + 中英切换链路', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' })
    const hero = page.locator('.home-hero')
    await expect(hero).toBeAttached()
    await expect(hero.locator('.hh-title')).toContainText('framework-agnostic')
    // 中英切换：页面文案跟 locale 走
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.home-hero .hh-title')).toContainText('框架无关的')
  })

  test('页脚：自定义四栏页脚 + 双许可与版权', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const footer = page.locator('.home-footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('MIT OR Apache-2.0')
    await expect(footer).toContainText('OAS-UI')
    await expect(footer.locator('.hf-col')).toHaveCount(3)
  })

  test('SPA 路由切换 GA page_view 补发（onAfterRouteChanged 回归）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => Array.isArray(window.dataLayer))
    // 点击 hero 主 CTA（oas-click 事件 → 跳转快速开始）
    const cta = page.locator('.home-hero oas-button').first()
    await cta.waitFor({ state: 'attached' })
    await cta.locator('[part="button"]').click()
    await page.waitForURL(/guide\/getting-started/)
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const dl = window.dataLayer ?? []
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

  test('SPA 导航回首页后滚动入场动画可触发（回归：首载非首页时 reveal 永不显示）', async ({
    page,
  }) => {
    // 首载落在组件页（非 home 布局）→ Layout onMounted 查不到 .home-reveal
    await page.goto('/components/button', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.VPDoc')).toBeAttached()
    // SPA 导航回首页（点击站点 logo，等价于地址栏前端路由切换）
    await page.evaluate(() => {
      const link = [...document.querySelectorAll('a')].find((a) => new URL(a.href).pathname === '/')
      if (link) link.click()
    })
    await page.waitForURL(/\/$/)
    const reveal = page.locator('.home-reveal').first()
    await expect(reveal).toBeAttached()
    // 滚动触发 IntersectionObserver → 加 .in 显形
    await reveal.scrollIntoViewIfNeeded()
    await expect.poll(() => page.locator('.home-reveal.in').count()).toBeGreaterThan(0)
    await expect(reveal).toHaveClass(/in/)
  })
})
