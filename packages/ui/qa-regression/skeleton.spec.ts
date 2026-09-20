// 复核回归：skeleton——骨架屏首份回归固化。
// 覆盖：受控 loading 切换骨架/内容互斥显隐（demo 开关联动 + aria-busy 同步）、
// effect 三档动效落点（data-effect + 真实 animationName）、防闪烁 delay 快慢两路
// （快请求骨架完全不出现、慢请求骨架先出后换内容）。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('skeleton loading 受控切换：关 → 骨架隐藏内容显出 + aria-busy 同步；再开还原', async ({ page }) => {
  await page.goto('/components/skeleton.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sk-load')
  await up(page, '#sk-load-switch')
  const read = () =>
    page.evaluate(() => {
      const sk = document.querySelector('#sk-load') as HTMLElement
      const block = sk.shadowRoot!.querySelector('[part="block"]') as HTMLElement
      const slot = sk.shadowRoot!.querySelector('slot') as HTMLElement
      const region = sk.closest('[aria-busy]') as HTMLElement
      return {
        blockHidden: block.hasAttribute('hidden'),
        slotHidden: slot.hasAttribute('hidden'),
        busy: region?.getAttribute('aria-busy'),
      }
    })
  const loading = await read()
  expect(loading.blockHidden, '加载中骨架应显示').toBe(false)
  expect(loading.slotHidden, '加载中真实内容应隐藏').toBe(true)
  expect(loading.busy).toBe('true')

  // 关掉 demo 开关 → loading=false：骨架隐藏、内容显出
  await page.locator('#sk-load-switch').click()
  await page.waitForFunction(() => {
    const sk = document.querySelector('#sk-load') as HTMLElement
    return sk.shadowRoot!.querySelector('[part="block"]')!.hasAttribute('hidden') === true
  })
  const loaded = await read()
  expect(loaded.blockHidden, 'loading=false → 骨架隐藏').toBe(true)
  expect(loaded.slotHidden, 'loading=false → 内容出口显出').toBe(false)
  expect(loaded.busy, 'aria-busy 应同步为 false').toBe('false')
})

test('skeleton effect 三档：data-effect 落点 + 真实动画名（sheen 流光 / pulse 呼吸 / none 静态）', async ({ page }) => {
  await page.goto('/components/skeleton.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-skeleton[effect="sheen"]')
  const r = await page.evaluate(() => {
    const read = (sel: string) => {
      const sk = document.querySelector(sel) as HTMLElement
      const block = sk.shadowRoot!.querySelector('[part="block"]') as HTMLElement
      const line = block.querySelector('[part="line"]') as HTMLElement
      return { effect: block.getAttribute('data-effect'), animation: getComputedStyle(line).animationName }
    }
    return {
      sheen: read('oas-skeleton[effect="sheen"]'),
      pulse: read('oas-skeleton[effect="pulse"]'),
      none: read('oas-skeleton[effect="none"]'),
      activeAlias: read('oas-skeleton[active]:not([effect])'),
    }
  })
  expect(r.sheen.effect).toBe('sheen')
  expect(r.sheen.animation, 'sheen → shimmer 流光动画').toContain('shimmer')
  expect(r.pulse.effect).toBe('pulse')
  expect(r.pulse.animation, 'pulse → 呼吸动画').toContain('pulse')
  expect(r.none.effect).toBe('none')
  expect(r.none.animation, 'effect="none" → 无动画').toBe('none')
  expect(r.activeAlias.effect, 'active 快捷开关等价 sheen').toBe('sheen')
  expect(r.activeAlias.animation).toContain('shimmer')
})

test('skeleton 防闪烁 delay：快请求（150ms < 500ms）骨架不出现直接内容；慢请求骨架先出后换内容', async ({ page }) => {
  await page.goto('/components/skeleton.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sk-delay')
  const read = () =>
    page.evaluate(() => {
      const sk = document.querySelector('#sk-delay') as HTMLElement
      const block = sk.shadowRoot!.querySelector('[part="block"]') as HTMLElement
      const slot = sk.shadowRoot!.querySelector('slot') as HTMLElement
      return {
        blockHidden: block.hasAttribute('hidden'),
        slotHidden: slot.hasAttribute('hidden'),
        out: (document.querySelector('#sk-delay-out') as HTMLElement)?.textContent,
      }
    })

  // 快请求：150ms 后完成，输出明确「骨架未出现」，终态内容直接显出
  await page.locator('#sk-delay-fast').click()
  await page.waitForFunction(
    () => (document.querySelector('#sk-delay-out') as HTMLElement)?.textContent?.includes('防闪烁生效'),
    null,
    { timeout: 5000 },
  )
  const fast = await read()
  expect(fast.blockHidden, '快请求终态骨架应隐藏（从未出现）').toBe(true)
  expect(fast.slotHidden, '快请求终态内容应显出').toBe(false)
  expect(fast.out).toContain('快速')

  // 慢请求：1.2s > delay 500ms → 骨架先出现（约 500ms），随后内容替换
  await page.locator('#sk-delay-slow').click()
  await page.waitForFunction(
    () => {
      const sk = document.querySelector('#sk-delay') as HTMLElement
      return sk.shadowRoot!.querySelector('[part="block"]')!.hasAttribute('hidden') === false
    },
    null,
    { timeout: 5000 },
  )
  const mid = await read()
  expect(mid.blockHidden, '慢请求超过 delay 后骨架应出现').toBe(false)
  expect(mid.slotHidden, '骨架展示期间内容应隐藏').toBe(true)
  await page.waitForFunction(
    () => (document.querySelector('#sk-delay-out') as HTMLElement)?.textContent?.includes('慢速完成'),
    null,
    { timeout: 5000 },
  )
  const done = await read()
  expect(done.blockHidden, '慢请求完成后骨架隐藏').toBe(true)
  expect(done.slotHidden, '慢请求完成后内容显出').toBe(false)
})
