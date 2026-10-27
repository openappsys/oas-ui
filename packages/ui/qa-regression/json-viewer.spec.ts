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

test('json-viewer toolbar=false 工具栏隐藏且复制反馈浮层可见', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-compact')
  const display = await page.evaluate(
    () =>
      getComputedStyle(document.querySelector('#jv-compact')!.shadowRoot!.querySelector('[part="toolbar"]')!).display,
  )
  expect(display).toBe('none')
  const flash = await page.evaluate(async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true })
    const el = document.querySelector('#jv-compact') as HTMLElement & { copyPath(path: string): Promise<boolean> }
    const ok = await el.copyPath('$')
    const node = el.shadowRoot!.querySelector<HTMLElement>('[part="copy-status"]')!
    return { ok, hidden: node.hidden, text: node.textContent }
  })
  expect(flash.ok).toBe(true)
  expect(flash.hidden).toBe(false)
  expect(flash.text).toBeTruthy()
})

test('json-viewer 基础与错误态 axe 零违规', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-basic')
  await up(page, '#jv-error')
  const results = await new AxeBuilder({ page }).include('#jv-basic').include('#jv-error').analyze()
  expect(results.violations).toEqual([])
})

test('json-viewer 自定义展开/收起模板：带框 +/- 切换且叶节点无图标', async ({ page }) => {
  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-json-viewer'))
  await page.evaluate(() => {
    const el = document.createElement('oas-json-viewer')
    el.id = 'qa-jv-toggle'
    el.setAttribute('text', '{"name":"Ada","nested":{"ok":true}}')
    el.setAttribute('default-expand-depth', '0')
    const collapsed = document.createElement('template')
    collapsed.setAttribute('slot', 'toggle-collapsed')
    collapsed.innerHTML =
      '<span class="qa-toggle-icon" part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1px solid currentColor;border-radius:3px">+</span>'
    const expanded = document.createElement('template')
    expanded.setAttribute('slot', 'toggle-expanded')
    expanded.innerHTML =
      '<span class="qa-toggle-icon" part="toggle-icon" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1px solid currentColor;border-radius:3px">−</span>'
    el.append(collapsed, expanded)
    document.body.appendChild(el)
  })
  const root = page.locator('#qa-jv-toggle [part="row"]').first()
  await expect(root.locator('.qa-toggle-icon')).toHaveText('+')
  await expect(root.locator('.qa-toggle-icon')).toHaveCSS('border-top-width', '1px')
  await root.click()
  await expect(root.locator('.qa-toggle-icon')).toHaveText('−')
  await expect(page.locator('#qa-jv-toggle [data-container="false"]').first().locator('.qa-toggle-icon')).toHaveCount(0)

  // 实际 demo：dark / RTL / ::part 覆盖都要真实生效，不能只验证动态 fixture
  await up(page, '#jv-custom-toggle')
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const demoRoot = page.locator('#jv-custom-toggle [part="row"]').first()
  const demoIcon = demoRoot.locator('[part="toggle-icon"]')
  await expect(demoIcon).toHaveText('+')
  await expect(demoIcon).toBeVisible()
  await page.addStyleTag({ content: '#jv-custom-toggle::part(toggle-icon){border-color:rgb(255, 0, 0) !important}' })
  await expect(demoIcon).toHaveCSS('border-top-color', 'rgb(255, 0, 0)')
  await demoRoot.click()
  await expect(demoRoot.locator('[part="toggle-icon"]')).toHaveText('−')
  await page.evaluate(() => (document.documentElement.dir = 'rtl'))
  await expect(demoRoot.locator('[part="toggle-icon"]')).toBeVisible()
  await page.evaluate(() => document.querySelector('#qa-jv-toggle')?.remove())
})

test('json-viewer 滚动复用行 DOM：同窗口保留节点，跨窗口/键盘/搜索不退化，console 零告警', async ({ page }) => {
  const badWarns: string[] = []
  const allow = [
    /net::ERR_/,
    /Failed to load resource/,
    /hydrating/,
    /cookie .*overwritten/i,
    /scroll-linked positioning effect/i,
  ]
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
      badWarns.push(`${m.type()}: ${m.text()}`)
    }
  })
  page.on('pageerror', (e) => badWarns.push(`pageerror: ${e.message}`))

  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#jv-large')
  await page.waitForFunction(
    () => (document.querySelector('#jv-large')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )

  // 同窗口小幅滚动：窗口 start/end 未变时必须复用行 DOM（节点身份不变）
  const sameWindow = await page.evaluate(() => {
    const root = document.querySelector('#jv-large')!.shadowRoot!
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
    const row = root.querySelector<HTMLElement>('[part="row"]')!
    const rowH = row.getBoundingClientRect().height
    const viewportH = viewport.clientHeight || viewport.getBoundingClientRect().height
    const band = (value: number): number => ((value % rowH) + rowH) % rowH
    let base = 0
    let delta = 0
    // 偏移落在行中部时，小幅滚动不会跨 start/end 边界
    for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7, 0.45, 0.55, 0.35, 0.65]) {
      const offset = rowH * fraction
      const candidate = 24 * rowH + offset
      const bottom = band(candidate + viewportH)
      if (offset > rowH * 0.15 && rowH - offset > rowH * 0.15 && bottom > rowH * 0.2 && rowH - bottom > rowH * 0.2) {
        base = candidate
        delta = Math.min(offset, rowH - offset, bottom, rowH - bottom) * 0.5
        break
      }
    }
    if (!delta) throw new Error('无法构造同窗口滚动幅度')
    viewport.scrollTop = base
    viewport.dispatchEvent(new Event('scroll'))
    const first = root.querySelector('[part="row"]')
    const paths = [...root.querySelectorAll('[part="row"]')].map((node) => node.getAttribute('data-path'))
    viewport.scrollTop = base + delta
    viewport.dispatchEvent(new Event('scroll'))
    const after = root.querySelector('[part="row"]')
    return {
      sameNode: first !== null && first === after,
      stablePaths:
        JSON.stringify(paths) ===
        JSON.stringify([...root.querySelectorAll('[part="row"]')].map((node) => node.getAttribute('data-path'))),
      rowCount: paths.length,
      delta,
    }
  })
  expect(sameWindow.rowCount).toBeGreaterThan(0)
  expect(sameWindow.stablePaths, '同窗口滚动内容应完全一致').toBe(true)
  expect(sameWindow.sameNode, `同窗口滚动 delta=${sameWindow.delta}px 应保留行 DOM 节点`).toBe(true)

  // 跨窗口滚动：内容与活动指针都要更新，不能复用陈旧 DOM
  const crossWindow = await page.evaluate(() => {
    const root = document.querySelector('#jv-large')!.shadowRoot!
    const viewport = root.querySelector<HTMLElement>('[part="viewport"]')!
    viewport.scrollTop = viewport.scrollHeight / 2
    viewport.dispatchEvent(new Event('scroll'))
    const activeId = viewport.getAttribute('aria-activedescendant')
    return {
      first: root.querySelector('[part="row"]')?.getAttribute('data-path'),
      rows: root.querySelectorAll('[part="row"]').length,
      activePointerValid: activeId == null || root.getElementById(activeId) != null,
    }
  })
  expect(crossWindow.rows).toBeGreaterThan(0)
  expect(crossWindow.first).not.toBe('$')
  expect(crossWindow.activePointerValid).toBe(true)

  // 键盘：活动行与 aria-activedescendant 仍同步
  const viewport = page.locator('#jv-large [part="viewport"]')
  await viewport.focus()
  const activeBefore = await page.evaluate(() =>
    document.querySelector('#jv-large')!.shadowRoot!.querySelector('[part="row"].active')?.getAttribute('data-path'),
  )
  await page.keyboard.press('ArrowDown')
  const keyboard = await page.evaluate(() => {
    const root = document.querySelector('#jv-large')!.shadowRoot!
    const active = root.querySelector('[part="row"].active')
    const activeId = root.querySelector('[part="viewport"]')!.getAttribute('aria-activedescendant')
    return {
      activePath: active?.getAttribute('data-path'),
      visible: !!active,
      resolved: activeId ? root.getElementById(activeId)?.getAttribute('data-path') : null,
    }
  })
  expect(keyboard.activePath).not.toBe(activeBefore)
  expect(keyboard.visible, '活动行必须在虚拟窗口内可见').toBe(true)
  expect(keyboard.resolved).toBe(keyboard.activePath)

  // 搜索 next：可见 active 行与计数同步
  await up(page, '#jv-search')
  await page.waitForFunction(
    () => (document.querySelector('#jv-search')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )
  const countBefore = await page.evaluate(
    () => document.querySelector('#jv-search')!.shadowRoot!.querySelector('[part="count"]')?.textContent ?? '',
  )
  await page.locator('#jv-search [part="next"]').click()
  const search = await page.evaluate(() => {
    const root = document.querySelector('#jv-search')!.shadowRoot!
    const active = root.querySelector('[part="row"].active')
    const activeId = root.querySelector('[part="viewport"]')!.getAttribute('aria-activedescendant')
    return {
      count: root.querySelector('[part="count"]')?.textContent ?? '',
      activePath: active?.getAttribute('data-path'),
      visible: !!active,
      resolved: activeId ? root.getElementById(activeId)?.getAttribute('data-path') : null,
    }
  })
  expect(countBefore).toMatch(/^\d+\/\d+$/)
  expect(search.count).toMatch(/^\d+\/\d+$/)
  expect(search.count).not.toBe(countBefore)
  expect(search.visible, '搜索 next 后活动命中行必须可见').toBe(true)
  expect(search.resolved).toBe(search.activePath)
  expect(search.activePath).toBeTruthy()

  expect(badWarns, `console/page 零新增 error/warning：${badWarns.join(' | ')}`).toEqual([])
})

test('json-viewer 纯滚动下自定义 toggle 模板新增/原地更新/移除都刷新（真实 Chromium）', async ({ page }) => {
  const badWarns: string[] = []
  const allow = [
    /net::ERR_/,
    /Failed to load resource/,
    /hydrating/,
    /cookie .*overwritten/i,
    /scroll-linked positioning effect/i,
  ]
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !allow.some((re) => re.test(m.text()))) {
      badWarns.push(`${m.type()}: ${m.text()}`)
    }
  })
  page.on('pageerror', (e) => badWarns.push(`pageerror: ${e.message}`))

  await page.goto('/components/json-viewer.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!customElements.get('oas-json-viewer'))
  await page.evaluate(() => {
    const el = document.createElement('oas-json-viewer')
    el.id = 'qa-jv-toggle-scroll'
    el.setAttribute('text', JSON.stringify(Array.from({ length: 60 }, (_, i) => i)))
    el.setAttribute('height', '140')
    el.setAttribute('row-height', '20')
    el.style.cssText = 'position:fixed;left:16px;top:16px;width:420px;z-index:2147483000'
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-jv-toggle-scroll')?.shadowRoot?.querySelectorAll('[part="row"]').length ?? 0) > 0,
  )
  const icon = page.locator('#qa-jv-toggle-scroll [part="toggle-icon"]')
  await expect(icon).toHaveCount(0)

  // 无属性/方法调用，只有 scroll 事件：新增模板后图标必须出现
  await page.evaluate(() => {
    const el = document.querySelector('#qa-jv-toggle-scroll')!
    const template = document.createElement('template')
    template.setAttribute('slot', 'toggle-expanded')
    template.innerHTML = '<span part="toggle-icon">-</span>'
    el.append(template)
    el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!.dispatchEvent(new Event('scroll'))
  })
  await expect(icon.first()).toHaveText('-')
  await expect(icon.first()).toBeVisible()

  // 原地改 template.content：纯 scroll 后文本更新
  await page.evaluate(() => {
    const el = document.querySelector('#qa-jv-toggle-scroll')!
    el.querySelector('template[slot="toggle-expanded"]')!.innerHTML =
      '<span part="toggle-icon" style="display:inline-block">+</span>'
    el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!.dispatchEvent(new Event('scroll'))
  })
  await expect(icon.first()).toHaveText('+')

  // 移除模板：纯 scroll 后自定义图标消失，回落默认三角形
  await page.evaluate(() => {
    const el = document.querySelector('#qa-jv-toggle-scroll')!
    el.querySelector('template[slot="toggle-expanded"]')!.remove()
    el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!.dispatchEvent(new Event('scroll'))
  })
  await expect(icon).toHaveCount(0)
  const twisty = await page.evaluate(() => {
    const root = document.querySelector('#qa-jv-toggle-scroll')!.shadowRoot!
    const node = root.querySelector<HTMLElement>('[part="row"] .twisty')!
    return { custom: node.getAttribute('data-custom'), text: node.textContent }
  })
  expect(twisty.custom).toBeNull()
  expect(twisty.text).toBe('')

  expect(badWarns, `console/page 零新增 error/warning：${badWarns.join(' | ')}`).toEqual([])
})
