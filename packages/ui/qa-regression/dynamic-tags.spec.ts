// 复核回归：dynamic-tags——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('dynamic-tags sortable：按钮式排序点击重排并派发 oas-change（触屏可达通道）', async ({ page }) => {
  // 防回归：HTML5 DnD 在触屏上不可用，sortable 必须提供按钮式 move 上移/下移通道
  await page.goto('/components/dynamic-tags.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-dynamic-tags[sortable]')
  const before = await page.evaluate(
    () => document.querySelector('oas-dynamic-tags[sortable]')!.getAttribute('model-value')!,
  )
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-dynamic-tags[sortable]')!
    const ups = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.tag-sort-up')]
    const downs = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.tag-sort-down')]
    const detail: unknown[] = []
    el.addEventListener('oas-change', (e) => detail.push((e as CustomEvent).detail))
    downs[0]!.click() // 首标签下移一位
    return { upCount: ups.length, downCount: downs.length, boundaryUpDisabled: ups[0]!.disabled, detail }
  })
  expect(r.upCount).toBe(3)
  expect(r.downCount).toBe(3)
  expect(r.boundaryUpDisabled).toBe(true)
  expect(r.detail).toEqual([{ value: expect.any(Array), trigger: 'sort' }])
  const after = await page.evaluate(
    () => document.querySelector('oas-dynamic-tags[sortable]')!.getAttribute('model-value')!,
  )
  expect(after).not.toBe(before)
})

test('dynamic-tags 触屏（coarse）：chip 触控高 44 + 删除钮/清空钮热区加宽', async ({ browser }) => {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  await p.goto('/components/dynamic-tags.html', { waitUntil: 'domcontentloaded' })
  await up(p, 'oas-dynamic-tags[sortable]')
  await up(p, 'oas-dynamic-tags[clearable][model-value]')
  const r = await p.evaluate(() => {
    const el = document.querySelector('oas-dynamic-tags[sortable]')!
    const chip = el.shadowRoot!.querySelector('.tag') as HTMLElement
    const remove = el.shadowRoot!.querySelector('.tag-remove') as HTMLElement
    const clearable = document.querySelector('oas-dynamic-tags[clearable][model-value]')!
    const clear = clearable.shadowRoot!.querySelector('.clear') as HTMLElement
    return {
      coarse: window.matchMedia('(pointer: coarse)').matches,
      chipMinH: getComputedStyle(chip).minHeight,
      removeW: getComputedStyle(remove).width,
      clearW: getComputedStyle(clear).width,
    }
  })
  expect(r.coarse, 'touch context 应命中 pointer: coarse').toBe(true)
  // 修复前 chip 无触控抬高、删除×/清空钮仅 16px 热区
  expect(r.chipMinH).toBe('44px')
  expect(r.removeW).toBe('44px')
  expect(r.clearW).toBe('44px')
  await ctx.close()
})
