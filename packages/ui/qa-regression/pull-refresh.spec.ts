// 复核回归：pull-refresh（oas-pull-refresh）——移动端下拉刷新真实浏览器固化。
// 覆盖：真实鼠标手势链（下拉超阈值 → oas-refresh → 宿主 refreshing 停驻 → 移除 → success → 回弹复位）、
// 不足阈值零事件零残留、disabled 不响应、滚离顶部后手势放行（原生滚动不受干扰）。
// 机制在单测（happy-dom 合成 pointer）已固化；本 spec 用真实鼠标事件驱动完整用户路径。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

interface ShadowRead {
  transform: string
  state: string | null
  dragging: boolean
  label: string | null
  spinnerDisplay: string
}

/** 读 shadow 内机制状态（位移/状态镜像/文案/spinner 显示） */
async function readShadow(page: import('@playwright/test').Page, sel: string): Promise<ShadowRead> {
  return page.evaluate((s) => {
    const host = document.querySelector(s) as HTMLElement
    const root = host.shadowRoot!
    const track = root.querySelector('[part="track"]') as HTMLElement
    const spinner = root.querySelector('[part="spinner"]') as HTMLElement
    const label = root.querySelector('[part="label"]') as HTMLElement
    return {
      transform: track.style.transform,
      state: host.getAttribute('data-state'),
      dragging: host.hasAttribute('data-dragging'),
      label: label.textContent,
      spinnerDisplay: getComputedStyle(spinner).display,
    }
  }, sel)
}

/** 真实鼠标纵向拖拽：从元素内 (cx, y+40) 按下，垂直下拖 dist 后松开 */
async function dragDown(page: import('@playwright/test').Page, sel: string, dist: number): Promise<void> {
  const box = await page.locator(sel).boundingBox()
  expect(box).not.toBeNull()
  const cx = box!.x + box!.width / 2
  const y0 = box!.y + Math.min(box!.height / 2, 40)
  await page.mouse.move(cx, y0)
  await page.mouse.down()
  await page.mouse.move(cx, y0 + dist, { steps: 10 })
  await page.mouse.up()
}

test('pull-refresh 真手势链：下拉超阈值 → oas-refresh → refreshing 停驻 → success → 复位', async ({ page }) => {
  await page.goto('/components/pull-refresh.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pr-basic')

  // 初始：位移 0、状态 idle、spinner 隐藏
  const initial = await readShadow(page, '#pr-basic')
  expect(initial.transform).toBe('translateY(0px)')
  expect(initial.state).toBe('idle')
  expect(initial.spinnerDisplay).toBe('none')
  const outBefore = await page.locator('#pr-basic-out').textContent()

  // 真实鼠标下拉 140px（超过默认阈值 60 的阻力化位移）后释放
  await dragDown(page, '#pr-basic', 140)

  // 事件可见反馈：demo 输出区更新（非 console）
  await expect(page.locator('#pr-basic-out')).toHaveText(/oas-refresh 已派发/, { timeout: 5000 })

  // 停驻阈值高度 + 刷新中视觉（宿主已置 refreshing）
  await page.waitForFunction(
    () => {
      const host = document.querySelector('#pr-basic') as HTMLElement
      if (host.getAttribute('data-state') !== 'refreshing') return false
      const track = host.shadowRoot!.querySelector('[part="track"]') as HTMLElement
      return track.style.transform === 'translateY(60px)'
    },
    { timeout: 5000 },
  )
  const refreshing = await readShadow(page, '#pr-basic')
  expect(refreshing.label).toBe('刷新中…')
  expect(refreshing.dragging).toBe(false)
  expect(refreshing.spinnerDisplay, '刷新中 spinner 可见').toBe('block')

  // demo 宿主 900ms 后移除 refreshing → success 文案 → 600ms 后回弹复位
  await page.waitForFunction(
    () => {
      const host = document.querySelector('#pr-basic') as HTMLElement
      return host.getAttribute('data-state') === 'success'
    },
    { timeout: 5000 },
  )
  const success = await readShadow(page, '#pr-basic')
  expect(success.label).toBe('刷新成功')
  expect(success.transform).toBe('translateY(60px)')

  await page.waitForFunction(
    () => {
      const host = document.querySelector('#pr-basic') as HTMLElement
      if (host.getAttribute('data-state') !== 'idle') return false
      const track = host.shadowRoot!.querySelector('[part="track"]') as HTMLElement
      return track.style.transform === 'translateY(0px)'
    },
    { timeout: 5000 },
  )
  const done = await readShadow(page, '#pr-basic')
  expect(done.label).toBe('下拉刷新')
  expect(done.spinnerDisplay).toBe('none')
  // 复位后再次下拉可重复触发（宿主重新置 refreshing）
  await dragDown(page, '#pr-basic', 140)
  await expect(page.locator('#pr-basic-out')).toHaveText(/oas-refresh 已派发/, { timeout: 5000 })
  expect(outBefore).toContain('在列表内从顶部向下拉')
})

test('pull-refresh 不足阈值释放：零事件零残留（回弹归零）', async ({ page }) => {
  await page.goto('/components/pull-refresh.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pr-basic')

  const outBefore = await page.locator('#pr-basic-out').textContent()
  // 短拉 24px（阻力化后 ~21.6px < 60px 阈值）
  await dragDown(page, '#pr-basic', 24)

  await page.waitForTimeout(700)
  const after = await readShadow(page, '#pr-basic')
  expect(after.state, '保持 idle').toBe('idle')
  expect(after.transform, '回弹归零').toBe('translateY(0px)')
  expect(after.dragging, '拖拽镜像清除').toBe(false)
  expect(after.label).toBe('下拉刷新')
  expect(await page.locator('#pr-basic-out').textContent(), '零事件（demo 反馈未变）').toBe(outBefore)
})

test('pull-refresh disabled：手势全不响应', async ({ page }) => {
  await page.goto('/components/pull-refresh.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pr-disabled')

  const outBefore = await page.locator('#pr-disabled-out').textContent()
  await dragDown(page, '#pr-disabled', 140)

  await page.waitForTimeout(500)
  const after = await readShadow(page, '#pr-disabled')
  expect(after.state).toBe('idle')
  expect(after.transform).toBe('translateY(0px)')
  expect(after.dragging).toBe(false)
  expect(await page.locator('#pr-disabled-out').textContent(), 'demo 反馈未变（无 oas-refresh）').toBe(outBefore)
})

test('pull-refresh 滚离顶部：下拉手势放行（不接管、不派发）', async ({ page }) => {
  await page.goto('/components/pull-refresh.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pr-basic')

  // 把内部滚动盒滚离顶部（模拟用户已下滚列表）
  await page.evaluate(() => {
    const host = document.querySelector('#pr-basic') as HTMLElement
    const root = host.shadowRoot!.querySelector('[part="root"]') as HTMLElement
    root.scrollTop = 60
    root.dispatchEvent(new Event('scroll'))
  })
  const outBefore = await page.locator('#pr-basic-out').textContent()
  await dragDown(page, '#pr-basic', 140)

  await page.waitForTimeout(500)
  const after = await readShadow(page, '#pr-basic')
  expect(after.state, '非顶部起手不接管').toBe('idle')
  expect(after.transform, '无位移').toBe('translateY(0px)')
  expect(await page.locator('#pr-basic-out').textContent(), '零事件').toBe(outBefore)
})

test('pull-refresh 指示区几何：拉动中 indicator 与内容零重叠（回归：负下 margin 曾致文案与首行同行）', async ({
  page,
}) => {
  await page.goto('/components/pull-refresh.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#pr-basic')
  const box = await page.locator('#pr-basic').boundingBox()
  expect(box).not.toBeNull()
  const cx = box!.x + box!.width / 2
  const y0 = box!.y + Math.min(box!.height / 2, 40)
  await page.mouse.move(cx, y0)
  await page.mouse.down()
  await page.mouse.move(cx, y0 + 120, { steps: 8 })
  const r = await page.evaluate(() => {
    const host = document.querySelector('#pr-basic')!
    const ind = host.shadowRoot!.querySelector('[part="indicator"]')!.getBoundingClientRect()
    const content = host.shadowRoot!.querySelector('[part="content"]')!.getBoundingClientRect()
    return { indBottom: ind.bottom, contentTop: content.top, indHeight: ind.height }
  })
  await page.mouse.up()
  expect(r.indHeight, '指示区高度存在').toBeGreaterThan(20)
  expect(r.indBottom, '指示区底缘不得越过内容顶缘（零重叠）').toBeLessThanOrEqual(r.contentTop + 0.5)
})
