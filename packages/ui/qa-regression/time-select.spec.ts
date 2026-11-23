// 用户回归：time-select 的真实浏览器行为——真实点击后的选中态、禁用态可读性与事件反馈
// 只验证"机制"不够：这里同时断言视觉标记（data-state / aria-*）与 demo 反馈文案。

import { expect, test } from '@playwright/test'
import { realClick, up } from './helpers'

test('time-select：真实点击模式钮与时段，选中态可见、值写回且 demo 反馈到 oas-change', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-schedule')
  // 真实点击：从「尽快送达」切到「预约配送」，再真实点击一个可用时段
  await realClick(page, '#ts-schedule', '.mode[data-mode="schedule"]')
  await realClick(page, '#ts-schedule', '.slot[data-slot="evening"]')

  const state = await page.evaluate(() => {
    const host = document.querySelector('#ts-schedule') as HTMLElement & { value: { date: string; slot: string } }
    const root = host.shadowRoot!
    const selectedDate = root.querySelector<HTMLButtonElement>('.date[aria-selected="true"]')
    const slot = root.querySelector<HTMLButtonElement>('.slot[data-slot="evening"]')!
    return {
      mode: host.getAttribute('mode'),
      dateKey: selectedDate?.dataset.date ?? '',
      slotChecked: slot.getAttribute('aria-checked'),
      slotHighlightVisible: slot.getAttribute('aria-checked') === 'true',
      value: host.value,
      feedback: document.querySelector('#ts-schedule-out')!.textContent ?? '',
    }
  })
  expect(state.mode).toBe('schedule')
  expect(state.slotChecked, '点击后的时段按钮应有 aria-checked=true').toBe('true')
  expect(state.slotHighlightVisible).toBe(true)
  expect(state.value).toEqual({ date: state.dateKey, slot: 'evening' })
  expect(state.feedback, 'demo 需要显示 oas-change 反馈').toContain('oas-change')
  expect(state.feedback).toContain('evening')
})

test('time-select：休息与满约两种不可选态视觉可区分，且均不可选中', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-states')
  const states = await page.evaluate(() => {
    const host = document.querySelector('#ts-states') as HTMLElement & { value: { slot: string } }
    const root = host.shadowRoot!
    const read = (selector: string) => {
      const button = root.querySelector<HTMLButtonElement>(selector)!
      const style = getComputedStyle(button)
      return {
        disabled: button.disabled,
        ariaDisabled: button.getAttribute('aria-disabled'),
        state: button.getAttribute('data-state'),
        decoration: style.textDecorationLine,
        text: button.textContent ?? '',
      }
    }
    const before = host.value.slot
    const rest = read('.slot[data-slot="b"]')
    const full = read('.slot[data-slot="c"]')
    root.querySelector<HTMLButtonElement>('.slot[data-slot="b"]')!.click()
    root.querySelector<HTMLButtonElement>('.slot[data-slot="c"]')!.click()
    return { rest, full, before, after: host.value.slot }
  })
  expect(states.rest.state).toBe('rest')
  expect(states.rest.ariaDisabled).toBe('true')
  expect(states.rest.text).toContain('休息')
  expect(states.full.state).toBe('full')
  expect(states.full.ariaDisabled).toBe('true')
  expect(states.full.text).toContain('已满约')
  expect(states.full.decoration, '满约需要删除线以区别于休息').toBe('line-through')
  expect(states.rest.decoration, '休息不加删除线（两种语义视觉可区分）').not.toBe('line-through')
  expect(states.after, '点击不可选时段不得改变已选值').toBe(states.before)
})

test('time-select：键盘方向键在可用时段间移动并跳过不可选项（roving tabindex）', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-states')
  await page.evaluate(() => {
    const root = (document.querySelector('#ts-states') as HTMLElement).shadowRoot!
    root.querySelector<HTMLElement>('.slot')!.focus()
  })
  await page.keyboard.press('ArrowRight')
  const after = await page.evaluate(() => {
    const host = document.querySelector('#ts-states') as HTMLElement & { value: { slot: string } }
    const root = host.shadowRoot!
    const active = root.activeElement as HTMLButtonElement | null
    return {
      slot: active?.dataset.slot,
      tabStops: [...root.querySelectorAll<HTMLButtonElement>('.slot')].filter((b) => b.tabIndex === 0).length,
      value: host.value.slot,
    }
  })
  expect(after.slot, '应跳过 disabled 的 b 与 full 的 c').toBe('d')
  expect(after.tabStops).toBe(1)
  expect(after.value).toBe('d')
})
