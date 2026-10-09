// 复核回归：combobox——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { panelGeometryAcrossOpens, up } from './helpers'

test('combobox 浮层定位：首开左缘对齐输入框且与再开一致', async ({ page }) => {
  // 曾现 bug：与 select 同根因——positionDropdown 先用面板固有宽度（未撑开）算 left，
  // 之后才把 style.width 设成输入框宽度 → 首开左缘偏右（实测 +89px），再开才对齐。
  // 不变量：面板左缘 == 输入框左缘，且首开/再开完全一致。
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-combobox')
  const g = await panelGeometryAcrossOpens(page, 'oas-combobox', async (host) => {
    await host.locator('input[part="input"]').click()
    await page.keyboard.press('ArrowDown')
  })
  expect(Math.abs(g.first.left - g.first.anchorLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(g.first.left - g.second.left)).toBeLessThanOrEqual(1)
})

// 移动端专项：bottom-sheet 底部抽屉承载（data-mobile-sheet 标记 + sheet open + dropdown 静态化 + oas-close 同步收起）
test('combobox 移动端：底部抽屉贴视口底展开 + 列表可交互 + 点遮罩同步收起', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  try {
    await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
    await up(page, 'oas-combobox')
    const host = page.locator('oas-combobox').first()
    await expect(host).toHaveAttribute('data-mobile-sheet', '')
    // combobox 聚焦即展开
    await host.locator('input').click()
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-combobox')!.shadowRoot!
        return root.querySelector('[part="dropdown"]')!.classList.contains('open')
      },
      null,
      { timeout: 5000 },
    )
    // 等底部抽屉升起动画落定（transform 收敛、面板贴视口底）后再量几何，避免量到动画中途
    await page.waitForFunction(
      () => {
        const root = document.querySelector('oas-combobox')!.shadowRoot!
        const sheet = root.querySelector('oas-bottom-sheet') as HTMLElement
        const panel = sheet.shadowRoot!.querySelector('.sheet') as HTMLElement
        return Math.abs(panel.getBoundingClientRect().bottom - window.innerHeight) < 1
      },
      null,
      { timeout: 5000 },
    )
    const info = await host.evaluate((el) => {
      const root = el.shadowRoot!
      const sheet = root.querySelector('oas-bottom-sheet')!
      const sheetRoot = sheet.shadowRoot!
      const panel = sheetRoot.querySelector<HTMLElement>('.sheet')!
      const backdrop = sheetRoot.querySelector<HTMLElement>('.backdrop')!
      const handle = sheetRoot.querySelector<HTMLElement>('.handle')!
      const dropdown = root.querySelector<HTMLElement>('[part="dropdown"]')!
      const pr = panel.getBoundingClientRect()
      return {
        sheetOpen: sheet.hasAttribute('open'),
        sheetPassive: sheet.hasAttribute('passive'),
        dropdownPosition: getComputedStyle(dropdown).position,
        panelBottom: pr.bottom,
        panelLeft: pr.left,
        panelRight: pr.right,
        vw: window.innerWidth,
        vh: window.innerHeight,
        backdropOpacity: Number(getComputedStyle(backdrop).opacity),
        handleVisible: getComputedStyle(handle).display !== 'none',
        // 面板可用：抽屉内能取到选项行
        options: dropdown.querySelectorAll('[role="option"]').length,
        // 触控目标抬升：首个选项行几何
        optionH: (() => {
          const row = dropdown.querySelector<HTMLElement>('.option')!
          return row.getBoundingClientRect().height
        })(),
      }
    })
    expect(info.sheetOpen, '移动端展开时 sheet 应带 open').toBe(true)
    expect(info.sheetPassive, '移动端 sheet 应去 passive 变容器').toBe(false)
    expect(info.dropdownPosition, '移动端 dropdown 应静态化').toBe('static')
    expect(Math.abs(info.panelBottom - info.vh), '抽屉面板应贴视口底（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.panelLeft, '抽屉面板应左贴视口').toBe(0)
    expect(Math.abs(info.panelRight - info.vw), '抽屉面板应右贴视口（≤1px 亚像素容差）').toBeLessThanOrEqual(1)
    expect(info.backdropOpacity, '遮罩应可见').toBeGreaterThan(0.5)
    expect(info.handleVisible, 'drag handle 应可见').toBe(true)
    expect(info.options, '抽屉内列表应可交互（有选项行）').toBeGreaterThan(0)
    // 触控目标抬升：移动形态下选项行高度 ≥44px（--oas-touch-target-min）
    expect(info.optionH, `移动形态选项行高度 ${Math.round(info.optionH)}px 应 ≥44px`).toBeGreaterThanOrEqual(44)
    // 抽屉内点选交互：点第一项 → 选中并回写 value
    await host.evaluate((el) => {
      const row = el.shadowRoot!.querySelector<HTMLElement>('[part="dropdown"] [role="option"]')!
      row.click()
    })
    await expect.poll(() => host.evaluate((el) => el.getAttribute('value'))).not.toBe(null)
    // oas-close 同步收起：点遮罩（先失焦——选中后焦点仍在输入框，
    // 直接再点输入框不会重触发 focus，与 PC 行为一致；失焦后重新聚焦即重开）
    await host.evaluate((el) => el.shadowRoot!.querySelector<HTMLInputElement>('input')!.blur())
    await host.locator('input').click()
    await page.waitForFunction(
      () => document.querySelector('oas-combobox')!.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open'),
      null,
      { timeout: 5000 },
    )
    await host.evaluate((el) => {
      const sheet = el.shadowRoot!.querySelector('oas-bottom-sheet')!
      sheet.shadowRoot!.querySelector<HTMLElement>('.backdrop')!.click()
    })
    await expect
      .poll(() => host.evaluate((el) => el.shadowRoot!.querySelector('oas-bottom-sheet')!.hasAttribute('open')))
      .toBe(false)
  } finally {
    await ctx.close()
  }
})

// ---- P2 批次：autocomplete 透传 ----

test('combobox autocomplete="off" 透传内层 input（默认即 off）', async ({ page }) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-combobox[autocomplete]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-combobox[autocomplete]')!
    return (el.shadowRoot!.querySelector('input') as HTMLInputElement).getAttribute('autocomplete')
  })
  expect(r).toBe('off')
})

// ---- multiple 多选批次：真点选项叠加 chips / chip 移除 / 上限拦截反馈可见 ----

test('combobox multiple：真点选项叠加为 chips、value JSON 回写、面板保持展开、chip × 移除、demo 反馈可见', async ({
  page,
}) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-multi')
  const host = page.locator('#cb-multi')
  // 展开面板（点击输入框 → focus 开面板）
  await host.locator('input').click()
  await page.waitForFunction(
    () =>
      document.querySelector('#cb-multi')!.shadowRoot!.querySelector('[part="dropdown"]')!.classList.contains('open'),
    null,
    { timeout: 5000 },
  )
  const chipLabels = () =>
    page.evaluate(() =>
      [...document.querySelector('#cb-multi')!.shadowRoot!.querySelectorAll('.chip .chip-label')].map(
        (n) => n.textContent,
      ),
    )
  // 点第 1 项 → chip 出现 + value JSON + 面板保持展开
  await page.evaluate(() => {
    document
      .querySelector('#cb-multi')!
      .shadowRoot!.querySelectorAll('[part="dropdown"] [role="option"]')[0]!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  await expect.poll(chipLabels).toEqual(['苹果'])
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#cb-multi')!.getAttribute('value')))
    .toBe('["apple"]')
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('#cb-multi')!.shadowRoot!.querySelector('input')!.getAttribute('aria-expanded'),
      ),
    )
    .toBe('true')
  // 点第 3 项 → 两枚 chip
  await page.evaluate(() => {
    document
      .querySelector('#cb-multi')!
      .shadowRoot!.querySelectorAll('[part="dropdown"] [role="option"]')[2]!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  await expect.poll(chipLabels).toEqual(['苹果', '橙子'])
  // demo 反馈文本可见（value JSON 回显）
  await expect(page.locator('#cb-multi-out')).toContainText('["apple","orange"]')
  // 点 chip 的 × → 移除单项
  await page.evaluate(() => {
    const chip = document.querySelector('#cb-multi')!.shadowRoot!.querySelectorAll('.chip')[0]!
    ;(chip.querySelector('button') as HTMLButtonElement).click()
  })
  await expect.poll(chipLabels).toEqual(['橙子'])
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#cb-multi')!.getAttribute('value')))
    .toBe('["orange"]')
})

test('combobox multiple：max-count 上限拦截（第 4 项点击被拦 + exceed 反馈可见）+ max-tag-count 折叠 +N', async ({
  page,
}) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-multi-max')
  const host = page.locator('#cb-multi-max')
  await host.locator('input').click()
  await page.waitForFunction(
    () =>
      document
        .querySelector('#cb-multi-max')!
        .shadowRoot!.querySelector('[part="dropdown"]')!
        .classList.contains('open'),
    null,
    { timeout: 5000 },
  )
  // 连选 3 项到上限
  for (const idx of [0, 1, 2]) {
    await page.evaluate((i) => {
      document
        .querySelector('#cb-multi-max')!
        .shadowRoot!.querySelectorAll('[part="dropdown"] [role="option"]')
        [i]!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    }, idx)
  }
  // max-tag-count=2：标签折叠为 2 + '+1'
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.querySelector('#cb-multi-max')!.shadowRoot!
        const chips = [...root.querySelectorAll('.chip .chip-label')].map((n) => n.textContent)
        const plus = root.querySelector('.chip-plus')?.textContent ?? null
        return { chips, plus }
      }),
    )
    .toEqual({ chips: ['苹果', '香蕉'], plus: '+1' })
  // 点第 4 项（未选项，上限已到）→ 拦截 + exceed 反馈可见
  await page.evaluate(() => {
    document
      .querySelector('#cb-multi-max')!
      .shadowRoot!.querySelectorAll('[part="dropdown"] [role="option"]')[3]!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })
  await expect(page.locator('#cb-multi-max-out')).toContainText('已达上限')
  await expect
    .poll(() => page.evaluate(() => document.querySelector('#cb-multi-max')!.getAttribute('value')))
    .toBe('["apple","banana","orange"]')
})

// ---- 原生 FormData 通道：多选「同名多条」+ 无 name 不注入空名 entry（真实浏览器 FormData 语义）----

test('combobox multiple FormData：有 name 同名多条、无 name 不注入空名 entry', async ({ page }) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-multi')
  const r = await page.evaluate(async () => {
    const build = (name?: string) => {
      const cb = document.createElement('oas-combobox')
      cb.setAttribute('multiple', '')
      if (name) cb.setAttribute('name', name)
      cb.setAttribute('value', '["apple","banana"]')
      cb.setAttribute(
        'options',
        JSON.stringify([
          { label: '苹果', value: 'apple' },
          { label: '香蕉', value: 'banana' },
        ]),
      )
      const form = document.createElement('form')
      form.appendChild(cb)
      document.body.appendChild(form)
      return form
    }
    const named = build('tags')
    const nameless = build()
    await new Promise((res) => setTimeout(res, 50))
    return {
      named: [...new FormData(named).entries()],
      nameless: [...new FormData(nameless).entries()],
    }
  })
  expect(r.named, '有 name → 同名两条 entry').toEqual([
    ['tags', 'apple'],
    ['tags', 'banana'],
  ])
  expect(r.nameless, '无 name → 不提交任何 entry（不注入空名 entry）').toEqual([])
})

// 回归（二轮 review）：chip 移除按钮 mousedown preventDefault——点 × 移除已选项时
// 面板保持展开（修复前 mousedown 默认失焦 → input blur → closePanel，面板在移除生效前意外收起）。
// 真实鼠标点击走完整 mousedown/mouseup/click 序列，复现真实浏览器焦点行为。
test('combobox 多选：点 chip × 移除已选项后面板保持展开（防失焦收面板）', async ({ page }) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-multi')
  const host = page.locator('#cb-multi')
  // 预置两个选中 + 聚焦展开面板
  await host.evaluate((el) => {
    el.setAttribute('value', '["apple","banana"]')
    ;(el.shadowRoot!.querySelector('input') as HTMLInputElement).focus()
  })
  await page.waitForFunction(
    () => document.querySelector('#cb-multi')!.shadowRoot!.querySelector('.dropdown')!.classList.contains('open'),
    null,
    { timeout: 5000 },
  )
  // 真实点击第一个 chip 的 × （完整 mousedown 序列）
  const rm = host.locator('.chip button').first()
  await rm.click()
  // 移除生效
  await expect.poll(() => host.evaluate((el) => el.getAttribute('value')), { timeout: 5000 }).toBe('["banana"]')
  // 面板未收起（修复点）
  const stillOpen = await host.evaluate((el) => el.shadowRoot!.querySelector('.dropdown')!.classList.contains('open'))
  expect(stillOpen, '移除 chip 后面板保持展开（blur 不收面板）').toBe(true)
})
