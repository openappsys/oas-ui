// 复核回归：goods-action——角标可见、真实点击派发。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('goods-action：角标可见，点击 icon 项派发 oas-action-click', async ({ page }) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  const bar = page.locator('#ga-basic')
  await expect(bar.locator('[part="badge"]:not([hidden])')).toHaveText('3')
  await bar.locator('[part="icon-button"]').nth(2).click()
  await expect(page.locator('#ga-basic-out')).toContainText('cart')
  await expect(page.locator('#ga-basic-out')).toContainText('icon')

  await bar.locator('[part="button"]').last().click()
  await expect(page.locator('#ga-basic-out')).toContainText('buy')
  await expect(page.locator('#ga-basic-out')).toContainText('button')
})

test('goods-action：loading spinner 是 1em 圆环（修复前为 4px 竖线）；success/warning 实底文字对比度 ≥4.5', async ({
  page,
}) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  // C2 回归：`.button` 无 flex 布局时 spinner（inline span）1em 尺寸失效 → 4×21 竖线。
  // 几何必须用 offsetWidth/offsetHeight（layout 盒）：boundingBox() 是 transform 后的
  // AABB——spinner 带 rotate 动画，AABB 恒方形膨胀，坏态竖线在特定相位也能伪装通过
  const spinnerGeo = await page.evaluate(() => {
    const sp = [...document.querySelectorAll('oas-goods-action')]
      .map((el) => el.shadowRoot!.querySelector<HTMLElement>('[part="button-spinner"]:not([hidden])'))
      .find(Boolean)!
    const cs = getComputedStyle(sp)
    return { w: sp.offsetWidth, h: sp.offsetHeight, radius: cs.borderRadius, cssW: parseFloat(cs.width) }
  })
  expect(spinnerGeo.w, 'spinner offsetWidth ≈1em+border 而非 4px').toBeGreaterThan(8)
  expect(spinnerGeo.h, 'spinner offsetHeight ≈1em+border 而非 21px 拉伸').toBeGreaterThan(8)
  expect(spinnerGeo.w, 'spinner layout 盒应为正方形（宽=高）').toBe(spinnerGeo.h)
  expect(spinnerGeo.radius, 'border-radius 50% 出圆环').toBe('50%')
  // 1em = font-size-md = 14px（按钮字号）；computed width 即 content 宽（content-box）
  expect(Math.abs(spinnerGeo.cssW - 14), 'spinner 内容宽应 =1em（14px）').toBeLessThanOrEqual(1)

  // I5 回归：success/warning 实底（color-mix 80% / 78%）+ 专用 on-<tone> 文字 token。
  // Chrome 把 color-mix 计算值序列化为 color(srgb r g b)（分量 0–1 浮点）——解析必须
  // 分支处理 ×255；此前 /[\d.]+/g 把 0–1 分量当 0–255 → 对比度算成 20.9 恒真假绿
  const ratios = await page.evaluate(() => {
    const parse = (v: string): [number, number, number] => {
      const nums = v.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
      if (v.startsWith('color(')) return [nums[0]! * 255, nums[1]! * 255, nums[2]! * 255]
      return [nums[0]!, nums[1]!, nums[2]!]
    }
    const lum = ([r, g, b]: [number, number, number]) => {
      const f = (c: number) => {
        c /= 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const contrastOf = (btn: Element) => {
      const cs = getComputedStyle(btn)
      const rgb = parse(cs.backgroundColor)
      const ratio = (() => {
        const l1 = lum(rgb)
        const l2 = lum(parse(cs.color))
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
      })()
      return { ratio, rgb, lum: lum(rgb) }
    }
    const read = (key: string) => {
      const btn = [...document.querySelectorAll('oas-goods-action')]
        .map((el) => el.shadowRoot!.querySelector(`[part="button"][data-key="${key}"]`))
        .find(Boolean)
      return btn ? contrastOf(btn) : null
    }
    return { success: read('ok'), warning: read('warn') }
  })
  // 数值锚定（light 基线，掺 text-primary #18181b）：success 80% ≈ rgb(22.4,135.2,64.6)
  // 理论 4.58；warning 78% ≈ rgb(174.5,98.1,10.6) 理论 4.60——区间 + 逐通道双锚定，
  // 防解析口径再漂移后恒真
  expect(ratios.success?.ratio, 'success 实底对比度 ≥WCAG AA').toBeGreaterThanOrEqual(4.5)
  expect(ratios.success?.ratio, 'success 对比度应落在压深档理论值 4.58 附近').toBeLessThan(5.0)
  expect(ratios.warning?.ratio, 'warning 实底对比度 ≥WCAG AA').toBeGreaterThanOrEqual(4.5)
  expect(ratios.warning?.ratio, 'warning 对比度应落在压深档理论值 4.60 附近').toBeLessThan(5.0)
  expect(ratios.success?.rgb[0]).toBeCloseTo(22.4, 0)
  expect(ratios.success?.rgb[1]).toBeCloseTo(135.2, 0)
  expect(ratios.success?.rgb[2]).toBeCloseTo(64.6, 0)
  expect(ratios.warning?.rgb[0]).toBeCloseTo(174.5, 0)
  expect(ratios.warning?.rgb[1]).toBeCloseTo(98.1, 0)
  expect(ratios.warning?.rgb[2]).toBeCloseTo(10.6, 0)

  // hover 方向回归：hover 混色占比 76% / 74% 沿压深方向走（修复前 85% 误向提亮、
  // 对比跌回 ≈4.1）——:hover 靠真实指针位置触发，用 Playwright hover() 移动指针
  const readHoverBg = (key: string) =>
    page.evaluate((k) => {
      const btn = [...document.querySelectorAll('oas-goods-action')]
        .map((el) => el.shadowRoot!.querySelector(`[part="button"][data-key="${k}"]`))
        .find(Boolean)!
      const cs = getComputedStyle(btn)
      const rgb = (cs.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []).map((n) =>
        cs.backgroundColor.startsWith('color(') ? n * 255 : n,
      )
      return rgb as number[]
    }, key)
  const okBtn = page.locator('oas-goods-action [part="button"][data-key="ok"]').first()
  const warnBtn = page.locator('oas-goods-action [part="button"][data-key="warn"]').first()
  // 等 background transition（transition-fast ≈150ms）结束再读稳态：过渡中 Chromium 走
  // oklab 插值、computed 序列化为 oklab(...)，稳态才回到 color(srgb …) 记法。
  // 但「序列化形态」只在 Chromium 过渡中才有区别——Firefox 一开始就是 color(srgb …)，
  // 该判据立刻通过、读到的是过渡中途值（实测 g 通道 133.7/134.5 波动，稳态应 129.6），
  // 故必须再等「连续两次采样同值」的稳态，否则同一份样式的 hover 断言跨引擎不稳定。
  const bgOf = (key: string) =>
    page.evaluate((k) => {
      const btn = [...document.querySelectorAll('oas-goods-action')]
        .map((el) => el.shadowRoot!.querySelector(`[part="button"][data-key="${k}"]`))
        .find(Boolean)!
      return getComputedStyle(btn).backgroundColor
    }, key)
  const bgSteady = async (key: string, base: string): Promise<void> => {
    // 连续两次采样同值 + 已离开基色：mid-transition 的两次背靠背采样可能同值（同一帧内
    // 过渡还没推进），只等「同值」会在 Firefox 读到 ≈基色（实测 g 133.7/134.5、r 173.5）
    let last = ''
    let stable = 0
    await expect
      .poll(
        async () => {
          const cur = await bgOf(key)
          stable = cur === last && cur !== base ? stable + 1 : 0
          last = cur
          return stable > 0
        },
        { timeout: 3000, message: 'hover 底色过渡落定（已离开基色且连续两次采样同值）' },
      )
      .toBe(true)
    // 稳态记法复核（Chromium 过渡中走 oklab，稳态回到 color(srgb …)）
    expect(last, '稳态 hover 底色应为 color() 记法').toMatch(/^color\(/)
  }
  const baseOk = await bgOf('ok')
  const baseWarn = await bgOf('warn')
  await okBtn.hover()
  await bgSteady('ok', baseOk)
  const okHover = await readHoverBg('ok')
  await warnBtn.hover()
  await bgSteady('warn', baseWarn)
  const warnHover = await readHoverBg('warn')
  // hover bg 逐通道锚定：success 76% ≈ (22.5,129.6,62.7)；warning 74% ≈ (166.8,94.3,11.5)
  expect(okHover[0]).toBeCloseTo(22.5, 0)
  expect(okHover[1]).toBeCloseTo(129.6, 0)
  expect(okHover[2]).toBeCloseTo(62.7, 0)
  expect(warnHover[0]).toBeCloseTo(166.8, 0)
  expect(warnHover[1]).toBeCloseTo(94.3, 0)
  expect(warnHover[2]).toBeCloseTo(11.5, 0)
  // 压深方向确证：hover 底色各可见通道不亮于 base（g 通道主载体）
  expect(okHover[1], 'success hover 应压深（g 通道 135.2 → 129.6）').toBeLessThan(ratios.success!.rgb[1])
  expect(warnHover[1], 'warning hover 应压深（g 通道 98.1 → 94.3）').toBeLessThan(ratios.warning!.rgb[1])
})

// N4 回归：极窄宿主（≤90px 双 loading 按钮）下 spinner flex:none 不可收缩，会画出按钮
// 边框——`.button` overflow:hidden 盒内裁剪兜底；长文本省略仍由 .button-text 承担不回退
test('goods-action：极窄宿主按钮内容盒内裁剪不溢出边框，长文本省略不回退', async ({ page }) => {
  await page.goto('/components/goods-action.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-goods-action')

  const probe = await page.evaluate(async () => {
    const host = document.createElement('oas-goods-action')
    host.id = 'ga-narrow-probe'
    host.style.cssText = 'display:block;width:90px'
    host.setAttribute(
      'actions',
      JSON.stringify([
        { key: 'narrow-load', text: '提交中', loading: true },
        { key: 'narrow-long', text: '这是一段非常长的按钮文字用于验证省略号行为是否保持' },
      ]),
    )
    document.body.appendChild(host)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))))
    const loadingBtn = host.shadowRoot!.querySelector<HTMLElement>('[part="button"][data-key="narrow-load"]')!
    const longBtn = host.shadowRoot!.querySelector<HTMLElement>('[part="button"][data-key="narrow-long"]')!
    const longText = longBtn.querySelector<HTMLElement>('[part="button-text"]')!
    return {
      overflow: getComputedStyle(loadingBtn).overflow,
      textTruncated: longText.scrollWidth > longText.clientWidth,
      textOverflow: getComputedStyle(longText).textOverflow,
    }
  })
  expect(probe.overflow, '按钮盒 overflow:hidden 兜底（修复前 visible：spinner 画出边框）').toBe('hidden')
  expect(probe.textTruncated, '场景确证：90px 宿主下长文本确已被截断（非恒真前提）').toBe(true)
  expect(probe.textOverflow, '长文本省略不回退：ellipsis 仍在').toBe('ellipsis')

  await page.evaluate(() => document.getElementById('ga-narrow-probe')?.remove())
})
