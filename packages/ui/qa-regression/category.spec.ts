// commerce category 用户视角回归：双栏联动与商品位选择反馈。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('category 左类右品联动：点击子类更新高亮、宫格与页面反馈', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-event-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const node = el.shadowRoot!.querySelector<HTMLElement>('.node[data-key="phone"]')!
    node.click()
  })
  const linked = await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const root = el.shadowRoot!
    return {
      active: el.getAttribute('active-key'),
      selected: root.querySelector('.node[data-key="phone"]')!.getAttribute('aria-selected'),
      tiles: [...root.querySelectorAll<HTMLElement>('.tile')].map((t) => t.textContent),
      feedback: document.getElementById('category-event-info')!.textContent,
    }
  })
  expect(linked.active).toBe('phone')
  expect(linked.selected).toBe('true')
  expect(linked.tiles).toEqual(['苹果', '安卓'])
  expect(linked.feedback).toContain('digital / phone')
})

test('category 商品位点击：页面反馈显示商品名', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-event-demo')

  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const tile = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="audio"]')!
    tile.click()
    el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="p1"]')!.click()
  })
  const feedback = await page.evaluate(() => document.getElementById('category-event-info')!.textContent)
  expect(feedback).toContain('蓝牙耳机')
})

// 修复回归：面板/树重建后焦点曾被丢弃（focus 落回 body，键盘用户直接断链）
test('category 面板与树重建后焦点保留（返回 / 宫格进入 / 树激活）', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-event-demo')

  const afterTile = await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const tile = el.shadowRoot!.querySelector<HTMLElement>('.tile[data-key="phone"]')!
    tile.focus()
    tile.click()
    return {
      active: el.getAttribute('active-key'),
      focusedIsBack: (el.shadowRoot!.activeElement as HTMLElement | null)?.classList.contains('back') ?? false,
    }
  })
  expect(afterTile.active).toBe('phone')
  expect(afterTile.focusedIsBack, '进入子类后焦点应落在返回钮（不能丢到 body）').toBe(true)

  const afterBack = await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-event-demo')!
    const back = el.shadowRoot!.querySelector<HTMLButtonElement>('.back')!
    back.focus()
    back.click()
    const focused = el.shadowRoot!.activeElement as HTMLElement | null
    return {
      active: el.getAttribute('active-key'),
      key: focused?.dataset.key ?? '',
      isBack: focused?.classList.contains('back') ?? false,
    }
  })
  expect(afterBack.active).toBe('digital')
  expect(afterBack.key, '上级没有返回钮时焦点回到左侧树当前项').toBe('digital')
  expect(afterBack.isBack).toBe(false)
})

// RTL 回归：展开箭头硬编码 '›' + rotate(90deg) 时未镜像，方向暗示与阅读方向相反
test('category RTL：折叠箭头镜像（LTR 指右 / RTL 指左）', async ({ page }) => {
  await page.goto('/components/category.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-category#category-demo')

  const readTransform = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-category#category-demo')!
      const node = el.shadowRoot!.querySelector<HTMLElement>('.node[aria-expanded="false"] .chevron')
      return node ? getComputedStyle(node).transform : ''
    })

  // 先确保存在折叠态节点（收起第一个根类目）；chevron 有 transform 过渡，读值前等它落定
  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-demo')!
    el.shadowRoot!.querySelector<HTMLElement>('.node[aria-expanded="true"]')!.click()
  })
  await page.waitForTimeout(400)
  const ltr = await readTransform()
  await page.evaluate(() => {
    const el = document.querySelector('oas-category#category-demo')!
    el.setAttribute('dir', 'rtl')
  })
  await page.waitForTimeout(400)
  const rtl = await readTransform()
  expect(ltr, 'LTR 折叠箭头应无旋转（指向右侧）').toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  expect(rtl, 'RTL 折叠箭头应旋转 180°（指向左侧）').toContain('matrix(-1')
})
