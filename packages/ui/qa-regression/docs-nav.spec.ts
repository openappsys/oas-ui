import { test, expect } from '@playwright/test'

// SPA 内部跳转（VitePress 客户端路由）回归：
// Vue 对自定义元素按「key in el」决定写 property 还是 attribute。若组件的**私有方法名与单字属性同名**
// （如 private scale() 与 scale="day"），SPA 跳转时元素已升级 → Vue 把属性写成 property → own string
// 遮蔽原型方法 → `this.scale is not a function` → demo 空白；整页刷新因升级晚于 patch 才走 attribute。
// 该用例锁定 scheduler / gantt / resource 在「表格页 → 日程 → 甘特 → 资源」的客户端跳转后仍渲染数据且无 pageerror。
test('docs SPA 跳转：gantt / resource demo 不因属性-方法撞名而空白', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  // 客户端跳转到日程
  await page.locator('a[href="/components/scheduler"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-scheduler')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.event, .res-ev, .res-bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const sched = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-scheduler')]
    return {
      path: location.pathname,
      events: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.event, .res-ev, .res-bar').length || 0), 0),
      ownView: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'view')),
    }
  })
  expect(sched.path, '客户端路由到 scheduler').toContain('/components/scheduler')
  expect(sched.events, 'scheduler demo 渲染事件').toBeGreaterThan(0)
  expect(sched.ownView, '元素上不得出现 own 属性 view').toBe(false)

  // 客户端跳转到甘特
  await page.locator('a[href="/components/gantt"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-gantt')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.bars .bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const gantt = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-gantt')]
    return {
      path: location.pathname,
      bars: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.bars .bar').length || 0), 0),
      rows: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.side-body .row-name').length || 0), 0),
      ownScale: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'scale')),
      ownExpanded: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'expanded')),
    }
  })
  expect(gantt.path, '客户端路由到 gantt').toContain('/components/gantt')
  expect(gantt.bars, 'gantt demo 渲染任务条').toBeGreaterThan(0)
  expect(gantt.rows, 'gantt demo 渲染行').toBeGreaterThan(0)
  expect(gantt.ownScale, '元素上不得出现 own 属性 scale（会遮蔽方法）').toBe(false)
  expect(gantt.ownExpanded, '元素上不得出现 own 属性 expanded（会遮蔽 Set 字段）').toBe(false)

  // 客户端跳转到资源
  await page.locator('a[href="/components/resource"]').first().click()
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('oas-resource')].some(
        (el) => (el.shadowRoot?.querySelectorAll('.lanes .row.lane .bar').length ?? 0) > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  const res = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-resource')]
    return {
      path: location.pathname,
      lanes: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.lanes .row.lane').length || 0), 0),
      bars: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.lanes .bar').length || 0), 0),
      ownScale: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'scale')),
    }
  })
  expect(res.path, '客户端路由到 resource').toContain('/components/resource')
  expect(res.lanes, 'resource demo 渲染泳道').toBeGreaterThan(0)
  expect(res.bars, 'resource demo 渲染任务条').toBeGreaterThan(0)
  expect(res.ownScale, '元素上不得出现 own 属性 scale').toBe(false)

  // 客户端跳转到菜单：items 静态 JSON attribute 在 Vue 下被写成 property（字符串）——
  // setter 若不容忍字符串会把 JSON 串逐字符当菜单项渲染（整串垃圾项）。
  // 侧栏链接可能不可见/被遮挡（locator.click 命中超时）——直接 DOM click 走同一 Vue Router 路径
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/menu"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/menu') && document.querySelectorAll('oas-menu').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const menu = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-menu')]
    const counts = els.map((el) => el.shadowRoot?.querySelectorAll('.item').length ?? 0)
    return { path: location.pathname, counts, total: counts.reduce((a, b) => a + b, 0), max: Math.max(0, ...counts) }
  })
  expect(menu.path, '客户端路由到 menu').toContain('/components/menu')
  expect(menu.total, 'menu demo 应渲染菜单项（items JSON attribute 在 SPA 下存活）').toBeGreaterThan(0)
  expect(menu.max, '单个菜单项数合理（不是 items JSON 串逐字符渲染的垃圾项）').toBeLessThan(30)

  // 客户端跳转到 rate：colors/icons 静态 JSON attribute 同类场景——property 通道收到字符串
  // 须解析生效（分段色注入 / 逐值符号渲染），不得整批回落默认（DOM click 同 menu，规避遮挡）
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/rate"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/rate') && document.querySelectorAll('oas-rate').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const rate = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-rate')]
    // icons JSON 专属产物：icons demo 第 5 星渲染 icons[4]='😍'（默认星形是 SVG 无文本）——
    // property 通道收到 JSON 字符串若被丢弃，该字符不会出现在任何星内
    const starTexts = els.flatMap((el) =>
      [...(el.shadowRoot?.querySelectorAll('.star') ?? [])].map((s) => (s.textContent ?? '').trim()),
    )
    const hasIconsJson = starTexts.some((t) => t === '\u{1F60D}')
    // colors JSON 专属产物：colors demo（value=2 × 3 段均分）命中第二段 gold →
    // --oas-preset-gold 注入（color="red" demo 是普通属性不受本 bug 影响，不作为判据）
    const activeVars = els.map((el) => (el as HTMLElement).style.getPropertyValue('--oas-rate-active'))
    const hasColorsJson = activeVars.some((v) => v.includes('--oas-preset-gold'))
    return { path: location.pathname, rates: els.length, hasIconsJson, hasColorsJson }
  })
  expect(rate.path, '客户端路由到 rate').toContain('/components/rate')
  expect(rate.rates, 'rate demo 在场').toBeGreaterThan(0)
  expect(rate.hasIconsJson, 'icons JSON attribute 应生效（逐值符号渲染）').toBe(true)
  expect(rate.hasColorsJson, 'colors JSON attribute 应生效（分段色注入）').toBe(true)

  // 客户端跳转到 index-bar：sections 静态 JSON attribute 同类场景——无 setter 的实例字段会被
  // own string 覆盖且 attribute 未写入 → 分组数据整体丢失（列表与侧栏皆空）
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/index-bar"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/index-bar') && document.querySelectorAll('oas-index-bar').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const indexBar = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-index-bar')]
    const basic = document.getElementById('ib-basic')
    const raw = basic?.getAttribute('sections') ?? null
    let parsed: unknown = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }
    return {
      path: location.pathname,
      hasBasic: basic !== null,
      isArray: Array.isArray(parsed),
      groups: Array.isArray(parsed) ? parsed.length : 0,
      sections: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.section').length || 0), 0),
      letters: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.letter').length || 0), 0),
      ownSections: els.some((el) => Object.prototype.hasOwnProperty.call(el, 'sections')),
    }
  })
  expect(indexBar.path, '客户端路由到 index-bar').toContain('/components/index-bar')
  expect(indexBar.hasBasic, 'index-bar demo 在场').toBe(true)
  expect(indexBar.isArray, 'index-bar sections 属性仍为可解析 JSON 数组').toBe(true)
  expect(indexBar.groups, 'index-bar 静态分组数 > 0').toBeGreaterThan(0)
  expect(indexBar.sections, 'index-bar 实际渲染分节 > 0（数据未丢失）').toBeGreaterThan(0)
  expect(indexBar.letters, 'index-bar 侧栏字母 > 0').toBeGreaterThan(0)
  expect(indexBar.ownSections, 'sections 走原型访问器，不得是实例 own 字段').toBe(false)

  // 客户端跳转到 cascader：value 静态 JSON attribute 在 SPA 下被写成 property（字符串）——
  // setter 若对字符串直接 `.map` 会抛/丢值（受控路径整体失效）
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/cascader"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/cascader') && document.querySelectorAll('oas-cascader').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const cascader = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-cascader')]
    const preset = els.find((el) => !el.hasAttribute('multiple') && el.hasAttribute('value')) ?? null
    const multi = document.getElementById('cs-multi')
    const read = (node: Element | null, attr: string): { ok: boolean; parsed: unknown } => {
      const raw = node?.getAttribute(attr) ?? null
      if (raw == null) return { ok: false, parsed: null }
      try {
        return { ok: true, parsed: JSON.parse(raw) }
      } catch {
        return { ok: false, parsed: null }
      }
    }
    const value = read(preset, 'value')
    const options = read(multi, 'options')
    const multiValueChecks = [...document.querySelectorAll('oas-cascader[multiple][value]')].map((el) => {
      const v = read(el, 'value')
      return Array.isArray(v.parsed) && v.parsed.length > 0 && Array.isArray(v.parsed[0])
    })
    return {
      path: location.pathname,
      cascaders: els.length,
      hasPreset: preset !== null,
      valueOk: value.ok,
      valueIsArray: Array.isArray(value.parsed),
      valueAllStrings: Array.isArray(value.parsed)
        ? value.parsed.length > 0 && value.parsed.every((v) => typeof v === 'string')
        : false,
      optionsOk: options.ok && Array.isArray(options.parsed) && (options.parsed as unknown[]).length > 0,
      multiValueNested: multiValueChecks.length > 0 && multiValueChecks.every(Boolean),
      triggerText: (preset?.shadowRoot?.querySelector('.value')?.textContent ?? '').trim(),
    }
  })
  expect(cascader.path, '客户端路由到 cascader').toContain('/components/cascader')
  expect(cascader.cascaders, 'cascader demo 在场').toBeGreaterThan(0)
  expect(cascader.hasPreset, 'cascader 预设路径 demo 在场').toBe(true)
  expect(cascader.valueOk, 'cascader value 属性为可解析 JSON').toBe(true)
  expect(cascader.valueIsArray, 'cascader value 不双重编码（单层路径数组）').toBe(true)
  expect(cascader.valueAllStrings, 'cascader value 元素为字符串路径').toBe(true)
  expect(cascader.optionsOk, 'cascader options 静态 JSON 属性存活').toBe(true)
  expect(cascader.multiValueNested, 'cascader 多选 value 为路径数组的数组').toBe(true)
  expect(cascader.triggerText, 'cascader 已选路径回显非空').not.toBe('')

  // 客户端跳转到 select：多选 value 静态 JSON attribute 同类场景——整串当单值会双重编码，
  // 选中态与标签整体丢失
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/select"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/select') && document.querySelectorAll('oas-select').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const select = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-select')]
    const multi = els.find((el) => el.hasAttribute('multiple') && el.hasAttribute('value')) ?? null
    const single = els.find((el) => !el.hasAttribute('multiple') && el.getAttribute('value') === 'banana') ?? null
    let parsed: unknown = null
    let ok = false
    if (multi) {
      try {
        parsed = JSON.parse(multi.getAttribute('value') ?? '')
        ok = true
      } catch {
        ok = false
      }
    }
    return {
      path: location.pathname,
      selects: els.length,
      hasMulti: multi !== null,
      valueOk: ok,
      valueIsArray: Array.isArray(parsed),
      allStrings: Array.isArray(parsed) ? parsed.length > 1 && parsed.every((v) => typeof v === 'string') : false,
      chips: multi?.shadowRoot?.querySelectorAll('.chip').length ?? 0,
      singleText: (single?.shadowRoot?.querySelector('.value')?.textContent ?? '').trim(),
    }
  })
  expect(select.path, '客户端路由到 select').toContain('/components/select')
  expect(select.selects, 'select demo 在场').toBeGreaterThan(0)
  expect(select.hasMulti, 'select 多选 value demo 在场').toBe(true)
  expect(select.valueOk, 'select 多选 value 属性为可解析 JSON').toBe(true)
  expect(select.valueIsArray, 'select 多选 value 不双重编码（数组）').toBe(true)
  expect(select.allStrings, 'select 多选 value 元素为字符串').toBe(true)
  expect(select.chips, 'select 多选标签数 > 1（整串单值会只剩 1 个）').toBeGreaterThan(1)
  expect(select.singleText, 'select 单选回显选项文案').toContain('香蕉')

  // 客户端跳转到 toggle-group：多选 value 静态 JSON attribute 同类场景——
  // 双重编码后选中集对不上任何按钮，选中态为空
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/toggle-group"]')!.click())
  await page.waitForFunction(
    () =>
      location.pathname.includes('/components/toggle-group') &&
      document.querySelectorAll('oas-toggle-group').length > 0,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const toggleGroup = await page.evaluate(() => {
    const els = [...document.querySelectorAll('oas-toggle-group')]
    const multi = document.getElementById('tg-controlled-multi')
    const single = document.getElementById('tg-single')
    const read = (node: Element | null, attr: string): unknown => {
      try {
        return JSON.parse(node?.getAttribute(attr) ?? 'null')
      } catch {
        return null
      }
    }
    const value = read(multi, 'value')
    const items = read(single, 'items')
    return {
      path: location.pathname,
      groups: els.length,
      multiValueIsArray: Array.isArray(value),
      multiValue: Array.isArray(value) ? value : [],
      checked: multi?.shadowRoot?.querySelectorAll('.item[aria-checked="true"]').length ?? 0,
      singleItems: Array.isArray(items) ? items.length : 0,
      buttons: els.reduce((n, el) => n + (el.shadowRoot?.querySelectorAll('.item').length || 0), 0),
    }
  })
  expect(toggleGroup.path, '客户端路由到 toggle-group').toContain('/components/toggle-group')
  expect(toggleGroup.groups, 'toggle-group demo 在场').toBeGreaterThan(0)
  expect(toggleGroup.multiValueIsArray, 'toggle-group 多选 value 属性为可解析 JSON 数组').toBe(true)
  expect(toggleGroup.multiValue, 'toggle-group 多选 value 不双重编码').toEqual(['bold'])
  expect(toggleGroup.checked, 'toggle-group 多选选中态 > 0（bold 被选中）').toBeGreaterThan(0)
  expect(toggleGroup.singleItems, 'toggle-group items 静态 JSON 属性存活').toBeGreaterThan(0)
  expect(toggleGroup.buttons, 'toggle-group 按钮渲染 > 0').toBeGreaterThan(0)

  // 客户端跳转到 slider：range 静态 value="[20, 80]" 同类场景——整体走 `Number(v) || 0`
  // 会把 JSON 串变 0，双把手归零；须解析为数值数组并保持两滑块位置
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/slider"]')!.click())
  await page.waitForFunction(
    () => {
      if (!location.pathname.includes('/components/slider')) return false
      const el = document.getElementById('slider-range')
      return !!el?.shadowRoot?.querySelector('input[data-role="range-min"]')
    },
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const slider = await page.evaluate(() => {
    const el = document.getElementById('slider-range')
    const raw = el?.getAttribute('value') ?? null
    let parsed: unknown = null
    let ok = false
    try {
      parsed = raw == null ? null : JSON.parse(raw)
      ok = Array.isArray(parsed)
    } catch {
      ok = false
    }
    const thumb = (role: string) =>
      el?.shadowRoot?.querySelector<HTMLInputElement>(`input[data-role="${role}"]`)?.value ?? null
    return {
      path: location.pathname,
      sliders: document.querySelectorAll('oas-slider').length,
      hasRange: el !== null,
      valueOk: ok,
      value: Array.isArray(parsed) ? parsed : [],
      lo: thumb('range-min'),
      hi: thumb('range-max'),
      ownValue: el ? Object.prototype.hasOwnProperty.call(el, 'value') : null,
    }
  })
  expect(slider.path, '客户端路由到 slider').toContain('/components/slider')
  expect(slider.sliders, 'slider demo 在场').toBeGreaterThan(0)
  expect(slider.hasRange, 'slider range 预设值 demo 在场').toBe(true)
  expect(slider.valueOk, 'slider range value 属性为可解析 JSON 数组').toBe(true)
  expect(slider.value, 'slider range value 不双重编码（两个数值）').toEqual([20, 80])
  expect([slider.lo, slider.hi], 'slider range 两滑块值非默认（20 / 80）').toEqual(['20', '80'])
  expect(slider.ownValue, 'value 走原型访问器，不得是实例 own 字段').toBe(false)

  // 客户端跳转到 tree-select：多选静态 value='["js"]' 同类场景——整串当单值会双重编码，
  // chip 文本退化为 JSON 串
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/tree-select"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/tree-select') && document.getElementById('ts-cache') !== null,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const treeSelect = await page.evaluate(() => {
    const el = document.getElementById('ts-cache')
    const raw = el?.getAttribute('value') ?? null
    let parsed: unknown = null
    let ok = false
    try {
      parsed = raw == null ? null : JSON.parse(raw)
      ok = Array.isArray(parsed)
    } catch {
      ok = false
    }
    const chips = [...(el?.shadowRoot?.querySelectorAll('.chip:not(.chip-plus)') ?? [])].map((c) =>
      (c.textContent ?? '').trim(),
    )
    return {
      path: location.pathname,
      treeSelects: document.querySelectorAll('oas-tree-select').length,
      hasCache: el !== null,
      valueOk: ok,
      value: Array.isArray(parsed) ? parsed : [],
      chips,
      ownValue: el ? Object.prototype.hasOwnProperty.call(el, 'value') : null,
    }
  })
  expect(treeSelect.path, '客户端路由到 tree-select').toContain('/components/tree-select')
  expect(treeSelect.treeSelects, 'tree-select demo 在场').toBeGreaterThan(0)
  expect(treeSelect.hasCache, 'tree-select 多选 JSON value demo 在场').toBe(true)
  expect(treeSelect.valueOk, 'tree-select 多选 value 属性为可解析 JSON 数组').toBe(true)
  expect(treeSelect.value, 'tree-select 多选 value 不双重编码').toEqual(['js'])
  expect(treeSelect.chips, 'tree-select 多选 chip 数正确').toHaveLength(1)
  expect(treeSelect.chips[0], 'tree-select chip 文本非 JSON 串').not.toContain('[')
  expect(treeSelect.chips[0], 'tree-select chip 文本非 JSON 串（无引号）').not.toContain('"')
  expect(treeSelect.chips[0], 'tree-select chip 文本非空').not.toBe('')
  expect(treeSelect.ownValue, 'value 走原型访问器，不得是实例 own 字段').toBe(false)

  // 客户端跳转到 combobox：多选 property 通道收 JSON 字符串（Vue 静态属性写法同路径）。
  // 文档站没有「多选 + 静态 value」demo，这里对现有多选 demo 直接写 property 字符串复现同通道。
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/combobox"]')!.click())
  await page.waitForFunction(
    () => location.pathname.includes('/components/combobox') && document.getElementById('cb-multi') !== null,
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const combobox = await page.evaluate(() => {
    // 页面上下文里自定义元素的 value 是原型访问器，HTMLElement 类型未声明，显式补类型
    const el = document.getElementById('cb-multi') as (HTMLElement & { value: unknown }) | null
    const optionsRaw = el?.getAttribute('options') ?? null
    let optionsParsed: unknown = null
    let optionsOk = false
    try {
      optionsParsed = optionsRaw == null ? null : JSON.parse(optionsRaw)
      optionsOk = Array.isArray(optionsParsed) && optionsParsed.length > 0
    } catch {
      optionsOk = false
    }
    // 模拟框架把静态 value JSON attribute 写成 property（字符串）
    if (el) el.value = '["apple","banana"]'
    const raw = el?.getAttribute('value') ?? null
    let parsed: unknown = null
    let ok = false
    try {
      parsed = raw == null ? null : JSON.parse(raw)
      ok = Array.isArray(parsed)
    } catch {
      ok = false
    }
    const chips = [...(el?.shadowRoot?.querySelectorAll('.chip .chip-label') ?? [])].map((n) =>
      (n.textContent ?? '').trim(),
    )
    return {
      path: location.pathname,
      comboboxes: document.querySelectorAll('oas-combobox').length,
      hasMulti: el !== null,
      optionsOk,
      valueOk: ok,
      value: Array.isArray(parsed) ? parsed : [],
      chips,
      ownValue: el ? Object.prototype.hasOwnProperty.call(el, 'value') : null,
    }
  })
  expect(combobox.path, '客户端路由到 combobox').toContain('/components/combobox')
  expect(combobox.comboboxes, 'combobox demo 在场').toBeGreaterThan(0)
  expect(combobox.hasMulti, 'combobox 多选 demo 在场').toBe(true)
  expect(combobox.optionsOk, 'combobox options 静态 JSON 属性存活').toBe(true)
  expect(combobox.valueOk, 'combobox 多选 value 属性为可解析 JSON 数组').toBe(true)
  expect(combobox.value, 'combobox 多选 value 不双重编码（数组）').toEqual(['apple', 'banana'])
  expect(combobox.chips, 'combobox 多选 chip 数/文本正确').toEqual(['苹果', '香蕉'])
  expect(combobox.ownValue, 'value 走原型访问器，不得是实例 own 字段').toBe(false)

  // 客户端跳转到 splitter：sizes 文档写法是逗号分隔百分比（30,40,30），SPA 下会被写成
  // property 字符串。setter 若只收 JSON 数组会把合法 CSV 判非法并覆盖 attribute 为均分——
  // 表现为「attribute 还在、比例却是 33/33/33」。同时锁定实际 pane flex 比例与 SSR 基线一致。
  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('a[href="/components/splitter"]')!.click())
  await page.waitForFunction(
    () =>
      location.pathname.includes('/components/splitter') &&
      [...document.querySelectorAll('oas-splitter')].some((el) => el.children.length >= 3 && el.hasAttribute('sizes')),
    undefined,
    { timeout: 20000 },
  )
  await page.waitForTimeout(500)
  const splitter = await page.evaluate(() => {
    const el =
      [...document.querySelectorAll('oas-splitter')].find((n) => n.children.length >= 3 && n.hasAttribute('sizes')) ??
      null
    const raw = el?.getAttribute('sizes') ?? ''
    let attrSizes: number[] = []
    try {
      const parsed: unknown = raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',').map((s) => Number(s.trim()))
      if (Array.isArray(parsed)) attrSizes = parsed.map((n) => Number(n))
    } catch {
      attrSizes = []
    }
    const panes = [...(el?.shadowRoot?.querySelectorAll<HTMLElement>('.pane') ?? [])]
    let fixed = 0
    const paneSizes = panes
      .map((p) => {
        const m = /^0\s+0\s+([\d.]+)%$/.exec((p.style.flex || '').trim())
        if (!m) return null
        const v = Number(m[1])
        fixed += v
        return v
      })
      .map((v) => v ?? Math.max(0, 100 - fixed))
    return {
      path: location.pathname,
      hasMulti: el !== null,
      attrSizes,
      paneSizes,
      ownSizes: el ? Object.prototype.hasOwnProperty.call(el, 'sizes') : null,
    }
  })
  expect(splitter.path, '客户端路由到 splitter').toContain('/components/splitter')
  expect(splitter.hasMulti, 'splitter 首个多面板 sizes demo 在场').toBe(true)
  expect(splitter.attrSizes, 'splitter sizes attribute 归一后仍为 30/40/30（不得被覆盖成均分）').toEqual([30, 40, 30])
  expect(splitter.paneSizes, 'splitter 实际 pane flex 比例与 SSR 基线一致（30/40/30）').toEqual([30, 40, 30])
  expect(splitter.ownSizes, 'sizes 走原型访问器，不得是实例 own 字段').toBe(false)

  expect(errors, 'console/page 零 error').toEqual([])
})
