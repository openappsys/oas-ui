// 个人回归：oas-json-viewer 虚拟滚动、搜索、受控展开与复制路径固化。

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { up } from './helpers'

test('json-viewer 10k 节点只渲染虚拟窗口，滚动后窗口移动', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-large')
  await page.waitForFunction(
    () => (document.querySelector('#jv-large')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )
  const before = await page.evaluate(() => {
    const el = document.querySelector('#jv-large')!
    const viewport = el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    return {
      rows: el.shadowRoot!.querySelectorAll('[part="row"]').length,
      first: el.shadowRoot!.querySelector('[part="row"]')?.getAttribute('data-path'),
      scrollHeight: viewport.scrollHeight,
      clientHeight: viewport.clientHeight,
    }
  })
  expect(before.rows).toBeGreaterThan(0)
  expect(before.rows).toBeLessThan(80)
  expect(before.first).toBe('$')
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight * 50)

  await page.evaluate(() => {
    const viewport = document.querySelector('#jv-large')!.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
    viewport.scrollTop = viewport.scrollHeight / 2
    viewport.dispatchEvent(new Event('scroll'))
  })
  await page.waitForTimeout(120)
  const after = await page.evaluate(() => {
    const el = document.querySelector('#jv-large')!
    const root = el.shadowRoot!
    const activeId = root.querySelector('[part="viewport"]')?.getAttribute('aria-activedescendant')
    return {
      rows: root.querySelectorAll('[part="row"]').length,
      first: root.querySelector('[part="row"]')?.getAttribute('data-path'),
      activePointerValid: activeId == null || root.getElementById(activeId) != null,
    }
  })
  expect(after.rows).toBeGreaterThan(0)
  expect(after.rows).toBeLessThan(80)
  expect(after.first).not.toBe('$')
  expect(after.activePointerValid).toBe(true)
})

test('json-viewer 搜索命中计数/自动展开，Ctrl+F 与键盘导航可用', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-search')
  await page.evaluate(() => {
    const el = document.querySelector('#jv-search')!
    ;(window as unknown as { __search: unknown }).__search = null
    el.addEventListener('oas-search-change', (event) => {
      ;(window as unknown as { __search: unknown }).__search = (event as CustomEvent).detail
    })
  })
  await page.locator('#jv-search [part="search"]').fill('alpha')
  await page.waitForFunction(() => (window as unknown as { __search?: { matches?: number } }).__search?.matches === 1)
  const search = await page.evaluate(() => {
    const el = document.querySelector('#jv-search')!
    return {
      detail: (window as unknown as { __search: unknown }).__search,
      rows: [...el.shadowRoot!.querySelectorAll('[part="row"]')].map((row) => row.getAttribute('data-path')),
    }
  })
  expect(search.detail).toMatchObject({ matches: 1, activeIndex: 0 })
  expect(search.rows).toContain("$['tags'][0]")

  const viewport = page.locator('#jv-search [part="viewport"]')
  await viewport.focus()
  await page.keyboard.press('Control+f')
  const focused = await page.evaluate(() =>
    document.querySelector('#jv-search')!.shadowRoot!.activeElement?.getAttribute('part'),
  )
  expect(focused).toBe('search')

  const activeBefore = await page.evaluate(() =>
    document.querySelector('#jv-search')!.shadowRoot!.querySelector('[part="row"].active')?.getAttribute('data-path'),
  )
  await viewport.focus()
  await page.keyboard.press('ArrowDown')
  const activeAfter = await page.evaluate(() =>
    document.querySelector('#jv-search')!.shadowRoot!.querySelector('[part="row"].active')?.getAttribute('data-path'),
  )
  expect(activeAfter).not.toBe(activeBefore)
  const activeId = await page.evaluate(() =>
    document
      .querySelector('#jv-search')!
      .shadowRoot!.querySelector('[part="viewport"]')!
      .getAttribute('aria-activedescendant'),
  )
  expect(activeId).toBeTruthy()
  const activeExists = await page.evaluate((id) => {
    const root = document.querySelector('#jv-search')!.shadowRoot!
    return root.getElementById(id)?.getAttribute('role') === 'treeitem'
  }, activeId!)
  expect(activeExists).toBe(true)
})

test('json-viewer 受控 expanded 点击只派发事件不写回属性', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-json-viewer'))
  await page.evaluate(() => {
    document.querySelector('#jv-controlled-e2e')?.remove()
    const el = document.createElement('oas-json-viewer')
    el.id = 'jv-controlled-e2e'
    el.setAttribute('text', '{"a":{"b":1}}')
    el.setAttribute('default-expand-depth', '0')
    el.setAttribute('expanded', '[]')
    el.style.cssText = 'position:fixed;left:16px;top:16px;width:420px;z-index:2147483000'
    document.body.appendChild(el)
    ;(window as unknown as { __toggle: unknown }).__toggle = null
    el.addEventListener('oas-toggle', (event) => {
      ;(window as unknown as { __toggle: unknown }).__toggle = (event as CustomEvent).detail
    })
  })
  await page.waitForFunction(
    () => !!document.querySelector('#jv-controlled-e2e')?.shadowRoot?.querySelector('[part="row"]'),
  )
  await page.locator('#jv-controlled-e2e [part="row"]').first().click()
  const result = await page.evaluate(() => ({
    attr: document.querySelector('#jv-controlled-e2e')!.getAttribute('expanded'),
    toggle: (window as unknown as { __toggle: unknown }).__toggle,
    rows: document.querySelector('#jv-controlled-e2e')!.shadowRoot!.querySelectorAll('[part="row"]').length,
  }))
  expect(result.attr).toBe('[]')
  expect(result.toggle).toMatchObject({ path: '$', expanded: true })
  expect(result.rows).toBe(1)
})

test('json-viewer 复制路径为可回传 JSONPath，值/JSON 通道正确', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-copy')
  await page.evaluate(() => {
    const el = document.querySelector('#jv-copy')!
    ;(window as unknown as { __copies: unknown[] }).__copies = []
    el.addEventListener('oas-copy', (event) => {
      ;(window as unknown as { __copies: unknown[] }).__copies.push((event as CustomEvent).detail)
    })
  })
  await page.locator('#jv-copy [part="copy-path"]').click()
  await page.locator('#jv-copy [part="copy-value"]').click()
  await page.locator('#jv-copy [part="copy-json"]').click()
  await expect(page.locator('#jv-copy [part="status"]')).toContainText(/已复制|复制失败/)
  const copies = await page.evaluate(() => (window as unknown as { __copies: unknown[] }).__copies)
  expect(copies).toHaveLength(3)
  expect(copies[0]).toMatchObject({ kind: 'path', path: "$['a.b'][0]['c']", text: "$['a.b'][0]['c']" })
  expect(copies[1]).toMatchObject({ kind: 'value', text: 'hello' })
  expect(copies[2]).toMatchObject({ kind: 'json', text: '"hello"' })

  const roundTrip = await page.evaluate(() => {
    const el = document.querySelector('#jv-copy') as HTMLElement & { scrollToPath(path: string): void }
    el.scrollToPath("$['a.b'][0]['c']")
    return el.shadowRoot!.querySelector('[part="row"].active')?.getAttribute('data-path')
  })
  expect(roundTrip).toBe("$['a.b'][0]['c']")
})

test('json-viewer CSS 变量在未设置 height/row-height 属性时生效', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-json-viewer'))
  const size = await page.evaluate(async () => {
    const el = document.createElement('oas-json-viewer')
    el.id = 'jv-cssvar-e2e'
    el.setAttribute('text', '{"a":{"b":1}}')
    el.style.setProperty('--oas-json-viewer-height', '240px')
    el.style.setProperty('--oas-json-viewer-row-height', '2rem')
    el.style.cssText += ';position:fixed;left:16px;top:16px;width:420px;z-index:2147483000'
    document.body.appendChild(el)
    await customElements.whenDefined('oas-json-viewer')
    const viewer = el.shadowRoot!.querySelector<HTMLElement>('[part="viewer"]')!
    const row = el.shadowRoot!.querySelector<HTMLElement>('[part="row"]')!
    return {
      viewer: viewer.getBoundingClientRect().height,
      row: row.getBoundingClientRect().height,
    }
  })
  expect(size.viewer).toBe(240)
  expect(size.row).toBe(32)
})

test('json-viewer 基础与错误态 axe 零违规', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-basic')
  await up(page, '#jv-error')
  const results = await new AxeBuilder({ page }).include('#jv-basic').include('#jv-error').analyze()
  expect(results.violations).toEqual([])
})
