// 复核回归：rank——真实点选 / 键盘加入排名、名次调整、下限校验的可见反馈。

import { expect, test } from '@playwright/test'
import { realClick, up } from './helpers'

test('rank：真实点选加入排名，名次徽标与 oas-change 反馈可见', async ({ page }) => {
  await page.goto('/components/rank.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rk-basic')
  await realClick(page, '#rk-basic', 'button.option[data-key="banana"]')

  const state = await page.evaluate(() => {
    const host = document.querySelector('#rk-basic') as HTMLElement & { value: string[] }
    const root = host.shadowRoot!
    return {
      value: host.value,
      badges: [...root.querySelectorAll<HTMLElement>('.badge')].map((badge) => badge.textContent),
      rankedText: root.querySelector<HTMLElement>('button.ranked-label')?.textContent ?? '',
      optionGone: !root.querySelector('button.option[data-key="banana"]'),
      feedback: document.querySelector('#rk-basic-out')!.textContent ?? '',
      live: root.querySelector<HTMLElement>('[part="live"]')!.textContent ?? '',
    }
  })
  expect(state.value).toEqual(['banana'])
  expect(state.badges).toEqual(['1'])
  expect(state.rankedText).toBe('香蕉')
  expect(state.optionGone, '已选项应从可选区移出').toBe(true)
  expect(state.feedback).toContain('oas-change')
  expect(state.live).toContain('香蕉')
})

test('rank：键盘加入后再按回车取消（可见按钮闭环，焦点不丢）', async ({ page }) => {
  await page.goto('/components/rank.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rk-basic')
  await page.evaluate(() => {
    const root = (document.querySelector('#rk-basic') as HTMLElement).shadowRoot!
    root.querySelector<HTMLButtonElement>('button.option[data-key="apple"]')!.focus()
  })
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  const state = await page.evaluate(() => {
    const host = document.querySelector('#rk-basic') as HTMLElement & { value: string[]; shadowRoot: ShadowRoot }
    return {
      value: host.value,
      ranked: host.shadowRoot.querySelectorAll('button.ranked-label').length,
      optionBack: !!host.shadowRoot.querySelector('button.option[data-key="apple"]'),
      focusedKey: (host.shadowRoot.activeElement as HTMLElement | null)?.dataset.key ?? null,
    }
  })
  expect(state.value).toEqual([])
  expect(state.ranked).toBe(0)
  expect(state.optionBack).toBe(true)
  expect(state.focusedKey, '取消后焦点应回到同 key 的选项按钮').toBe('apple')
})

test('rank：键盘 Enter 加入排名，上移按钮调整名次（真实键盘 + 可见徽标）', async ({ page }) => {
  await page.goto('/components/rank.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rk-basic')
  await page.evaluate(() => {
    const root = (document.querySelector('#rk-basic') as HTMLElement).shadowRoot!
    root.querySelector<HTMLButtonElement>('button.option[data-key="grape"]')!.focus()
  })
  await page.keyboard.press('Enter')
  const afterEnter = await page.evaluate(() => {
    const host = document.querySelector('#rk-basic') as HTMLElement & { value: string[] }
    return { value: host.value, focusedAction: (host.shadowRoot!.activeElement as HTMLElement | null)?.dataset.action }
  })
  expect(afterEnter.value).toEqual(['grape'])
  expect(afterEnter.focusedAction, '加入后焦点应落在新排名项的可操作按钮上').toBe('remove')

  await realClick(page, '#rk-basic', 'button.option[data-key="apple"]')
  await realClick(page, '#rk-basic', 'button.action[data-key="apple"][data-action="up"]')
  const afterMove = await page.evaluate(() => {
    const host = document.querySelector('#rk-basic') as HTMLElement & { value: string[]; shadowRoot: ShadowRoot }
    return {
      value: host.value,
      badges: [...host.shadowRoot.querySelectorAll<HTMLElement>('.badge')].map((badge) => badge.textContent),
    }
  })
  expect(afterMove.value).toEqual(['apple', 'grape'])
  expect(afterMove.badges).toEqual(['1', '2'])
})

test('rank：min-ranks 下限校验显示错误，补足后自动消失', async ({ page }) => {
  await page.goto('/components/rank.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#rk-min')
  await realClick(page, '#rk-min-submit', 'button')

  const failed = await page.evaluate(() => {
    const host = document.querySelector('#rk-min') as HTMLElement
    const root = host.shadowRoot!
    const error = root.querySelector<HTMLElement>('[part="error"]')!
    return {
      invalid: host.hasAttribute('data-invalid'),
      errorHidden: error.hidden,
      errorText: error.textContent ?? '',
      feedback: document.querySelector('#rk-min-out')!.textContent ?? '',
    }
  })
  expect(failed.invalid).toBe(true)
  expect(failed.errorHidden).toBe(false)
  expect(failed.errorText).not.toBe('')
  expect(failed.feedback).toContain('oas-invalid')

  await realClick(page, '#rk-min', 'button.option[data-key="search"]')
  await realClick(page, '#rk-min', 'button.option[data-key="export"]')
  const recovered = await page.evaluate(() => {
    const host = document.querySelector('#rk-min') as HTMLElement
    return {
      invalid: host.hasAttribute('data-invalid'),
      errorHidden: host.shadowRoot!.querySelector<HTMLElement>('[part="error"]')!.hidden,
      value: (host as HTMLElement & { value: string[] }).value,
    }
  })
  expect(recovered.invalid).toBe(false)
  expect(recovered.errorHidden).toBe(true)
  expect(recovered.value).toEqual(['search', 'export'])

  await realClick(page, '#rk-min-submit', 'button')
  const passed = await page.evaluate(() => document.querySelector('#rk-min-out')!.textContent ?? '')
  expect(passed).toContain('校验通过')
})
