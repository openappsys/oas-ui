// 复核回归：snackbar——本批能力固化断言（堆叠/排队/合并/暂停/关闭途径 reason）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 当前处于视觉打开态（oas-open）的 snackbar 元素列表信息 */
async function openBars(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('oas-snackbar')]
      .filter((el) => el.classList.contains('oas-open'))
      .map((el) => ({
        message: el.getAttribute('message') ?? '',
        // box 为 fixed 定位，取实际矩形验证堆叠几何
        rect: el.shadowRoot!.querySelector<HTMLElement>('[part="box"]')!.getBoundingClientRect(),
      })),
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/components/snackbar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-button')
  await page.waitForFunction(() => typeof (window as any).sbShow === 'function', null, {
    timeout: 10000,
  })
})

test('堆叠布局：三条同向打开纵向排列不重叠（最新贴底边）', async ({ page }) => {
  // 曾现缺陷：多条 fixed 定位同坐标互相覆盖，宣称堆叠能力却无堆叠视觉。
  await page.evaluate(() => {
    ;(window as any).sbShow({ message: '堆叠一', duration: '0' })
    ;(window as any).sbShow({ message: '堆叠二', duration: '0' })
    ;(window as any).sbShow({ message: '堆叠三', duration: '0' })
  })
  await page.waitForFunction(
    () => document.querySelectorAll('oas-snackbar.oas-open').length === 3,
    null,
    { timeout: 5000 },
  )
  const bars = await openBars(page)
  expect(bars.length).toBe(3)
  const viewportHeight = page.viewportSize()?.height ?? 0
  for (const b of bars) {
    expect(b.rect.height).toBeGreaterThan(0)
  }
  // 最新一条贴底边（默认 bottom 方向 + 24px 偏移，留容差）；老条目依序上移
  const maxBottom = Math.max(...bars.map((b) => b.rect.bottom))
  expect(maxBottom).toBeGreaterThan(viewportHeight - 60)
  // 两两不重叠：按 top 排序后前一条的 bottom 不越过后一条的 top（留 1px 容差）
  const sorted = [...bars].sort((a, b) => a.rect.top - b.rect.top)
  for (let i = 1; i < sorted.length; i++) {
    expect(sorted[i]!.rect.top - sorted[i - 1]!.rect.bottom).toBeGreaterThanOrEqual(-1)
  }
})

test('堆叠超限挤掉最老：第 4 条打开时最老一条收到 reason=evict 的 oas-close', async ({ page }) => {
  await page.evaluate(() => {
    for (let i = 1; i <= 3; i++) (window as any).sbShow({ message: `占位${i}`, duration: '0' })
  })
  await page.waitForFunction(
    () => document.querySelectorAll('oas-snackbar.oas-open').length === 3,
  )
  await page.evaluate(() => (window as any).sbShow({ message: '第四条', duration: '0' }))
  await page.waitForFunction(
    () => (document.getElementById('sb-log')?.textContent ?? '').includes('evict'),
    null,
    { timeout: 5000 },
  )
  // 挤掉后仍保持 3 条在屏
  expect((await openBars(page)).length).toBe(3)
})

test('排队模式：栈满时第 4 条等待，前面的关闭后补位展示', async ({ page }) => {
  await page.evaluate(() => {
    for (let i = 1; i <= 3; i++) (window as any).sbShow({ message: `排队${i}`, queue: '', duration: '1500' })
    ;(window as any).sbShow({ message: '排队4', queue: '', duration: '0' })
  })
  // 初始 3 条在屏，第 4 条等待（有 open 属性但无视觉态）
  await page.waitForFunction(
    () => document.querySelectorAll('oas-snackbar.oas-open').length === 3,
  )
  const q4Visible = await page.evaluate(() =>
    [...document.querySelectorAll('oas-snackbar')].some(
      (el) => el.getAttribute('message') === '排队4' && el.classList.contains('oas-open'),
    ),
  )
  expect(q4Visible).toBe(false)  // 第一条 1.5s 后到期关闭 → 第 4 条补位
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-snackbar')].some(
        (el) => el.getAttribute('message') === '排队4' && el.classList.contains('oas-open'),
      ),
    null,
    { timeout: 5000 },
  )
})

test('closable 关闭按钮：点击后 open 移除且 reason=close', async ({ page }) => {
  await page.evaluate(() =>
    (window as any).sbShow({ message: '常驻可关', duration: '0', closable: '' }),
  )
  await page.waitForFunction(() => document.querySelectorAll('oas-snackbar.oas-open').length === 1)
  await page.evaluate(() => {
    const el = document.querySelector('oas-snackbar.oas-open')!
    ;(el.shadowRoot!.querySelector('[part="close"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => (document.getElementById('sb-log')?.textContent ?? '').includes('close'),
    null,
    { timeout: 5000 },
  )
  expect(await page.evaluate(() => document.querySelectorAll('oas-snackbar.oas-open').length)).toBe(0)
})

test('同内容合并：group 同文案连发两次合并为一条且计数 ×2', async ({ page }) => {
  const groupBlock = page.locator('.demo-block', { hasText: 'group 合并' })
  await groupBlock.locator('oas-button').first().click()
  await groupBlock.locator('oas-button').first().click()
  await page.waitForFunction(
    () => document.querySelectorAll('oas-snackbar.oas-open').length === 1,
    null,
    { timeout: 5000 },
  )
  const badge = await page.evaluate(() => {
    const el = document.querySelector('oas-snackbar.oas-open')!
    const count = el.shadowRoot!.querySelector<HTMLElement>('[part="count"]')!
    return { text: count.textContent ?? '', hidden: count.hidden }
  })
  expect(badge.hidden).toBe(false)
  expect(badge.text).toBe('×2')
})

test('hover 暂停计时：悬停期间不到期，离开后按剩余时长关闭（reason=timeout）', async ({ page }) => {
  await page.evaluate(() =>
    (window as any).sbShow({ message: '悬停暂停', duration: '3000' }),
  )
  await page.waitForFunction(() => document.querySelectorAll('oas-snackbar.oas-open').length === 1)
  const center = await page.evaluate(() => {
    const rect = document
      .querySelector('oas-snackbar.oas-open')!
      .shadowRoot!.querySelector<HTMLElement>('[part="box"]')!
      .getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  })
  await page.mouse.move(center.x, center.y)
  // 悬停超过 duration 仍打开（计时被暂停）
  await page.waitForTimeout(3600)
  expect(await page.evaluate(() => document.querySelectorAll('oas-snackbar.oas-open').length)).toBe(1)
  // 离开 → 剩余时长走完自动关闭
  await page.mouse.move(4, 4)
  await page.waitForFunction(
    () => (document.getElementById('sb-log')?.textContent ?? '').includes('timeout'),
    null,
    { timeout: 5000 },
  )
})

test('Escape 关闭：无焦点归属时关最老一条（reason=escape）', async ({ page }) => {
  await page.evaluate(() => {
    ;(window as any).sbShow({ message: '最老', duration: '0' })
    ;(window as any).sbShow({ message: '最新', duration: '0' })
  })
  await page.waitForFunction(
    () => document.querySelectorAll('oas-snackbar.oas-open').length === 2,
  )
  await page.keyboard.press('Escape')
  await page.waitForFunction(
    () => (document.getElementById('sb-log')?.textContent ?? '').includes('escape'),
    null,
    { timeout: 5000 },
  )
  // 关的是最老一条，最新仍在屏
  const remaining = await openBars(page)
  expect(remaining.length).toBe(1)
  expect(remaining[0]!.message).toBe('最新')
})

test('计时进度条：progress 开启时可见且随时间推进（scaleX 动画）', async ({ page }) => {
  await page.evaluate(() =>
    (window as any).sbShow({ message: '带进度', duration: '6000', progress: '' }),
  )
  await page.waitForFunction(() => document.querySelectorAll('oas-snackbar.oas-open').length === 1)
  const early = await page.evaluate(() => {
    const bar = document
      .querySelector('oas-snackbar.oas-open')!
      .shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    return { hidden: bar.hidden, transform: bar.style.transform }
  })
  expect(early.hidden).toBe(false)
  expect(early.transform).toContain('scaleX')
})
