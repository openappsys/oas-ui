// 复核回归：descriptions——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('descriptions items 通道：JSON attribute 存活渲染 + 声明式子元素优先接管', async ({ page }) => {
  // 新批能力经真实 demo 链路：items JSON 属性在 Vue 宿主下不被剥离，渲染出
  // oas-descriptions-item（data-generated 标记）；宿主 .map() 声明式子项照常渲染
  await page.goto('/components/descriptions.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#desc-items-attr')
  const r = await page.evaluate(() => {
    const attrEl = document.querySelector('#desc-items-attr')!
    const generated = attrEl.shadowRoot!.querySelectorAll('.items > oas-descriptions-item[data-generated]')
    const first = generated[0] as HTMLElement | undefined
    // 声明式通道 demo：宿主脚本 .map() 生成子项（非 data-generated）
    const declarative = document.querySelectorAll('#desc-data-driven > oas-descriptions-item')
    return {
      generated: generated.length,
      firstLabel: first?.getAttribute('label'),
      firstText: first?.textContent,
      declarative: declarative.length,
      attrStillThere: attrEl.hasAttribute('items'),
    }
  })
  expect(r.generated, 'items JSON 渲染 4 项').toBe(4)
  expect(r.firstLabel).toBe('服务名')
  expect(r.firstText).toBe('oas-ui-docs')
  expect(r.attrStillThere, 'items 属性保留在宿主（数据通道声明式来源）').toBe(true)
  expect(r.declarative, '声明式通道 .map() 子项照常渲染').toBeGreaterThan(0)

  // 声明式优先：给 items demo 塞入子元素后，生成项清空、子元素经默认插槽渲染
  await page.evaluate(() => {
    const el = document.querySelector('#desc-items-attr')!
    const node = document.createElement('oas-descriptions-item')
    node.setAttribute('label', '声明项')
    node.textContent = '子元素优先'
    el.appendChild(node)
  })
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#desc-items-attr')!
    return {
      generated: el.shadowRoot!.querySelectorAll('.items > oas-descriptions-item[data-generated]').length,
      slotted: (el.shadowRoot!.querySelector('slot:not([name])') as HTMLSlotElement)!.assignedNodes().length,
    }
  })
  expect(after.generated, '子元素在场时生成项清空（声明式优先）').toBe(0)
  expect(after.slotted, '子元素经默认插槽渲染').toBe(1)
})
