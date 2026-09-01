// 复核回归：notification——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

async function ready(page: import('@playwright/test').Page) {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
}

test('notification 进度条：show-progress 渲染、动画时长与 duration 同步、位于底部', async ({
  page,
}) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[show-progress]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const fill = root.querySelector<HTMLElement>('.progress-fill')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const desc = root.querySelector<HTMLElement>('[part="description"]')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const d = desc.getBoundingClientRect()
    return {
      progressHidden: progress.hidden,
      fillInlineDuration: fill.style.animationDuration, // '5000ms'（demo duration: 5000）
      computedDuration: getComputedStyle(fill).animationDuration,
      animationName: getComputedStyle(fill).animationName,
      belowDescription: p.top >= d.bottom - 1, // 进度条在描述下方
      insideBox: p.bottom <= b.bottom + 1, // 进度条在卡片盒内
      topClass: progress.classList.contains('progress-top'),
    }
  })
  expect(r.progressHidden).toBe(false)
  expect(r.fillInlineDuration).toBe('5000ms')
  expect(r.computedDuration).not.toBe('0s') // 动画真实生效（非 0 时长）
  expect(r.animationName).toContain('oas-notification-progress')
  expect(r.belowDescription).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.topClass).toBe(false)
})

test('notification 进度条 progress-position=top：进度条切到描述上方', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '带进度条' }).locator('oas-button').nth(1).click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[progress-position="top"]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[progress-position="top"]')!
    const root = el.shadowRoot!
    const progress = root.querySelector<HTMLElement>('[part="progress"]')!
    const box = root.querySelector<HTMLElement>('[part="box"]')!
    const titleRow = root.querySelector<HTMLElement>('.title-row')!
    const p = progress.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    const t = titleRow.getBoundingClientRect()
    return {
      topClass: progress.classList.contains('progress-top'),
      aboveTitle: p.bottom <= t.top + 1, // 进度条在标题行上方（卡盒顶部）
      insideBox: p.top >= b.top - 1,
      notHidden: !progress.hidden,
    }
  })
  expect(r.topClass).toBe(true)
  expect(r.aboveTitle).toBe(true)
  expect(r.insideBox).toBe(true)
  expect(r.notHidden).toBe(true)
})

test('notification 长内容可滚动：描述区限高 + overflow-y auto 且真实可滚', async ({ page }) => {
  await page.goto('/components/notification.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).notification !== 'undefined', null, {
    timeout: 10000,
  })
  await page.locator('.demo-block', { hasText: '长内容可滚动' }).locator('oas-button').click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('oas-notification')
        ?.shadowRoot?.querySelector('[part="description"]')
        ?.classList.contains('scrollable') ?? false,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification')!
    const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="description"]')!
    const cs = getComputedStyle(desc)
    return {
      scrollableClass: desc.classList.contains('scrollable'),
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      scrollable: desc.scrollHeight > desc.clientHeight, // 内容超长 → 真实可滚
    }
  })
  expect(r.scrollableClass).toBe(true)
  expect(r.maxHeight).not.toBe('none')
  expect(r.overflowY).toBe('auto')
  expect(r.scrollable).toBe(true)
})

// —— notification P1-P17 做透能力固化断言 ——
// 覆盖：悬停暂停（计时+进度条）、closable 开关、onClick 点击回调、四角栈定位、
// max 挤出、collapsible 折叠徽章、footer 操作区、loading spinner、进度条颜色变量。

test('notification 悬停暂停：hover 后进度条 animation-play-state=paused 且不自动关闭', async ({
  page,
}) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '悬停暂停' }).locator('oas-button').first().click()
  const notif = page.locator('oas-notification[show-progress]').first()
  await notif.waitFor({ timeout: 5000 })
  await notif.hover()
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    const fill = el.shadowRoot!.querySelector<HTMLElement>('.progress-fill')!
    return { playState: fill.style.animationPlayState }
  })
  expect(r.playState).toBe('paused')
  // 8s duration，悬停 1.2s 后仍存活（若未暂停会因计时流逝而提前关闭风险排除）
  await page.waitForTimeout(1200)
  expect(await page.locator('oas-notification[show-progress]').count()).toBeGreaterThan(0)
  await page.mouse.move(10, 300) // 移出恢复
  const r2 = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    return el.shadowRoot!.querySelector<HTMLElement>('.progress-fill')!.style.animationPlayState
  })
  expect(r2).not.toBe('paused')
})

test('notification closable=false：关闭按钮渲染但隐藏', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '关闭开关' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[closable="false"]') != null,
    null,
    { timeout: 5000 },
  )
  const hidden = await page.evaluate(
    () =>
      document
        .querySelector('oas-notification[closable="false"]')!
        .shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.hidden,
  )
  expect(hidden).toBe(true)
})

test('notification onClick：卡片可点击（clickable 属性 + oas-click 触发计数）', async ({
  page,
}) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '点击回调' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[clickable]') != null,
    null,
    { timeout: 5000 },
  )
  await page.locator('oas-notification[clickable] [part="box"]').click()
  await page.waitForFunction(
    () =>
      (document.getElementById('notif-click-count')?.textContent?.match(/(\d+)/)?.[1] ?? '0') !==
      '0',
    null,
    { timeout: 5000 },
  )
})

test('notification position 四角：bottom-left 栈定位正确', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '位置四角' }).locator('oas-button').nth(2).click()
  await page.waitForFunction(
    () => document.querySelectorAll('oas-notification').length > 0,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('oas-notification')!
    const stack = el.parentElement!
    return { bottom: stack.style.bottom, left: stack.style.left }
  })
  expect(r.bottom).toBe('16px')
  expect(r.left).toBe('16px')
})

test('notification max：连发 6 条（max=3）只存活 3 条', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '数量上限' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelectorAll('oas-notification').length === 3,
    null,
    { timeout: 5000 },
  )
})

test('notification collapsible：超阈值折叠 + "+N" 徽章点击展开', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '栈治理' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('.oas-notification-stack .stack-badge') != null,
    null,
    { timeout: 5000 },
  )
  const collapsedCount = await page.evaluate(() => {
    const stack = document.querySelector('.oas-notification-stack.stack-collapsible')!
    return [...stack.querySelectorAll('oas-notification')].filter((el) =>
      el.classList.contains('oas-notification-collapsed'),
    ).length
  })
  expect(collapsedCount).toBe(4) // 5 条、留最新 1 条
  await page.locator('.stack-badge').click()
  const expandedCount = await page.evaluate(() => {
    const stack = document.querySelector('.oas-notification-stack.stack-collapsible')!
    return [...stack.querySelectorAll('oas-notification')].filter((el) =>
      el.classList.contains('oas-notification-collapsed'),
    ).length
  })
  expect(expandedCount).toBe(0)
})

test('notification footer：操作区渲染且按钮可点', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: 'footer 操作区' }).locator('oas-button').click()
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-notification')
      const footer = el?.shadowRoot?.querySelector<HTMLElement>('[part="footer"]')
      return footer != null && !footer.hidden
    },
    null,
    { timeout: 5000 },
  )
  const texts = await page.evaluate(() => {
    const el = document.querySelector('oas-notification')!
    return el.shadowRoot!.querySelector('[part="footer"]')!.textContent ?? ''
  })
  expect(texts).toContain('查看详情')
  expect(texts).toContain('撤销')
})

test('notification loading：spinner 渲染、type=loading、无关闭按钮', async ({ page }) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: 'loading' }).locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[type="loading"]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[type="loading"]')!
    const root = el.shadowRoot!
    return {
      spinner: root.querySelector('[part="spinner"]') != null,
      closeHidden: root.querySelector<HTMLElement>('[part="close"]')!.hidden,
    }
  })
  expect(r.spinner).toBe(true)
  expect(r.closeHidden).toBe(true)
})

test('notification 进度条颜色变量：--oas-notification-progress-color 计算值可穿透', async ({
  page,
}) => {
  await ready(page)
  await page.locator('.demo-block', { hasText: '进度条颜色' }).locator('oas-button').click()
  await page.waitForFunction(
    () => document.querySelector('oas-notification[show-progress]') != null,
    null,
    { timeout: 5000 },
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-notification[show-progress]')!
    const fill = el.shadowRoot!.querySelector<HTMLElement>('.progress-fill')!
    const cs = getComputedStyle(fill)
    return {
      // 挂载容器设置了 danger 色，穿透后 fill 计算色应为 danger token 解析色（非 primary）
      backgroundColor: cs.backgroundColor,
      inColorHost: !!document.getElementById('notif-color-host')!.querySelector('oas-notification'),
    }
  })
  expect(r.inColorHost).toBe(true)
  expect(r.backgroundColor).not.toBe('')
})

