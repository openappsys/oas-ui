// 复核回归：conversation 族（oas-bubble / oas-attachment / oas-message-scroller / oas-marker / oas-message-row）
// ——会话族首批五件的真实浏览器固化。覆盖：scroller 跳底按钮真交互、AI 式底部跟随（离底不打扰 /
// 回底跟随）、IM 式钉底、scroll-state demo 反馈、attachment 内置操作事件可见反馈、暗色 token 切换。

import { test, expect } from '@playwright/test'
import { up, realClick } from './helpers'

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

// ---------- B 批：滚动的精确性（异步保位 / 首屏防跳 / last-anchor / 轮次锚定）真交互固化 ----------

test('message-scroller 异步保位：prepend 历史含延迟图片，撑高后锚行位置不漂移', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-async')
  // 等 demo 动态填充完成（锚行带 message-id）
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('#msc-async oas-message-row').length), { timeout: 8000 })
    .toBeGreaterThanOrEqual(12)
  await waitLayout(page, '#msc-async')

  // 真点「插入历史（含延迟图片）」→ demo 内部 150ms 后图片撑高、500ms 后输出漂移结果
  await realClick(page, '#msc-async-load', null)
  await expect(page.locator('#msc-async-out')).toHaveText(/保位锚生效/, { timeout: 10000 })
})

test('message-scroller 首屏防跳：连接时 data-pending-scroll 在场，定位后同帧移除且已落底', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-basic')
  const result = await page.evaluate(async () => {
    const el = document.createElement('oas-message-scroller')
    el.style.height = '160px'
    el.style.width = '320px'
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('p')
      p.textContent = '防跳验证行 ' + i
      el.appendChild(p)
    }
    document.body.appendChild(el)
    // 同步段（upgrade 完成）：防跳反射必须已在场
    const duringConnect = el.hasAttribute('data-pending-scroll')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const vp = el.shadowRoot!.querySelector('.viewport') as HTMLElement
    const out = {
      duringConnect,
      removed: !el.hasAttribute('data-pending-scroll'),
      top: vp.scrollTop,
      atBottom: vp.scrollHeight - vp.clientHeight - vp.scrollTop <= 8,
    }
    el.remove()
    return out
  })
  expect(result.duringConnect, '连接即反射 data-pending-scroll（隐藏未定位帧）').toBe(true)
  expect(result.removed, '首帧定位后移除（不永久隐藏）').toBe(true)
  expect(result.top, '初始定位（end）已生效').toBeGreaterThan(0)
  expect(result.atBottom).toBe(true)
})

test('message-scroller last-anchor：打开定位在最后提问行顶部；scrollToMessage 精确跳转有可见反馈', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-last-anchor')
  // 等 demo 动态填充（1 + 6 + 1 轮 = 16 行，锚行 8 条）
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('#msc-last-anchor oas-message-row').length), {
      timeout: 8000,
    })
    .toBeGreaterThanOrEqual(16)
  // demo 填充后由宿主 scrollToMessage 补定位（客户端异步填充场景；demo 内部轮询收敛页面级晚应用样式）。
  // 注意语义边界：最后锚点靠底时「顶对齐」物理不可达（下方内容不足一屏，浏览器 clamp 贴底）——
  // 断言「锚顶对齐或贴底 + 锚行可见」
  await expect
    .poll(
      async () => {
        const state = await page.evaluate(() => {
          const host = document.querySelector('#msc-last-anchor') as HTMLElement
          const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
          const anchor = [...host.querySelectorAll('oas-message-row[anchor]')].at(-1) as HTMLElement
          return {
            offset: Math.abs(anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top),
            bottomGap: vp.scrollHeight - vp.clientHeight - vp.scrollTop,
            visible: anchor.getBoundingClientRect().top < vp.getBoundingClientRect().top + vp.clientHeight,
          }
        })
        return state.offset <= 8 || state.bottomGap <= 8 ? (state.visible ? 'settled' : 'invisible') : 'drifted'
      },
      { timeout: 8000 },
    )
    .toBe('settled')

  // scrollToMessage 真点：可见反馈（返回值 true + 输出行更新）
  await realClick(page, '#msc-la-first', null)
  await expect(page.locator('#msc-la-out')).toHaveText(/→ true/, { timeout: 5000 })
  const firstTop = await page.evaluate(() => {
    const host = document.querySelector('#msc-last-anchor') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    const first = host.querySelector('oas-message-row') as HTMLElement
    return first.getBoundingClientRect().top - vp.getBoundingClientRect().top
  })
  expect(Math.abs(firstTop), 'scrollToMessage(m1) 后第一条消息顶对视口顶').toBeLessThanOrEqual(8)
})

test('message-scroller turn-anchor：锚顶跟随中流式追加，提问钉在视口顶不漂移', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-turn')
  // 等 demo 动态填充（1 锚 + 8 回答行）
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('#msc-turn oas-message-row').length), { timeout: 8000 })
    .toBeGreaterThanOrEqual(9)

  // 真点「跳到当前提问」→ scrollToMessage 精确到锚顶（offset ≈0）
  await realClick(page, '#msc-turn-anchor', null)
  await page.waitForTimeout(200)
  const readAnchorOffset = () =>
    page.evaluate(() => {
      const host = document.querySelector('#msc-turn') as HTMLElement
      const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
      const anchor = [...host.querySelectorAll('oas-message-row[anchor]')].at(-1) as HTMLElement
      return anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top
    })
  expect(Math.abs(await readAnchorOffset()), '跳转后锚行顶对视口顶（±8px）').toBeLessThanOrEqual(8)

  // 真点「流式追加回答」：首行把锚对齐到 prev-peek 位（demo 首锚在内容顶，contentY-peek<0
  // clamp 到 0 → 锚保持在顶）；后续追加锚顶不动
  await realClick(page, '#msc-turn-stream', null)
  await expect(page.locator('#msc-turn-out')).toHaveText(/锚顶跟随/, { timeout: 10000 })
  const offsetAfter = await readAnchorOffset()
  expect(offsetAfter, '追加后锚钉在视口顶（peek 被 clamp，锚上无上文可露）').toBeLessThanOrEqual(8)
  expect(offsetAfter, '锚不漂移为负').toBeGreaterThanOrEqual(-8)
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

// ---------- 增强批：bubble reactions / marker status·shimmer / scroller visibility / attachment group ----------

test('bubble reactions：真点反应按钮派发 oas-reaction 且 demo 有可见反馈（aria-pressed/输出文案）', async ({
  page,
}) => {
  await page.goto('/components/bubble.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#bubble-reactions-demo')
  const box = page.locator('#bubble-reactions-demo').locator('[part="reactions"]')
  await expect(box).toBeVisible()
  await expect(box).toHaveAttribute('role', 'group')
  const btn = box.locator('button.reaction').first()
  await expect(btn, '选中态经 aria-pressed 表达（不只靠颜色）').toHaveAttribute('aria-pressed', 'true')
  await expect(btn).toHaveAttribute('aria-label', '👍 3')

  await realClick(page, '#bubble-reactions-demo', '[part="reactions"] button.reaction')
  await expect(page.locator('#bubble-reactions-out')).toHaveText(/oas-reaction/, { timeout: 5000 })
})

test('marker status 语义色 / shimmer 生效（计算样式）', async ({ page }) => {
  await page.goto('/components/marker.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-marker')
  const result = await page.evaluate(() => {
    const colorOf = (sel: string) => {
      const host = document.querySelector(sel) as HTMLElement | null
      const inner = host?.shadowRoot?.querySelector('.marker') as HTMLElement | null
      return inner ? getComputedStyle(inner).color : ''
    }
    const shimmerHost = document.querySelector('oas-marker[shimmer]') as HTMLElement | null
    const content = shimmerHost?.shadowRoot?.querySelector('.content') as HTMLElement | null
    const cs = content ? getComputedStyle(content) : null
    return {
      danger: colorOf('oas-marker[status="danger"]'),
      info: colorOf('oas-marker[status="info"]'),
      plain: colorOf('oas-marker:not([status])'),
      clip: cs ? cs.getPropertyValue('background-clip') || cs.getPropertyValue('-webkit-background-clip') : '',
      anim: cs ? cs.animationName : '',
    }
  })
  expect(result.danger).not.toBe(result.plain)
  expect(result.info).not.toBe(result.plain)
  expect(result.info).not.toBe(result.danger)
  expect(result.clip, 'shimmer 走 background-clip:text').toBe('text')
  expect(result.anim, 'shimmer 动画生效').toContain('marker-shimmer')
})

test('message-scroller track-visible：滚动后 oas-visible-change 更新可见集与当前锚点', async ({ page }) => {
  await page.goto('/components/message-scroller.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#msc-visible')
  await expect
    .poll(() => page.evaluate(() => document.querySelectorAll('#msc-visible oas-message-row').length), {
      timeout: 8000,
    })
    .toBeGreaterThanOrEqual(6)
  await expect(page.locator('#msc-visible-out')).toHaveText(/当前锚点/, { timeout: 8000 })

  // 滚到顶部 → 可见集变化 → 事件反馈（demo 文案切到 oas-visible-change）
  // 注：scroller 初始自动滚到底（可见集=尾部），故必须向上滚才产生可见集变化。
  await page.evaluate(() => {
    const host = document.querySelector('#msc-visible') as HTMLElement
    const vp = host.shadowRoot!.querySelector('.viewport') as HTMLElement
    vp.scrollTop = 0
    vp.dispatchEvent(new Event('scroll'))
  })
  await expect(page.locator('#msc-visible-out')).toHaveText(/oas-visible-change/, { timeout: 5000 })
  const ids = await page.evaluate(() => {
    const host = document.querySelector('#msc-visible') as HTMLElement & { visibleMessageIds: string[] }
    return host.visibleMessageIds
  })
  expect(Array.isArray(ids)).toBe(true)
  expect(ids.length).toBeGreaterThan(0)
})

test('attachment-group：横向溢出反射边缘可滚 + 滚动到端改变 data-scrollable', async ({ page }) => {
  await page.goto('/components/attachment.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-attachment-group')
  const readState = () =>
    page.evaluate(
      () => (document.querySelector('oas-attachment-group') as HTMLElement).getAttribute('data-scrollable') ?? '',
    )
  await expect.poll(readState, { timeout: 8000 }).toContain('end')

  // 滚到结束端：起始端可滚（start），结束端不可滚
  await page.evaluate(() => {
    const host = document.querySelector('oas-attachment-group') as HTMLElement
    const g = host.shadowRoot!.querySelector('.group') as HTMLElement
    g.scrollLeft = g.scrollWidth
    g.dispatchEvent(new Event('scroll'))
  })
  await expect.poll(readState, { timeout: 5000 }).toContain('start')
})
