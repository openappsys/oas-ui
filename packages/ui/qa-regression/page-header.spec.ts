// 复核回归：page-header——title 吸收、back 事件可见反馈、responsive 紧凑、ghost 钩子固化断言。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

test('page-header title 吸收不残留原生 title；点返回 oas-back 有消息可见反馈；ghost 类名钩子', async ({ page }) => {
  await page.goto('/components/page-header.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-page-header')
  const r = await page.evaluate(() => {
    const headers = [...document.querySelectorAll('oas-page-header')]
    const backArias = [...document.querySelectorAll('oas-page-header[back]')].map(
      (el) => el.shadowRoot!.querySelector('[part="back"]')?.getAttribute('aria-label') ?? '',
    )
    return {
      total: headers.length,
      titleResidue: headers.filter((el) => el.hasAttribute('title')).length,
      titled: headers.filter((el) => (el.shadowRoot!.querySelector('[part="title"]')?.textContent ?? '') !== '').length,
      backCount: backArias.length,
      backAriaOk: backArias.every((a) => a.length > 0),
      ghostOk: [...document.querySelectorAll('oas-page-header[ghost]')].every((el) =>
        el.classList.contains('oas-page-header--ghost'),
      ),
    }
  })
  expect(r.total, '页面有 page-header demo').toBeGreaterThan(0)
  expect(r.titleResidue, 'title 吸收：宿主不残留原生 title（悬停不弹原生提示）').toBe(0)
  expect(r.titled, '标题照常渲染进可见标题区').toBeGreaterThan(0)
  expect(r.backCount, 'back 头部有返回钮').toBeGreaterThan(0)
  expect(r.backAriaOk, '返回钮有可读名称（i18n aria-label）').toBe(true)
  expect(r.ghostOk, 'ghost 变体挂宿主类名钩子（背景/分隔线规则的 CSS 入口）').toBe(true)

  // 事件反馈 demo：onoas-back → message.info 可见反馈
  await realClick(page, 'oas-page-header[onoas-back]', '[part="back"]')
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, { timeout: 5000 })
})

test('page-header responsive 紧凑：组件宽 <768px 时 data-compact 生效、加宽后还原（ResizeObserver 驱动）', async ({
  page,
}) => {
  await page.goto('/components/page-header.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-page-header[responsive]')
  const sel = 'oas-page-header[responsive]'
  // docs 内容列天然窄（组件 clientWidth <768）→ 紧凑布局生效
  const narrow = await page.evaluate((s) => {
    const el = document.querySelector(s)!
    return { w: el.clientWidth, compact: el.hasAttribute('data-compact') }
  }, sel)
  expect(narrow.w, 'demo 内组件宽 <768px').toBeLessThan(768)
  expect(narrow.compact, '窄宽下紧凑钩子生效').toBe(true)

  // 宿主加宽 ≥768px → RO 触发重算 → 紧凑还原（data-compact 移除）。
  // demo 容器为 flex（flex-shrink 会缩回宽度）且子项 max-width:100%，需一并解除
  await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement
    el.style.width = '900px'
    el.style.maxWidth = 'none'
    el.style.flex = 'none'
  }, sel)
  await expect
    .poll(() =>
      page.evaluate((s) => {
        const el = document.querySelector(s)!
        return { wide: el.clientWidth >= 768, compact: el.hasAttribute('data-compact') }
      }, sel),
    )
    .toEqual({ wide: true, compact: false })

  // 恢复宿主宽度 → 紧凑重新生效
  await page.evaluate((s) => {
    const el = document.querySelector(s) as HTMLElement
    el.style.width = ''
    el.style.maxWidth = ''
    el.style.flex = ''
  }, sel)
  await expect
    .poll(() =>
      page.evaluate((s) => {
        const el = document.querySelector(s)!
        return { narrow: el.clientWidth > 0 && el.clientWidth < 768, compact: el.hasAttribute('data-compact') }
      }, sel),
    )
    .toEqual({ narrow: true, compact: true })
})
