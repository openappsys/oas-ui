import { test, expect } from '@playwright/test'

// 自定义颜色断言（用户纪律：demo 专门设置了颜色的，e2e 必须有颜色断言）。
// 断言一律取「最终计算色值」（getComputedStyle 的 rgb），不断 class/变量——
// 「变量设了没人消费」的级联断裂只有计算值能抓到（曾现 bug：button color 无 type 全灰，
// 单测机制断言全绿但视觉全灭）。
// 覆盖：tag 自定义色/预设色、switch color、avatar badge-color。
// 已在 qa-regression 覆盖不重复：button color（无 type 失效 bug 回归）、badge ribbon 语义色。

async function up(p: import('@playwright/test').Page, sel: string) {
  await p.waitForSelector(sel, { timeout: 15000 })
  await p.waitForFunction((s) => document.querySelector(s)?.shadowRoot != null, sel, {
    timeout: 15000,
  })
}

test('tag color 自定义色值：缺省浅底/描边/实心/浅底都按色值渲染', async ({ page }) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[color]')
  const r = await page.evaluate(() => {
    const pick = (color: string, variant?: string) => {
      const sel = variant
        ? `oas-tag[color="${color}"][variant="${variant}"]`
        : `oas-tag[color="${color}"]:not([variant])`
      const el = document.querySelector(sel)!
      const cs = getComputedStyle(el.shadowRoot!.querySelector('.tag')!)
      return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }
    }
    return {
      plain: pick('#7c3aed'), // 缺省（filled 浅底）
      outlined: pick('#0ea5e9', 'outlined'), // 天蓝描边
      solid: pick('#e11d48', 'solid'), // 玫红实心
      filled: pick('#16a34a', 'filled'), // 绿色浅底
    }
  })
  expect(r.plain.bg, '缺省按浅底渲染（12% tint）').toContain('0.12')
  expect(r.outlined.color, '描边文字 = 自定义色').toBe('rgb(14, 165, 233)')
  expect(r.outlined.border).toBe('rgb(14, 165, 233)')
  expect(r.solid.bg, '实心底 = 自定义色').toBe('rgb(225, 29, 72)')
  expect(r.solid.color, '实心白字').toBe('rgb(255, 255, 255)')
  expect(r.filled.bg, 'filled 浅底（12% tint）').toContain('0.12')
})

test('tag 预设色：color 预设名解析到 --oas-preset-* token（filled/solid 都生效）', async ({
  page,
}) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[color="magenta"]')
  const r = await page.evaluate(() => {
    const pick = (color: string, variant?: string) => {
      const sel = variant
        ? `oas-tag[color="${color}"][variant="${variant}"]`
        : `oas-tag[color="${color}"]:not([variant])`
      const el = document.querySelector(sel)!
      const cs = getComputedStyle(el.shadowRoot!.querySelector('.tag')!)
      return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color }
    }
    return {
      magentaFilled: pick('magenta'), // 预设浅底（缺省 variant 即浅底渲染）
      redSolid: pick('red', 'solid'), // 预设实心
      purpleSolid: pick('purple', 'solid'),
    }
  })
  // 预设 token：magenta #eb2f96 / red #f5222d / purple #722ed1（light）
  expect(r.magentaFilled.bg, 'magenta 浅底（12% tint）').toContain('0.12')
  expect(r.redSolid.bg, 'red 实心 = 预设 token 值').toBe('rgb(245, 34, 45)')
  expect(r.purpleSolid.bg, 'purple 实心 = 预设 token 值').toBe('rgb(114, 46, 209)')
})

test('switch color：开启态轨道按自定义色渲染', async ({ page }) => {
  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-switch[color]')
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-switch[color]')].map((el) => ({
      color: el.getAttribute('color'),
      bg: getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor,
    })),
  )
  expect(r.length).toBeGreaterThanOrEqual(2)
  expect(r[0]!.bg, 'color=#16a34a 轨道色').toBe('rgb(22, 163, 74)')
  expect(r[1]!.bg, 'color=#dc2626 轨道色').toBe('rgb(220, 38, 38)')
})

test('avatar badge-color：徽标按语义色渲染', async ({ page }) => {
  await page.goto('/components/avatar.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-avatar[badge-color]')
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-avatar[badge][badge-color]')].map((el) => ({
      color: el.getAttribute('badge-color'),
      bg: getComputedStyle(el.shadowRoot!.querySelector('[part="badge"]')!).backgroundColor,
    })),
  )
  const byColor = Object.fromEntries(r.map((x) => [x.color, x.bg]))
  expect(byColor['primary'], 'badge-color=primary').toBe('rgb(11, 108, 255)')
  expect(byColor['success'], 'badge-color=success').toBe('rgb(22, 163, 74)')
  expect(byColor['warning'], 'badge-color=warning').toBe('rgb(217, 119, 6)')
})

test('自定义色在暗色主题仍生效（tag solid + switch 轨道）', async ({ page }) => {
  await page.goto('/components/tag.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-tag[color]')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const tagBg = await page.evaluate(() => {
    const el = document.querySelector('oas-tag[color="#e11d48"][variant="solid"]')!
    return getComputedStyle(el.shadowRoot!.querySelector('.tag')!).backgroundColor
  })
  expect(tagBg, 'dark 下 tag 实心仍按自定义色').toBe('rgb(225, 29, 72)')

  await page.goto('/components/switch.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-switch[color]')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(300)
  const swBg = await page.evaluate(() => {
    const el = document.querySelector('oas-switch[color]')!
    return getComputedStyle(el.shadowRoot!.querySelector('button')!).backgroundColor
  })
  expect(swBg, 'dark 下 switch 轨道仍按自定义色').toBe('rgb(22, 163, 74)')
})
