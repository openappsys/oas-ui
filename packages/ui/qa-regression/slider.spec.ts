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
    const trackW = max.getBoundingClientRect().width
    const THUMB = 14
    // 填充边与原生 thumb 中心同公式对齐：pct×(长-直径)（px，见组件内注释）
    const expectedFillW = ((80 - 20) / 100) * (trackW - THUMB)
    return {
      min: Number(min.value),
      max: Number(max.value),
      numMin: numMin.value,
      numMax: numMax.value,
      fillWidthPx: parseFloat(fill.style.width),
      expectedFillW,
      fillUnit: fill.style.width.endsWith('px'),
      minAria: min.getAttribute('aria-label'),
      maxAria: max.getAttribute('aria-label'),
    }
  })
  expect(r.min).toBe(20)
  expect(r.max).toBe(80)
  expect(r.numMin).toBe('20')
  expect(r.numMax).toBe('80')
  expect(r.fillUnit, '有布局尺寸时 fill 应按像素定位（与 thumb 中心同公式）').toBe(true)
  expect(Math.abs(r.fillWidthPx - r.expectedFillW), 'fill 宽应等于双 thumb 中心距').toBeLessThanOrEqual(1.5)
  expect(r.minAria).toBeTruthy()
  expect(r.maxAria).toBeTruthy()

  // reverse demo：方向反转 + 填充区从右端起（值 60 → 镜像 40%，thumb 中心 = 0.4×(长-直径)+半径）
  await up(page, 'oas-slider[reverse]')
  const rev = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[reverse]')!
    const root = el.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    const trackW = input.getBoundingClientRect().width
    const THUMB = 14
    return {
      dir: input.getAttribute('dir'),
      fillLeft: fill.style.left,
      fillLeftExpected: 0.4 * (trackW - THUMB) + THUMB / 2,
      fillRight: fill.style.right,
      fillWidth: fill.style.width,
      ariaLabel: input.getAttribute('aria-label'),
      ariaNow: input.getAttribute('aria-valuenow'),
    }
  })
  expect(rev.dir).toBe('rtl')
  expect(parseFloat(rev.fillLeft), 'reverse 填充左边应与 thumb 中心同公式（px）').toBeCloseTo(rev.fillLeftExpected, 0)
  expect(rev.fillRight).toBe('')
  expect(parseFloat(rev.fillWidth)).toBeGreaterThan(0)
  expect(rev.ariaLabel).toBeTruthy()
  expect(rev.ariaNow).toBe('60')
})

test('slider custom-thumb：模板内容克隆进滑块、值气泡显示当前值、原生 thumb 隐藏', async ({ page }) => {
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

test('slider 基础用法：自定义滑块/数值输入区 hidden 真实隐藏（默认与拖动后均无残留圆环）', async ({ page }) => {
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
  expect(Math.abs(r.delta), '自定义滑块中心与原生 thumb 中心偏差不得超 1.5px').toBeLessThanOrEqual(1.5)
})

test('slider range：pointerdown 提升 input z-index 后蓝色填充仍可见（灰轨道不得盖住 fill）', async ({ page }) => {
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
  expect(r.trackBg, '原生轨道背景应透明（灰轨道由底层伪元素承担）').toMatch(/transparent|rgba\(0, 0, 0, 0\)/)
})

test('slider vertical：data-vertical 镜像、orient/aria-orientation 同步、填充换 top 轴', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[vertical]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[vertical]')!
    const root = el.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const fill = root.querySelector<HTMLElement>('.fill')!
    const trackH = input.getBoundingClientRect().height
    const THUMB = 14
    return {
      hostVertical: el.hasAttribute('data-vertical'),
      orient: input.getAttribute('orient'),
      ariaOrientation: input.getAttribute('aria-orientation'),
      fillTop: fill.style.top,
      // 垂直 min 在下：值 40 → 填充从底部（min 端）向上延伸到值 40 的 thumb 中心
      fillTopExpected: (1 - 40 / 100) * (trackH - THUMB) + THUMB / 2,
      // 新几何：填充从轨道底边贴边到值 thumb 中心（修掉起点灰缝后），高 = 轨长 - thumb 中心
      fillHeightExpected: trackH - ((1 - 40 / 100) * (trackH - THUMB) + THUMB / 2),
      fillHeight: fill.style.height,
      fillLeft: fill.style.left,
      trackH,
    }
  })
  expect(r.hostVertical).toBe(true)
  expect(r.orient).toBe('vertical')
  expect(r.ariaOrientation).toBe('vertical')
  // fill 上缘 = 值 40 的 thumb 中心（0.6×(轨长-直径)+半径），高 = 40% 行程
  expect(parseFloat(r.fillTop), '垂直 fill 上缘应等于值 thumb 中心（px，min 在下）').toBeCloseTo(r.fillTopExpected, 0)
  expect(Math.abs(parseFloat(r.fillHeight) - r.fillHeightExpected), '垂直 fill 高应为值占比行程').toBeLessThanOrEqual(
    1.5,
  )
  expect(r.fillLeft).toBe('')
})

test('slider tooltip 格式化双通道：format 模板串与 formatTooltip 函数同源进 aria-valuetext', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[format]')
  const tpl = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[format]')!
    const root = el.shadowRoot!
    const thumb = root.querySelector<HTMLElement>('.custom-thumb[data-thumb="value"]')!
    return {
      tip: thumb.querySelector('.thumb-tip')?.textContent ?? '',
      valueText: root.querySelector<HTMLInputElement>('[data-role="range"]')!.getAttribute('aria-valuetext'),
    }
  })
  expect(tpl.tip).toBe('40%')
  expect(tpl.valueText).toBe('40%')
  // formatTooltip 函数通道（onMounted 赋值 Intl 货币格式化，tooltip-always 常显）
  const fn = await page.evaluate(() => {
    const el = document.getElementById('slider-fn-format') as (Element & { formatTooltip?: unknown }) | null
    if (!el || typeof el.formatTooltip !== 'function') return null
    const root = el.shadowRoot!
    const thumb = root.querySelector<HTMLElement>('.custom-thumb[data-thumb="value"]')!
    return {
      tip: thumb.querySelector('.thumb-tip')?.textContent ?? '',
      tipVisible: !thumb.querySelector('.thumb-tip')?.hasAttribute('hidden'),
    }
  })
  expect(fn, 'formatTooltip 函数 property 应已赋值').not.toBeNull()
  expect(fn!.tip).toContain('120')
  expect(fn!.tipVisible).toBe(true)
})

test('slider step="mark"：拖动值吸附最近刻度（marks 外连续值不可选）', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[step="mark"]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[step="mark"]')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[data-role="range"]')!
    input.value = '45'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return { value: Number(input.value), attr: el.getAttribute('value'), step: input.step }
  })
  expect(r.value).toBe(30)
  expect(r.attr).toBe('30')
  expect(r.step).toBe('any')
})

test('slider show-stops：按 step 渲染刻度点且无标签节点', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[show-stops]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[show-stops]')!
    const marks = el.shadowRoot!.querySelector<HTMLElement>('.marks')!
    return {
      hidden: marks.hidden,
      count: marks.querySelectorAll('.mark').length,
      labels: marks.querySelectorAll('.mark-label').length,
    }
  })
  expect(r.hidden).toBe(false)
  expect(r.count).toBe(11)
  expect(r.labels).toBe(0)
})

test('slider start-point：填充从中点起向值延伸（温度计）', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[start-point]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[start-point]')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[data-role="range"]')!
    const fill = el.shadowRoot!.querySelector<HTMLElement>('.fill')!
    const trackW = input.getBoundingClientRect().width
    const THUMB = 14
    // min -50 / max 50 / start-point 0 / value 12：填充 [50%, 62%]（thumb 中心同公式，px）
    return {
      left: parseFloat(fill.style.left),
      leftExpected: 0.5 * (trackW - THUMB) + THUMB / 2,
      width: parseFloat(fill.style.width),
      widthExpected: 0.12 * (trackW - THUMB),
    }
  })
  expect(Math.abs(r.left - r.leftExpected), 'start-point 填充左边应在 50% thumb 中心').toBeLessThanOrEqual(1.5)
  expect(Math.abs(r.width - r.widthExpected), 'start-point 填充宽应覆盖 50%→62% 行程').toBeLessThanOrEqual(1.5)
})

test('slider readonly：pointerdown 被拦截且 input 不禁用、aria-readonly 同步', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[readonly]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[readonly]')!
    const root = el.shadowRoot!
    const input = root.querySelector<HTMLInputElement>('[data-role="range"]')!
    const e = new Event('pointerdown', { cancelable: true })
    root.querySelector('.track-wrap')!.dispatchEvent(e)
    return {
      disabled: input.disabled,
      ariaReadonly: input.getAttribute('aria-readonly'),
      hostReadonly: el.hasAttribute('data-readonly'),
      prevented: e.defaultPrevented,
    }
  })
  expect(r.disabled).toBe(false)
  expect(r.ariaReadonly).toBe('true')
  expect(r.hostReadonly).toBe(true)
  expect(r.prevented).toBe(true)
})

test('slider 键盘大步进：PageUp 按默认 10×step 跳进并派发事件', async ({ page }) => {
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[large-step]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[large-step]')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[data-role="range"]')!
    let inputEvents = 0
    let changeEvents = 0
    el.addEventListener('oas-input', () => inputEvents++)
    el.addEventListener('oas-change', () => changeEvents++)
    const e = new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    return {
      value: Number(input.value),
      attr: el.getAttribute('value'),
      prevented: e.defaultPrevented,
      inputEvents,
      changeEvents,
    }
  })
  expect(r.value).toBe(75)
  expect(r.attr).toBe('75')
  expect(r.prevented).toBe(true)
  expect(r.inputEvents).toBe(1)
  expect(r.changeEvents).toBe(1)
})

test('slider vertical：真实鼠标拖动可改值（pointer 接管）+ 输入框拉满轨道高度', async ({ page }) => {
  // 曾现 bug：垂直用 writing-mode 实现，Chromium 原生竖直拖拽 hit-test 失效拖不动
  // （value 40→40），且 input 未显式高度（默认 20px）导致原生轨道缩在顶部、
  // 填充/thumb/tooltip 全面错位。修复：input 拉满轨道高度 + 原生 thumb 隐藏 +
  // .custom-thumb 视觉 + pointer 事件接管拖动。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider[vertical]')
  const layout = await page.evaluate(() => {
    const el = document.querySelector('oas-slider[vertical]')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[data-role="range"]')!
    const thumb = el.shadowRoot!.querySelector<HTMLElement>('.custom-thumb[data-thumb="value"]')!
    const trackWrap = el.shadowRoot!.querySelector<HTMLElement>('.track-wrap')!
    return {
      inputH: input.getBoundingClientRect().height,
      wrapH: trackWrap.getBoundingClientRect().height,
      thumbVisible: getComputedStyle(thumb).display !== 'none',
    }
  })
  expect(layout.inputH, '垂直 input 应拉满轨道高度（不再是默认 20px）').toBe(layout.wrapH)
  expect(layout.thumbVisible, '垂直模式 custom-thumb 恒可见（承担默认拇指视觉）').toBe(true)

  // 真实鼠标拖动：min 在下，向上拖值变大
  const el = page.locator('oas-slider[vertical]').first()
  await el.scrollIntoViewIfNeeded()
  const box = await el.boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.7)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.7 - i * 10)
    await page.waitForTimeout(20)
  }
  await page.mouse.up()
  const after = await page.evaluate(() => document.querySelector('oas-slider[vertical]')!.getAttribute('value'))
  expect(Number(after), '垂直拖动应使值变化（向上拖 → 值变大）').toBeGreaterThan(40)
})

test('slider 水平拇指在填充末端保持完整圆（底色描边，不再「半圆融入」破相）', async ({ page }) => {
  // 曾现 bug：纯色 thumb 跨在蓝色填充末端时，与填充同色的半圆融入填充，
  // 视觉上像「错位半圆」。修复：thumb 加底色描边。Chromium getComputedStyle
  // 不支持 range 伪元素（回退返回元素自身样式），断言走像素：扫描 thumb 中心行，
  // 描边会把「填充+thumb」的连续蓝色断成两段。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const clip = await page.evaluate(() => {
    const el = document.querySelector('oas-slider')!
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('input[data-role="range"]')!
    const ir = input.getBoundingClientRect()
    const min = Number(input.min || 0)
    const max = Number(input.max || 100)
    const v = Number(input.value || (min + max) / 2)
    const THUMB = 14
    const cx = ir.left + ((v - min) / (max - min)) * (ir.width - THUMB) + THUMB / 2
    const cy = ir.top + ir.height / 2
    return { x: cx - 60, y: cy - 12, width: 120, height: 24 }
  })
  const buf = await page.screenshot({ clip })
  const runs = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const row = Math.floor(img.height / 2)
    const d = g.getImageData(0, row, img.width, 1).data
    const isBlue = (i: number) => (d[i + 2] ?? 0) > 150 && (d[i + 2] ?? 0) - (d[i] ?? 0) > 60 && (d[i + 1] ?? 0) < 190
    let runs = 0
    let inBlue = false
    for (let x = 0; x < img.width; x++) {
      const blue = isBlue(x * 4)
      if (blue && !inBlue) runs++
      inBlue = blue
    }
    return runs
  }, buf.toString('base64'))
  expect(runs, 'thumb 中心行应出现 ≥2 段蓝色（描边把填充与圆盘断开），无描边时融合为 1 段').toBeGreaterThanOrEqual(2)
})

test('slider 范围模式双拇指叠层对齐轨道中线 + 单值填充起点贴边（无拇指半径灰缝）', async ({ page }) => {
  // 缺陷固化（用户实测）：①range 模式 min/max 两个原生 input 是相对定位正常流上下堆叠，
  // max 拇指掉到轨道线下方；改 absolute inset:0 叠层（共享 track-wrap 同盒）。②单值无
  // start-point 时填充起点用 posPx(min)=拇指半径，起点留 size/2 灰缝；改贴轨道视觉起点边。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const r = await page.evaluate(() => {
    // range 双拇指（水平 range demo）
    const rs = [...document.querySelectorAll('oas-slider')].find(
      (s) => s.hasAttribute('range') && !s.hasAttribute('vertical'),
    )!
    const wrap = rs.shadowRoot!.querySelector('.track-wrap')!.getBoundingClientRect()
    const wrapCY = wrap.top + wrap.height / 2
    const inputs = [...rs.shadowRoot!.querySelectorAll('input[type="range"]:not([hidden])')]
    const offsets = inputs.map((i) => {
      const r = i.getBoundingClientRect()
      return Math.round((r.top + r.height / 2 - wrapCY) * 10) / 10
    })
    // 单值填充贴边（颜色 demo value=40 无 start-point）
    const single = [...document.querySelectorAll('oas-slider')].find(
      (s) =>
        !s.hasAttribute('range') &&
        !s.hasAttribute('vertical') &&
        !s.hasAttribute('start-point') &&
        s.getAttribute('value') === '40',
    )!
    const fill = single.shadowRoot!.querySelector('.fill')!.getBoundingClientRect()
    const wrap2 = single.shadowRoot!.querySelector('.track-wrap')!.getBoundingClientRect()
    const fillGap = Math.round((fill.left - wrap2.left) * 10) / 10
    return { offsets, fillGap }
  })
  for (const off of r.offsets) {
    expect(Math.abs(off), 'range 双拇指中线应与轨道中线对齐').toBeLessThanOrEqual(1)
  }
  expect(r.fillGap, '单值填充起点应贴轨道边缘（无灰缝）').toBeLessThanOrEqual(1)
})

test('slider 拇指视觉统一：无自定义内容时 custom-thumb 与原生同为实心圆点（空心环只属自定义内容）', async ({
  page,
}) => {
  // 设计固化：空心环（bg 底 + 彩边）是「自定义内容容器」样式（git 史 3540d7c 原始设计）；
  // range/tooltip/拖动等无自定义内容场景复用了该元素导致「圆点 vs 圆圈」不一致（用户实测）。
  // 修复：默认实心圆点+底色环（与原生像素级一致），仅 data-thumb-content 时回空心环。
  await page.goto('/components/slider.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-slider')
  const r = await page.evaluate(() => {
    // 垂直 demo 的 custom-thumb（无自定义内容，应实心）
    const v = [...document.querySelectorAll('oas-slider')].find(
      (s) => s.hasAttribute('vertical') && !s.hasAttribute('show-input'),
    )!
    const vth = v.shadowRoot!.querySelector('.custom-thumb:not([hidden])')!
    const vcs = getComputedStyle(vth)
    // 自定义内容 demo（🎯 slot）应空心环
    const c = [...document.querySelectorAll('oas-slider')].find((s) => s.querySelector('[slot="custom-thumb"]'))
    const cth = c?.shadowRoot!.querySelector('.custom-thumb:not([hidden])')
    const ccs = cth ? getComputedStyle(cth) : null
    return {
      verticalBg: vcs.backgroundColor,
      verticalBorder: vcs.borderLeftWidth,
      verticalShadow: vcs.boxShadow,
      customBg: ccs?.backgroundColor ?? null,
      customBorder: ccs?.borderLeftWidth ?? null,
    }
  })
  expect(r.verticalBorder, '无自定义内容的拇指应无彩边（实心点）').toBe('0px')
  expect(r.verticalShadow, '无自定义内容的拇指应带底色环').not.toBe('none')
  if (r.customBg !== null) {
    expect(r.customBorder, '有自定义内容的拇指应空心环（彩边）').toBe('2px')
  }
})
