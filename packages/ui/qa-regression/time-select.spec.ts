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
      const label = button.querySelector<HTMLElement>('.slot-label')!
      return {
        disabled: button.disabled,
        ariaDisabled: button.getAttribute('aria-disabled'),
        state: button.getAttribute('data-state'),
        decoration: getComputedStyle(label).textDecorationLine,
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
  expect(states.rest.disabled, '不可选时段走原生 disabled（a11y 门禁按原生禁用态豁免对比度）').toBe(true)
  expect(states.rest.text).toContain('休息')
  expect(states.full.state).toBe('full')
  expect(states.full.ariaDisabled).toBe('true')
  expect(states.full.disabled).toBe(true)
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

test('time-select：模式组方向键可切换模式并迁移焦点（另一模式纯键盘可达）', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-express')
  await page.evaluate(() => {
    const root = (document.querySelector('#ts-express') as HTMLElement).shadowRoot!
    root.querySelector<HTMLElement>('.mode')!.focus()
  })
  await page.keyboard.press('ArrowRight')
  const after = await page.evaluate(() => {
    const host = document.querySelector('#ts-express') as HTMLElement
    const root = host.shadowRoot!
    const active = root.activeElement as HTMLButtonElement | null
    return {
      mode: host.getAttribute('mode'),
      focused: active?.dataset.mode,
      checked: root.querySelector<HTMLButtonElement>('.mode[aria-checked="true"]')?.dataset.mode,
      feedback: document.querySelector('#ts-express-out')!.textContent ?? '',
    }
  })
  expect(after.mode, '方向键切到预约配送').toBe('schedule')
  expect(after.focused, '焦点必须跟到新模式钮（否则键盘丢失位置）').toBe('schedule')
  expect(after.checked).toBe('schedule')
  expect(after.feedback).toContain('oas-change')
})

test('time-select：RTL 下模式组方向键镜像（ArrowLeft 前进 / ArrowRight 后退）且焦点落位', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-express')
  // 进入 RTL（宿主在页面内，方向由祖先 dir 计算）：组件据此镜像方向键
  await page.evaluate(() => {
    document.documentElement.setAttribute('dir', 'rtl')
  })
  await page.evaluate(() => {
    const root = (document.querySelector('#ts-express') as HTMLElement).shadowRoot!
    root.querySelector<HTMLElement>('.mode')!.focus()
  })

  // RTL：ArrowLeft = 前进（express → schedule），焦点跟到新钮
  await page.keyboard.press('ArrowLeft')
  const forward = await page.evaluate(() => {
    const host = document.querySelector('#ts-express') as HTMLElement
    const root = host.shadowRoot!
    const active = root.activeElement as HTMLButtonElement | null
    return {
      rtlFlag: host.hasAttribute('data-rtl'),
      mode: host.getAttribute('mode'),
      focused: active?.dataset.mode ?? null,
      checked: root.querySelector<HTMLButtonElement>('.mode[aria-checked="true"]')?.dataset.mode ?? null,
      tabStops: [...root.querySelectorAll<HTMLButtonElement>('.mode')].filter((b) => b.tabIndex === 0).length,
    }
  })
  expect(forward.rtlFlag, 'RTL 生效时宿主应标记 data-rtl').toBe(true)
  expect(forward.mode, 'RTL 下 ArrowLeft 前进到预约配送').toBe('schedule')
  expect(forward.focused, '焦点必须跟到新选中的模式钮').toBe('schedule')
  expect(forward.checked).toBe('schedule')
  expect(forward.tabStops, '模式组保持单一 roving tab stop').toBe(1)

  // RTL：ArrowRight = 后退（schedule → express），焦点回到 express
  await page.keyboard.press('ArrowRight')
  const backward = await page.evaluate(() => {
    const host = document.querySelector('#ts-express') as HTMLElement
    const root = host.shadowRoot!
    const active = root.activeElement as HTMLButtonElement | null
    return { mode: host.getAttribute('mode'), focused: active?.dataset.mode ?? null }
  })
  expect(backward.mode, 'RTL 下 ArrowRight 后退回尽快送达').toBe('express')
  expect(backward.focused).toBe('express')

  // 恢复 LTR，避免影响同页其它用例（worker 内同一 page 复用）
  await page.evaluate(() => document.documentElement.removeAttribute('dir'))
})

test('time-select：次要文字（相对日 / 尽快送达详情）在浅色下满足 4.5:1', async ({ page }) => {
  await page.goto('/components/time-select.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#ts-express')
  const ratios = await page.evaluate(() => {
    // 计算色可能是 rgb()/rgba() 或 color(srgb …)（color-mix 的 computed 形态），两种都要按 0-255 归一到同一量纲
    const toRgb = (value: string): number[] => {
      const nums = (value.match(/-?[\d.]+/g) ?? []).map(Number)
      const scale = value.startsWith('color(') ? 255 : 1
      return nums.slice(0, 3).map((n) => n * scale)
    }
    const luminance = (rgb: number[]): number => {
      const [r, g, b] = rgb.map((v) => {
        const s = (v ?? 0) / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (fg: number[], bg: number[]): number => {
      const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number]
      return (hi + 0.05) / (lo + 0.05)
    }
    // 有效背景：最近的非透明背景色（shadow 内逐级上溯，越过根即为默认白）
    const effectiveBg = (start: Element): number[] => {
      let node: Element | null = start
      while (node) {
        const bg = getComputedStyle(node).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return toRgb(bg)
        node = node.parentElement
      }
      return [255, 255, 255]
    }
    const read = (el: Element | null): number | null =>
      el ? ratio(toRgb(getComputedStyle(el).color), effectiveBg(el)) : null
    const expressRoot = (document.querySelector('#ts-express') as HTMLElement).shadowRoot!
    const valueRoot = (document.querySelector('#ts-value') as HTMLElement).shadowRoot!
    // 取「未选中日期」的相对文案：选中日的相对文案走 selected 反色（不是次要文字配色）
    const relative = [...valueRoot.querySelectorAll('.date')].find(
      (date) => date.getAttribute('aria-selected') !== 'true',
    )
    return {
      express: read(expressRoot.querySelector('.express-detail')),
      relative: read(relative?.querySelector('.date-relative') ?? null),
    }
  })
  expect(ratios.express, '尽快送达详情（次要文字落在 bg-hover 表面）需达 AA').toBeGreaterThanOrEqual(4.5)
  expect(ratios.relative, '「明天」相对文案需达 AA').toBeGreaterThanOrEqual(4.5)
})
