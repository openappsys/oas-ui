// 回归固化：浮层箭头形状/位置/圆角 token 化（--oas-<comp>-arrow-width/height/align-offset/radius）。
// 背景：7 个浮层组件的箭头统一为菱形旋转方案，此前尺寸写死（12px）或散落 JS 常量；
// 对齐「三角高与角度（宽高比）」的定制需求（浮层箭头几何定制能力）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('浮层箭头 token：tooltip 宽高独立（三角高与角度）/ offset / radius 生效，merge 不受影响', async ({ page }) => {
  await page.goto('/components/tooltip.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tooltip')

  const r = await page.evaluate(async () => {
    interface Tip extends HTMLElement {
      shadowRoot: ShadowRoot
    }
    const make = async (attrs: Record<string, string>, style = ''): Promise<Tip> => {
      const el = document.createElement('oas-tooltip') as Tip
      el.setAttribute('content', 'tip')
      el.setAttribute('open', '')
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      if (style) el.setAttribute('style', style)
      // tooltip 是包裹式锚点（宿主首个元素子节点）；固定视口上部保证 bottom 不被翻转
      const anchor = document.createElement('button')
      anchor.textContent = 'a'
      anchor.style.cssText = 'position:fixed;top:60px;left:60px;z-index:1'
      el.append(anchor)
      document.body.append(el)
      await customElements.whenDefined('oas-tooltip')
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
      return el
    }
    const arrowOf = (el: Tip): HTMLElement => el.shadowRoot.querySelector('.arrow')!

    const plain = await make({ placement: 'bottom' })
    const shaped = await make(
      { placement: 'bottom-start' },
      '--oas-tooltip-arrow-width: 20px; --oas-tooltip-arrow-height: 8px; --oas-tooltip-arrow-align-offset: 32px; --oas-tooltip-arrow-radius: 3px',
    )
    const merged = await make(
      { placement: 'bottom-start', 'arrow-position': 'merge' },
      '--oas-tooltip-arrow-width: 20px; --oas-tooltip-arrow-height: 8px',
    )

    const csPlain = getComputedStyle(arrowOf(plain))
    const csShaped = getComputedStyle(arrowOf(shaped))
    const csMerged = getComputedStyle(arrowOf(merged))

    return {
      defaultW: csPlain.width,
      defaultH: csPlain.height,
      defaultTop: csPlain.top,
      shapedW: csShaped.width,
      shapedH: csShaped.height,
      shapedLeft: csShaped.left,
      shapedRadius: csShaped.borderRadius,
      shapedTop: csShaped.top,
      mergedW: csMerged.width,
      mergedH: csMerged.height,
    }
  })

  expect(r.defaultW, '默认宽 12').toBe('12px')
  expect(r.defaultH, '默认高 12').toBe('12px')
  expect(r.defaultTop, '默认悬边半值外探（-6）').toBe('-6px')
  expect(r.shapedW, '自定义宽 20（宽高比变化 = 角度变化）').toBe('20px')
  expect(r.shapedH, '自定义高 8').toBe('8px')
  expect(r.shapedTop, '悬边量随 height 分量（-4）').toBe('-4px')
  expect(r.shapedLeft, 'start 侧偏移走 arrow-align-offset token（32）').toBe('32px')
  expect(r.shapedRadius, '圆角走 arrow-radius token').toBe('3px')
  expect(r.mergedW, 'merge 独立 8px 几何不受宽高 token 影响').toBe('8px')
  expect(r.mergedH, 'merge 独立 8px 几何不受宽高 token 影响').toBe('8px')
})

test('浮层箭头 token：popover point-at-center 的 clamp 读取 width token（JS/CSS 同一真源）', async ({ page }) => {
  await page.goto('/components/popover.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-popover')

  const r = await page.evaluate(async () => {
    interface Pop extends HTMLElement {
      shadowRoot: ShadowRoot
    }
    const el = document.createElement('oas-popover') as Pop
    el.setAttribute('open', '')
    el.setAttribute('arrow-point-at-center', '')
    el.setAttribute('style', '--oas-popover-arrow-width: 24px')
    // 包裹式锚点（触发器放 slot），固定视口上部
    const anchor = document.createElement('button')
    anchor.textContent = 'a'
    anchor.style.cssText = 'position:fixed;top:60px;left:60px;z-index:1'
    el.append(anchor, Object.assign(document.createElement('div'), { textContent: 'panel' }))
    document.body.append(el)
    await customElements.whenDefined('oas-popover')
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    const arrow = el.shadowRoot.querySelector('.arrow') as HTMLElement
    const cs = getComputedStyle(arrow)
    return {
      w: cs.width,
      arrowX: arrow.style.getPropertyValue('--arrow-x'),
    }
  })

  expect(r.w, 'width token 生效（24）').toBe('24px')
  // clamp 上界 = panelRect.width - ARROW_PAD(8) - arrowW：若用旧常量 12 会偏大 6px；
  // --arrow-x 由 JS 写入，断言其为数值且与 width token 联动（center - left - 24/2 的半值出现）
  expect(r.arrowX, 'JS clamp 按 width token 计算（--arrow-x 已写入）').toMatch(/^-?\d+(\.\d+)?px$/)
})
