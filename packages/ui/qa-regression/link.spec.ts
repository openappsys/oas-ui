// 复核回归：link——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('link href="#" 点击不滚动页面', async ({ page }) => {
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const link = page.locator('.demo-block', { hasText: '点击事件' }).locator('oas-link')
  await link.scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const before = await page.evaluate(() => window.scrollY)
  await link.click()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => window.scrollY)
  expect(after).toBe(before)
  expect(after).toBeGreaterThan(0)
})

test('link 三态下划线 + icon + external + rel：hover 悬停出下划线、图标前后位置、外链自动 target/rel/图标', async ({
  page,
}) => {
  // v2.1 link 补齐回归：underline 三态（hover 默认悬停出现）+ icon/icon-position +
  // external（自动 target=_blank + rel + 外链图标）+ rel 安全自动补。
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const r = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) => b.textContent?.includes('hover'))
    const links = [...block!.querySelectorAll('oas-link')]
    const deco = (el: Element) => getComputedStyle(el.shadowRoot!.querySelector('a')!).textDecorationLine
    return {
      hoverRest: deco(links[0]!),
      alwaysRest: deco(links[1]!),
      neverRest: deco(links[2]!),
      iconDemo: (() => {
        const iconBlock = [...document.querySelectorAll('.demo-block')].find((b) => b.textContent?.includes('搜索文档'))
        const withIcon = iconBlock!.querySelector('oas-link[icon]')!
        const a = withIcon.shadowRoot!.querySelector('a')!
        return {
          firstIsIcon: a.firstElementChild!.classList.contains('icon'),
          iconSvg: !!a.querySelector('.icon svg'),
        }
      })(),
      external: (() => {
        const ext = document.querySelector('oas-link[external]')!
        const a = ext.shadowRoot!.querySelector('a')!
        return {
          target: a.getAttribute('target'),
          rel: a.getAttribute('rel'),
          iconAtEnd: a.lastElementChild!.classList.contains('icon-external'),
        }
      })(),
    }
  })
  expect(r.hoverRest).not.toContain('underline') // 静止无下划线
  expect(r.alwaysRest).toContain('underline') // 常驻
  expect(r.neverRest).not.toContain('underline') // 无
  expect(r.iconDemo.firstIsIcon).toBe(true) // 图标在文字前（start 默认）
  expect(r.iconDemo.iconSvg).toBe(true)
  expect(r.external.target).toBe('_blank')
  expect(r.external.rel).toBe('noopener noreferrer')
  expect(r.external.iconAtEnd).toBe(true)

  // hover 悬停真交互：hover 态出下划线
  const hoverLink = page.locator('oas-link').filter({ hasText: 'hover' }).first()
  await hoverLink.hover()
  await page.waitForTimeout(200)
  const hoverDeco = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-link')].find((l) => l.textContent?.includes('hover'))
    return getComputedStyle(el!.shadowRoot!.querySelector('a')!).textDecorationLine
  })
  expect(hoverDeco).toContain('underline')
})

test('link 色板达标：预设名映射 -text 达标 token、自定义色原值渲染、type 语义色改指 text 变体', async ({ page }) => {
  // v2.1 link 色板对齐（设计期文字 token 模型）：预设亮色（gold 等）白底本色不达标，
  // 预设名映射 --oas-preset-*-text 达标 token；自定义色值原值渲染（责任在宿主）；
  // 存量隐患修复：type=success/warning/danger 文字色改指 -text 变体（此前 3.3:1 不达 AA）。
  await page.goto('/components/link.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-link')
  const r = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) => b.textContent?.includes('magenta'))
    const color = (name: string) =>
      getComputedStyle(block!.querySelector(`oas-link[color="${name}"]`)!.shadowRoot!.querySelector('a')!).color
    const sem = [...document.querySelectorAll('.demo-block')].find((b) => b.textContent?.includes('主要链接'))
    const typeColor = (t: string) =>
      getComputedStyle(sem!.querySelector(`oas-link[type="${t}"]`)!.shadowRoot!.querySelector('a')!).color
    // 自定义色 demo：按 color 属性值精确定位（不依赖 DOM 顺序）；
    // demo 用 token 表达自定义色值（写死 hex 无法两主题同时达标）
    const customByAttr = (attr: string) => {
      const host = document.querySelector(`oas-link[color="${attr}"]`)!
      return getComputedStyle(host.shadowRoot!.querySelector('a')!).color
    }
    return {
      gold: color('gold'),
      geekblue: color('geekblue'),
      purple: color('purple'),
      success: typeColor('success'),
      warning: typeColor('warning'),
      custom: customByAttr('var(--oas-color-info-text)'),
      customOverride: customByAttr('var(--oas-preset-purple-text)'),
    }
  })
  // light 下预设亮色取 -text 深色变体（gold 本色 #faad14 白底 1.9:1，text 变体 #6a4c00）
  expect(r.gold).toBe('rgb(106, 76, 0)')
  // 本色达标者保本色
  expect(r.geekblue).toBe('rgb(37, 68, 219)')
  expect(r.purple).toBe('rgb(114, 46, 209)')
  // type 语义色改 -text 变体
  expect(r.success).toBe('rgb(17, 129, 58)')
  expect(r.warning).toBe('rgb(167, 92, 5)')
  // 自定义色原值渲染：--oas-color-info-text（#0891b2）与 --oas-preset-purple-text（#722ed1）各自解析为本色
  expect(r.custom).toBe('rgb(8, 145, 178)')
  expect(r.customOverride).toBe('rgb(114, 46, 209)')
})
