// 复核回归：toggle-group——浏览器级固化断言。
// 覆盖：单选点击切换（aria-checked + value 回写 + oas-change + demo 反馈文本 #tg-single-out）、
// 多选切换/取消（checkbox 语义 + JSON 数组 value）、键盘方向键移动并选中（roving）、
// disabled 项不可选（aria-disabled + 点击拦截）、多选上限 max-count（oas-exceed-limit 拦截
// + demo 反馈文本 #tg-max-out）。
// 结构：shadow 内 [part="group"]（role=radiogroup/group）与 [part="item"]（role=radio/checkbox）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/toggle-group.html'

interface TgLog {
  type: string
  detail: unknown
}

function attachLog(page: import('@playwright/test').Page, selector: string, types: string[]): Promise<void> {
  return page.evaluate(
    ({ selector, types }) => {
      const el = document.querySelector(selector) as HTMLElement & { __log?: TgLog[] }
      el.__log = []
      for (const t of types) {
        el.addEventListener(t, (e) => (el.__log as TgLog[]).push({ type: t, detail: (e as CustomEvent).detail }))
      }
    },
    { selector, types },
  )
}

function readLog(page: import('@playwright/test').Page, selector: string): Promise<TgLog[]> {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as (HTMLElement & { __log?: TgLog[] }) | null
    return el?.__log ?? []
  }, selector)
}

test('toggle-group 单选点击切换：aria-checked 同步 + value 回写 + oas-change + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#tg-single')
  await page.waitForTimeout(300) // 等 demo 宿主挂事件监听
  await attachLog(page, '#tg-single', ['oas-change'])
  // 初始无选中
  const init = await page.evaluate(() => {
    const el = document.querySelector('#tg-single')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      role: el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role'),
      checked: btns.map((b) => b.getAttribute('aria-checked')),
    }
  })
  expect(init.role, '单选组应为 radiogroup 语义').toBe('radiogroup')
  expect(init.checked).toEqual(['false', 'false', 'false'])

  // 点击第 3 项「月」
  await page.locator('#tg-single [part="item"]').nth(2).click()
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#tg-single')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      checked: btns.map((b) => b.getAttribute('aria-checked')),
      value: el.getAttribute('value'),
      tabindexes: btns.map((b) => b.getAttribute('tabindex')),
      out: document.querySelector('#tg-single-out')!.textContent,
    }
  })
  expect(after.checked, '仅「月」aria-checked=true').toEqual(['false', 'false', 'true'])
  expect(after.value, 'demo 宿主监听应回写 value 属性').toBe('month')
  expect(after.tabindexes, 'roving tabindex 落到选中项').toEqual(['-1', '-1', '0'])
  expect(after.out, '#tg-single-out 应显示当前值').toBe('当前：month')
  const log = await readLog(page, '#tg-single')
  expect(log).toEqual([{ type: 'oas-change', detail: { value: 'month' } }])
})

test('toggle-group 多选：checkbox 语义 + 点击勾选/取消 + value JSON 数组 + oas-change', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#tg-multi')
  await page.waitForTimeout(300)
  await attachLog(page, '#tg-multi', ['oas-change'])
  // 点「加粗」「斜体」
  await page.locator('#tg-multi [part="item"]').nth(0).click()
  await page.locator('#tg-multi [part="item"]').nth(1).click()
  await page.waitForTimeout(200)
  const picked = await page.evaluate(() => {
    const el = document.querySelector('#tg-multi')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      role: el.shadowRoot!.querySelector('[part="group"]')!.getAttribute('role'),
      itemRoles: btns.map((b) => b.getAttribute('role')),
      checked: btns.map((b) => b.getAttribute('aria-checked')),
      value: el.getAttribute('value'),
      out: document.querySelector('#tg-multi-out')!.textContent,
    }
  })
  expect(picked.role, '多选组应为 group 语义').toBe('group')
  expect(picked.itemRoles).toEqual(['checkbox', 'checkbox', 'checkbox'])
  expect(picked.checked, '前两项应选中').toEqual(['true', 'true', 'false'])
  expect(picked.value, 'value 应为 JSON 数组字符串').toBe('["bold","italic"]')
  expect(picked.out, '#tg-multi-out 应显示当前集合').toContain('bold')
  // 再点「加粗」取消
  await page.locator('#tg-multi [part="item"]').nth(0).click()
  await page.waitForTimeout(200)
  const canceled = await page.evaluate(() => document.querySelector('#tg-multi')!.getAttribute('value'))
  expect(canceled, '再点已选项应取消').toBe('["italic"]')
  const log = await readLog(page, '#tg-multi')
  expect(log.map((l) => (l.detail as { value: string[] }).value)).toEqual([['bold'], ['bold', 'italic'], ['italic']])
})

test('toggle-group 键盘方向键：单选移动即选中（焦点随 roving tabindex）', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#tg-event')
  // 聚焦首项后真实按键 ArrowRight → 移动并选中第 2 项
  await page.evaluate(() => {
    document.querySelector('#tg-event')!.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="item"]')[0]!.focus()
  })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(200)
  const right = await page.evaluate(() => {
    const el = document.querySelector('#tg-event')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      value: el.getAttribute('value'),
      checked: btns.map((b) => b.getAttribute('aria-checked')),
      focusIndex: btns.indexOf(el.shadowRoot!.activeElement as Element),
    }
  })
  expect(right.value, 'ArrowRight 应选中下一项').toBe('center')
  expect(right.checked).toEqual(['false', 'true', 'false'])
  expect(right.focusIndex, '焦点应随方向键移动').toBe(1)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(200)
  const left = await page.evaluate(() => document.querySelector('#tg-event')!.getAttribute('value'))
  expect(left, 'ArrowLeft 应回选上一项').toBe('left')
})

test('toggle-group disabled 项：aria-disabled + tabindex -1 + 点击不选中不派事件', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-toggle-group')
  // 「禁用项」demo：items 含 "disabled":true 的组
  const target = page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-toggle-group')].find((g) =>
      (g.getAttribute('items') ?? '').includes('"disabled":true'),
    )!
    ;(el as HTMLElement & { __log?: TgLog[] }).__log = []
    el.addEventListener('oas-change', (e) =>
      (el as HTMLElement & { __log: TgLog[] }).__log.push({ type: 'oas-change', detail: (e as CustomEvent).detail }),
    )
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      ariaDisabled: btns.map((b) => b.getAttribute('aria-disabled')),
      tabindexes: btns.map((b) => b.getAttribute('tabindex')),
    }
  })
  expect((await target).ariaDisabled, '禁用项 aria-disabled=true').toEqual(['false', 'true', 'false'])
  // roving tabindex 契约：单选模式下仅「选中项」为 0——该组无初始选中，故全部 -1；禁用项恒 -1
  expect((await target).tabindexes, '无选中时全部不可 Tab 聚焦，禁用项恒 -1').toEqual(['-1', '-1', '-1'])
  // 点击禁用项：不选中、不派事件
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-toggle-group')].find((g) =>
      (g.getAttribute('items') ?? '').includes('"disabled":true'),
    )!
    el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="item"]')[1]!.click()
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = [...document.querySelectorAll('oas-toggle-group')].find((g) =>
      (g.getAttribute('items') ?? '').includes('"disabled":true'),
    ) as (HTMLElement & { __log?: TgLog[] }) | null
    return {
      value: el!.getAttribute('value'),
      checked: [...el!.shadowRoot!.querySelectorAll('[part="item"]')].map((b) => b.getAttribute('aria-checked')),
      log: el!.__log ?? [],
    }
  })
  expect(after.value, '点击禁用项不应产生 value').toBe(null)
  expect(after.checked, '禁用项不可选中').toEqual(['false', 'false', 'false'])
  expect(after.log, '点击禁用项不应派发 oas-change').toEqual([])
})

test('toggle-group max-count=2：达上限拦截越界选择 + oas-exceed-limit + 反馈文本；已选项仍可取消', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#tg-max')
  await page.waitForTimeout(300)
  await attachLog(page, '#tg-max', ['oas-change', 'oas-exceed-limit'])
  // 初始 value=["bold"]，点「斜体」→ 选中 2/2
  await page.locator('#tg-max [part="item"]').nth(1).click()
  await page.waitForTimeout(200)
  const full = await page.evaluate(() => {
    const el = document.querySelector('#tg-max')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      value: el.getAttribute('value'),
      ariaDisabled: btns.map((b) => b.getAttribute('aria-disabled')),
      out: document.querySelector('#tg-max-out')!.textContent,
    }
  })
  expect(full.value).toBe('["bold","italic"]')
  expect(full.ariaDisabled, '达上限后未选项应置灰（aria-disabled）').toEqual(['false', 'false', 'true', 'true'])
  // 点「下划线」→ 拦截 + oas-exceed-limit + 可见反馈
  // 达上限后未选项被置 aria-disabled=true，playwright actionability 会拒绝点击；
  // 真实用户仍可点击（浏览器照常派发 click），组件自身拦截越界选择——用 force 走真实事件路径
  await page.locator('#tg-max [part="item"]').nth(2).click({ force: true })
  await page.waitForTimeout(200)
  const exceeded = await page.evaluate(() => ({
    value: document.querySelector('#tg-max')!.getAttribute('value'),
    out: document.querySelector('#tg-max-out')!.textContent,
  }))
  expect(exceeded.value, '越界选择应被拦截（value 不变）').toBe('["bold","italic"]')
  expect(exceeded.out, '#tg-max-out 应显示已达上限反馈').toContain('已达上限')
  // 取消一项后未选项恢复可选
  await page.locator('#tg-max [part="item"]').nth(0).click()
  await page.waitForTimeout(200)
  const freed = await page.evaluate(() => {
    const el = document.querySelector('#tg-max')!
    const btns = [...el.shadowRoot!.querySelectorAll('[part="item"]')]
    return {
      value: el.getAttribute('value'),
      ariaDisabled: btns.map((b) => b.getAttribute('aria-disabled')),
    }
  })
  expect(freed.value, '已选项仍可取消').toBe('["italic"]')
  expect(freed.ariaDisabled, '取消后未选项恢复可选').toEqual(['false', 'false', 'false', 'false'])
  const log = await readLog(page, '#tg-max')
  expect(
    log.some(
      (l) => l.type === 'oas-exceed-limit' && (l.detail as { value: string; max: number }).value === 'underline',
    ),
    '应派发 oas-exceed-limit { value: "underline", max: 2 }',
  ).toBe(true)
})
