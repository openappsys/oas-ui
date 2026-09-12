// 复核回归：card——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('card clickable：整卡 role/tabindex 存活、点击派发 oas-click 有可见反馈、内部按钮不触发整卡', async ({ page }) => {
  // 曾现风险：clickable 属性被 Vue 剥离、整卡点击静默失败、actions 内按钮误触整卡
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card[clickable]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })
  // 整卡承担按钮语义（Vue 下 clickable 存活 → role/tabindex 同步）
  const r = await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    const cover = card.shadowRoot!.querySelector('[part="cover-img"]')
    const actions = card.shadowRoot!.querySelector('[part="actions"]')
    return {
      role: card.getAttribute('role'),
      tabindex: card.getAttribute('tabindex'),
      coverSrc: cover?.getAttribute('src') ?? '',
      actionsHidden: actions?.hasAttribute('hidden') ?? true,
    }
  })
  expect(r.role, 'clickable 卡片应带 role=button').toBe('button')
  expect(r.tabindex).toBe('0')
  expect(r.coverSrc).toContain('picsum')
  expect(r.actionsHidden).toBe(false)

  // 点击整卡 → message 可见反馈（demo 监听 oas-click 弹消息）
  await page.evaluate(() => {
    const card = document.querySelector('oas-card[clickable][cover-src]')!
    ;(card.shadowRoot!.querySelector('[part="body"]') as HTMLElement).click()
  })
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })
  const msgCount = await page.locator('oas-message').count()
  expect(msgCount).toBeGreaterThan(0)

  // 点击 actions 内按钮 → 不派发整卡 oas-click（演示反馈应不重复弹出）
  const before = await page.locator('oas-message').count()
  await page.locator('oas-card[clickable][cover-src] oas-button').first().click()
  await page.waitForTimeout(600)
  const after = await page.locator('oas-message').count()
  expect(after, '点内部按钮不应再触发整卡 oas-click').toBe(before)
})

test('card title 吸收：宿主不残留原生 title（消除整卡悬浮 tooltip），标题照常渲染', async ({ page }) => {
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card')
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('oas-card')]
    return {
      total: cards.length,
      residue: cards.filter((c) => c.hasAttribute('title')).length,
      renderedTitles: cards.filter((c) => (c.shadowRoot?.querySelector('[part="title"]')?.textContent ?? '') !== '')
        .length,
    }
  })
  expect(r.total, '页面应有 card demo').toBeGreaterThan(0)
  expect(r.residue, '任何卡片宿主都不应残留原生 title（整卡悬停不弹原生提示）').toBe(0)
  expect(r.renderedTitles, '带 title 的卡片应照常渲染标题区').toBeGreaterThan(0)
})

test('card selectable：点击切换选中 + aria-checked/角标同步 + 内部按钮不触发 + 受控单选宿主回写', async ({ page }) => {
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card[selectable]')
  await page.waitForFunction(() => typeof (window as any).message !== 'undefined', null, {
    timeout: 10000,
  })

  const clickBody = (selector: string) =>
    page.evaluate((sel) => {
      const card = document.querySelector(sel)!
      card
        .shadowRoot!.querySelector('[part="body"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    }, selector)

  // Vue 下 selectable/selected 属性存活 + checkbox 语义 + 角标初始隐藏
  const r = await page.evaluate(() => {
    const multi = [...document.querySelectorAll<HTMLElement>('oas-card[selectable]')].filter(
      (c) => !c.hasAttribute('data-select-radio'),
    )
    const first = multi[0]!
    return {
      total: multi.length,
      selectableAttr: first.hasAttribute('selectable'),
      role: first.getAttribute('role'),
      ariaChecked: first.getAttribute('aria-checked'),
      badgeHidden: first.shadowRoot!.querySelector('[part="check-badge"]')!.hasAttribute('hidden'),
    }
  })
  expect(r.total, '多选卡 demo 应有 3 张').toBe(3)
  expect(r.selectableAttr, 'selectable 属性不被 Vue 剥离').toBe(true)
  expect(r.role).toBe('checkbox')
  expect(r.ariaChecked).toBe('false')
  expect(r.badgeHidden).toBe(true)

  // 点击整卡 → 选中态全套钩子（属性反射 + aria-checked + 角标）+ 计数与消息可见反馈
  await clickBody('oas-card[selectable]:not([data-select-radio])')
  await page.waitForFunction(() => document.querySelector('#card-select-count')?.textContent?.includes('1'), null, {
    timeout: 5000,
  })
  const after = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('oas-card[selectable]:not([data-select-radio])')!
    return {
      selected: card.hasAttribute('selected'),
      ariaChecked: card.getAttribute('aria-checked'),
      badgeHidden: card.shadowRoot!.querySelector('[part="check-badge"]')!.hasAttribute('hidden'),
      count: document.querySelector('#card-select-count')?.textContent ?? '',
    }
  })
  expect(after.selected).toBe(true)
  expect(after.ariaChecked).toBe('true')
  expect(after.badgeHidden, '选中后勾选角标应显示').toBe(false)
  expect(after.count).toContain('1')
  await page.waitForFunction(() => document.querySelectorAll('oas-message').length > 0, null, {
    timeout: 5000,
  })

  // 点击卡内 actions 按钮 → 不触发选中切换（选中态保持、计数不变、无新增选中）
  const beforeSelected = await page.evaluate(() => document.querySelectorAll('oas-card[selectable][selected]').length)
  await page.locator('oas-card[selectable]:not([data-select-radio]) oas-button').first().click()
  await page.waitForTimeout(400)
  const afterSelected = await page.evaluate(() => document.querySelectorAll('oas-card[selectable][selected]').length)
  expect(afterSelected, '点内部按钮不应改变选中态').toBe(beforeSelected)

  // 键盘 Enter 切换（聚焦整卡后派发 keydown）
  await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('oas-card[selectable]:not([data-select-radio])')!
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
  const kb = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('oas-card[selectable]:not([data-select-radio])')!
    return {
      selected: card.hasAttribute('selected'),
      ariaChecked: card.getAttribute('aria-checked'),
    }
  })
  expect(kb.selected).toBe(false)
  expect(kb.ariaChecked).toBe('false')

  // 受控单选卡组：宿主角色 role=radio 保留；点第二张 → 互斥回写（第一张取消、第二张选中）
  const radio = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('oas-card[data-select-radio]')]
    return {
      roles: cards.map((c) => c.getAttribute('role')),
      initial: cards.map((c) => c.hasAttribute('selected')),
    }
  })
  expect(radio.roles, '宿主显式 role=radio 不被组件覆盖').toEqual(['radio', 'radio', 'radio'])
  expect(radio.initial).toEqual([true, false, false])

  await clickBody('oas-card[data-select-radio]:nth-of-type(2)')
  await page.waitForFunction(
    () => {
      const cards = [...document.querySelectorAll<HTMLElement>('oas-card[data-select-radio]')]
      return !cards[0]!.hasAttribute('selected') && cards[1]!.hasAttribute('selected')
    },
    null,
    { timeout: 5000 },
  )
})

test('card title 动态更新：连接后 setAttribute title → 标题区文本即时更新（消费式，非仅首连一次）', async ({
  page,
}) => {
  // 反馈称 title 只读一次不再同步——实证消费式属性：任意时刻 set 都吸收渲染
  await page.goto('/components/card.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-card')
  const ok = await page.evaluate(() => {
    const card = document.querySelector('oas-card')
    if (!card) return false
    card.setAttribute('title', '动态更新标题')
    const text = card.shadowRoot?.querySelector('[part="title"]')?.textContent ?? ''
    return text === '动态更新标题' && !card.hasAttribute('title')
  })
  expect(ok, 'setAttribute title 后标题区应即时更新、宿主不残留原生 title').toBe(true)
})
