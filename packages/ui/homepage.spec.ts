import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 官网首页（home 布局）专属 e2e
// 自动收集型 spec（smoke/visual 等）只扫 components 目录，不含首页
// qa-regression.spec.ts 不另加断言：防复发铁律针对「修的 bug」，本 spec 即固化载体
const stats = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../docs/docs/.vitepress/generated/stats.json'), 'utf8'),
)

test.describe.configure({ mode: 'parallel' })

test.describe('官网首页（重设计版）', () => {
  // 默认 Playwright context 是 en-US；首页浏览器语言自动跳转只针对 landing page，
  // 本 describe 的默认首页断言固定 zh-CN，避免每个用例重复声明。
  test.use({ locale: 'zh-CN' })

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
    // 字体加载完成（console 零告警断言的渲染收尾信号：资源期报错此刻必然已入列）
    await page.evaluate(() => document.fonts.ready)
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
    // 完整基准在仓库 docs/perf-baseline.md（站点无独立性能页）→ 外链 GitHub
    const baseline = sec.locator('a[href$="docs/perf-baseline.md"]')
    await expect(baseline).toBeAttached()
    await expect(baseline).toHaveAttribute(
      'href',
      /github\.com\/openappsys\/oas-ui\/blob\/main\/docs\/perf-baseline\.md/,
    )
    await expect(baseline).toHaveAttribute('target', '_blank')
  })

  test('性能标尺：最窄段数值完整可见（贴段左缘且不被白底/相邻段遮住）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.home-perf', { timeout: 15000 })
    await page.evaluate(() => document.querySelector('.home-perf')?.scrollIntoView({ block: 'center' }))
    // 滚动落定 + 数值渲染的真实信号：最窄段数值三点全部可见（即本用例断言条件本身；
    // smooth 滚动中途 elementFromPoint 会命中滚动层，必须在终态采样）
    await expect
      .poll(() =>
        page.evaluate(() => {
          const seg = document.querySelector('.home-perf .seg-btn') as HTMLElement | null
          const val = seg?.querySelector('.hp-val') as HTMLElement | null
          if (!seg || !val) return false
          const b = val.getBoundingClientRect()
          const s = seg.getBoundingClientRect()
          const y = Math.round(b.top + b.height / 2)
          const onTop = (x: number): boolean => document.elementFromPoint(x, y) === val
          return (
            seg.classList.contains('seg-tiny') &&
            Math.abs(b.left - s.left) <= 1 &&
            onTop(Math.round(b.left + 1)) &&
            onTop(Math.round(b.left + b.width / 2)) &&
            onTop(Math.round(b.right - 1))
          )
        }),
      )
      .toBe(true)
    const r = await page.evaluate(() => {
      const seg = document.querySelector('.home-perf .seg-btn') as HTMLElement | null
      const val = seg?.querySelector('.hp-val') as HTMLElement | null
      if (!seg || !val) return null
      const b = val.getBoundingClientRect()
      const s = seg.getBoundingClientRect()
      const y = Math.round(b.top + b.height / 2)
      const onTop = (x: number): boolean => document.elementFromPoint(x, y) === val
      return {
        tiny: seg.classList.contains('seg-tiny'),
        leftAligned: Math.abs(b.left - s.left) <= 1,
        leftVisible: onTop(Math.round(b.left + 1)),
        midVisible: onTop(Math.round(b.left + b.width / 2)),
        rightVisible: onTop(Math.round(b.right - 1)),
      }
    })
    expect(r!.tiny, '窄段使用 seg-tiny 布局').toBe(true)
    expect(r!.leftAligned, '数值贴段左缘（不再居中溢出到白底）').toBe(true)
    expect(r!.leftVisible && r!.midVisible && r!.rightVisible, '数值全宽都可见（未被遮挡）').toBe(true)
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
  test('各屏分隔光带齐全：含性能速览→三行代码交界（.home-divider 回归）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const divider = page.locator('.home-cta > .home-divider')
    await expect(divider).toBeAttached()
    await expect(divider).toHaveCSS('height', '1px')
    // 位置：贴 home-cta 顶部（与其他屏 .home-section::before 的 top:0 同位）
    // 两者同用 getBoundingClientRect（视口相对）比较——避免 boundingBox（视口相对）与文档相对（+scrollY）混比，
    // 页面一旦滚动即产生等于 scrollY 的假差（曾以 16px 偶发失败）。
    const { dividerTop, ctaTop } = await page.evaluate(() => ({
      dividerTop: document.querySelector('.home-cta > .home-divider')!.getBoundingClientRect().top,
      ctaTop: document.querySelector('.home-cta')!.getBoundingClientRect().top,
    }))
    expect(Math.abs(dividerTop - ctaTop), '分隔线应贴 CTA 屏顶').toBeLessThan(1)
    // 渐变线本体非透明（品牌蓝渐变 + 光晕）
    const bg = await divider.evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(bg).toContain('linear-gradient')
    const shadow = await divider.evaluate((el) => getComputedStyle(el).boxShadow)
    expect(shadow).not.toBe('none')
  })

  test('英文首页渲染 + 中英切换链路', async ({ browser, page }) => {
    // /en/ 是显式英文路径：直接打开即英文首页。
    const ctxEn = await browser.newContext({ locale: 'en-US' })
    const pEn = await ctxEn.newPage()
    await pEn.goto('/en/', { waitUntil: 'domcontentloaded' })
    const hero = pEn.locator('.home-hero')
    await expect(hero).toBeAttached()
    await expect(hero.locator('.hh-title')).toContainText('framework-agnostic')
    await ctxEn.close()
    // 中文首页：zh 浏览器不触发英文 landing 跳转，zh 标题渲染是“未被重定向”的确定性信号
    // （重定向脚本在 head 同步执行，若发生 goto 直接落在 /en/，zh 标题永不出现 → 此处超时红）
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.home-hero .hh-title')).toContainText('框架无关的', { timeout: 15000 })
  })

  // 浏览器语言自动跳转只作用于 landing page：en 首访根路径跳 /en/，query/hash 保留；
  // 中文深链是显式内容地址，不做浏览器语言猜测；zh 浏览器根路径自然留在中文。
  test('landing 自动跳转：en 首页跳 /en/ 并保留 query/hash，子页面不自动', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US' })
    const p = await ctx.newPage()
    await p.goto('/?from=landing#a11y', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => new URL(p.url()).pathname, { timeout: 15000 }).toBe('/en/')
    expect(new URL(p.url()).search, 'landing 跳转应保留 query').toBe('?from=landing')
    expect(new URL(p.url()).hash, 'landing 跳转应保留 hash').toBe('#a11y')
    await expect(p.locator('.home-hero .hh-title')).toContainText('framework-agnostic', { timeout: 15000 })
    expect(await p.evaluate(() => localStorage.getItem('oas-lang')), '自动猜测不得持久化').toBeNull()

    await p.goto('/index.html?from=landing-index#index', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => new URL(p.url()).pathname, { timeout: 15000 }).toBe('/en/')
    expect(new URL(p.url()).search, 'index.html landing 跳转应保留 query').toBe('?from=landing-index')
    expect(new URL(p.url()).hash, 'index.html landing 跳转应保留 hash').toBe('#index')
    expect(await p.evaluate(() => localStorage.getItem('oas-lang')), 'index.html 自动猜测仍不得持久化').toBeNull()

    const deep = await ctx.newPage()
    await deep.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => deep.evaluate(() => document.documentElement.lang), { timeout: 15000 }).toBe('zh-CN')
    expect(new URL(deep.url()).pathname, 'en 浏览器无偏好访问中文深链不应自动跳').toBe('/components/button.html')
    await ctx.close()
  })

  // 语言偏好跳转（head inline 脚本）：显式保存的偏好仍全站生效；浏览器语言猜测只作用于 landing。
  test('语言偏好跳转：无偏好 landing 按浏览器语言，显式 oas-lang=en 才跳深链', async ({ browser }) => {
    // en 浏览器、无偏好：根路径自动跳英文首页
    const ctxEn = await browser.newContext({ locale: 'en-US' })
    const pEn = await ctxEn.newPage()
    await pEn.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => new URL(pEn.url()).pathname, { timeout: 15000 }).toBe('/en/')
    await expect(pEn.locator('.home-hero .hh-title')).toContainText('framework-agnostic', { timeout: 15000 })
    // en 浏览器、无偏好：zh 深链留中文（html lang=zh-CN 为 zh 页确定性信号，en 页为 lang=en）
    await pEn.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => pEn.evaluate(() => document.documentElement.lang), { timeout: 15000 }).toBe('zh-CN')
    expect(new URL(pEn.url()).pathname, 'en 浏览器无偏好访问 zh 深链应留中文').not.toContain('/en')
    // 显式偏好 en：zh 根路径与深链跳对应英文页
    await pEn.evaluate(() => localStorage.setItem('oas-lang', 'en'))
    await pEn.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => pEn.url(), { timeout: 15000 }).toContain('/en/')
    await pEn.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => pEn.url(), { timeout: 15000 }).toContain('/en/components/button')
    expect(new URL(pEn.url()).pathname, '已存 en 偏好访问 zh 深链应跳对应英文页').toContain('/en/components/button')
    await ctxEn.close()
    // zh 浏览器、无偏好：根路径留中文
    const ctxZh = await browser.newContext({ locale: 'zh-CN' })
    const pZh = await ctxZh.newPage()
    await pZh.goto('/', { waitUntil: 'domcontentloaded' })
    // 留在中文页的确定性信号：zh 标题渲染
    await expect(pZh.locator('.home-hero .hh-title')).toContainText('框架无关的', { timeout: 15000 })
    expect(pZh.url(), 'zh 浏览器首访应留中文根路径').not.toContain('/en/')
    await ctxZh.close()
  })

  test('语言偏好持久化：显式 oas-lang 决定跳转方向', async ({ browser }) => {
    // en 浏览器 + 已存 zh 偏好 → 留中文
    const ctx = await browser.newContext({ locale: 'en-US' })
    const p = await ctx.newPage()
    await p.goto('/en/', { waitUntil: 'domcontentloaded' })
    await p.evaluate(() => localStorage.setItem('oas-lang', 'zh'))
    await p.goto('/', { waitUntil: 'domcontentloaded' })
    // 留在中文页的确定性信号：zh 标题渲染（zh 偏好被无视而误跳 /en/ 时此处超时红）
    await expect(p.locator('.home-hero .hh-title')).toContainText('框架无关的', { timeout: 15000 })
    expect(p.url(), '已存 zh 偏好的 en 浏览器访问根路径应留中文').not.toContain('/en/')
    // 反向：zh 浏览器 + 已存 en 偏好 → 跳英文
    const ctx2 = await browser.newContext({ locale: 'zh-CN' })
    const p2 = await ctx2.newPage()
    await p2.goto('/', { waitUntil: 'domcontentloaded' })
    await p2.evaluate(() => localStorage.setItem('oas-lang', 'en'))
    await p2.goto('/', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => p2.url(), { timeout: 15000 }).toContain('/en/')
    expect(p2.url(), '已存 en 偏好的 zh 浏览器访问根路径应跳英文').toContain('/en/')
    await ctx.close()
    await ctx2.close()
  })

  // 回归（回环 + 显式路径优先）：head 脚本按 oas-lang 决定跳向，Layout 一度把「落地页 locale」无条件
  // 写回 oas-lang——zh 浏览器整页打开 /en/ 深链时组件把 en 写回偏好，脚本下次读到 en 再跳 /en/，整页
  // 互踢。现语义：/en/ 是显式语言路径一律不回弹；显式 en 偏好访问 zh 深链才跳，且收敛不循环。
  // 断言「稳定收敛 + 落点正确」——只在某一刻取样 URL 是抓不到的。
  test('语言偏好跳转：/en/ 显式路径优先且不回环', async ({ browser }) => {
    const settle = async (locale: string, start: string, expectPath: string, pref?: 'en' | 'zh') => {
      const ctx = await browser.newContext({ locale })
      const p = await ctx.newPage()
      if (pref) {
        await p.goto('/', { waitUntil: 'domcontentloaded' })
        await p.evaluate((v) => localStorage.setItem('oas-lang', v), pref)
      }
      let loads = 0
      p.on('load', () => loads++)
      await p.goto(start, { waitUntil: 'domcontentloaded' })
      // 收敛的真实信号：URL 稳定落在期望路径（互踢循环下 pathname 反复翻转；
      // 若曾在错误路径间振荡，重定向产生的整页 load 会被下方 loads ≤3 断言抓住）
      await expect.poll(() => new URL(p.url()).pathname, { timeout: 15000 }).toBe(expectPath)
      const path = new URL(p.url()).pathname
      await ctx.close()
      expect(path, `${locale} 打开 ${start} 应稳定落在 ${expectPath}`).toBe(expectPath)
      expect(loads, `${locale} 打开 ${start} 不应反复整页重定向`).toBeLessThanOrEqual(3)
    }
    // zh 浏览器整页打开 /en/ 深链：显式英文路径优先，保持英文（不被偏好/语言弹回中文）
    await settle('zh-CN', '/en/components/button-group.html', '/en/components/button-group.html')
    // 显式 en 偏好整页打开中文深链：跳对应英文页并稳定收敛
    await settle('zh-CN', '/components/button-group.html', '/en/components/button-group.html', 'en')
  })

  test('语言偏好只在显式切换时写：落地首屏不写、点语言下拉切换才写（满负载污染实抓回归锁）', async ({ browser }) => {
    // 曾现：仅靠 oldValue === undefined 判定「首屏不写」不够——路由/水合重算会以 oldValue 有值
    // 再次触发 watcher，满负载下把落地页 locale 写回 oas-lang（en 浏览器访问 zh 深链不再跳转）。
    // 现判据：点击 .VPNavBarTranslations 内的链接才算显式切换。
    const ctx = await browser.newContext({ locale: 'zh-CN' })
    const p = await ctx.newPage()
    await p.goto('/', { waitUntil: 'domcontentloaded' })
    // 水合完成的确定性信号：hero 标题渲染（曾误写偏好的 watcher 在水合期触发，此刻必然已跑完）
    await expect(p.locator('.home-hero .hh-title')).toContainText('框架无关的', { timeout: 15000 })
    expect(await p.evaluate(() => localStorage.getItem('oas-lang')), '落地首屏不得写偏好').toBeNull()
    // 显式切换：打开语言下拉 → 点 English
    await p.locator('.VPNavBarTranslations button.button').click()
    await p.locator('.VPNavBarTranslations .VPMenuLink a[href="/en/"]').click()
    await expect.poll(() => new URL(p.url()).pathname, { timeout: 15000 }).toContain('/en')
    await expect.poll(() => p.evaluate(() => localStorage.getItem('oas-lang')), { timeout: 15000 }).toBe('en')
    await ctx.close()
  })

  test('页脚：自定义四栏页脚 + 双许可与版权', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const footer = page.locator('.home-footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('MIT OR Apache-2.0')
    await expect(footer).toContainText('OAS-UI')
    await expect(footer.locator('.hf-col')).toHaveCount(3)
  })

  // SPA 路由 GA page_view 补发回归（确定性 stub，不依赖外网 GTM）：
  // e2e 构建固定 OAS_DOCS_ANALYTICS=0（不加载外部 gtag.js），旧实现此时 test.skip 静默跳过——
  // 路由钩子从未被验证（假绿）。钩子注册（theme enhanceApp）与外部脚本可达性是两件事：
  // 这里用 addInitScript 注入与 gtag.js inline 引导等价的确定性 dataLayer/gtag stub，
  // 验证主题注册的 onAfterRouteChange 在 SPA 路由切换时补发 page_view。
  test('SPA 路由切换 GA page_view 补发（确定性 dataLayer/gtag stub，不依赖外网）', async ({ page }) => {
    // 与真实 gtag.js 引导同构：dataLayer 数组 + 把参数原样入队的 gtag 函数
    await page.addInitScript(() => {
      const w = window as unknown as { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void }
      w.dataLayer = []
      w.gtag = (...args: unknown[]) => {
        w.dataLayer!.push(args)
      }
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const configCalls = () =>
      page.evaluate(() => {
        const dl = (window as unknown as { dataLayer?: unknown[][] }).dataLayer ?? []
        return dl.filter(
          (entry) =>
            Array.isArray(entry) && entry[0] === 'config' && typeof entry[1] === 'string' && entry[1].length > 0,
        )
      })
    // 首载不补发：钩子以当前 pathname 初始化，VitePress 首载回调按同路径去重跳过
    expect(await configCalls(), '首页整载不应补发 page_view（首屏由 inline config 承担）').toEqual([])
    // 点击站点内真实链接，走 VitePress Router 的 SPA 切换（hero CTA 用 window.location
    // 整页跳转，不经过 Router；用链接才能验证 onAfterRouteChange 的 page_view 补发）
    const link = page.locator('.home-footer a[href="/guide/getting-started"]').first()
    await link.waitFor({ state: 'attached' })
    await link.click()
    await page.waitForURL(/guide\/getting-started/)
    // 严格断言：恰好一条 config，且 page_path 指向 SPA 落点（钩子未注册/去重失效都会红）
    await expect
      .poll(configCalls, { timeout: 15000 })
      .toEqual([['config', 'G-RXS142HBXF', { page_path: '/guide/getting-started' }]])
  })

  test('SPA 导航回首页后滚动入场动画可触发（回归：首载非首页时 reveal 永不显示）', async ({ page }) => {
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
    // 滚动触发 IntersectionObserver → 加 .in 显形。
    // 用 block:'center' 把元素完整滚进视口（scrollIntoViewIfNeeded 对「部分可见」不下滚，
    // 低于 IO threshold 时不触发回调——满负载字体加载改变高度时实抓过该类抖动）
    await page.evaluate(() => {
      document.querySelector('.home-reveal')?.scrollIntoView({ block: 'center' })
    })
    await expect(page.locator('.home-reveal.in').first()).toBeVisible()
    await expect(reveal).toHaveClass(/in/)
  })
})
