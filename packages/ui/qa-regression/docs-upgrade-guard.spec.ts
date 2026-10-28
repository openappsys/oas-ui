// 复核回归：docs demo 升级守卫（whenTagDefined）——升级前裸 property 写入的固化断言。
//
// 背景：demo 脚本对 oas-* 元素的 property 写入若发生在组件升级前，会变成自有属性（expando）
// 遮蔽升级后的 setter——功能静默失效。修复统一走 .vitepress/theme/when-defined.ts 共享守卫；
// 静态防回流（扫裸写）见 packages/docs/prop-write-timing.test.ts。
//
// 本 spec 从用户视角锁「真实 preview 里 demo 的可见行为」+「无 expando 残留」：
//  - 行为断言：formatter/过滤器/禁用规则/快捷预设等守卫写入的功能真实生效（可见反馈）；
//  - expando 断言：demo 写过的 property 不得以自有属性形态残留在实例上
//    （守卫生效时写入走原型 setter → 无自有属性；某天有人拆掉守卫且升级时序竞争落败时，这里红）。
import { test, expect } from '@playwright/test'

// demo 元素升级完成（shadowRoot 就绪）
async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { state: 'attached', timeout: 15000 })
  await p.waitForFunction((s) => (document.querySelector(s) as Element | null)?.shadowRoot != null, sel, {
    timeout: 15000,
  })
}

/** 实例上不得残留同名自有属性（expando 遮蔽 setter 的直接证据） */
async function assertNoExpando(p: import('@playwright/test').Page, sel: string, prop: string) {
  const hasOwn = await p.evaluate(
    ({ sel, prop }) => {
      const el = document.querySelector(sel) as unknown as Record<string, unknown> | null
      return el ? Object.prototype.hasOwnProperty.call(el, prop) : null
    },
    { sel, prop },
  )
  expect(hasOwn, `${sel} 应存在（否则断言空转）`).not.toBeNull()
  expect(hasOwn, `${sel} 实例不得残留自有属性 ${prop}（升级前裸写会遮蔽 setter）`).toBe(false)
}

test('docs 守卫 demo：calendar disabledDate 周末禁用真实生效（无 expando 残留）', async ({ page }) => {
  await page.goto('/components/calendar.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#calendar-disabled-date')
  const r = await page.evaluate(() => {
    const el = document.querySelector('#calendar-disabled-date') as HTMLElement & { disabledDate?: unknown }
    const days = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.day[data-date]')]
    const disabled = days.filter((d) => d.getAttribute('aria-disabled') === 'true')
    const weekdaySample = el.shadowRoot!.querySelector<HTMLButtonElement>(
      `.day[data-date="${new Date().toISOString().slice(0, 10)}"]`,
    )
    return {
      hasOwnExpando: Object.prototype.hasOwnProperty.call(el, 'disabledDate'),
      accessorLive: typeof el.disabledDate === 'function',
      disabledCount: disabled.length,
      allDisabledAreWeekend: disabled.every((d) => {
        const dow = new Date(`${d.getAttribute('data-date')}T00:00:00`).getDay()
        return dow === 0 || dow === 6
      }),
      todayVisible: !!weekdaySample,
      todayEnabled: weekdaySample ? weekdaySample.getAttribute('aria-disabled') !== 'true' : null,
    }
  })
  expect(r.hasOwnExpando, 'disabledDate 不得以自有属性残留（守卫必须生效）').toBe(false)
  expect(r.accessorLive, '原型 getter 应返回 demo 写入的函数（写入必须落到 setter）').toBe(true)
  expect(r.disabledCount, '周末禁用应有可见的禁用格子').toBeGreaterThan(0)
  expect(r.allDisabledAreWeekend, '禁用格子必须全部是周末（demo 规则真实生效）').toBe(true)
  if (r.todayVisible) expect(r.todayEnabled, '工作日（今天）不得被禁用').toBe(true)
})

test('docs 守卫 demo：combobox cb-filter 拼音首字母过滤真实生效（value 通道只有自定义过滤能命中）', async ({
  page,
}) => {
  await page.goto('/components/combobox.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-filter')
  await assertNoExpando(page, '#cb-filter', 'filter')
  // 输入 'pg'：默认 label 包含匹配对「苹果」不命中；只有 demo 写入的自定义过滤（value 拼音缩写按子序列命中）能命中
  await page.locator('#cb-filter').locator('input[part="input"]').fill('pg')
  const labels = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('#cb-filter') as HTMLElement | null
        const rows = el?.shadowRoot?.querySelectorAll<HTMLElement>('[part="dropdown"] [role="option"]')
        return rows && rows.length > 0 ? [...rows].map((o) => o.textContent?.trim() ?? '') : null
      },
      null,
      { timeout: 5000 },
    )
    .then((h) => h.jsonValue())
  expect(labels, "输入 'pg' 应只命中「苹果」（自定义过滤真实生效）").toEqual(['苹果'])
})

test('docs 守卫 demo：select filterMethod 自定义过滤真实生效', async ({ page }) => {
  await page.goto('/components/select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#select-filter')
  // filterMethod 在组件内是 class field（实例自有属性是设计使然），expando 断言不适用——只锁行为
  // 先点 trigger 开面板（search-input 开面板前隐藏），再输入过滤词
  await page.locator('#select-filter').locator('[part="trigger"]').click()
  const search = page.locator('#select-filter').locator('input[part="search-input"]')
  await search.waitFor({ state: 'visible', timeout: 5000 })
  await search.fill('app')
  const labels = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('#select-filter') as HTMLElement | null
        const rows = el?.shadowRoot?.querySelectorAll<HTMLElement>('[part="dropdown"] [role="option"]')
        return rows && rows.length > 0 ? [...rows].map((o) => (o.textContent ?? '').trim()) : null
      },
      null,
      { timeout: 5000 },
    )
    .then((h) => h.jsonValue())
  expect(
    labels !== null && labels.length === 1 && labels[0]!.startsWith('苹果 Apple'),
    `输入 'app' 应过滤到 1 个「苹果 Apple」选项（过滤链路可见生效），实际 ${JSON.stringify(labels)}`,
  ).toBe(true)
})

test('docs 守卫 demo：input formatter 千分位真实渲染（写入即生效，无 expando 残留）', async ({ page }) => {
  await page.goto('/components/input.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#input-format')
  await assertNoExpando(page, '#input-format', 'formatter')
  await page.locator('#input-format').evaluate((el) => {
    ;(el as unknown as { value: string }).value = '12345678'
  })
  const shown = await page.evaluate(() => {
    const el = document.querySelector('#input-format') as HTMLElement
    return el.shadowRoot!.querySelector<HTMLInputElement>('input')!.value
  })
  expect(shown, '写入 12345678 后应显示千分位格式（formatter 真实生效）').toBe('12,345,678')
})

test('docs 守卫 demo：input-number formatter 前后缀格式首帧即渲染', async ({ page }) => {
  await page.goto('/components/input-number.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#num-fn-format')
  await assertNoExpando(page, '#num-fn-format', 'formatter')
  // demo 初始 value=5：守卫生效时 formatter 在首帧渲染 `≈ 5 件`
  const shown = await page.evaluate(() => {
    const el = document.querySelector('#num-fn-format') as HTMLElement
    return el.shadowRoot!.querySelector<HTMLInputElement>('input')!.value
  })
  expect(shown, '初始 value=5 应显示 `≈ 5 件`（formatter 真实生效）').toBe('≈ 5 件')
})

test('docs 守卫 demo：date-picker 自定义 shortcuts 与过去日期禁用真实生效', async ({ page }) => {
  await page.goto('/components/date-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#date-picker-shortcuts')
  await assertNoExpando(page, '#date-picker-shortcuts', 'shortcuts')
  await page.locator('#date-picker-shortcuts').evaluate((el) => el.setAttribute('open', ''))
  await page.waitForFunction(() => {
    const el = document.querySelector('#date-picker-shortcuts')
    return !!el?.shadowRoot?.querySelector('[part="panel"] .shortcut')
  })
  const shortcuts = await page.evaluate(() => {
    const el = document.querySelector('#date-picker-shortcuts') as HTMLElement
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="panel"] .shortcut')].map((s) =>
      s.textContent?.trim(),
    )
  })
  // 默认快捷预设只有「今天」；demo 写入的三项（含「固定 2026-08-10」）必须可见——证明自定义写入落到 setter
  expect(shortcuts, '面板应显示 demo 自定义的三条快捷预设').toEqual(['今天', '明天', '固定 2026-08-10'])

  await up(page, '#date-picker-disabled-date')
  await assertNoExpando(page, '#date-picker-disabled-date', 'disabledDate')
  await page.locator('#date-picker-disabled-date').evaluate((el) => el.setAttribute('open', ''))
  await page.waitForFunction(() => {
    const el = document.querySelector('#date-picker-disabled-date')
    return !!el?.shadowRoot?.querySelector('[part="panel"]')
  })
  const r = await page.evaluate(() => {
    const el = document.querySelector('#date-picker-disabled-date') as HTMLElement
    const past = el.shadowRoot!.querySelector<HTMLButtonElement>('.day[data-date="2026-08-05"]')
    return {
      pastDisabled: past ? past.classList.contains('disabled') : null,
      hasOwnExpando: Object.prototype.hasOwnProperty.call(el, 'disabledDate'),
    }
  })
  expect(r.pastDisabled, 'demo 价值 2026-08-09，其月内的过去日 08-05 应被禁用（规则真实生效）').toBe(true)
  expect(r.hasOwnExpando, 'disabledDate 不得以自有属性残留').toBe(false)
})

test('docs 守卫 demo：switch beforeChange 异步确认流真实可见', async ({ page }) => {
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#switch-before')
  // beforeChange 在组件内是 class field（实例自有属性是设计使然），expando 断言不适用——只锁行为
  // demo 初始 checked（开）：点击 = 关 → 走 800ms 异步确认流
  await page.locator('#switch-before').evaluate((el) => {
    ;(el.shadowRoot!.querySelector('button') as HTMLElement).click()
  })
  const info = page.locator('#switch-before-info')
  await expect(info).toContainText('正在确认', { timeout: 3000 })
  await expect(info).toContainText('已确认，切换完成', { timeout: 5000 })
})
