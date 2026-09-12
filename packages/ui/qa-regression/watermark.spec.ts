// 复核回归：watermark——canvas 引擎 / grayscale / fullscreen / movable 固化断言。
// 历史教训：渲染引擎从 SVG data-uri 迁移到 canvas 后，须防止回退路径被误删、
// grayscale 钩子失效、fullscreen 定位漂移。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

/** 读取指定水印组件 shadow 内图层（part=watermark）的内联 style */
async function layerStyle(page: import('@playwright/test').Page, sel: string): Promise<string> {
  await up(page, sel)
  return page.evaluate((s) => {
    const el = document.querySelector(s)
    const layer = el?.shadowRoot?.querySelector('[part="watermark"]')
    return layer?.getAttribute('style') ?? ''
  }, sel)
}

test('canvas 引擎：真实浏览器文字水印背景为 data:image/png（非 SVG 回退）', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  const style = await layerStyle(page, 'oas-watermark[text="内部资料 · CONFIDENTIAL"]')
  expect(style).toContain('data:image/png')
  expect(style).not.toContain('data:image/svg+xml')
})

test('grayscale：灰阶 tile 与原图 tile 的 dataURL 不同（canvas filter 钩子生效）', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#wm-img-color')
  // 灰阶为异步绘制（图片加载 → drawImage），等其落到 dataURL
  await page.waitForFunction(() => {
    const layer = document.querySelector('#wm-img-gray')?.shadowRoot?.querySelector('[part="watermark"]')
    return (layer?.getAttribute('style') ?? '').includes('data:image/png')
  })
  const [color, gray] = await page.evaluate(() =>
    ['#wm-img-color', '#wm-img-gray'].map((s) => {
      const layer = document.querySelector(s)?.shadowRoot?.querySelector('[part="watermark"]')
      return layer?.getAttribute('style') ?? ''
    }),
  )
  // 彩色直用原图 URL；灰阶经 canvas 转 dataURL，两者必然不同
  expect(color).toContain('picsum.photos')
  expect(gray).toContain('data:image/png')
  expect(gray).not.toBe(color)
})

test('fullscreen：fixed 定位铺满视口、pointer-events none、默认最高层级，z-index 属性可覆盖', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#wm-fullscreen-toggle')
  await page.locator('#wm-fullscreen-toggle').click()
  await up(page, '#wm-fullscreen-demo')
  const state = await page.evaluate(() => {
    const el = document.querySelector('#wm-fullscreen-demo')!
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    return {
      position: cs.position,
      inset: cs.top === '0px' && cs.right === '0px' && cs.bottom === '0px' && cs.left === '0px',
      zIndex: cs.zIndex,
      pointerEvents: cs.pointerEvents,
      coversViewport: rect.width === window.innerWidth && rect.height === window.innerHeight,
      layerStyle: el.shadowRoot?.querySelector('[part="watermark"]')?.getAttribute('style') ?? '',
    }
  })
  expect(state.position).toBe('fixed')
  expect(state.inset).toBe(true)
  expect(state.coversViewport).toBe(true)
  expect(state.pointerEvents).toBe('none')
  expect(Number(state.zIndex)).toBe(2147483647)
  // 全屏水印本身照常渲染（canvas tile）
  expect(state.layerStyle).toContain('data:image/png')

  // z-index 属性覆盖宿主层级（受控通道）
  await page.evaluate(() => {
    document.querySelector('#wm-fullscreen-demo')!.setAttribute('z-index', '999')
  })
  const z = await page.evaluate(() => (document.querySelector('#wm-fullscreen-demo') as HTMLElement).style.zIndex)
  expect(z).toBe('999')

  // 关闭 fullscreen：宿主层级写回清除，页面其他内容恢复可交互
  await page.locator('#wm-fullscreen-toggle').click()
  const after = await page.evaluate(() => {
    const el = document.querySelector('#wm-fullscreen-demo')! as HTMLElement
    return {
      zIndex: el.style.zIndex,
      position: getComputedStyle(el).position,
    }
  })
  expect(after.zIndex).toBe('')
  expect(after.position).not.toBe('fixed')
})

test('movable：canvas 引擎下拖拽 offset 写回、背景位置跟随（图层机制不因引擎迁移失效）', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#wm-movable')
  // movable demo 在页面下方，必须先滚入视口——否则鼠标坐标落空、pointerdown 不命中图层
  await page.locator('#wm-movable').scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  const box = (await page.locator('#wm-movable').boundingBox())!
  // 在水印层上按住拖动（movable 图层 pointer-events: auto）
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  const offset = await page.locator('#wm-movable').getAttribute('offset')
  expect(offset).not.toBeNull()
  const style = await page.evaluate(() => {
    const layer = document.querySelector('#wm-movable')?.shadowRoot?.querySelector('[part="watermark"]')
    return layer?.getAttribute('style') ?? ''
  })
  expect(style).toContain('data:image/png')
  const [nx, ny] = JSON.parse(offset!) as [number, number]
  expect(style).toContain(`background-position: ${nx}px ${ny}px`)
})

test('watermark demo 属性存活（Vue 不剥离）：grayscale / fullscreen 宿主属性均在', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#wm-img-gray')
  expect(await page.locator('oas-watermark[grayscale]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-watermark[movable]').count()).toBeGreaterThan(0)
  expect(await page.locator('oas-watermark[staggered]').count()).toBeGreaterThan(0)
})

test('watermark 空容器：无 slot 内容时宿主不塌缩、水印图层有实际宽度（flex 容器空宿主 0 宽回归）', async ({ page }) => {
  await page.goto('/components/watermark.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-watermark')
  const r = await page.evaluate(() => {
    // 空容器 demo：text="水印" + style height:120px、无任何 slot 内容
    const el = [...document.querySelectorAll('oas-watermark')].find(
      (x) => x.childNodes.length === 0 && (x as HTMLElement).style.height === '120px',
    )!
    const layer = el.shadowRoot?.querySelector('[part="watermark"]')
    const hostRect = el.getBoundingClientRect()
    const layerRect = layer?.getBoundingClientRect()
    return {
      hostW: Math.round(hostRect.width),
      layerW: layerRect ? Math.round(layerRect.width) : 0,
      bgImage: (layer?.getAttribute('style') ?? '').includes('data:'),
    }
  })
  // 宿主与图层都必须有实际宽度（空态满铺），且背景图存在
  expect(r.hostW).toBeGreaterThan(0)
  expect(r.layerW).toBeGreaterThan(0)
  expect(r.bgImage).toBe(true)
})
