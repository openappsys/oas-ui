// 复核回归：anchor——历史缺陷固化断言（移动端触摸目标）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('anchor 移动端：coarse 下链接行最小高度 ≥44px（--oas-touch-target-min）', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/anchor.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-anchor')
    const r = await page.evaluate(() => {
      const root = document.querySelector('oas-anchor')!.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const link = root.querySelector<HTMLElement>("[part='link']")!
      return {
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        linkMin: parseFloat(getComputedStyle(link).minHeight),
      }
    })
    expect(r.coarseRule, '样式表应有 coarse 触摸目标规则').toBe(true)
    expect(r.linkMin, '链接行 coarse 下最小高度 ≥44px').toBeGreaterThanOrEqual(44)
  } finally {
    await ctx.close()
  }
})

// —— 缺陷回归：anchor 墨水条在 hidden→visible 容器里首帧测量坍缩 ——
// 曾现缺陷：把 <oas-anchor> 挂进 display:none / 0 尺寸容器时，当前项 offsetWidth/offsetHeight
// 量到 0 被直接写进墨水条内联样式；容器转可见后若期间无 resize/scroll/active 变更，则没有
// 复测触发点 → 选中指示 width/height 停在 0（不可见）。
// 修复：量到 0 不写入（保留上一次有效值）+ 宿主尺寸 0→非 0 复测自愈（共享 measure-when-visible 助手）。
// 断言：隐藏容器挂载（A）转为可见后，墨水条尺寸与当前项/可见容器直接渲染（B）一致且 >0。
test('anchor 墨水条 hidden→visible：尺寸自愈，与可见容器直接渲染一致且 >0', async ({ page }) => {
  await page.goto('/components/anchor.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-anchor')
  const r = await page.evaluate(async () => {
    const raf = () => new Promise((res) => requestAnimationFrame(() => res(null)))
    const tick = (n: number) => new Promise((res) => setTimeout(res, n))
    const items = JSON.stringify([
      { href: '#sec-1', title: '第一章' },
      { href: '#sec-2', title: '第二章' },
      { href: '#sec-3', title: '第三章' },
    ])
    const build = async (hidden: boolean, variant: string) => {
      const box = document.createElement('div')
      box.style.cssText = 'width:240px'
      if (hidden) box.style.display = 'none'
      document.body.appendChild(box)
      const anchor = document.createElement('oas-anchor') as HTMLElement
      anchor.setAttribute('variant', variant)
      anchor.setAttribute('items', items)
      anchor.setAttribute('active', '#sec-2')
      box.appendChild(anchor)
      await tick(60)
      if (hidden) box.style.display = ''
      await raf()
      await raf()
      await tick(260) // 等墨水条过渡（transition 0.15s）稳定
      const root = anchor.shadowRoot!
      const ink = root.querySelector<HTMLElement>('[part="ink"]')!
      const active = [...root.querySelectorAll<HTMLElement>('[part="link"]')].find(
        (l) => l.getAttribute('aria-current') === 'true',
      )!
      const ir = ink.getBoundingClientRect()
      const ar = active.getBoundingClientRect()
      const out = {
        inkW: +ir.width.toFixed(2),
        inkH: +ir.height.toFixed(2),
        inkTop: +ir.top.toFixed(2),
        inkLeft: +ir.left.toFixed(2),
        linkW: +ar.width.toFixed(2),
        linkH: +ar.height.toFixed(2),
        linkTop: +ar.top.toFixed(2),
        inkDisplay: getComputedStyle(ink).display,
      }
      anchor.remove()
      box.remove()
      return out
    }
    const verticalHidden = await build(true, 'default')
    const verticalVisible = await build(false, 'default')
    const underlineHidden = await build(true, 'underline')
    const underlineVisible = await build(false, 'underline')
    return { verticalHidden, verticalVisible, underlineHidden, underlineVisible }
  })

  // 竖条（default）：高度随当前项，改前 hidden 挂载为 0
  expect(r.verticalHidden.inkDisplay, '竖条应可见').not.toBe('none')
  expect(r.verticalHidden.inkH, '竖条高 > 0（改前为 0 → RED）').toBeGreaterThan(0)
  expect(Math.abs(r.verticalHidden.inkH - r.verticalHidden.linkH), '竖条高应等于当前项高（±1px）').toBeLessThanOrEqual(
    1,
  )
  expect(
    Math.abs(r.verticalHidden.inkH - r.verticalVisible.inkH),
    '竖条高应与可见容器一致（±1px）',
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(r.verticalHidden.inkTop - r.verticalHidden.linkTop),
    '竖条 top 应对齐当前项（±1px）',
  ).toBeLessThanOrEqual(1)

  // underline 横条：宽度随当前项，改前 hidden 挂载为 0
  expect(r.underlineHidden.inkDisplay, '下划线应可见').not.toBe('none')
  expect(r.underlineHidden.inkW, '下划线宽 > 0（改前为 0 → RED）').toBeGreaterThan(0)
  expect(
    Math.abs(r.underlineHidden.inkW - r.underlineHidden.linkW),
    '下划线宽应等于当前项宽（±1px）',
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(r.underlineHidden.inkW - r.underlineVisible.inkW),
    '下划线宽应与可见容器一致（±1px）',
  ).toBeLessThanOrEqual(1)
})
