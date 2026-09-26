// 复核回归：carousel——卡片模式（type=card）与显式暂停按钮（pause-button）缺陷固化断言。
// 覆盖：Vue 宿主下属性存活、当前卡居中/邻卡露出、点击邻卡切换、暂停钮切换 autoplay 态。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('卡片模式：type=card 属性存活，当前卡居中、邻卡两侧露出', async ({ page }) => {
  await page.goto('/components/carousel.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-carousel[type="card"]')
  const geo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('oas-carousel[type="card"]')!
    const idx = Number(el.getAttribute('index'))
    const n = el.children.length
    const er = el.getBoundingClientRect()
    const rect = (i: number) => {
      const r = el.children[i]!.getBoundingClientRect()
      return {
        left: r.left - er.left,
        width: r.width,
        opacity: getComputedStyle(el.children[i]!).opacity,
      }
    }
    const cur = rect(idx)
    const next = rect((idx + 1) % n)
    const prev = rect((idx + n - 1) % n)
    return {
      vw: er.width,
      curCenter: cur.left + cur.width / 2,
      curWidth: cur.width,
      curOpacity: cur.opacity,
      nextVisible: next.width > 0 && next.left < er.width,
      prevVisible: prev.width > 0 && prev.left + prev.width > 0,
      neighborOpacity: next.opacity,
      trackTransform: el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!.style.transform,
    }
  })
  // 当前卡占主体（默认 60%）且水平居中
  expect(geo.curWidth).toBeGreaterThan(geo.vw * 0.5)
  expect(Math.abs(geo.curCenter - geo.vw / 2)).toBeLessThan(geo.vw * 0.05)
  expect(geo.curOpacity).toBe('1')
  // 左右邻卡均有露出、降透明
  expect(geo.nextVisible).toBe(true)
  expect(geo.prevVisible).toBe(true)
  expect(Number(geo.neighborOpacity)).toBeLessThan(1)
  // 轨道位移引用卡宽 token
  expect(geo.trackTransform).toContain('--oas-carousel-card-width')
})

test('卡片模式：点击邻卡直接切换到该卡（等效多步 next）', async ({ page }) => {
  await page.goto('/components/carousel.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-carousel[type="card"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('oas-carousel[type="card"]')!
    const n = el.children.length
    const before = Number(el.getAttribute('index'))
    const target = (before + 2) % n
    el.children[target]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    return { before, target, after: Number(el.getAttribute('index')) }
  })
  expect(r.after).toBe(r.target)
  expect(r.after).not.toBe(r.before)
})

test('显式暂停按钮：点击切换 aria-pressed 与图标，autoplay 停走/恢复', async ({ page }) => {
  await page.goto('/components/carousel.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-carousel[pause-button]')
  const btn = page.locator('oas-carousel[pause-button] [part="pause-button"]')
  await expect(btn).toBeVisible()
  const before = await page.evaluate(() => document.querySelector('oas-carousel[pause-button]')!.getAttribute('index')!)
  await btn.click()
  await expect(btn).toHaveAttribute('aria-pressed', 'true')
  // 显式暂停后超过两个间隔（2 * 2000ms）仍停走
  await page.waitForTimeout(4500)
  const pausedIndex = await page.evaluate(
    () => document.querySelector('oas-carousel[pause-button]')!.getAttribute('index')!,
  )
  expect(pausedIndex).toBe(before)
  // 图标随暂停态切换（pause 图标隐藏、play 图标显示）
  const icon = await page.evaluate(() => {
    const b = document.querySelector('oas-carousel[pause-button]')!.shadowRoot!.querySelector('[part="pause-button"]')!
    return {
      pause: getComputedStyle(b.querySelector('.icon-pause')!).display,
      play: getComputedStyle(b.querySelector('.icon-play')!).display,
    }
  })
  expect(icon.pause).toBe('none')
  expect(icon.play).not.toBe('none')
  // 再点恢复自动播放。注意：焦点仍在按钮上（聚焦暂停生效）、鼠标悬停（悬停暂停生效），
  // 需把焦点与指针都移出轮播区域后才走屏——这正是 WCAG 聚焦/悬停暂停的预期行为。
  await btn.click()
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  await page.locator('h1').first().click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(4500)
  const resumedIndex = await page.evaluate(
    () => document.querySelector('oas-carousel[pause-button]')!.getAttribute('index')!,
  )
  expect(Number(resumedIndex)).not.toBe(Number(before))
})

test('carousel 触屏：箭头/暂停钮/圆点 coarse 命中区到 44px，圆点视觉保持 12px', async ({ page }) => {
  // 固化缺口：箭头/暂停钮 32px、指示圆点 12px，触屏点中率低。修复：coarse 下箭头/暂停钮
  // 抬到 44px（max 保底），圆点 padding 扩热区 + margin 负补偿 + 间距放大防相邻热区重叠，
  // 视觉圆点不变大；纯 CSS 增强，DOM 结构与 PC 一致。
  await page.goto('/components/carousel.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-carousel')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-carousel')!
    const style = el.shadowRoot!.querySelector('style')!.textContent!
    const dot = el.shadowRoot!.querySelector<HTMLElement>('[part="dot"]')!
    return {
      coarse: style.includes('@media (pointer: coarse)'),
      arrowMax: style.includes('max(var(--oas-control-height-md), var(--oas-touch-target-min, 44px))'),
      dotPad: /padding:\s*16px/.test(style) && /margin:\s*-16px/.test(style),
      dotsGap: /gap:\s*32px/.test(style),
      dotWidth: getComputedStyle(dot).width,
    }
  })
  expect(r.coarse).toBe(true)
  expect(r.arrowMax).toBe(true)
  expect(r.dotPad).toBe(true)
  expect(r.dotsGap).toBe(true)
  // 视觉圆点仍为 12px（getComputedStyle 不含 coarse padding，padding 不扩 content 宽）
  expect(r.dotWidth).toBe('12px')
})

test('carousel draggable：PC 显式开启后真实鼠标拖拽切屏、跟手位移、松手恢复过渡', async ({ page }) => {
  await page.goto('/components/carousel.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-carousel#carousel-drag')
  // demo 在页面中后段——先滚进视口再取坐标（否则 mouse 事件落在视口外不触发 pointerdown）
  await page.evaluate(() => {
    document.querySelector('oas-carousel#carousel-drag')!.scrollIntoView({ block: 'center' })
  })
  await page.waitForTimeout(300)
  const geometry = await page.evaluate(() => {
    const el = document.querySelector('oas-carousel#carousel-drag')!
    const vp = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    const r = vp.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }
  })
  expect(geometry.w).toBeGreaterThan(100)
  // 真实鼠标按住向左拖 >25% 视口宽 → 切到第 2 屏（index=1）
  await page.mouse.move(geometry.x, geometry.y)
  await page.mouse.down()
  // 拖拽中：轨道带 no-transition（跟手、过渡禁用）
  await page.mouse.move(geometry.x - geometry.w * 0.35, geometry.y, { steps: 6 })
  const dragging = await page.evaluate(() => {
    const el = document.querySelector('oas-carousel#carousel-drag')!
    const track = el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    return {
      noTransition: track.classList.contains('no-transition'),
      follow: /px/.test(track.style.transform),
      indexNow: el.getAttribute('index'),
    }
  })
  expect(dragging.noTransition).toBe(true)
  expect(dragging.follow).toBe(true)
  expect(dragging.indexNow).toBe('0')
  await page.mouse.up()
  await page.waitForFunction(() => document.querySelector('oas-carousel#carousel-drag')!.getAttribute('index') === '1')
  const after = await page.evaluate(() => {
    const el = document.querySelector('oas-carousel#carousel-drag')!
    const track = el.shadowRoot!.querySelector<HTMLElement>('[part="track"]')!
    return {
      noTransition: track.classList.contains('no-transition'),
      readout: document.querySelector('#carousel-drag-index')!.textContent,
    }
  })
  expect(after.noTransition).toBe(false)
  expect(after.readout).toBe('2')
  // 小幅拖拽（<25%）回弹：index 不变
  await page.mouse.move(geometry.x, geometry.y)
  await page.mouse.down()
  await page.mouse.move(geometry.x - 30, geometry.y, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(120)
  expect(await page.evaluate(() => document.querySelector('oas-carousel#carousel-drag')!.getAttribute('index'))).toBe(
    '1',
  )
})
