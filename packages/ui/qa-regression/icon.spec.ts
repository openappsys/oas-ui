// 复核回归：icon——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('icon slot 内联 SVG：源 svg 不渲染（slot display:none）且表现属性随克隆保留', async ({
  page,
}) => {
  // 曾现 bug1：宿主全局 reset（img/svg{display:block}）跨树压过 shadow 普通 ::slotted 规则，
  //           源 svg 黑色副本外露（duotone demo 一个图标渲染成两个）。修复：slot{display:none}。
  // 曾现 bug2：克隆只拷 viewBox，fill/stroke 丢失 → 描边 svg 变实心块/不可见；
  //           且组件 svg{fill:currentColor} 优先级高于 fill 表现属性。修复：属性全量复制 + 兜底改 :not([fill])。
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-icon[duotone]')
  const r = await page.evaluate(() => {
    const duo = document.querySelector('oas-icon[duotone]')!
    const lightSvg = duo.querySelector(':scope > svg')!
    const duoRect = lightSvg.getBoundingClientRect()
    // slot 内联 SVG demo（描边 plus）：宿主 svg 应带 stroke/fill 属性且图形可见
    const slotIcon = [...document.querySelectorAll('oas-icon')].find(
      (el) => el.querySelector(':scope > svg')?.getAttribute('stroke') === 'currentColor',
    )!
    const hostSvg = slotIcon.shadowRoot!.querySelector('svg')!
    const hostBox = hostSvg.getBoundingClientRect()
    return {
      srcHidden: duoRect.width === 0 && duoRect.height === 0,
      hostHeight: Math.round(duo.getBoundingClientRect().height),
      strokeKept: hostSvg.getAttribute('stroke'),
      fillKept: hostSvg.getAttribute('fill'),
      rendered: hostBox.width > 0 && hostBox.height > 0,
    }
  })
  expect(r.srcHidden, '源 svg 不应渲染（黑色副本回归）').toBe(true)
  expect(r.hostHeight, '宿主高度应等于图标尺寸（32），不被源 svg 撑高').toBe(32)
  expect(r.strokeKept, 'stroke 表现属性应随克隆保留').toBe('currentColor')
  expect(r.fillKept, 'fill 表现属性应随克隆保留').toBe('none')
  expect(r.rendered).toBe(true)
})

test('icon 宿主 inline-flex：tag 内图标与文字中心线对齐（行高支撑偏心回归）', async ({ page }) => {
  // 曾现 bug：oas-icon 宿主默认 inline，内部 svg 被继承 line-height 撑出基线支撑，
  // 图标视觉中心比文字中心高 2px（tag icon 属性标签里肉眼可见不在一条线）。
  // 修复：:host display: inline-flex 收缩包裹 svg。锁定「svg 中心 == 文字中心」。
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[icon]')
  const r = await page.evaluate(() => {
    const tag = document.querySelector('oas-tag[icon]')!
    const root = tag.shadowRoot!
    const iconHost = root.querySelector('.icon oas-icon')!
    const svg = iconHost.shadowRoot!.querySelector('svg')!
    const content = root.querySelector('.content')!
    const cy = (el: Element) => {
      const b = el.getBoundingClientRect()
      return b.top + b.height / 2
    }
    return {
      diff: Math.abs(cy(svg) - cy(content)),
      hostDisplay: getComputedStyle(iconHost).display,
    }
  })
  expect(r.hostDisplay).toBe('flex') // flex 容器内块化后的计算值
  expect(r.diff, '图标与文字中心线偏差应 ≤1px').toBeLessThanOrEqual(1)
})

test('icon duotone：显式 data-layer 分层的透明度不被元素序 fallback 覆盖（真实 computed 断言）', async ({
  page,
}) => {
  await page.goto('/components/icon.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-icon[duotone]')
  const r = await page.evaluate(() => {
    const icons = [...document.querySelectorAll('oas-icon[duotone]')]
    return icons.map((el) => {
      const svg = el.shadowRoot!.querySelector('svg')!
      const layers = [...svg.querySelectorAll('path')].map((pt) => ({
        layer: pt.getAttribute('data-layer'),
        opacity: getComputedStyle(pt).opacity,
      }))
      return { swap: svg.getAttribute('data-swap'), layers }
    })
  })
  // 非 swap 图标：primary=1 / secondary=0.4（demo SVG 绘制序 secondary 在前）
  const normal = r.find((x) => !x.swap)
  const normalPrimary = normal?.layers.find((l) => l.layer === 'primary')
  const normalSecondary = normal?.layers.find((l) => l.layer === 'secondary')
  expect(normalPrimary?.opacity, 'primary 层应为全实（opacity 1）').toBe('1')
  expect(normalSecondary?.opacity, 'secondary 层应为半透明（opacity 0.4）').toBe('0.4')
  // swap 图标：两层透明度互换（primary=0.4 / secondary=1）
  const swapped = r.find((x) => x.swap)
  const swapPrimary = swapped?.layers.find((l) => l.layer === 'primary')
  const swapSecondary = swapped?.layers.find((l) => l.layer === 'secondary')
  expect(swapPrimary?.opacity, 'swap 后 primary 层应为 0.4').toBe('0.4')
  expect(swapSecondary?.opacity, 'swap 后 secondary 层应为 1').toBe('1')
})

// —— 缺陷回归：menubar show-arrow 的 side-top 缺 align 定位分支，箭头错位 ——
// 曾现缺陷：show-arrow 只给 side-bottom 配了 align-start/center/end 的 left/right 定位，
// side-top 缺三档（只有通用 bottom/rotate 规则）——position:absolute 无 left/right 时停在
// 面板内容起始位（左缘附近），而面板右对齐触发器时箭头偏左、不指向触发器右端。
// 修复：side-top 补 align-start/center/end 三档（与 side-bottom 对称）。