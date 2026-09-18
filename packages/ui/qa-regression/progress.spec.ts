// 复核回归：progress——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('progress value 别名渲染：percent 缺失时写 value 生效（宽度/ARIA/文本）', async ({ page }) => {
  // 曾现 bug：宿主直觉写 value 静默无效（组件只认 percent）。修复=value 作为 percent 的
  // 别名纳入 observedAttributes，percent 存在时优先，否则读 value。
  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-progress')
    el.setAttribute('value', '60')
    document.body.appendChild(el)
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    const out = {
      width: bar.style.width,
      now: bar.getAttribute('aria-valuenow'),
      max: bar.getAttribute('aria-valuemax'),
      text: el.shadowRoot!.querySelector('[part="text"]')!.textContent,
    }
    el.remove()
    return out
  })
  expect(r.width, 'value=60 驱动条宽 60%').toBe('60%')
  expect(r.now, 'aria-valuenow 同步 60').toBe('60')
  expect(r.max, 'aria-valuemax 保持 100').toBe('100')
  expect(r.text, '百分比文本同步').toContain('60%')
})

test('progress 同设 value + percent 时 percent 优先；移除 percent 后回退 value', async ({ page }) => {
  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress')
  const r = await page.evaluate(() => {
    const el = document.createElement('oas-progress')
    el.setAttribute('value', '60')
    el.setAttribute('percent', '30')
    document.body.appendChild(el)
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="bar"]')!
    const both = bar.style.width
    el.removeAttribute('percent')
    const fallback = bar.style.width
    el.remove()
    return { both, fallback }
  })
  expect(r.both, '两者同设 percent 优先 → 30%').toBe('30%')
  expect(r.fallback, '移除 percent 后回退 value → 60%').toBe('60%')
})

test('progress 内嵌百分比文字：仅 text-inside 时渲染，且只压在已填充段内', async ({ page }) => {
  // 曾现缺陷：①.inside 以整个轨道为容器居中，白字一半压在浅色轨道上（感知分 0）；
  // ②.inside/.text 自带 display:flex 压过 [hidden]，未开 text-inside 也照画（含 no-text/show-text=false 失效）
  await page.goto('/components/progress.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-progress[percent]')
  const r = await page.evaluate(() => {
    const host = document.createElement('oas-progress') as HTMLElement & { shadowRoot: ShadowRoot }
    host.setAttribute('percent', '45')
    document.body.appendChild(host)
    const bar = host.shadowRoot.querySelector('[part="bar"]') as HTMLElement
    const inside = host.shadowRoot.querySelector('[part="inside"]') as HTMLElement
    const hiddenBefore = inside.hidden
    const visibleBefore = inside.getBoundingClientRect().height > 0
    // 显式开启 text-inside → 内嵌文字才出现
    host.setAttribute('text-inside', '')
    const ib = inside.querySelector<HTMLElement>('.inside-value')!.getBoundingClientRect()
    const bb = bar.getBoundingClientRect()
    const text = inside.querySelector<HTMLElement>('.inside-value')!.textContent ?? ''
    const result = {
      nestedInBar: bar.contains(inside),
      hiddenBefore,
      visibleBefore,
      visibleAfter: inside.getBoundingClientRect().height > 0,
      leftOk: ib.left >= bb.left - 1,
      rightOk: ib.right <= bb.right + 1,
      text,
    }
    host.remove()
    return result
  })
  expect(r.hiddenBefore, '未开 text-inside 时 .inside 应为 hidden').toBe(true)
  expect(r.visibleBefore, '未开 text-inside 时 .inside 不得绘制（[hidden] 必须生效）').toBe(false)
  expect(r.visibleAfter, '开启 text-inside 后 .inside 应可见').toBe(true)
  expect(r.nestedInBar, '内嵌文字应在填充段（[part=bar]）内').toBe(true)
  expect(r.leftOk && r.rightOk, '内嵌文字左右边界不得越出填充段').toBe(true)
  expect(r.text).toContain('45')
})
