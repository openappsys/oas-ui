// 复核回归：matrix——真实点选 / 键盘与校验的可见反馈，不只验证事件派发。

import { expect, test } from '@playwright/test'
import { realClick, up } from './helpers'

const firstCell = (row: number, col: number): string => `input[data-row-index="${row}"][data-col-index="${col}"]`

test('matrix：真实点选后选中态可见并写回值（oas-change 有可见反馈）', async ({ page }) => {
  await page.goto('/components/matrix.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mx-basic')
  await realClick(page, '#mx-basic', firstCell(0, 2))

  const state = await page.evaluate(() => {
    const host = document.querySelector('#mx-basic') as HTMLElement & { value: Record<string, unknown> }
    const root = host.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('input[data-row-index="0"][data-col-index="2"]')!
    const cell = input.closest<HTMLElement>('.cell')!
    return {
      value: host.value,
      checked: input.checked,
      highlighted: cell.hasAttribute('data-checked'),
      feedback: document.querySelector('#mx-basic-out')!.textContent ?? '',
    }
  })
  expect(state.value).toEqual({ speed: 'good' })
  expect(state.checked, '真实点击后 input 应处于选中态').toBe(true)
  expect(state.highlighted, '选中单元格必须有可见高亮标记').toBe(true)
  expect(state.feedback, 'demo 需要显示 oas-change 反馈').toContain('oas-change')
  expect(state.feedback).toContain('good')
})

test('matrix：方向键在行内移动并选中（roving tabindex 真实键盘流）', async ({ page }) => {
  await page.goto('/components/matrix.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mx-basic')
  await page.evaluate(() => {
    const root = (document.querySelector('#mx-basic') as HTMLElement).shadowRoot!
    root.querySelector<HTMLInputElement>('input[data-row-index="0"][data-col-index="0"]')!.focus()
  })
  await page.keyboard.press('ArrowRight')
  const afterRight = await page.evaluate(() => {
    const host = document.querySelector('#mx-basic') as HTMLElement & { shadowRoot: ShadowRoot; value: unknown }
    const active = host.shadowRoot.activeElement as HTMLInputElement | null
    return {
      row: active?.dataset.rowIndex,
      col: active?.dataset.colIndex,
      value: host.value,
      tabStops: [...host.shadowRoot.querySelectorAll<HTMLInputElement>('input[data-row-index="0"]')]
        .map((input) => input.tabIndex)
        .filter((tabIndex) => tabIndex === 0).length,
    }
  })
  expect(afterRight.row).toBe('0')
  expect(afterRight.col).toBe('1')
  expect(afterRight.value).toEqual({ speed: 'ok' })
  expect(afterRight.tabStops, 'radio 行内只应有一个 Tab 停靠点').toBe(1)

  await page.keyboard.press('End')
  const afterEnd = await page.evaluate(() => {
    const host = document.querySelector('#mx-basic') as HTMLElement & { shadowRoot: ShadowRoot; value: unknown }
    return { col: (host.shadowRoot.activeElement as HTMLInputElement | null)?.dataset.colIndex, value: host.value }
  })
  expect(afterEnd.col).toBe('3')
  expect(afterEnd.value).toEqual({ speed: 'great' })
})

test('matrix：必答校验失败显示错误、补满后自动消失（可见反馈闭环）', async ({ page }) => {
  await page.goto('/components/matrix.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#mx-required')
  await realClick(page, '#mx-required-submit', 'button')

  const failed = await page.evaluate(() => {
    const host = document.querySelector('#mx-required') as HTMLElement
    const root = host.shadowRoot!
    const error = root.querySelector<HTMLElement>('[part="error"]')!
    const first = root.querySelector<HTMLInputElement>('input[data-row-index="0"][data-col-index="0"]')!
    return {
      invalid: host.hasAttribute('data-invalid'),
      errorHidden: error.hidden,
      errorText: error.textContent ?? '',
      ariaInvalid: first.getAttribute('aria-invalid'),
      rowMarked: root.querySelector('fieldset[data-invalid]') != null,
      feedback: document.querySelector('#mx-required-out')!.textContent ?? '',
    }
  })
  expect(failed.invalid).toBe(true)
  expect(failed.errorHidden).toBe(false)
  expect(failed.errorText).not.toBe('')
  expect(failed.ariaInvalid).toBe('true')
  expect(failed.rowMarked, '缺失行需要有可见错误标记（行标题变红）').toBe(true)
  expect(failed.feedback).toContain('oas-invalid')

  await realClick(page, '#mx-required', firstCell(0, 1))
  await realClick(page, '#mx-required', firstCell(1, 1))
  const recovered = await page.evaluate(() => {
    const host = document.querySelector('#mx-required') as HTMLElement
    const root = host.shadowRoot!
    return {
      invalid: host.hasAttribute('data-invalid'),
      errorHidden: root.querySelector<HTMLElement>('[part="error"]')!.hidden,
    }
  })
  expect(recovered.invalid).toBe(false)
  expect(recovered.errorHidden).toBe(true)

  await realClick(page, '#mx-required-submit', 'button')
  const passed = await page.evaluate(() => document.querySelector('#mx-required-out')!.textContent ?? '')
  expect(passed).toContain('校验通过')
})
