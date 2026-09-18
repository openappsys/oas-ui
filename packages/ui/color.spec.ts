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

/** 计算色值归一化：rgb()/rgba()/color(srgb …)/hex → [r,g,b]（0-255）。色值经 color-mix 时浏览器返回 color(srgb …)，不能按字符串直比 */
function parseColor(v: string): [number, number, number] {
  const hex = v.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1]!, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const srgb = v.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]
  const rgb = v.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  throw new Error(`无法解析色值: ${v}`)
}

function expectColorClose(actual: string, expected: [number, number, number], msg?: string): void {
  const a = parseColor(actual)
  for (let i = 0; i < 3; i++) {
    expect(
      Math.abs(a[i]! - expected[i]!),
      `${msg ?? ''} 通道${i}（实际 ${actual} vs 期望 ${expected.join(',')}）`,
    ).toBeLessThanOrEqual(2)
  }
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
  expectColorClose(r.outlined.color, [10, 119, 168], '描边文字 = 自定义色文字安全档（72% 掺黑）')
  expect(r.outlined.border).toBe('rgb(14, 165, 233)')
  expectColorClose(r.solid.bg, [162, 21, 52], '实心底 = 自定义色文字安全档（72% 掺黑）')
  expect(r.solid.color, '实心白字').toBe('rgb(255, 255, 255)')
  expect(r.filled.bg, 'filled 浅底（12% tint）').toContain('0.12')
})

test('tag 预设色：color 预设名解析到 --oas-preset-* token（filled/solid 都生效）', async ({ page }) => {
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
  // 预设 token（light）：magenta #eb2f96 / red-text #da1e28 / purple-text #722ed1
  expect(r.magentaFilled.bg, 'magenta 浅底（12% tint）').toContain('0.12')
  expect(r.redSolid.bg, 'red 实心 = 预设文字安全档 token 值').toBe('rgb(218, 30, 40)')
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
  expectColorClose(tagBg, [240.5, 166, 182], 'dark 下 tag 实心走主题感知安全档（38% 掺近白）')

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
