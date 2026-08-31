// 复核回归：tabs——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('tabs tab-position=right：tab 内容右对齐（justify-content: flex-end）', async ({ page }) => {
  // 曾现 bug：纵向 right 模式下 .tab 随 tablist 拉伸占满宽，但内容仍左对齐，与 left 模式不镜像。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[tab-position="right"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[tab-position="right"]')!
    const tab = el.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    const cs = getComputedStyle(tab)
    return {
      hostRightClass: el.classList.contains('oas-tabs--right'),
      justifyContent: cs.justifyContent,
    }
  })
  expect(r.hostRightClass).toBe(true)
  expect(r.justifyContent).toBe('flex-end')
})

test('tabs 动态增删：+ 新增默认标签（locale 文案、选中、roving tabindex），× 关闭可见反馈', async ({
  page,
}) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[addable] oas-tab-panel')
  const r1 = await page.evaluate(() => {
    const t = document.querySelector('#tabs-editable')!
    const add = t.shadowRoot!.querySelector<HTMLElement>('.tab-add')!
    add.focus() // 模拟真实点击：先聚焦 + 按钮（键盘 Enter / 鼠标按下都会聚焦）
    add.click()
    // 排除 + 占位 tab（role=tab 但无 data-value，axe aria-required-children 需要它是 tab）
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    const selected = tabs.find((b) => b.getAttribute('aria-selected') === 'true')!
    return {
      count: tabs.length,
      selectedText: selected.textContent ?? '',
      selectedTabIndex: selected.getAttribute('tabindex'),
      otherTabIndexes: tabs.filter((b) => b !== selected).map((b) => b.getAttribute('tabindex')),
      panelCount: t.querySelectorAll('oas-tab-panel').length,
      focusOnNew: t.shadowRoot!.activeElement === selected,
    }
  })
  expect(r1.count).toBe(3)
  expect(r1.panelCount).toBe(3)
  expect(r1.selectedText).toContain('新标签')
  expect(r1.selectedTabIndex).toBe('0')
  expect(r1.otherTabIndexes.every((v) => v === '-1')).toBe(true)
  expect(r1.focusOnNew).toBe(true)

  // 关闭新增的激活标签 → 面板移除 + 切回第一个 + 焦点仍在标签栏
  const r2 = await page.evaluate(() => {
    const t = document.querySelector('#tabs-editable')!
    const key = t.getAttribute('active')!
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    const idx = tabs.findIndex((b) => b.getAttribute('data-value') === key)
    const close = tabs[idx]!.querySelector<HTMLElement>('.tab-close')!
    close.focus // 模拟真实鼠标点击 ×（mousedown 聚焦可聚焦的关闭位）
    close.click()
    const after = [...t.shadowRoot!.querySelectorAll('[role="tab"][data-value]')]
    return {
      panelCount: t.querySelectorAll('oas-tab-panel').length,
      active: t.getAttribute('active'),
      firstSelected: after[0]?.getAttribute('aria-selected'),
      focusInTablist: !!after.find((b) => b === t.shadowRoot!.activeElement),
    }
  })
  expect(r2.panelCount).toBe(2)
  expect(r2.active).toBe('a')
  expect(r2.firstSelected).toBe('true')
  expect(r2.focusInTablist).toBe(true)
})

test('tabs 键盘方向键：焦点随 roving tabindex 移动、aria-selected 同步', async ({ page }) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs oas-tab-panel')
  const r = await page.evaluate(() => {
    const t = document.querySelector('oas-tabs')!
    const tablist = t.shadowRoot!.querySelector<HTMLElement>('[role="tablist"]')!
    const first = t.shadowRoot!.querySelector<HTMLElement>('[role="tab"]')!
    first.focus()
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    const tabs = [...t.shadowRoot!.querySelectorAll('[role="tab"]')]
    return {
      active: t.getAttribute('active'),
      focusIndex: tabs.indexOf(t.shadowRoot!.activeElement as Element),
      selectedIndex: tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true'),
      tabIndexes: tabs.map((b) => b.getAttribute('tabindex')),
    }
  })
  expect(r.active).toBe('b')
  expect(r.focusIndex).toBe(1)
  expect(r.selectedIndex).toBe(1)
  expect(r.tabIndexes).toEqual(['-1', '0', '-1'])
})

test('tabs 图标标签：icon 属性渲染 SVG，slot="icon" 自定义图标，均对读屏隐藏', async ({ page }) => {
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs#tabs-icon oas-tab-panel')
  const r = await page.evaluate(() => {
    const t = document.querySelector('#tabs-icon')!
    const icons = [...t.shadowRoot!.querySelectorAll('.tab-icon')]
    return {
      svgCount: icons.filter((i) => i.querySelector('svg')).length,
      texts: icons.map((i) => i.textContent ?? ''),
      hidden: icons.every((i) => i.getAttribute('aria-hidden') === 'true'),
    }
  })
  expect(r.svgCount).toBe(3) // star / mail / search
  expect(r.texts.join('')).toContain('🚀')
  expect(r.hidden).toBe(true)
})

// —— steps P1 补缺：点状（progress-dot）+ 导航模式（navigation）——
// 曾现缺口：步骤只有序号圆点一种形态，无点状/导航形态；导航模式无内置上一步/下一步。
// 本次补 progress-dot（圆点 + 细连线 + 点击/键盘切换）与 navigation（箭头导航条 + 底部按钮）。

test('tabs 非激活项 hover 有视觉反馈（line 与 card 模式）', async ({ page }) => {
  // 集成反馈固化：曾 .tab 无 hover 规则，悬停毫无反馈（选中项 hover 设计不变，选非激活项断言）
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  const tab = page.locator('oas-tabs [role="tab"][aria-selected="false"]').first()
  const before = await tab.evaluate((el) => getComputedStyle(el).backgroundColor)
  await tab.hover()
  await page.waitForTimeout(300)
  const after = await tab.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(after, 'hover 后背景应变化').not.toBe(before)
})

test('tabs 溢出（滚动/更多）时标签不压缩换行——white-space nowrap + flex-shrink 0（防文字竖排）', async ({
  page,
}) => {
  // 缺陷固化：more/滚动模式下 tab 曾被 flex 压缩致文字逐字竖排（应 nowrap + flex-shrink:0 保持宽度，
  // 溢出交给滚动箭头或「更多」下拉，而非挤压标签）
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  // 溢出滚动 demo 与 more demo 的标签都不该换行/压缩
  for (const sel of ['.demo-block oas-tabs:not([more])', '.demo-block oas-tabs[more]']) {
    const result = await page
      .locator(sel)
      .first()
      .evaluate((el) => {
        const tabs = [...(el.shadowRoot?.querySelectorAll('[role="tab"][data-value]') ?? [])]
        const t = tabs.find((x) => (x as HTMLElement).offsetWidth > 0)
        if (!t) return null
        const cs = getComputedStyle(t as HTMLElement)
        return { whiteSpace: cs.whiteSpace, flexShrink: cs.flexShrink }
      })
    if (result) {
      expect(result.whiteSpace, `${sel} 标签应 nowrap`).toBe('nowrap')
      expect(result.flexShrink, `${sel} 标签应不压缩`).toBe('0')
    }
  }
})

test('tabs editable 真实双击进入重命名编辑态（真实 dblclick，非 dispatchEvent）', async ({
  page,
}) => {
  // 缺陷固化：真实双击前两次 click 触发 activate→update 重建 tablist，导致浏览器判定双击目标
  // 已变而不派发 dblclick，重命名永不进入编辑态。修复=activate 重复点击守卫 + dblclick 委托到
  // 稳定的 tablist 容器。此处用 Playwright 真实 dblclick 复现路径（dispatchEvent 无法暴露该 bug）。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tabs-rename')
  await page.locator('h2:has-text("可编辑重命名")').first().scrollIntoViewIfNeeded()
  const tabA = page.locator('#tabs-rename [role="tab"][data-value="a"]')
  await tabA.dblclick({ force: true })
  await page.waitForTimeout(300)
  const hasInput = await page.evaluate(
    () => !!document.querySelector('#tabs-rename')!.shadowRoot!.querySelector('.tab-rename-input'),
  )
  expect(hasInput, '真实双击应进入重命名编辑态').toBe(true)
})

test('tabs editable 编辑态与非编辑态几何一致（编辑框贴合标签宽高，不晃动）', async ({ page }) => {
  // 缺陷固化：编辑框曾因 1px border + padding 比 label 高 1px，撑高 tab 致标签栏轻微晃动；
  // 修复=outline 替代 border（不占位）+ 宽高贴合原 label。此处断言切换前后 tab 高度不变。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tabs-rename')
  await page.locator('h2:has-text("可编辑重命名")').first().scrollIntoViewIfNeeded()
  const tabA = page.locator('#tabs-rename [role="tab"][data-value="a"]')
  const before = await tabA.evaluate((el) => {
    const label = el.querySelector('.tab-label')!.getBoundingClientRect()
    return { tabH: el.getBoundingClientRect().height, labelTop: label.top, labelH: label.height }
  })
  await tabA.dblclick({ force: true })
  await page.waitForTimeout(200)
  const after = await tabA.evaluate((el) => {
    const input = el.querySelector('.tab-rename-input')!.getBoundingClientRect()
    return { tabH: el.getBoundingClientRect().height, inputTop: input.top, inputH: input.height }
  })
  expect(after.tabH, '编辑态不应撑高 tab').toBe(before.tabH)
  expect(Math.abs(after.inputTop - before.labelTop), '编辑框与原标签纵向对齐').toBeLessThanOrEqual(
    0.5,
  )
  expect(Math.abs(after.inputH - before.labelH), '编辑框与原标签同高').toBeLessThanOrEqual(0.5)
})

test('tabs 选中下划线与文字同主色且为 2px 细线（light/dark，无 border 叠加变粗）', async ({
  page,
}) => {
  // 缺陷固化：①tablist overflow-x:auto 时 overflow-y 连带裁剪，tab border 溢出的激活下划线被裁
  // 导致 dark 下选中下划线丢失主色；②改 box-shadow 后与残留 border 占位叠加变粗。
  // 修复=纯 box-shadow inset 2px 主色（无 border 占位）。断言选中下划线颜色==选中文字颜色、且
  // border-bottom 无占位（宽度 0，粗细仅由 box-shadow 2px 决定）。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs')
  const probe = await page.evaluate(() => {
    const el = document.querySelector('.demo-block oas-tabs')!
    const sel = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement
    const cs = getComputedStyle(sel)
    // ::after 伪元素承载激活下划线（独立 2px 盒子，渲染精确无 box-shadow 亚像素伪影）
    const after = getComputedStyle(sel, '::after')
    return {
      color: cs.color,
      borderBottomWidth: cs.borderBottomWidth,
      afterBg: after.backgroundColor,
      afterH: after.height,
    }
  })
  // 下划线颜色 == 文字颜色（同主色）；border 无占位（0）；::after 为 2px 均匀色带
  expect(probe.afterBg, '选中下划线（::after）应与文字同主色').toBe(probe.color)
  expect(probe.afterH, '下划线应为 2px').toBe('2px')
  expect(probe.borderBottomWidth, 'border 不应再占位').toBe('0px')
  // card 模式：激活用边框连通（border-bottom bg 色），::after 不叠加主色（否则变粗）
  const cardProbe = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-tabs')].find((t) =>
      t.classList.contains('oas-tabs--card'),
    )
    if (!el) return null
    const sel = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement
    return getComputedStyle(sel, '::after').backgroundColor
  })
  expect(
    cardProbe === null || cardProbe === 'rgba(0, 0, 0, 0)' || cardProbe === 'transparent',
    'card 模式激活 ::after 不应叠加主色（保持边框连通）',
  ).toBe(true)
})

test('tabs more 模式（通用机制）：tab 全渲染不隐藏 + more 下拉列视口外 tab + 点选平滑滚动到可见区', async ({
  page,
}) => {
  // 通用（滚动 + 视口外镜像下拉）：more 不再是 display:none 收缩，而是 tab 全部渲染 +
  // tablist 可滚动，more 下拉列出当前滚动视口之外的 tab 作快捷跳转，点选后平滑滚动到可见区。
  await page.goto('/components/tabs.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tabs[more]')
  await page.locator('h2:has-text("更多收缩")').first().scrollIntoViewIfNeeded()
  // tab 全部渲染不隐藏（无 display 收缩）
  const noHidden = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[more]')!
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[role="tab"][data-value]')].every(
      (t) => getComputedStyle(t).display !== 'none',
    )
  })
  expect(noHidden, 'more 模式 tab 应全部渲染不隐藏').toBe(true)
  // 打开 more 下拉，列出视口外 tab
  await page.evaluate(() => {
    document
      .querySelector('oas-tabs[more]')!
      .shadowRoot!.querySelector<HTMLElement>('.more-btn')!
      .click()
  })
  await page.waitForTimeout(200)
  const dropCount = await page.evaluate(
    () =>
      document.querySelector('oas-tabs[more]')!.shadowRoot!.querySelectorAll('.more-item').length,
  )
  expect(dropCount, 'more 下拉应列出视口外 tab').toBeGreaterThan(0)
  // 点选最后一个视口外项 → 平滑滚动到可见 + 激活
  const scrollBefore = await page.evaluate(
    () =>
      document.querySelector('oas-tabs[more]')!.shadowRoot!.querySelector('.tablist')!.scrollLeft,
  )
  await page.evaluate(() => {
    const items = [
      ...document
        .querySelector('oas-tabs[more]')!
        .shadowRoot!.querySelectorAll<HTMLElement>('.more-item'),
    ]
    items[items.length - 1]?.click()
  })
  await page.waitForTimeout(600) // 等平滑滚动
  const result = await page.evaluate(() => {
    const el = document.querySelector('oas-tabs[more]')!
    return {
      active: el.getAttribute('active'),
      scrollLeft: el.shadowRoot!.querySelector('.tablist')!.scrollLeft,
    }
  })
  expect(result.active, '点选后应激活').toBeTruthy()
  expect(result.scrollLeft, '点选视口外项应滚动到可见区').toBeGreaterThan(scrollBefore)
})
