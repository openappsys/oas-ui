// 复核回归：toolbar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('toolbar 窄容器子项防收缩：项保持固有宽度、溢出触发「···」、弹层镜像项为 menuitemcheckbox', async ({ page }) => {
  await page.goto('/components/toolbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tb-overflow')
  const r = await page.evaluate(async () => {
    const host = document.querySelector('#tb-overflow')!
    host.scrollIntoView({ block: 'center' })
    await new Promise((res) => setTimeout(res, 500))
    const more = host.shadowRoot!.querySelector<HTMLElement>('.more')
    const kids = [...host.children].filter((k) => !k.hasAttribute('data-collapsed'))
    const collapsed = [...host.children].filter((k) => k.hasAttribute('data-collapsed'))
    // 至少一个文本按钮未被压扁（宽度 > 按钮内容合理下限）
    const textBtn = kids.find((k) => (k.textContent || '').trim().length >= 2)
    const minW = textBtn ? textBtn.getBoundingClientRect().width : 0
    let panelRoles: string[] = []
    if (more && !more.hidden) {
      more.click()
      await new Promise((res) => setTimeout(res, 400))
      const panel = host.shadowRoot!.querySelector<HTMLElement>('.more-panel')
      if (panel && !panel.hidden) {
        panelRoles = [...panel.querySelectorAll('[role]')].map((n) => n.getAttribute('role') || '')
      }
    }
    return {
      moreVisible: !!more && !more.hidden,
      collapsedCount: collapsed.length,
      minW: minW | 0,
      panelRoles,
    }
  })
  expect(r.moreVisible, '「···」收纳项应可见').toBe(true)
  expect(r.collapsedCount, '应有被收纳项').toBeGreaterThan(0)
  expect(r.minW, '未收纳按钮不应被压扁（两字中文按钮固有宽约 24px+，压扁态为 ~13px）').toBeGreaterThan(24)
  expect(r.panelRoles.length, '弹层应有镜像项').toBeGreaterThan(0)
  for (const role of r.panelRoles) {
    expect(['menuitem', 'menuitemcheckbox'], '镜像项角色应为 menuitem/menuitemcheckbox').toContain(role)
  }
})

// 移动端专项：coarse pointer 下「···」收纳钮与镜像行最小高度 ≥44px（触控目标抬升）
test('toolbar 移动端：coarse 下「···」钮与镜像行最小高度 ≥44px（--oas-touch-target-min）', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/toolbar.html', { waitUntil: 'domcontentloaded' })
    await up(page, '#tb-overflow')
    const r = await page.evaluate(async () => {
      const host = document.querySelector('#tb-overflow')!
      host.scrollIntoView({ block: 'center' })
      await new Promise((res) => setTimeout(res, 500))
      const root = host.shadowRoot!
      const css = root.querySelector('style')!.textContent!
      const more = root.querySelector<HTMLElement>('.more')!
      if (more.hidden) return { collapsed: false as const }
      more.click()
      await new Promise((res) => setTimeout(res, 300))
      const mirror = root.querySelector<HTMLElement>('.more-panel [part="mirror-item"]')!
      return {
        collapsed: true as const,
        coarseRule: css.includes('@media (pointer: coarse)') && css.includes('--oas-touch-target-min'),
        moreMin: parseFloat(getComputedStyle(more).minHeight),
        mirrorMin: parseFloat(getComputedStyle(mirror).minHeight),
      }
    })
    expect(r.collapsed, '窄容器 demo 应触发溢出收纳').toBe(true)
    if (r.collapsed) {
      expect(r.coarseRule, '样式表应有 coarse 触摸目标规则').toBe(true)
      expect(r.moreMin, '「···」钮 coarse 下最小高度 ≥44px').toBeGreaterThanOrEqual(44)
      expect(r.mirrorMin, '镜像行 coarse 下最小高度 ≥44px').toBeGreaterThanOrEqual(44)
    }
  } finally {
    await ctx.close()
  }
})

// —— 缺陷回归：icon duotone 显式 data-layer 分层被元素序 fallback 劫持 ——
// 曾现缺陷：[data-layer='primary'/'secondary'] 显式分层规则与「前两个直接子元素」
// fallback 规则特异性相同（0,2,1）且 fallback 声明在后——SVG 按自然绘制序摆放
// （底色层在前、主图形在后）时，primary 层命中 > :nth-child(2) 的 secondary
// fallback，opacity 双双错乱（primary 变 0.4 / swap 两层全 1），双色观感消失。
// 修复：fallback 选择器加 :not([data-layer])——显式分层永远优先，序号兜底只管未标记的 SVG。
