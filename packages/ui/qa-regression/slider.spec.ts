// 复核回归：slider——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('slider show-input：拖动滑块实时更新输入框、输入数字防抖后驱动滑块', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-input]')
  const el = page.locator('oas-slider[show-input]').first()
  // 初始：输入框与滑块数值一致
  const r0 = await el.evaluate((node) => {
    const root = node.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const num = root.querySelector<HTMLInputElement>('[data-role="num"]')!
    return { range: Number(input.value), num: num.value }
  })
  expect(r0.num).toBe(String(r0.range))
  // 拖动滑块（派发 input）→ 输入框实时更新
  await el.evaluate((node) => {
    const root = node.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    input.value = '77'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const r1 = await el.evaluate((node) => {
    const root = node.shadowRoot!
    return root.querySelector<HTMLInputElement>('[data-role="num"]')!.value
  })
  expect(r1).toBe('77')
  // 输入数字 → 防抖（300ms）后驱动滑块
  await el.evaluate((node) => {
    const root = node.shadowRoot!
    const num = root.querySelector<HTMLInputElement>('[data-role="num"]')!
    num.value = '35'
    num.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('oas-slider[show-input]')
      const input = el?.shadowRoot?.querySelector<HTMLInputElement>('[data-role="range"]')
      return input != null && Number(input.value) === 35
    },
    null,
    { timeout: 5000 },
  )
})

test('slider range：双滑块区间 + 双输入框联动且方向反向（reverse）生效', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range][show-input]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range][show-input]')!
    const root = el.shadowRoot!
    const min = root.querySelector<HTMLInputElement>('[data-role="range-min"]')!
    const max = root.querySelector<HTMLInputElement>('[data-role="range-max"]')!
    const numMin = root.querySelector<HTMLInputElement>('[data-role="num-min"]')!
    const numMax = root.querySelector<HTMLInputElement>('[data-role="num-max"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    return {
      min: Number(min.value),
      max: Number(max.value),
      numMin: numMin.value,
      numMax: numMax.value,
      fillWidth: fill.style.width,
      minAria: min.getAttribute('aria-label'),
      maxAria: max.getAttribute('aria-label'),
    }
  })
  expect(r.min).toBe(20)
  expect(r.max).toBe(80)
  expect(r.numMin).toBe('20')
  expect(r.numMax).toBe('80')
  expect(r.fillWidth).toBe('60%')
  expect(r.minAria).toBeTruthy()
  expect(r.maxAria).toBeTruthy()

  // reverse demo：方向反转 + 填充区从右端
  await up(page, 'oas-slider[reverse]')
  const rev = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[reverse]')!
    const root = el.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    return {
      dir: input.getAttribute('dir'),
      fillRight: fill.style.right,
      fillWidth: fill.style.width,
      ariaLabel: input.getAttribute('aria-label'),
      ariaNow: input.getAttribute('aria-valuenow'),
    }
  })
  expect(rev.dir).toBe('rtl')
  expect(rev.fillRight).toBe('0%')
  expect(parseFloat(rev.fillWidth)).toBeGreaterThan(0)
  expect(rev.ariaLabel).toBeTruthy()
  expect(rev.ariaNow).toBe('60')
})

test('slider custom-thumb：模板内容克隆进滑块、值气泡显示当前值、原生 thumb 隐藏', async ({
  page,
}) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-tooltip]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-tooltip]')!
    const root = el.shadowRoot!
    const thumb = root.querySelector<HTMLElement>('.custom-thumb[data-thumb="value"]')!
    return {
      visible: !thumb.hidden,
      content: thumb.querySelector('.thumb-content')?.textContent ?? '',
      tip: thumb.querySelector('.thumb-tip')?.textContent ?? '',
      tipVisible: !thumb.querySelector('.thumb-tip')?.hasAttribute('hidden'),
      nativeHidden: el.hasAttribute('data-custom-thumb'),
      dataPct: thumb.getAttribute('data-pct'),
    }
  })
  expect(r.visible).toBe(true)
  expect(r.content).toContain('🎯')
  expect(r.tip).toBe('60')
  expect(r.tipVisible).toBe(true)
  expect(r.nativeHidden).toBe(true)
  expect(parseFloat(r.dataPct ?? '')).toBe(60)
})

test('slider 基础用法：自定义滑块/数值输入区 hidden 真实隐藏（默认与拖动后均无残留圆环）', async ({
  page,
}) => {
  // 曾现 bug：.custom-thumb{display:flex} 压过 UA [hidden] 规则 → 三个自定义滑块恒可见：
  // 默认态全堆在 left:0（轨道起点多一个白圈，被误认为正常）；一拖动车 'value' 滑块被定位
  // 到值位置后松手 hidden=true 仍显示 → 原生蓝 thumb 旁残留白圈（双滑块假象）。
  // 同类根因：.inputs{display:flex} 在无 show-input 时同样压过 hidden（空容器白占 flex gap）。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const probe = () =>
    page.evaluate(() => {
      const el = document.querySelector('oas-slider')!
      const sr = el.shadowRoot!
      const disp = (sel: string) => getComputedStyle(sr.querySelector(sel)!).display
      return {
        valueThumb: disp('.custom-thumb[data-thumb="value"]'),
        minThumb: disp('.custom-thumb[data-thumb="min"]'),
        maxThumb: disp('.custom-thumb[data-thumb="max"]'),
        inputs: disp('.inputs'),
      }
    })
  const before = await probe()
  expect(before.valueThumb, '默认态 value 自定义滑块应隐藏').toBe('none')
  expect(before.minThumb, '默认态 min 自定义滑块应隐藏').toBe('none')
  expect(before.maxThumb, '默认态 max 自定义滑块应隐藏').toBe('none')
  expect(before.inputs, '无 show-input 时数值输入区应隐藏').toBe('none')
  // 模拟拖动（input→change 全程），松手后不得残留任何自定义滑块
  await page.evaluate(() => {
    const input = document
      .querySelector('oas-slider')!
      .shadowRoot!.querySelector<HTMLInputElement>('input[data-role="range"]')!
    input.value = '70'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const after = await probe()
  expect(after.valueThumb, '拖动后 value 自定义滑块不得残留').toBe('none')
  expect(after.minThumb, '拖动后 min 自定义滑块不得残留').toBe('none')
  expect(after.maxThumb, '拖动后 max 自定义滑块不得残留').toBe('none')
})

test('slider range：拖动中自定义滑块中心与原生 thumb 中心对齐（无半径跳变）', async ({ page }) => {
  // 曾现 bug：thumbLeft() 返回的是原生 thumb「左缘」公式 pct*(w-size)，但 .custom-thumb 以
  // translate(-50%,-50%) 把它当「中心」用 → 拖动中空心环偏左半个直径（7px），松手切回
  // 原生实心 thumb 瞬间右跳 7px（用户感知「空心的会移位」）。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range]')!
    const sr = el.shadowRoot!
    const maxInput = sr.querySelector<HTMLInputElement>('input[data-role="range-max"]')!
    // 进入拖动态（dragging=true → overlay 启用，custom-thumb 显示）
    maxInput.value = '60'
    maxInput.dispatchEvent(new Event('input', { bubbles: true }))
    const rect = maxInput.getBoundingClientRect()
    const min = Number(maxInput.min)
    const max = Number(maxInput.max)
    const v = Number(maxInput.value)
    const THUMB = 14
    // 原生 thumb 中心公式：左缘 pct*(w-size) + 半径 size/2
    const nativeCx = rect.left + ((v - min) / (max - min)) * (rect.width - THUMB) + THUMB / 2
    const th = sr.querySelector<HTMLElement>('.custom-thumb[data-thumb="max"]')!
    const tr = th.getBoundingClientRect()
    return {
      visible: getComputedStyle(th).display !== 'none',
      delta: tr.left + tr.width / 2 - nativeCx,
    }
  })
  expect(r.visible, '拖动中自定义滑块应显示').toBe(true)
  expect(Math.abs(r.delta), '自定义滑块中心与原生 thumb 中心偏差不得超 1.5px').toBeLessThanOrEqual(
    1.5,
  )
})

test('slider range：pointerdown 提升 input z-index 后蓝色填充仍可见（灰轨道不得盖住 fill）', async ({
  page,
}) => {
  // 曾现 bug：range 模式 pointerdown 把目标 input 提 z-index 抢拖动权，但原生 input 的
  // 灰色轨道背景（::-webkit-slider-runnable-track）随之上浮盖住 .fill → 蓝色区间填充
  // 消失（dark 下 20-77 之间无蓝条）。修复：灰轨道下沉到 .track-wrap::before 底层，
  // 原生 track 背景透明，z-index 提升只影响 thumb 命中、不遮视觉。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[range]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[range]')!
    const sr = el.shadowRoot!
    const wrap = sr.querySelector<HTMLElement>('.track-wrap')!
    const maxInput = sr.querySelector<HTMLInputElement>('input[data-role="range-max"]')!
    const rect = wrap.getBoundingClientRect()
    // 等价真实按下：pointerdown 冒泡到 wrap，触发 z-index 提升逻辑
    maxInput.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.8,
        clientY: rect.top + rect.height / 2,
      }),
    )
    const fill = sr.querySelector<HTMLElement>('.fill')!
    const fr = fill.getBoundingClientRect()
    const fillCs = getComputedStyle(fill)
    const trackBg = getComputedStyle(maxInput, '::-webkit-slider-runnable-track').backgroundColor
    return {
      fillWidth: fr.width,
      fillBg: fillCs.backgroundColor,
      fillVisible: fillCs.display !== 'none' && fillCs.visibility !== 'hidden',
      trackBg,
      raisedZ: maxInput.style.zIndex,
    }
  })
  expect(r.fillWidth, 'fill 应有宽度').toBeGreaterThan(0)
  expect(r.fillVisible, 'fill 应可见').toBe(true)
  expect(r.fillBg, 'fill 应为 primary 填充色').not.toMatch(/transparent|rgba\(0, 0, 0, 0\)/)
  expect(r.raisedZ, 'pointerdown 后 z-index 提升逻辑仍应生效').toBe('2')
  // 视觉遮挡根因锁定：原生轨道背景必须透明，否则 z-index 提升后灰轨道盖住 fill
  expect(r.trackBg, '原生轨道背景应透明（灰轨道由底层伪元素承担）').toMatch(
    /transparent|rgba\(0, 0, 0, 0\)/,
  )
})
