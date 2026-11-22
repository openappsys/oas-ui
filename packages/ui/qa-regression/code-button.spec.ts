// 复核回归：code-button——点击后的可见冷却反馈（不是只验证事件派发）。

import { test, expect } from '@playwright/test'
import { realClick, up } from './helpers'

test('code-button：点击进入冷却，按钮禁用且文案逐秒可见', async ({ page }) => {
  await page.goto('/components/code-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-basic')
  await realClick(page, '#cb-basic', '[part="button"]')

  const cooling = await page.evaluate(() => {
    const host = document.querySelector('#cb-basic')!
    const btn = host.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!
    return {
      disabled: btn.disabled,
      text: host.shadowRoot!.querySelector<HTMLElement>('.fallback')!.textContent ?? '',
      feedback: document.querySelector('#cb-basic-out')!.textContent ?? '',
    }
  })
  expect(cooling.disabled).toBe(true)
  expect(cooling.text).toMatch(/\d+ 秒后重发/)
  expect(cooling.feedback).toContain('oas-send')

  // 剩余秒数应变化（真实计时器，非冻结状态）：等文案变化而不是固定等待
  await page.waitForFunction(
    (initial) => {
      const el = document.querySelector('#cb-basic') as HTMLElement
      const text = el.shadowRoot?.querySelector<HTMLElement>('.fallback')?.textContent ?? ''
      return text !== initial
    },
    cooling.text,
    { timeout: 5000 },
  )
  const next = await page.evaluate(
    () => document.querySelector('#cb-basic')!.shadowRoot!.querySelector<HTMLElement>('.fallback')!.textContent ?? '',
  )
  expect(next).not.toBe(cooling.text)
})

test('code-button：受控流程拦截 oas-send 后不自动冷却，宿主 start() 才冷却', async ({ page }) => {
  await page.goto('/components/code-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-controlled')
  await realClick(page, '#cb-controlled', '[part="button"]')
  const intercepted = await page.evaluate(() => {
    const host = document.querySelector('#cb-controlled')!
    const btn = host.shadowRoot!.querySelector<HTMLButtonElement>('[part="button"]')!
    return { disabled: btn.disabled, text: host.shadowRoot!.querySelector<HTMLElement>('.fallback')!.textContent ?? '' }
  })
  expect(intercepted.disabled).toBe(false)
  expect(intercepted.text).not.toMatch(/秒后重发/)
  // 800ms 后 demo 调用 start()：进入冷却
  await page.waitForFunction(
    () => {
      const el = document.querySelector('#cb-controlled') as HTMLElement & { shadowRoot: ShadowRoot }
      return el.shadowRoot.querySelector<HTMLButtonElement>('[part="button"]')?.disabled === true
    },
    { timeout: 5000 },
  )
})

// 回归（history：文档承诺「倒计时期间仍显示内置倒计时文案」但插槽内容把它盖住，单测只断 .fallback
// 文本存在 → 假绿）。这里断**可见性**：冷却期插槽内容不可见、内置倒计时可见；冷却结束反过来。
test('code-button：冷却期隐藏自定义插槽、显示内置倒计时（可见性断言）', async ({ page }) => {
  await page.goto('/components/code-button.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cb-slot')

  const read = () =>
    page.evaluate(() => {
      const host = document.querySelector('#cb-slot') as HTMLElement & { shadowRoot: ShadowRoot }
      const fallback = host.shadowRoot.querySelector<HTMLElement>('.fallback')!
      const slotted = host.querySelector<HTMLElement>('span')!
      const visible = (el: HTMLElement): boolean => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
      }
      return {
        slottedVisible: visible(slotted),
        fallbackVisible: visible(fallback),
        fallbackText: fallback.textContent ?? '',
        counting: host.hasAttribute('data-counting'),
      }
    })

  const idle = await read()
  expect(idle.counting, '空闲态不应带 data-counting').toBe(false)
  expect(idle.slottedVisible, '空闲态显示插槽文案').toBe(true)
  expect(idle.fallbackVisible, '空闲态内置文案退场').toBe(false)

  await realClick(page, '#cb-slot', '[part="button"]')
  const cooling = await read()
  expect(cooling.counting, '冷却期必须有 data-counting（slot 的 CSS 隐藏依赖它）').toBe(true)
  expect(cooling.slottedVisible, '冷却期插槽内容必须不可见').toBe(false)
  expect(cooling.fallbackVisible, '冷却期内置倒计时必须可见').toBe(true)
  expect(cooling.fallbackText).toMatch(/\d+ 秒后重发/)
})
