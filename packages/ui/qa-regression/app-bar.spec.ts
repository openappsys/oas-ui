// 复核回归：app-bar——汉堡钮事件反馈、overflow 溢出收纳、hide-on-scroll 滚动折叠固化断言。
// 收纳/折叠断言轮询属性与显隐（aria-expanded / data-collapsed / data-hidden），不测 transform 过渡帧。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('app-bar 汉堡钮：点击派发 oas-menu-toggle、demo 输出可见反馈、menu-open 回写 aria-expanded 同步', async ({
  page,
}) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-menu')
  const clickMenu = () =>
    page.evaluate(() =>
      (document.querySelector('#ab-menu')!.shadowRoot!.querySelector('[part="menu-button"]') as HTMLElement).click(),
    )
  await clickMenu()
  await page.waitForFunction(
    () => (document.querySelector('#ab-menu-out')?.textContent ?? '').includes('oas-menu-toggle'),
    null,
    { timeout: 5000 },
  )
  const first = await page.evaluate(() => ({
    out: document.querySelector('#ab-menu-out')!.textContent ?? '',
    menuOpen: document.querySelector('#ab-menu')!.hasAttribute('menu-open'),
    expanded: document
      .querySelector('#ab-menu')!
      .shadowRoot!.querySelector('[part="menu-button"]')!
      .getAttribute('aria-expanded'),
  }))
  expect(first.out, '事件反馈文案可见（demo 输出行更新）').toContain('menu-open=true')
  expect(first.menuOpen, '宿主监听 oas-menu-toggle 回写 menu-open').toBe(true)
  expect(first.expanded, 'aria-expanded 跟随 menu-open').toBe('true')

  // 再点一次：宿主移除 menu-open → aria-expanded 复位
  await clickMenu()
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-menu')!.hasAttribute('menu-open')))
    .toBe(false)
  expect(
    await page.evaluate(() =>
      document
        .querySelector('#ab-menu')!
        .shadowRoot!.querySelector('[part="menu-button"]')!
        .getAttribute('aria-expanded'),
    ),
  ).toBe('false')
})

test('app-bar overflow：窄视口超宽操作项收进「···」（data-collapsed）、镜像项点击回派原按钮有消息反馈', async ({
  page,
}) => {
  await page.setViewportSize({ width: 480, height: 800 })
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-overflow')
  await page.waitForFunction(
    () =>
      [...document.querySelector('#ab-overflow')!.querySelectorAll('[slot="actions"]')].some((b) =>
        b.hasAttribute('data-collapsed'),
      ),
    null,
    { timeout: 5000 },
  )
  // 点「···」→ 弹层展开（镜像收纳项）
  await page.evaluate(() =>
    (document.querySelector('#ab-overflow')!.shadowRoot!.querySelector('[part="more"]') as HTMLElement).click(),
  )
  await page.waitForFunction(
    () =>
      !document.querySelector('#ab-overflow')!.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!.hidden,
    null,
    { timeout: 5000 },
  )
  const panel = await page.evaluate(() => {
    const bar = document.querySelector('#ab-overflow')!
    const morePanel = bar.shadowRoot!.querySelector('[part="more-panel"]')!
    return {
      mirrors: morePanel.querySelectorAll('.mirror').length,
      collapsed: [...bar.querySelectorAll('[slot="actions"]')].filter((b) => b.hasAttribute('data-collapsed')).length,
      expanded: bar.shadowRoot!.querySelector('[part="more"]')!.getAttribute('aria-expanded'),
    }
  })
  expect(panel.collapsed, '窄容器下有操作项被收纳隐藏').toBeGreaterThan(0)
  expect(panel.mirrors, '收纳项镜像进「···」弹层').toBe(panel.collapsed)
  expect(panel.expanded, '「···」aria-expanded 同步').toBe('true')

  // 点镜像项 → 回派原按钮 → demo onclick 弹 message（可见反馈），弹层关闭
  await page.evaluate(() =>
    document.querySelector('#ab-overflow')!.shadowRoot!.querySelectorAll<HTMLElement>('.mirror')[0]!.click(),
  )
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#ab-overflow')!.shadowRoot!.querySelector<HTMLElement>('[part="more-panel"]')!.hidden,
      ),
    )
    .toBe(true)
})

test('app-bar hide-on-scroll：fixed 形态下滚 data-hidden 滑出、上滚恢复', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ab-hide')
  expect(
    await page.evaluate(() => document.querySelector('#ab-hide')!.getAttribute('data-position')),
    'hide-on-scroll 生效于悬浮形态（fixed）',
  ).toBe('fixed')
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-hide')!.hasAttribute('data-hidden')))
    .toBe(true)
  await page.evaluate(() => window.scrollTo({ top: 80, behavior: 'instant' }))
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#ab-hide')!.hasAttribute('data-hidden')))
    .toBe(false)
})

test('app-bar 标题极窄防御：可用宽不足省略号阈值时标题整体隐藏（无半字形残片）', async ({ page }) => {
  await page.goto('/components/app-bar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-app-bar')
  const r = await page.evaluate(async () => {
    // 构造确定性极窄场景：host 限宽 + 宽 trailing（flex-shrink:0 不可收缩）把 title-wrap 挤到阈值以下
    const mk = (heading: string, trailingW: string) => {
      const host = document.createElement('oas-app-bar')
      host.setAttribute('heading', heading)
      host.style.cssText = 'width: 360px; position: fixed; top: -200px; left: 0;'
      const t = document.createElement('div')
      t.setAttribute('slot', 'trailing')
      t.style.cssText = `width: ${trailingW}; height: 20px;`
      host.appendChild(t)
      document.body.appendChild(host)
      return host
    }
    const narrow = mk('极窄标题防御回归', '300px')
    const normal = mk('常规标题对照', '40px')
    // 等 update + container query 生效（双 rAF 保证一帧布局完成）
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const read = (host: HTMLElement) => {
      const wrap = host.shadowRoot!.querySelector<HTMLElement>('[part="title-wrap"]')!
      const title = host.shadowRoot!.querySelector<HTMLElement>('[part="title"]')!
      const fs = parseFloat(getComputedStyle(wrap).fontSize)
      return {
        wrapW: wrap.clientWidth,
        threshold: fs * 2.5,
        titleHidden: getComputedStyle(title).display === 'none',
      }
    }
    const out = { narrow: read(narrow), normal: read(normal) }
    narrow.remove()
    normal.remove()
    return out
  })
  // 回归：title 宽 18px 时 ellipsis 连省略号都放不下 → 渲染半个字形残片；
  // 防御 = 可用宽 < 2.5em 时标题整体隐藏（@container max-width: 2.5em）
  expect(r.narrow.wrapW, '构造场景应把 title-wrap 挤到阈值以下（否则场景失效测不到防御）').toBeLessThan(
    r.narrow.threshold,
  )
  expect(r.narrow.titleHidden, '可用宽不足完整「字形+省略号」时标题应整体隐藏，而非渲染半字形').toBe(true)
  expect(r.normal.wrapW, '对照场景 title-wrap 应在阈值以上').toBeGreaterThan(r.normal.threshold)
  expect(r.normal.titleHidden, '常规宽度下标题不得被防御误隐藏').toBe(false)
})
