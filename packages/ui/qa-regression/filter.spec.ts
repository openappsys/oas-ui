// 复核回归：filter——两形态面板真点击、键盘闭环、已选撤销、暗色 token。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const GROUPS =
  '[{"key":"brand","label":"品牌","multiple":true,"options":[{"value":"a","label":"品牌A"},{"value":"b","label":"品牌B"}]},{"key":"color","label":"颜色","options":[{"value":"red","label":"红色"},{"value":"blue","label":"蓝色"}]}]'

/** 预置一个带条件组的 dropdown filter（attrs = JSON 对象串，如 '{"conditions":"..."}'） */
async function mountDropdown(page: import('@playwright/test').Page, id: string, attrs = '{}'): Promise<void> {
  await page.evaluate(
    ({ id, groups, attrs }) => {
      const el = document.createElement('oas-filter')
      el.id = id
      el.setAttribute('groups', groups)
      for (const [k, v] of Object.entries(JSON.parse(attrs) as Record<string, string>)) el.setAttribute(k, v)
      document.querySelector('.demo-block')!.appendChild(el)
    },
    { id, groups: GROUPS, attrs },
  )
  await up(page, `#${id}`)
}

test('filter：dropdown 面板真点击——开面板选条件，chips 回显 + oas-change 反馈可见', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-basic')

  const host = page.locator('#fr-e2e-basic')
  const trigger = host.locator('[part="trigger"]')
  await expect(trigger).toBeVisible()

  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const panel = host.locator('[part="panel"]')
  await expect(panel).toBeVisible()

  // 点多选组第一项 → chip 出现
  const optA = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  await optA.click()
  await expect(optA).toHaveAttribute('aria-checked', 'true')
  const chip = host.locator('[part="chip"][data-group="brand"][data-value="a"]')
  await expect(chip).toBeVisible()
  await expect(chip).toContainText('品牌：品牌A')
  // 徽标计数可见
  await expect(host.locator('[part="badge"]')).toContainText('1')
  // aria-live 摘要真实可读
  await expect(host.locator('[part="live"]')).toContainText('品牌：品牌A')
  // demo 事件反馈输出（oas-change）
  await expect(page.locator('#filter-basic-out')).toContainText('oas-change')
})

test('filter：drawer 形态真点击——遮罩下条件可选，「完成」/ 遮罩关闭', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')

  const host = page.locator('oas-filter[panel="drawer"]').first()
  const trigger = host.locator('[part="trigger"]')
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const mask = host.locator('[part="mask"]')
  await expect(mask).toBeVisible()
  const panel = host.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('data-form', 'drawer')
  await expect(panel).toBeVisible()

  // 选一个条件（真点击）
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeVisible()

  // 「完成」按钮关闭
  await host.locator('[part="done"]').click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(mask).toBeHidden()

  // 再开 → 点遮罩关闭
  await trigger.click()
  await expect(mask).toBeVisible()
  await mask.click({ position: { x: 10, y: 10 } })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  // 焦点回收：遮罩点击后面板/遮罩隐藏时浏览器先把焦点回收到 body——关闭路径必须把焦点
  // 收回触发器（否则键盘用户失位，下一次 Tab 从文档头开始）
  const focusedPart = (): Promise<string | null> =>
    host.evaluate((el) => {
      let a: Element | null = document.activeElement
      while (a && a.shadowRoot?.activeElement) a = a.shadowRoot.activeElement
      return a?.getAttribute?.('part') ?? null
    })
  await expect.poll(focusedPart).toBe('trigger')
})

test('filter：键盘闭环——Enter 开面板聚焦首条件，方向键移动，Esc 关回触发器', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-kbd')

  const host = page.locator('#fr-e2e-kbd')
  const trigger = host.locator('[part="trigger"]')
  // 触发器 Tab 可达
  await trigger.focus()
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  // 开面板自动聚焦首个条件
  const firstOption = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  await expect(firstOption).toBeFocused()

  // 方向键移动焦点（不触发选择）
  await page.keyboard.press('ArrowDown')
  const secondOption = host.locator('[part="option"][data-group="brand"][data-value="b"]')
  await expect(secondOption).toBeFocused()
  await expect(host.locator('[part="chip"][data-value="b"]')).toHaveCount(0)

  // Esc 关闭并焦点回触发器
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()

  // chips 可聚焦：选条件后 Tab 到 chip 回车撤销
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter') // 首条件已聚焦，Enter 选中（radio role 语义下点击/回车等价）
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeVisible()
  await host.locator('[part="chip"][data-value="a"]').focus()
  await expect(host.locator('[part="chip"][data-value="a"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(host.locator('[part="chip"][data-value="a"]')).toHaveCount(0)
})

test('filter：已选撤销与重置——chips 逐项移除、重置清全部（含排序回缺省）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-chips', JSON.stringify({ conditions: '{"sort":"price","order":"desc"}' }))

  const host = page.locator('#fr-e2e-chips')
  const trigger = host.locator('[part="trigger"]')
  await trigger.click()
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()
  await host.locator('[part="option"][data-group="color"][data-value="red"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(2)
  await expect(host.locator('[part="badge"]')).toContainText('2')
  // dropdown 面板锚定在栏下方（会盖住 chips 行）——选完条件先收面板，再操作 chips（用户真实操作流）
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  // 逐项撤销
  await host.locator('[part="chip"][data-group="brand"][data-value="a"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(1)
  await expect(host.locator('[part="badge"]')).toContainText('1')

  // 重置：清空 chips + 排序回缺省（aria-checked 回首项）
  await host.locator('[part="reset"]').click()
  await expect(host.locator('[part="chip"]')).toHaveCount(0)
  await expect(host.locator('[part="badge"]')).toBeHidden()
  await expect(host.locator('[part="sort-item"]').first()).toHaveAttribute('aria-checked', 'true')
  const raw = (await host.getAttribute('conditions')) ?? '{}'
  await expect(JSON.parse(raw)).toEqual({})
})

test('filter：暗色 token——选中态底色与文字色随主题切换（无硬编码浅色残留）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-dark')

  const host = page.locator('#fr-e2e-dark')
  const readColors = (): Promise<{ panelBg: string; optionColor: string; activeBg: string }> =>
    host.evaluate((el) => {
      const root = el.shadowRoot!
      const panel = root.querySelector<HTMLElement>('[part="panel"]')!
      const option = root.querySelector<HTMLElement>('[part="option"]')!
      return {
        panelBg: getComputedStyle(panel).backgroundColor,
        optionColor: getComputedStyle(option).color,
        activeBg: getComputedStyle(option).borderColor,
      }
    })

  const light = await readColors()
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  // token 生效信号：demo 块底色翻暗（dark.spec 同款，不按本机帧率定等待）
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.demo-block__body')!).backgroundColor))
    .toBe('rgb(24, 24, 27)')
  const dark = await readColors()

  // 面板底色随主题翻转（token 引用生效；暗色 rgb 值显著变暗）
  const parseLum = (bg: string): number => {
    const m = bg.match(/\d+/g) ?? ['255', '255', '255']
    return Number(m[0]) + Number(m[1]) + Number(m[2])
  }
  expect(parseLum(dark.panelBg)).toBeLessThan(parseLum(light.panelBg))
  // 文字色发生变化（token 化，不是固定黑）
  expect(dark.optionColor).not.toBe(light.optionColor)
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
})

test('filter：dropdown 面板锚定几何——面板贴在触发器正下方且与栏同宽；视口下方放不下时向上翻', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-anchor')

  const host = page.locator('#fr-e2e-anchor')
  // 滚到视口顶部保证下方空间充足（贴底形态的前提；demo 位置靠下时面板会正确翻向上方）
  await host.evaluate((el) => el.scrollIntoView({ block: 'start' }))
  const trigger = host.locator('[part="trigger"]')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const readGeometry = (): Promise<{
    barTop: number
    barBottom: number
    barWidth: number
    panelTop: number
    panelWidth: number
    panelHeight: number
  }> =>
    host.evaluate((el) => {
      const root = el.shadowRoot!
      const bar = root.querySelector<HTMLElement>('[part="bar"]')!
      const panel = root.querySelector<HTMLElement>('[part="panel"]')!
      const barRect = bar.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      return {
        barTop: barRect.top,
        barBottom: barRect.bottom,
        barWidth: barRect.width,
        panelTop: panelRect.top,
        panelWidth: panelRect.width,
        panelHeight: panelRect.height,
      }
    })

  // 贴底展开：面板顶边 ≈ 栏底边（+margin 空隙，±8px 容差），宽 ≈ 栏宽，data-flip 未翻转
  const g = await readGeometry()
  expect(g.panelTop).toBeGreaterThan(g.barTop)
  expect(Math.abs(g.panelTop - g.barBottom)).toBeLessThanOrEqual(8)
  expect(Math.abs(g.panelWidth - g.barWidth)).toBeLessThanOrEqual(2)

  // 视口空间翻转：把视口压到只剩栏上方一小块 → 下方放不下，面板翻到栏上方（top < barTop）
  await page.setViewportSize({ width: 800, height: 160 })
  await host.evaluate((el) => {
    // 收起再展开，重新触发翻转判定
    const trigger = el.shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
    trigger.click()
    trigger.click()
  })
  const flipped = await host.evaluate((el) => {
    const root = el.shadowRoot!
    const bar = root.querySelector<HTMLElement>('[part="bar"]')!
    const panel = root.querySelector<HTMLElement>('[part="panel"]')!
    return {
      flip: panel.getAttribute('data-flip'),
      barTop: bar.getBoundingClientRect().top,
      panelTop: panel.getBoundingClientRect().top,
    }
  })
  expect(flipped.flip).toBe('up')
  expect(flipped.panelTop).toBeLessThan(flipped.barTop)
})

test('filter：RTL 下组内水平方向键镜像——ArrowRight 向先前移（对齐 time-select 口径）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')
  await mountDropdown(page, 'fr-e2e-rtl', JSON.stringify({ dir: 'rtl' }))

  const host = page.locator('#fr-e2e-rtl')
  const trigger = host.locator('[part="trigger"]')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const first = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  const second = host.locator('[part="option"][data-group="brand"][data-value="b"]')
  await second.focus()
  await page.keyboard.press('ArrowRight')
  // RTL：ArrowRight = 视觉向右 = 前一项（LTR 下会 clamp 停在第二项，此断言可区分修复前后）
  await expect(first).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(second).toBeFocused()
  // 焦点移动不改变条件（仍不触发选择）
  await expect(host.locator('[part="chip"]')).toHaveCount(0)
})

test('filter：drawer 真键盘焦点陷阱——Tab 循环限制在面板内（dialog 语义 + aria-modal）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-filter')

  const host = page.locator('oas-filter[panel="drawer"]').first()
  const trigger = host.locator('[part="trigger"]')
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')

  const panel = host.locator('[part="panel"]')
  await expect(panel).toHaveAttribute('role', 'dialog')
  await expect(panel).toHaveAttribute('aria-modal', 'true')

  // 真键盘 Tab 循环：从最后一个可聚焦项（完成按钮）Tab → 回面板内首个未禁用选项
  await host.locator('[part="done"]').focus()
  await page.keyboard.press('Tab')
  const firstOption = host.locator('[part="option"][data-group="brand"][data-value="a"]')
  await expect(firstOption).toBeFocused()
  // Shift+Tab 从首项循环到末项
  await page.keyboard.press('Shift+Tab')
  await expect(host.locator('[part="done"]')).toBeFocused()
  // 焦点游离（触发器）→ Tab 拉回面板首项（不落到页面其它元素）
  await trigger.focus()
  await page.keyboard.press('Tab')
  await expect(firstOption).toBeFocused()
})

// —— T19 L3：persist 能力子路径 demo（条件持久化章节）——
// 「保存」→ 编码串与 localStorage 直存反馈可见；「还原」→ conditions 回写可见。
test('filter：持久化 demo——保存出编码串与 localStorage 反馈、还原回写 conditions', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#filter-persist')
  const host = page.locator('#filter-persist')
  const out = page.locator('#filter-persist-out')

  // 选一个条件（真点面板选项），选完收起面板（面板开着会遮挡下方按钮行）
  const trigger = host.locator('[part="trigger"]')
  await trigger.scrollIntoViewIfNeeded()
  await trigger.click()
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()
  await expect(host.locator('[part="badge"]')).toContainText('1')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  // 保存 → 反馈行出现 URL 串（含 conditions=）与 localStorage JSON
  await page.locator('#filter-persist-save').click()
  await expect(out).toContainText('conditions=')
  await expect(out).toContainText('localStorage')
  await expect(out).toContainText('"groups"')

  // 改条件（重新开面板选第二个品牌）→ 还原 → conditions 回写为保存时的值
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await host.locator('[part="option"][data-group="brand"][data-value="b"]').click()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await page.locator('#filter-persist-restore').click()
  await expect(out).toContainText('已还原')
  const conditions = await host.evaluate((el) => el.getAttribute('conditions'))
  expect(conditions && JSON.parse(conditions)).toMatchObject({ groups: { brand: ['a'] } })
})

// —— 复核修复批（用户可见）：persist demo 的操作按钮行移到筛选器上方——\r\n// 条件面板向下展开（dropdown 默认方向）时不再遮挡按钮：面板开启态 elementFromPoint 命中按钮自身。\r\n// 已知限制：面板空间不足向上翻转（data-flip=up）时会临时覆盖上方按钮行——浮层覆盖邻近内容属浮层本质，\r\n// 点面板外区域关闭即可操作（filter.md 注意事项已说明）。
test('filter：persist demo 面板开启态不遮挡操作按钮（elementFromPoint 命中按钮）', async ({ page }) => {
  await page.goto('/components/filter.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#filter-persist')
  const host = page.locator('#filter-persist')
  const trigger = host.locator('[part="trigger"]')
  await trigger.scrollIntoViewIfNeeded()

  // 开面板（面板向下铺开，覆盖 filter 本体下方区域）+ 选一个条件（保存后反馈需含非空条件）
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(host.locator('[part="panel"]')).toBeVisible()
  await host.locator('[part="option"][data-group="brand"][data-value="a"]').click()

  // 面板开启态：三个操作按钮的几何中心 elementFromPoint 必须命中按钮自身（不被 filter 面板拦截）
  const hitIds = await page.evaluate(() => {
    const probe = (id: string): string => {
      const btn = document.getElementById(id)!
      const rect = btn.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return hit && (hit === btn || btn.contains(hit)) ? id : `blocked:${hit?.tagName}`
    }
    return [probe('filter-persist-save'), probe('filter-persist-restore'), probe('filter-persist-clear')]
  })
  expect(hitIds).toEqual(['filter-persist-save', 'filter-persist-restore', 'filter-persist-clear'])
  // 且按钮真实可点（面板开着直接点保存）
  await page.locator('#filter-persist-save').click()
  await expect(page.locator('#filter-persist-out')).toContainText('conditions=')
})
