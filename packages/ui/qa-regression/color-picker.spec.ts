// 复核回归：color-picker——一期增强缺陷固化断言。
// 覆盖：右缘窄容器触发面板不再撑横向滚动/被祖先裁切（FD3 复现场景）、
// 真实浏览器 slot 触发器点击穿透、alpha 滑杆 8 位 hex 回写、
// clearable 清除链路（oas-clear + 空态占位 + demo 可见反馈）、
// hex 输入非法红框不生效、readonly 拒开、受控 open 双向 oas-open-change、
// Vue demo 属性存活。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('color-picker 右缘触发：面板 fixed 视口内、不撑横向滚动条、不被 overflow 祖先裁切', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-edge')

  const noHScroll = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    )
  expect(await noHScroll(), '打开前页面不应有横向滚动').toBe(true)

  await page.evaluate(() => {
    const el = document.querySelector('#cp-edge')!
    const trigger = el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement
    trigger.click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#cp-edge')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.classList.contains('open') === true,
    null,
    { timeout: 5000 },
  )

  const geom = await page.evaluate(() => {
    const el = document.querySelector('#cp-edge')!
    const panel = el.shadowRoot!.querySelector('[part="panel"]')!
    const r = panel.getBoundingClientRect()
    return {
      placement: panel.getAttribute('data-placement'),
      left: r.left,
      right: r.right,
      width: r.width,
      vw: window.innerWidth,
      panelDisplay: getComputedStyle(panel as Element).display,
      // 面板挂在 trigger 所在 shadow 内、position: fixed（不在 overflow:hidden 祖先的流内）
      clippedByAncestor: r.width <= 0,
    }
  })
  expect(geom.clippedByAncestor).toBe(false)
  expect(geom.panelDisplay).toBe('block')
  expect(geom.width).toBeGreaterThan(200)
  expect(geom.right).toBeLessThanOrEqual(geom.vw)
  expect(await noHScroll(), '面板打开后页面仍不应有横向滚动（FD3 回归）').toBe(true)
})

test('color-picker 真实浏览器：slot 自定义触发器点击沿 slot 冒泡打开面板', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-slot')

  const custom = page.locator('#cp-slot span[slot="trigger"]')
  await expect(custom).toHaveCount(1)
  await custom.click()
  await page.waitForFunction(
    () => document.querySelector('#cp-slot')?.hasAttribute('open') === true,
    null,
    { timeout: 5000 },
  )
  expect(await page.evaluate(() => document.querySelector('#cp-slot')?.hasAttribute('open'))).toBe(
    true,
  )
})

test('color-picker alpha 滑杆拖动：值回写 8 位 hex，触发器文本同步（show-alpha demo）', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-alpha')

  await page.evaluate(() => {
    const el = document.querySelector('#cp-alpha')!
    ;(el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#cp-alpha')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.classList.contains('open') === true,
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#cp-alpha')!
    const alpha = el.shadowRoot!.querySelector('.alpha') as HTMLInputElement
    alpha.value = '25'
    alpha.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForFunction(
    () => document.querySelector('#cp-alpha')?.getAttribute('value') === '#0b6cff40',
    null,
    { timeout: 5000 },
  )
  const text = await page.evaluate(
    () =>
      document
        .querySelector('#cp-alpha')
        ?.shadowRoot?.querySelector('.hex-text')
        ?.textContent?.trim(),
  )
  expect(text).toBe('#0b6cff40')
})

test('color-picker clearable：oas-clear + 空态占位 + demo 可见反馈', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-clear')

  await page.evaluate(() => {
    const el = document.querySelector('#cp-clear')!
    ;(el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#cp-clear')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.classList.contains('open') === true,
    null,
    { timeout: 5000 },
  )
  await page.evaluate(() => {
    const el = document.querySelector('#cp-clear')!
    ;(el.shadowRoot!.querySelector('[part="clear"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#cp-clear')?.hasAttribute('value') === false,
    null,
    { timeout: 5000 },
  )
  const state = await page.evaluate(() => {
    const el = document.querySelector('#cp-clear')!
    const text = el.shadowRoot!.querySelector('.hex-text')!
    return {
      placeholder: text.classList.contains('placeholder'),
      feedback: document.querySelector('#cp-clear-output')?.textContent ?? '',
      clearStillInDom: el.shadowRoot!.querySelector('[part="clear"]')?.hasAttribute('hidden') === true,
    }
  })
  expect(state.placeholder, '清空后触发文本应为「未选择」占位态').toBe(true)
  expect(state.feedback).toContain('oas-clear')
  expect(state.feedback).toContain('#16a34a')
  expect(state.clearStillInDom, '空值时 clear 按钮应隐藏').toBe(true)
})

test('color-picker hex 输入：非法值红框不生效，合法值提交并派发', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-event')

  await page.evaluate(() => {
    const el = document.querySelector('#cp-event')!
    ;(el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#cp-event')
        ?.shadowRoot?.querySelector('[part="panel"]')
        ?.classList.contains('open') === true,
    null,
    { timeout: 5000 },
  )

  // 非法：红框 + aria-invalid，组件值不变
  await page.evaluate(() => {
    const el = document.querySelector('#cp-event')!
    const input = el.shadowRoot!.querySelector('[part="hex-input"]') as HTMLInputElement
    input.value = 'zzz'
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  const invalid = await page.evaluate(() => {
    const el = document.querySelector('#cp-event')!
    const input = el.shadowRoot!.querySelector('[part="hex-input"]')!
    return {
      invalidClass: input.classList.contains('invalid'),
      ariaInvalid: input.getAttribute('aria-invalid'),
      value: el.getAttribute('value'),
    }
  })
  expect(invalid.invalidClass).toBe(true)
  expect(invalid.ariaInvalid).toBe('true')
  expect(invalid.value).toBe('#0b6cff')

  // 合法：提交 + demo 事件反馈可见
  await page.evaluate(() => {
    const el = document.querySelector('#cp-event')!
    const input = el.shadowRoot!.querySelector('[part="hex-input"]') as HTMLInputElement
    input.value = '#336699'
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForFunction(
    () => document.querySelector('#cp-event')?.getAttribute('value') === '#336699',
    null,
    { timeout: 5000 },
  )
  const ok = await page.evaluate(() => {
    const el = document.querySelector('#cp-event')!
    const input = el.shadowRoot!.querySelector('[part="hex-input"]')!
    return {
      invalidClass: input.classList.contains('invalid'),
      feedback: document.querySelector('#cp-output')?.textContent ?? '',
    }
  })
  expect(ok.invalidClass).toBe(false)
  expect(ok.feedback).toBe('oas-change: #336699')
})

test('color-picker 受控 open：外部按钮开/关 + oas-open-change 可见反馈；readonly 拒开', async ({ page }) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-ctrl')
  await up(page, '#cp-readonly')

  await page.evaluate(() => {
    ;(document.querySelector('#cp-open-btn') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#cp-ctrl')?.hasAttribute('open') === true,
    null,
    { timeout: 5000 },
  )
  const opened = await page.evaluate(
    () => document.querySelector('#cp-ctrl-output')?.textContent ?? '',
  )
  expect(opened).toContain('oas-open-change: true')

  await page.evaluate(() => {
    ;(document.querySelector('#cp-close-btn') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => document.querySelector('#cp-ctrl')?.hasAttribute('open') === false,
    null,
    { timeout: 5000 },
  )
  const closed = await page.evaluate(
    () => document.querySelector('#cp-ctrl-output')?.textContent ?? '',
  )
  expect(closed).toContain('oas-open-change: false')

  // readonly：点击不打开、无 open 属性
  await page.evaluate(() => {
    const el = document.querySelector('#cp-readonly')!
    ;(el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement).click()
  })
  await page.waitForTimeout(100)
  const readonlyState = await page.evaluate(() => {
    const el = document.querySelector('#cp-readonly')!
    return {
      open: el.hasAttribute('open'),
      size: document.querySelector('#cp-ctrl')?.getAttribute('size') ?? null,
    }
  })
  expect(readonlyState.open).toBe(false)
})

test('color-picker Vue demo 属性存活：size / show-alpha / uppercase / preset-columns 未被剥离', async ({
  page,
}) => {
  await page.goto('/components/color-picker.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cp-upper')
  const attrs = await page.evaluate(() => {
    const pick = (id: string) => {
      const el = document.querySelector(id)!
      return [...el.attributes].map((a) => a.name)
    }
    return {
      upper: pick('#cp-upper'),
      alpha: pick('#cp-alpha'),
      format: pick('#cp-format'),
      presets: pick('#cp-presets'),
      clear: pick('#cp-clear'),
    }
  })
  expect(attrs.upper).toContain('uppercase')
  expect(attrs.upper).toContain('value')
  expect(attrs.alpha).toContain('show-alpha')
  expect(attrs.format).toContain('color-format')
  expect(attrs.presets).toContain('preset-columns')
  expect(attrs.presets).toContain('preset-rows')
  expect(attrs.presets).toContain('preset')
  expect(attrs.clear).toContain('clearable')
  // 值未被 Vue 处理丢语义：hex 文本按 uppercase 大写渲染
  const upperText = await page.evaluate(
    () =>
      document
        .querySelector('#cp-upper')
        ?.shadowRoot?.querySelector('.hex-text')
        ?.textContent?.trim(),
  )
  expect(upperText).toBe('#0B6CFF')
})
