// 复核回归：list——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('list 选中行 hover 保持 primary 背景（白字可读，不被 clickable hover 浅灰压盖）', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[selected]')
  // 真实 hover 选中行
  await page.locator('oas-list-item[selected]').first().hover()
  const r = await page.evaluate(() => {
    const sel = document.querySelector('oas-list-item[selected]')!
    const bg = getComputedStyle(sel).backgroundColor
    const color = getComputedStyle(sel).color
    // 取 primary 与 bg-hover 的实际计算色做对照
    const probe = document.createElement('div')
    document.body.appendChild(probe)
    probe.style.background = 'var(--oas-color-bg-hover)'
    const bgHover = getComputedStyle(probe).backgroundColor
    probe.style.background = 'var(--oas-color-primary)'
    const primary = getComputedStyle(probe).backgroundColor
    probe.style.background = 'var(--oas-color-primary-hover, var(--oas-color-primary))'
    const primaryHover = getComputedStyle(probe).backgroundColor
    probe.remove()
    return { bg, color, bgHover, primary, primaryHover }
  })
  // 选中行 hover 背景 ≠ bg-hover 浅灰（bug 形态），= primary 系（primary 或 primary-hover）
  expect(r.bg).not.toBe(r.bgHover)
  expect([r.primary, r.primaryHover]).toContain(r.bg)
})

test('list 分组组头在滚动容器内吸顶（computedStyle position=sticky 且 top=0）', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#list-grouped')
  // demo 数据在 whenDefined 后异步注入：等组头渲染且列表体可滚动后再断言
  await page.waitForFunction(() => {
    const list = document.querySelector('#list-grouped')
    const sh = list?.shadowRoot
    const body = sh?.querySelector('[part="body"]') as HTMLElement | null
    return (sh?.querySelectorAll('.group-header')?.length ?? 0) >= 3 && !!body && body.scrollHeight > body.clientHeight
  })
  const r = await page.evaluate(() => {
    const list = document.querySelector('#list-grouped')!
    const sh = list.shadowRoot!
    const body = sh.querySelector('[part="body"]')!
    const headers = Array.from(sh.querySelectorAll('.group-header'))
    const bodyTop = Math.round(body.getBoundingClientRect().top)
    // 滚动到底：逐段推进记录「钉在容器顶的组头」是否单调向后（后组头到顶顶走前组头）
    const max = body.scrollHeight - body.clientHeight
    let prev = -1
    let violated = false
    for (let top = 0; top <= max; top += 6) {
      body.scrollTop = top
      const pinned = headers.filter((h) => Math.abs(h.getBoundingClientRect().top - bodyTop) < 1)
      // 多个组头同钉顶时，DOM 靠后的盖在顶层（可见者取最后）
      const visible = pinned.length ? headers.indexOf(pinned[pinned.length - 1]!) : -1
      if (visible !== -1 && prev !== -1 && visible < prev) {
        violated = true
        break
      }
      if (visible !== -1) prev = visible
    }
    return {
      headerTexts: headers.map((h) => h.textContent),
      styles: headers.map((h) => {
        const cs = getComputedStyle(h as HTMLElement)
        return { position: cs.position, top: cs.top }
      }),
      scrollable: max > 0,
      violated,
    }
  })
  // 组名来自 group，groupLabel（已完结 · v2.4）覆盖了「已完成」组文案
  expect(r.headerTexts).toEqual(['进行中', '已完结 · v2.4', '待开始'])
  for (const s of r.styles) {
    expect(s.position).toBe('sticky')
    expect(s.top).toBe('0px')
  }
  expect(r.scrollable).toBe(true)
  // 吸顶语义：向下滚动时可见组头单调推进（后组头到顶顶走前组头）
  expect(r.violated).toBe(false)
})

test('list 分组组头不占用行索引（数据行 data-index 连续、组头是 role=separator 静态条）', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#list-grouped')
  await page.waitForFunction(() => {
    const sh = document.querySelector('#list-grouped')?.shadowRoot
    return (sh?.querySelectorAll('[part="data-items"] oas-list-item')?.length ?? 0) === 9
  })
  const r = await page.evaluate(() => {
    const list = document.querySelector('#list-grouped')!
    const sh = list.shadowRoot!
    const rows = Array.from(sh.querySelectorAll('[part="data-items"] oas-list-item'))
    const headers = Array.from(sh.querySelectorAll('[part="data-items"] .group-header'))
    return {
      rowIndexes: rows.map((row) => row.getAttribute('data-index')),
      headerRoles: headers.map((h) => h.getAttribute('role')),
      headerTabindex: headers.map((h) => h.hasAttribute('tabindex')),
    }
  })
  expect(r.rowIndexes).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8'])
  for (const role of r.headerRoles) expect(role).toBe('separator')
  for (const t of r.headerTabindex) expect(t).toBe(false)
})

test('list：点击可点行内的开关不触发行点击，且行不挂缺省 role=button（无交互嵌套）', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[clickable]')
  const r = await page.evaluate(async () => {
    const row = Array.from(document.querySelectorAll('oas-list-item[clickable]')).find((item) =>
      item.querySelector('oas-switch'),
    ) as (HTMLElement & { shadowRoot: ShadowRoot }) | undefined
    if (!row) return null
    const sw = row.querySelector('oas-switch') as HTMLElement & { shadowRoot: ShadowRoot }
    let rowClicks = 0
    row.addEventListener('oas-click', () => rowClicks++)
    const inner = sw.shadowRoot.querySelector('[part="switch"]') as HTMLElement
    const before = inner.getAttribute('aria-checked')
    inner.click()
    await new Promise((res) => setTimeout(res, 0))
    return { rowClicks, role: row.getAttribute('role'), before, after: inner.getAttribute('aria-checked') }
  })
  expect(r, '页面应有嵌开关的可点行').not.toBeNull()
  expect(r!.role, '可点行不挂缺省 role=button（否则行内开关构成交互嵌套）').toBe(null)
  expect(r!.rowClicks, '点击行内开关不应触发整行 oas-click（行与控件不双触发）').toBe(0)
  expect(r!.after, '开关自身应正常切换').not.toBe(r!.before)
})

test('list 选中行内 checked 开关：轨道底与 primary 行底可辨（demo 经 --oas-color-primary 通道调一档）', async ({
  page,
}) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[selected]')
  const r = await page.evaluate(() => {
    const row = document.querySelector('oas-list-item[selected]')!
    const sws = Array.from(row.querySelectorAll('oas-switch')) as Array<HTMLElement & { shadowRoot: ShadowRoot }>
    for (const sw of sws) {
      const btn = sw.shadowRoot?.querySelector('button')
      if (btn && btn.getAttribute('aria-checked') === 'true') {
        return {
          trackBg: getComputedStyle(btn).backgroundColor,
          rowBg: getComputedStyle(row).backgroundColor,
        }
      }
    }
    return null
  })
  expect(r, '选中行 demo 内应有开启态开关').not.toBeNull()
  expect(r!.trackBg, '开启轨道底色不得与选中行底同色（曾同为 primary → 轨道消失只剩悬空滑块，可供性丢失）').not.toBe(
    r!.rowBg,
  )
})
