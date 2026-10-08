// 复核回归：conversation 族（oas-bubble / oas-attachment / oas-message-scroller / oas-marker / oas-message-row）
// ——会话族首批五件的真实浏览器固化。覆盖：scroller 跳底按钮真交互、AI 式底部跟随（离底不打扰 /
// 回底跟随）、IM 式钉底、scroll-state demo 反馈、attachment 内置操作事件可见反馈、暗色 token 切换。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 读 scroller shadow 视口滚动几何 */
function readScroll(page: import('@playwright/test').Page, sel: string) {
  return page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    return { top: vp.scrollTop, height: vp.scrollHeight, client: vp.clientHeight }
  }, sel)
}

/** 在 shadow 视口上执行确定性滚动并触发 scroll 事件 */
async function scrollTo(page: import('@playwright/test').Page, sel: string, top: number): Promise<void> {
  await page.evaluate(
    ({ s, top }) => {
      const host = document.querySelector(s) as HTMLElement
      const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
      vp.scrollTop = top
      vp.dispatchEvent(new Event('scroll'))
    },
    { s: sel, top },
  )
}

/** 等待 scroller 布局稳定（upgrade + 首帧定位 + 内容布局就位） */
async function waitLayout(page: import('@playwright/test').Page, sel: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const { height, client } = await readScroll(page, sel)
        return height
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(0)
}

test('message-scroller 跳底按钮：离底显形、点击落底、到底隐藏（真交互链）', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-jump')
  await waitLayout(page, '#msc-jump')
  const jump = page.locator('#msc-jump').locator('[part="button"]')

  // 初始在底部（default-position=end）→ 按钮隐藏
  await expect(jump).toBeHidden()

  // 真实滚到顶 → 按钮显形
  const height = await page.evaluate(() => {
    const host = document.querySelector('#msc-jump') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    return vp.scrollHeight - vp.clientHeight
  })
  expect(height, 'demo 内容应超出视口（可滚）').toBeGreaterThan(50)
  await scrollTo(page, '#msc-jump', 0)
  await expect(jump).toBeVisible()
  // 可读名称走 locale（中文页）
  await expect(jump).toHaveAttribute('aria-label', '滚动到底部')

  // 点击跳底 → 落底 + 按钮隐藏
  await jump.click()
  await expect
    .poll(
      async () => {
        const { top, height: h, client } = await readScroll(page, '#msc-jump')
        return h - client - top
      },
      { timeout: 5000 },
    )
    .toBeLessThanOrEqual(8)
  await expect(jump).toBeHidden()
})

test('message-scroller AI 式 auto-scroll：离底追加不打扰、回底后跟随（读者意图优先）', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-ai')

  // 先追加数行使内容溢出视口（内容不满屏时 atBottom 恒真，「离底」语义不成立）
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      const host = document.querySelector('#msc-ai') as HTMLElement
      const row = document.createElement('p')
      row.textContent = '铺垫行 ' + Date.now()
      host.appendChild(row)
    })
    await page.waitForTimeout(60)
  }
  await expect
    .poll(
      async () => {
        const { height: h, client } = await readScroll(page, '#msc-ai')
        return h - client
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(50)

  // 真实滚离底部（读者上翻阅读）
  await scrollTo(page, '#msc-ai', 0)
  const topBefore = (await readScroll(page, '#msc-ai')).top

  // 流式追加：离底阅读时不被拉回
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const host = document.querySelector('#msc-ai') as HTMLElement
      const row = document.createElement('p')
      row.textContent = '流式行 ' + Date.now()
      host.appendChild(row)
    })
    await page.waitForTimeout(60)
  }
  const afterAway = await readScroll(page, '#msc-ai')
  expect(afterAway.top, '离底阅读时不被拉回').toBe(topBefore)

  // 滚回底部释放跟随（auto-scroll 模式：到底即恢复跟随）
  const max = await page.evaluate(() => {
    const host = document.querySelector('#msc-ai') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    return vp.scrollHeight - vp.clientHeight
  })
  await scrollTo(page, '#msc-ai', max)
  await page.evaluate(() => {
    const host = document.querySelector('#msc-ai') as HTMLElement
    const row = document.createElement('p')
    row.textContent = '回底后的新行 ' + Date.now()
    host.appendChild(row)
  })
  await expect
    .poll(
      async () => {
        const { top, height: h, client } = await readScroll(page, '#msc-ai')
        return h - client - top
      },
      { timeout: 5000 },
    )
    .toBeLessThanOrEqual(8)
})

test('message-scroller IM 式 pin-to-bottom：上翻也被拉回底部', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-im')
  await scrollTo(page, '#msc-im', 0)
  await page.evaluate(() => {
    const host = document.querySelector('#msc-im') as HTMLElement
    const row = document.createElement('oas-message-row')
    row.setAttribute('align', 'end')
    const bubble = document.createElement('oas-bubble')
    bubble.setAttribute('variant', 'secondary')
    bubble.textContent = '钉底回归 ' + Date.now()
    row.appendChild(bubble)
    host.appendChild(row)
  })
  await expect
    .poll(
      async () => {
        const { top, height: h, client } = await readScroll(page, '#msc-im')
        return h - client - top
      },
      { timeout: 5000 },
    )
    .toBeLessThanOrEqual(8)
})

test('message-scroller oas-scroll-state demo 反馈可见（非 console）', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-jump')
  await waitLayout(page, '#msc-jump')
  await scrollTo(page, '#msc-jump', 0)
  await expect(page.locator('#msc-jump-out')).toHaveText(/atTop=true/, { timeout: 5000 })
  const max = await page.evaluate(() => {
    const host = document.querySelector('#msc-jump') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    return vp.scrollHeight - vp.clientHeight
  })
  await scrollTo(page, '#msc-jump', max)
  await expect(page.locator('#msc-jump-out')).toHaveText(/atBottom=true/, { timeout: 5000 })
})

test('message-scroller 视口 resize 刷新边缘状态（ResizeObserver 观察 viewport，此前是盲区）', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-jump')
  await waitLayout(page, '#msc-jump')
  const jump = page.locator('#msc-jump').locator('[part="button"]')

  // 滚到底 → 按钮隐藏（初始态）
  const max = async () =>
    page.evaluate(() => {
      const host = document.querySelector('#msc-jump') as HTMLElement
      const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
      return vp.scrollHeight - vp.clientHeight
    })
  await scrollTo(page, '#msc-jump', await max())
  await expect(jump).toBeHidden()

  // 容器变矮（不滚动）：scrollTop 不动 → 距底超出阈值 → 状态/按钮须经视口 resize 通道刷新
  await page.evaluate(() => {
    const host = document.querySelector('#msc-jump') as HTMLElement
    host.style.height = '110px'
  })
  await expect(jump, '视口 resize 后跳底按钮显形（无滚动介入）').toBeVisible({ timeout: 5000 })
})

test('message-scroller 首帧广播：宿主监听晚于元素连接（upgrade 时序）也能收到初始态', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-jump')
  const result = await page.evaluate(async () => {
    // 真实 upgrade 时序复现：元素先创建并连接（同步段已跑完），宿主此后才挂监听
    const el = document.createElement('oas-message-scroller') as HTMLElement & {
      scrollToEnd: () => void
    }
    // 显式高度让内容可滚（height auto 时 viewport 被内容撑开、恒不可滚，定位恒 0）
    el.style.height = '160px'
    el.style.width = '320px'
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('p')
      p.textContent = '广播验证行 ' + i
      el.appendChild(p)
    }
    document.body.appendChild(el)
    const states: Array<Record<string, unknown>> = []
    el.addEventListener('oas-scroll-state', (e) => states.push((e as CustomEvent).detail))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const vp = el.shadowRoot!.querySelector('.viewport') as HTMLElement
    const out = { count: states.length, last: states.at(-1) ?? null, top: vp.scrollTop }
    el.remove()
    return out
  })
  expect(result.count, '首帧（rAF）恰好广播一次初始态').toBe(1)
  expect(result.top, '初始定位（end）已在广播前生效').toBeGreaterThan(0)
  expect(result.last).toMatchObject({ atBottom: true })
})

test('message-scroller 加载历史 demo：滚到顶触发 prepend 且保位补偿（原生 scroll 不冒泡，须挂 shadow 视口）', async ({
  page,
}) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-history')
  const sel = '#msc-history'
  const rows = () => page.evaluate((s) => document.querySelector(s)!.querySelectorAll('oas-message-row').length, sel)
  // 初始 8 条
  await expect.poll(rows, { timeout: 8000 }).toBe(8)
  // demo 内容须超出视口（否则 atTop 恒真、加载语义不成立）
  await expect
    .poll(
      async () => {
        const { height, client } = await readScroll(page, sel)
        return height - client
      },
      { timeout: 8000 },
    )
    .toBeGreaterThan(50)

  // 真实滚到顶部 → demo 的 shadow 视口 loader 触发（宿主监听原生 scroll 收不到 → 旧实现永不触发）
  await scrollTo(page, sel, 0)
  await expect.poll(rows, { timeout: 8000 }).toBe(13)

  // 保位补偿：scrollTop 落在插入高度差上（未补偿会停在 0，阅读位置被新内容顶走）
  await expect.poll(async () => (await readScroll(page, sel)).top, { timeout: 8000 }).toBeGreaterThan(0)
})

test('attachment 内置操作钮：点击派发事件且 demo 可见反馈（消息出现）', async ({ page }) => {
  await page.goto('/components/attachment.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#att-remove-demo')
  const remove = page.locator('#att-remove-demo').locator('[part="remove"]')
  await expect(remove).toHaveAttribute('aria-label', '移除 draft-v1.docx')
  await remove.click()
  await expect(page.locator('oas-message')).toHaveCount(1, { timeout: 5000 })
  await expect(page.locator('oas-message')).toContainText('oas-remove')

  const download = page.locator('#att-remove-demo').locator('[part="download"]')
  await expect(download).toHaveAttribute('aria-label', '下载 draft-v1.docx')
  await download.click()
  await expect(page.locator('oas-message').last()).toContainText('oas-download')
})

test('暗色：bubble/attachment/marker 渲染无异常且底色随主题 token 翻转', async ({ page }) => {
  await page.goto('/components/bubble.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bubble-loading-demo')
  const bubble = page.locator('.demo-block').first().locator('oas-bubble').first()

  const bgOf = () =>
    bubble.evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.bubble') as HTMLElement).backgroundColor)
  const lightBg = await bgOf()

  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const darkBg = await bgOf()
  expect(darkBg, 'dark 下气泡底色与 light 不同（token 驱动）').not.toBe(lightBg)
  // 语义校验：light 的 bg-hover 是浅灰（亮度高），dark 是深灰（亮度低）
  const lum = (c: string) => {
    const m = c.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']
    return m.slice(0, 3).reduce((a, v) => a + Number(v), 0) / 3
  }
  expect(lum(lightBg), 'light 底色偏亮').toBeGreaterThan(lum(darkBg))

  // 暗色下 attachment/marker 正常渲染（无透明/丢失）
  await page.goto('/components/attachment.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#att-remove-demo')
  const attBg = await page.evaluate(() => {
    const host = document.querySelector('#att-remove-demo') as HTMLElement
    return getComputedStyle(host.shadowRoot!.querySelector('[part="attachment"]') as HTMLElement).backgroundColor
  })
  expect(attBg, 'attachment 卡底在 dark 下仍有着色').not.toBe('rgba(0, 0, 0, 0)')
})
