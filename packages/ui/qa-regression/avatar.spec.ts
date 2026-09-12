// 复核回归：avatar——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('avatar 徽标角标：badge 文本可见且带底色、dot 圆点不渲染文本', async ({ page }) => {
  // 曾现缺口：avatar 无徽标能力，通知计数/在线状态需宿主自绘角标；
  // 本次补 badge/badge-dot/badge-color/badge-placement 叠加角标（视觉对齐 oas-badge）。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[badge="99+"]')
  const textBadge = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge="99+"]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    const cs = getComputedStyle(b)
    return { visible: !b.hasAttribute('hidden'), text: b.textContent, bg: cs.backgroundColor }
  })
  expect(textBadge.visible).toBe(true)
  expect(textBadge.text).toBe('99+')
  expect(textBadge.bg, '徽标应有非透明底色').not.toBe('rgba(0, 0, 0, 0)')

  const dot = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[badge-dot]')!
    const b = el.shadowRoot!.querySelector('[part="badge"]')!
    return { dot: b.classList.contains('dot'), text: b.textContent }
  })
  expect(dot.dot).toBe(true)
  expect(dot.text).toBe('')
})

test('avatar 加载失败回退：404 图触发 img error 后回退首字符、状态保持', async ({ page }) => {
  // 曾现缺口：avatar 图片加载失败显示裂图，无占位回退；本次补 onerror → fallback 插槽/首字符。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[src*="invalid.example.com"]')
  // 等 img error 触发 → fallback 容器显示
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
      return el.shadowRoot!.querySelector('[part="fallback"]')!.hasAttribute('hidden') === false
    },
    null,
    { timeout: 10000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[src*="invalid.example.com"]')!
    return {
      imgHidden: el.shadowRoot!.querySelector('img')!.hasAttribute('hidden'),
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent,
    }
  })
  expect(r.imgHidden).toBe(true)
  expect(r.text).toBe('张')
})

test('avatar 能力补齐批次：shape/color/fit/枚举 size 机制与视觉落点', async ({ page }) => {
  // 固化本轮新增能力，防回归：形态选择器、颜色变量协议、fit、枚举 size、icon 插槽优先级
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[shape="square"]')

  const shape = await page.evaluate(() => {
    const host = document.querySelector('oas-avatar[shape="square"]') as HTMLElement
    const img = host.shadowRoot!.querySelector('img') as HTMLElement
    const round = document.querySelector('oas-avatar[shape="round"]') as HTMLElement
    const pick = (el: HTMLElement) => getComputedStyle(el).borderRadius
    return { square: pick(host), squareImg: pick(img), round: pick(round) }
  })
  expect(shape.square).toBe('0px')
  expect(shape.squareImg).toBe('0px')
  expect(parseFloat(shape.round)).toBeGreaterThan(0)

  const color = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[color="#7c3aed"]') as HTMLElement
    const cs = getComputedStyle(el)
    return { bg: cs.backgroundColor, fg: cs.color }
  })
  expect(color.bg).toBe('rgb(124, 58, 237)')
  expect(color.fg, '深紫底应自动取白字').toBe('rgb(255, 255, 255)')

  const fit = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[fit="contain"]') as HTMLElement
    return getComputedStyle(el.shadowRoot!.querySelector('img')!).objectFit
  })
  expect(fit).toBe('contain')

  const size = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[size="small"]') as HTMLElement
    return getComputedStyle(el).width
  })
  expect(size).toBe('24px')

  const icon = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar:has([slot="icon"])') as HTMLElement
    return {
      iconHidden: (el.shadowRoot!.querySelector('[part="icon"]') as HTMLElement).hidden,
      textHidden: (el.shadowRoot!.querySelector('[part="text"]') as HTMLElement).hidden,
    }
  })
  expect(icon.iconHidden).toBe(false)
  expect(icon.textHidden, '显式 icon 插槽不截首字').toBe(true)
})

test('avatar 长名自适应：多字 text 全量渲染且字号收缩到下限、超宽走省略号', async ({ page }) => {
  // 固化：text 多字不再截首字；字号收缩到下限（10px）后仍超宽的部分由 text-overflow: ellipsis
  // 视觉收口（7 字在 32px 圆内物理上不可全显，截半字不可接受）；全文保留在 textContent。
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[size="32"][text="开源组件实验室"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar[size="32"][text="开源组件实验室"]') as HTMLElement
    const text = el.shadowRoot!.querySelector('[part="text"]') as HTMLElement
    const cs = getComputedStyle(text)
    return {
      content: text.textContent,
      fontSize: parseFloat(cs.fontSize),
      overflow: cs.textOverflow,
      nowrap: cs.whiteSpace,
    }
  })
  expect(r.content).toBe('开源组件实验室')
  expect(r.fontSize).toBeLessThanOrEqual(10.5) // 收缩到下限（基准 12.8 → 10px）
  expect(r.overflow).toBe('ellipsis')
  expect(r.nowrap).toBe('nowrap')
})

test('avatar 换头像入口：hover 显形遮罩、点击有可见反馈（message 浮层）', async ({ page }) => {
  // 固化：trigger 遮罩 hover 显形 + oas-trigger 事件反馈（demo 弹 message，非仅 console）
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#avatar-trigger-demo oas-avatar')
  const host = page.locator('#avatar-trigger-demo oas-avatar').first()

  const before = await page.evaluate(() => {
    const el = document.querySelector('#avatar-trigger-demo oas-avatar') as HTMLElement
    const t = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
    return getComputedStyle(t).opacity
  })
  expect(before).toBe('0')

  await host.hover()
  // 显形有 transition（--oas-transition-fast）：轮询到过渡结束而非悬停瞬读
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const el = document.querySelector('#avatar-trigger-demo oas-avatar') as HTMLElement
          const t = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
          return getComputedStyle(t).opacity
        }),
      { timeout: 3000 },
    )
    .toBe('1')

  await page.locator('#avatar-trigger-demo oas-avatar [part="trigger"]').first().click()
  await expect(page.locator('oas-message')).toHaveCount(1, { timeout: 5000 })
})

test('avatar-group 折叠弹层：hover +N 展开全部被折叠成员，Escape 关闭', async ({ page }) => {
  // 固化：+N hover 弹层机制（克隆头像列表 + 定位引擎）与键盘关闭
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar-group[max="4"]')
  const group = page.locator('oas-avatar-group[max="4"]')

  await group.locator('[part="count"]').hover()
  const panel = group.locator('[part="overflow"]')
  await expect(panel).toHaveAttribute('aria-hidden', 'false', { timeout: 5000 })
  const clones = await group.locator('[part="overflow-list"] oas-avatar').count()
  expect(clones).toBe(2)

  await page.keyboard.press('Escape')
  await expect(panel).toHaveAttribute('aria-hidden', 'true')
})

test('avatar-group 间距：spacing 属性注入叠距变量、成员描边防透叠', async ({ page }) => {
  // 固化：叠距变量化 + token ring 描边（视觉落在 box-shadow）
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar-group[spacing="4"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-avatar-group[spacing="4"]') as HTMLElement
    const cs = getComputedStyle(el)
    const first = el.querySelector('oas-avatar') as HTMLElement
    return {
      overlap: cs.getPropertyValue('--oas-avatar-group-overlap').trim(),
      ring: getComputedStyle(first).boxShadow,
    }
  })
  expect(r.overlap).toBe('4px')
  expect(r.ring).not.toBe('none')
})
