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
