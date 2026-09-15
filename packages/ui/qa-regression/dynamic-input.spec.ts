// 复核回归：dynamic-input——浏览器级固化断言。
// 覆盖：添加按钮追加行（oas-add + oas-change + demo 反馈文本 #dyn-output）、删除行
// （oas-remove { index, value } + 行数收缩）、min 下限契约（补足行数 + 达 min 删除按钮禁用；
// 契约为 min 控制、默认 min=0 可删光，无「至少保留一行」硬编码）、行内真实输入触发 oas-change。
// 结构：shadow 内 .row 行 / .add 添加按钮 / .remove 删除按钮，行内为嵌套 oas-input（其内部
// input 为 [part="input"]，两级 shadow 穿透）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

const PAGE = '/components/dynamic-input.html'

interface DynLog {
  type: string
  detail: unknown
}

function attachLog(page: import('@playwright/test').Page, selector: string): Promise<void> {
  return page.evaluate(
    ({ selector }) => {
      const el = document.querySelector(selector) as HTMLElement & { __log?: DynLog[] }
      el.__log = []
      for (const t of ['oas-add', 'oas-remove', 'oas-change']) {
        el.addEventListener(t, (e) => (el.__log as DynLog[]).push({ type: t, detail: (e as CustomEvent).detail }))
      }
    },
    { selector },
  )
}

function readLog(page: import('@playwright/test').Page, selector: string): Promise<DynLog[]> {
  return page.evaluate((s) => {
    const el = document.querySelector(s) as (HTMLElement & { __log?: DynLog[] }) | null
    return el?.__log ?? []
  }, selector)
}

test('dynamic-input 点击添加按钮：追加空行 + oas-add { index } + oas-change + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#dyn-event')
  await page.waitForTimeout(300) // 等 demo 宿主挂事件监听
  await attachLog(page, '#dyn-event')
  const initCount = await page.evaluate(
    () => document.querySelector('#dyn-event')!.shadowRoot!.querySelectorAll('.row').length,
  )
  expect(initCount, 'demo 初始 model-value=["a"] 应渲染 1 行').toBe(1)
  await page.evaluate(() => {
    document.querySelector('#dyn-event')!.shadowRoot!.querySelector<HTMLElement>('.add')!.click()
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#dyn-event')!
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.row')]
    return {
      rowCount: rows.length,
      newRowValue: rows[1]!.querySelector('oas-input')!.getAttribute('value'),
      modelValue: JSON.parse(el.getAttribute('model-value') ?? '[]'),
      out: document.querySelector('#dyn-output')!.textContent,
    }
  })
  expect(after.rowCount, '点击添加后应为 2 行').toBe(2)
  expect(after.newRowValue, '新增行默认值为空串').toBe('')
  expect(after.modelValue, '模型应写回属性（受控通道）').toEqual(['a', ''])
  expect(
    after.out,
    '#dyn-output 应显示事件反馈（demo 输出为最后一条事件，oas-change 随 add 派发并覆盖显示）',
  ).toContain('oas-change: ["a",""]')
  const log = await readLog(page, '#dyn-event')
  expect(
    log.some((l) => l.type === 'oas-add' && (l.detail as { index: number }).index === 1),
    '应派发 oas-add { index: 1 }',
  ).toBe(true)
  expect(
    log.some((l) => l.type === 'oas-change'),
    '添加后应派发 oas-change',
  ).toBe(true)
})

test('dynamic-input 点击删除按钮：移除对应行 + oas-remove { index, value } + oas-change', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#dyn-event')
  await attachLog(page, '#dyn-event')
  // 删除第一行（值为 "a"）；默认 min=0，契约允许删光
  await page.evaluate(() => {
    document.querySelector('#dyn-event')!.shadowRoot!.querySelector<HTMLElement>('.row .remove')!.click()
  })
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#dyn-event')!
    return {
      rowCount: el.shadowRoot!.querySelectorAll('.row').length,
      modelValue: JSON.parse(el.getAttribute('model-value') ?? '[]'),
      addDisabled: (el.shadowRoot!.querySelector<HTMLElement>('.add') as HTMLButtonElement).disabled,
    }
  })
  expect(after.rowCount, '删除唯一一行后应为 0 行（默认 min=0 可删光）').toBe(0)
  expect(after.modelValue).toEqual([])
  expect(after.addDisabled, '0 行时添加按钮仍可用').toBe(false)
  const log = await readLog(page, '#dyn-event')
  expect(
    log.some(
      (l) =>
        l.type === 'oas-remove' &&
        (l.detail as { index: number; value: string }).index === 0 &&
        (l.detail as { value: string }).value === 'a',
    ),
    '应派发 oas-remove { index: 0, value: "a" }',
  ).toBe(true)
  expect(
    log.some((l) => l.type === 'oas-change'),
    '删除后应派发 oas-change',
  ).toBe(true)
})

test('dynamic-input min=2：不足自动补足行数、达 min 删除按钮禁用、增行后恢复可用', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dynamic-input[min="2"]')
  const init = await page.evaluate(() => {
    const el = document.querySelector('oas-dynamic-input[min="2"]')!
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.row')]
    return {
      rowCount: rows.length,
      removeDisabled: rows.map((r) => (r.querySelector<HTMLButtonElement>('.remove') as HTMLButtonElement).disabled),
    }
  })
  expect(init.rowCount, 'model-value=["a"] 应补足到 2 行').toBe(2)
  expect(init.removeDisabled, '达到 min 时删除按钮全部禁用').toEqual([true, true])
  // 添加一行到 3 行：删除按钮恢复可用
  await page.evaluate(() => {
    document.querySelector('oas-dynamic-input[min="2"]')!.shadowRoot!.querySelector<HTMLElement>('.add')!.click()
  })
  await page.waitForTimeout(200)
  const grown = await page.evaluate(() => {
    const el = document.querySelector('oas-dynamic-input[min="2"]')!
    const rows = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.row')]
    return {
      rowCount: rows.length,
      removeDisabled: rows.map((r) => (r.querySelector<HTMLButtonElement>('.remove') as HTMLButtonElement).disabled),
    }
  })
  expect(grown.rowCount).toBe(3)
  expect(grown.removeDisabled, '超过 min 后删除按钮全部可用').toEqual([false, false, false])
})

test('dynamic-input 行内输入（真实 fill 两级 shadow）：更新模型 + 派发 oas-change + 反馈文本', async ({ page }) => {
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await up(page, '#dyn-event')
  await page.waitForTimeout(300)
  await attachLog(page, '#dyn-event')
  // 行内 oas-input 的内部 input（[part="input"]，两级 shadow 穿透）真实输入
  const inner = page.locator('#dyn-event .row').first().locator('oas-input [part="input"]')
  await expect(inner).toBeVisible()
  await inner.fill('xyz')
  await page.waitForTimeout(200)
  const after = await page.evaluate(() => ({
    modelValue: JSON.parse(document.querySelector('#dyn-event')!.getAttribute('model-value') ?? '[]'),
    out: document.querySelector('#dyn-output')!.textContent,
  }))
  expect(after.modelValue, '行内输入应更新模型').toEqual(['xyz'])
  expect(after.out, '#dyn-output 应显示 oas-change 反馈').toContain('"xyz"')
  const log = await readLog(page, '#dyn-event')
  expect(
    log.some((l) => l.type === 'oas-change' && JSON.stringify((l.detail as { value: string[] }).value) === '["xyz"]'),
    '行内输入应派发 oas-change { value: ["xyz"] }',
  ).toBe(true)
})
