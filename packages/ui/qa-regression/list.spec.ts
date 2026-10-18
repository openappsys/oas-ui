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

test('list 分组组头不占用行索引（数据行 data-index 连续、组头/分组容器是 presentation 静态条）', async ({ page }) => {
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
    const groups = Array.from(sh.querySelectorAll('[part="data-items"] .group'))
    return {
      rowIndexes: rows.map((row) => row.getAttribute('data-index')),
      rowRoles: rows.map((row) => row.getAttribute('role')),
      containerRole: sh.querySelector('[part="data-items"]')!.getAttribute('role'),
      headerRoles: headers.map((h) => h.getAttribute('role')),
      headerTabindex: headers.map((h) => h.hasAttribute('tabindex')),
      groupRoles: groups.map((g) => g.getAttribute('role')),
    }
  })
  expect(r.rowIndexes).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8'])
  // role=list 落在行容器上；组头/分组容器用 presentation 透传 owned children（required-children 合法）
  expect(r.containerRole).toBe('list')
  for (const role of r.rowRoles) expect(role).toBe('listitem')
  for (const role of r.headerRoles) expect(role).toBe('presentation')
  for (const role of r.groupRoles) expect(role).toBe('presentation')
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
  // 组件默认把行容器声明为 list，行派生 listitem；关键是不得挂交互角色（role=button 会与行内开关构成嵌套交互）
  expect(r!.role, '可点行不挂缺省 role=button（否则行内开关构成交互嵌套）').not.toBe('button')
  expect(['listitem', null], '行角色为 listitem（list 语义）或未设').toContain(r!.role)
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

test('list hoverable：属性存活 + 行打 data-hoverable 钩子 + 样式表 hover 规则走 token', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list[hoverable]')
  const r = await page.evaluate(() => {
    const el = document.querySelector('oas-list[hoverable]')!
    const items = el.querySelectorAll('oas-list-item')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    return {
      hooked: [...items].every((i) => i.hasAttribute('data-hoverable')),
      count: items.length,
      cssOk: css.includes(".list[data-hoverable='true']") && css.includes('var(--oas-color-bg-hover)'),
      selectedExcluded: css.includes(':not([selected])'),
    }
  })
  expect(r.count, 'hoverable demo 有声明式行').toBeGreaterThan(0)
  expect(r.hooked, '所有行打上 data-hoverable 钩子（Vue 下 hoverable 属性存活）').toBe(true)
  expect(r.cssOk, '样式表含 hover 规则（token 色）').toBe(true)
  expect(r.selectedExcluded, '选中行排除在 hover 规则外').toBe(true)
})

// ===== 能力缺口 D14：sortable 行拖拽排序 =====
test('list D14：sortable 拖拽派发 oas-reorder 并由宿主重排数据', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#list-sortable')
  const list = page.locator('#list-sortable')
  await list.scrollIntoViewIfNeeded()
  await page.waitForFunction(
    () =>
      document.querySelector('#list-sortable')!.shadowRoot!.querySelectorAll('[part="data-items"] oas-list-item')
        .length === 4,
  )
  const firstTitle = await list.evaluate((h) =>
    h.shadowRoot!.querySelector('[part="data-items"] oas-list-item')!.getAttribute('title'),
  )
  // JS 派发拖拽事件（原生 DnD 在自动化里难以稳定做手势，走真实事件链路验证）
  await list.evaluate((h) => {
    const rows = [...h.shadowRoot!.querySelectorAll<HTMLElement>('[part="data-items"] oas-list-item')]
    const dt = new DataTransfer()
    const fire = (type: string, target: HTMLElement) =>
      target.dispatchEvent(new DragEvent(type, { bubbles: true, composed: true, dataTransfer: dt }))
    fire('dragstart', rows[0]!)
    fire('dragover', rows[2]!)
    fire('drop', rows[2]!)
  })
  await page.waitForFunction(() =>
    (document.querySelector('#list-sortable-status')?.textContent ?? '').includes('需求评审'),
  )
  const titles = await list.evaluate((h) =>
    [...h.shadowRoot!.querySelectorAll('[part="data-items"] oas-list-item')].map((r) => r.getAttribute('title')),
  )
  expect(titles.length).toBe(4)
  expect(titles[2], '被拖行应移动到目标索引（宿主据 oas-reorder 重排）').toBe(firstTitle)
})

// ===== 整行链接（href / target）：真实点击导航 + 键盘焦点 + extra 不被覆盖层挡住 =====
test('list 链接行真实点击导航（hash 变化）+ 链接可访问名称 + extra 控件可点不误导航', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[href]')
  await page.evaluate(() => {
    document.querySelector('oas-list-item[href]')!.scrollIntoView({ block: 'center', behavior: 'instant' })
  })
  // 真实点击行标题文本区：命中覆盖 <a> → hash 导航
  await page.locator('oas-list-item[href]').first().click()
  const hash1 = await page.evaluate(() => location.hash)
  expect(hash1, '点击链接行应触发原生导航（hash 变化）').toBe('#list-anchor-demo')

  const meta = await page.evaluate(() => {
    const row = document.querySelector('oas-list-item[href]')!
    const a = row.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!
    // 链接行内 extra 控件真实点击：不应触发导航（hash 保持）
    const extraBtn = row.querySelector('[slot="extra"]') as HTMLElement | null
    return { label: a.getAttribute('aria-label'), hasExtra: !!extraBtn }
  })
  expect(meta.label, '链接 <a> 有可访问名称（行标题）').toBe('组件总览')
  expect(meta.hasExtra, '链接行 demo 应含 extra 控件').toBe(true)

  // extra 控件位于覆盖层之上：真实点击不误触导航（hash 保持不变）
  const extra = page.locator('oas-list-item[href] [slot="extra"]').first()
  await extra.click()
  const hashAfterExtra = await page.evaluate(() => location.hash)
  expect(hashAfterExtra, '点击链接行 extra 控件不得触发整行导航（覆盖层不得挡住操作区）').toBe('#list-anchor-demo')

  // 键盘：Tab 聚焦链接行内的 <a>（host 无 tabindex，焦点由内部 a 承担）
  const focusInLink = await page.evaluate(() => {
    const row = document.querySelector('oas-list-item[href]')!
    const a = row.shadowRoot!.querySelector<HTMLAnchorElement>('a.row-link')!
    a.focus()
    return document.activeElement === row && row.shadowRoot!.activeElement === a
  })
  expect(focusInLink, '键盘焦点应落在行内 <a>（host 不设 tabindex）').toBe(true)
})

test('list 前置媒体槽（icon / image）真实渲染 + 无内容隐藏', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list-item[slot="icon"], oas-list-item')
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('oas-list-item')]
    const withIcon = rows.find((row) => row.querySelector('[slot="icon"]'))
    const withImage = rows.find((row) => row.querySelector('[slot="image"]'))
    const plain = rows.find((row) => !row.querySelector('[slot="icon"], [slot="image"]'))
    const read = (row: Element, part: string) => {
      const el = row.shadowRoot!.querySelector(`[part="${part}"]`) as HTMLElement | null
      return el ? !el.hidden && el.getBoundingClientRect().width > 0 : false
    }
    return {
      iconVisible: withIcon ? read(withIcon, 'lead-icon') : null,
      imageVisible: withImage ? read(withImage, 'lead-image') : null,
      plainIconHidden: plain ? !read(plain, 'lead-icon') : null,
      plainImageHidden: plain ? !read(plain, 'lead-image') : null,
    }
  })
  expect(r.iconVisible, 'icon 槽行前置图标位可见').toBe(true)
  expect(r.imageVisible, 'image 槽行方形缩略图位可见').toBe(true)
  expect(r.plainIconHidden, '无内容行图标位隐藏').toBe(true)
  expect(r.plainImageHidden, '无内容行缩略图位隐藏').toBe(true)
})

// ===== windowed（服务端行窗口协议）：滚动请求 → 宿主回填 → 绝对行铺位 + 行数 aria =====
test('list windowed：滚动派发 oas-window-request、回填后绝对行渲染与 aria-setsize/posinset 绝对口径', async ({
  page,
}) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list')
  // 注入 windowed list：total=500、初始切片 40 行、定高视口 240 / 行高 40
  await page.evaluate(() => {
    const el = document.createElement('oas-list') as HTMLElement & {
      data: unknown[]
      shadowRoot: ShadowRoot
    }
    el.id = 'qa-windowed-list'
    el.setAttribute('role', 'list')
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0')
    el.setAttribute('height', '240')
    el.setAttribute('row-height', '40')
    const make = (start: number, len: number) => Array.from({ length: len }, (_, i) => ({ title: `行 ${start + i}` }))
    ;(el as unknown as { data: unknown[] }).data = make(0, 40)
    const w = window as unknown as {
      __winReqs: Array<{ start: number; end: number; reason: string }>
      __winMake: (s: number, n: number) => Array<{ title: string }>
    }
    w.__winReqs = []
    w.__winMake = make
    el.addEventListener('oas-window-request', (e) => {
      w.__winReqs.push((e as CustomEvent<{ start: number; end: number; reason: string }>).detail)
    })
    document.body.appendChild(el)
  })
  await page.waitForFunction(
    () =>
      (document.querySelector('#qa-windowed-list')?.shadowRoot?.querySelectorAll('[part="data-items"] oas-list-item')
        .length ?? 0) > 0,
  )

  // 滚动到绝对第 200 行附近：期望区间（半开、绝对行下标）应被派发
  const req = await page.evaluate(async () => {
    const el = document.querySelector('#qa-windowed-list')!
    const body = el.shadowRoot!.querySelector('[part="body"]') as HTMLElement
    body.scrollTop = 8000
    body.dispatchEvent(new Event('scroll'))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    const reqs = (window as unknown as { __winReqs: Array<{ start: number; end: number; reason: string }> }).__winReqs
    return reqs[reqs.length - 1] ?? null
  })
  expect(req, '滚动后应派发 oas-window-request').not.toBeNull()
  expect(req!.reason).toBe('scroll')
  expect(req!.start).toBeGreaterThan(100)
  expect(req!.end).toBeGreaterThan(req!.start)

  // 模拟宿主回填请求区间切片（window-start = 请求起点）
  await page.evaluate((r) => {
    const el = document.querySelector('#qa-windowed-list') as HTMLElement & { data: unknown[] }
    const w = window as unknown as { __winMake: (s: number, n: number) => Array<{ title: string }> }
    el.setAttribute('window-start', String(r.start))
    ;(el as unknown as { data: unknown[] }).data = w.__winMake(r.start, r.end - r.start)
  }, req!)

  // 回填后：绝对行号渲染（data-index / aria-posinset 均为全量坐标）
  await page.waitForFunction((r) => {
    const rows = [
      ...(document
        .querySelector('#qa-windowed-list')
        ?.shadowRoot?.querySelectorAll('[part="data-items"] oas-list-item') ?? []),
    ] as HTMLElement[]
    return rows.length > 0 && Number(rows[0]!.getAttribute('data-index')) >= r.start
  }, req!)

  const r = await page.evaluate(() => {
    const el = document.querySelector('#qa-windowed-list')!
    const sh = el.shadowRoot!
    const rows = [...sh.querySelectorAll<HTMLElement>('[part="data-items"] oas-list-item')]
    const top = sh.querySelector<HTMLElement>('[data-spacer="top"]')
    const bottom = sh.querySelector<HTMLElement>('[data-spacer="bottom"]')
    return {
      indexes: rows.map((row) => Number(row.getAttribute('data-index'))),
      posinset: rows.map((row) => Number(row.getAttribute('aria-posinset'))),
      setsize: rows.map((row) => row.getAttribute('aria-setsize')),
      topH: top ? parseFloat(top.style.height) : -1,
      bottomH: bottom ? parseFloat(bottom.style.height) : -1,
      rowH: rows.length ? rows[0]!.getBoundingClientRect().height : 0,
      scrollTop: (sh.querySelector('[part="body"]') as HTMLElement).scrollTop,
    }
  })
  expect(r.indexes.length, '回填后有绝对行渲染').toBeGreaterThan(0)
  // 绝对连续行号（不回到 0 起）
  expect(r.indexes).toEqual(r.indexes.map((_, i) => r.indexes[0]! + i))
  expect(Math.min(...r.indexes)).toBeGreaterThanOrEqual(req!.start)
  for (const row of r.indexes) expect(row).toBeLessThan(500)
  // aria-setsize = total；aria-posinset = 绝对行号 + 1
  expect(r.setsize.every((s) => s === '500')).toBe(true)
  expect(r.posinset).toEqual(r.indexes.map((i) => i + 1))
  // 占位 + 行 = 全量总高（500 × 40），且滚动位置未被重建清回 0
  expect(r.rowH).toBeGreaterThan(0)
  expect(r.topH + r.indexes.length * r.rowH + r.bottomH).toBe(500 * 40)
  expect(r.scrollTop).toBeGreaterThan(0)
})

// ===== a11y 角色归属：role=list 落在 shadow 内行容器，宿主不再承担 list 角色 =====
test('list a11y：windowed(height) / windowed(max-height) / 虚拟 / 分组四条路径角色归属合法（滚动容器不在 list 内）', async ({
  page,
}) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list')
  await page.evaluate(async () => {
    await customElements.whenDefined('oas-list')
    const make = (start: number, len: number) => Array.from({ length: len }, (_, i) => ({ title: `行 ${start + i}` }))
    const host = document.createElement('div')
    host.id = 'qa-list-a11y'
    document.body.appendChild(host)
    const mk = (id: string, attrs: Record<string, string>, data: unknown[], role?: string) => {
      const el = document.createElement('oas-list') as HTMLElement & { data?: unknown[] }
      el.id = id
      if (role) el.setAttribute('role', role)
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
      el.data = data
      host.appendChild(el)
    }
    mk(
      'qa-a11y-win-h',
      { windowed: '', total: '500', 'window-start': '0', height: '240', 'row-height': '40' },
      make(0, 40),
      'list',
    )
    mk(
      'qa-a11y-win-mh',
      { windowed: '', total: '500', 'window-start': '0', 'max-height': '240', 'row-height': '40' },
      make(0, 40),
      'list',
    )
    mk('qa-a11y-virtual', { height: '240', 'row-height': '40' }, make(0, 100), 'list')
    mk(
      'qa-a11y-grouped',
      { 'max-height': '240' },
      [
        { title: '甲', group: 'A' },
        { title: '乙', group: 'A' },
        { title: '丙', group: 'B' },
      ],
      'list',
    )
  })
  await page.waitForFunction(() =>
    ['qa-a11y-win-h', 'qa-a11y-win-mh', 'qa-a11y-virtual', 'qa-a11y-grouped'].every((id) => {
      const el = document.getElementById(id)
      const sh = el?.shadowRoot
      if (!sh) return false
      const virtual = sh.querySelector('oas-virtual-list') as HTMLElement | null
      const rows =
        virtual && !virtual.hidden
          ? virtual.shadowRoot!.querySelectorAll('[part="item"]')
          : sh.querySelectorAll('[part="data-items"] oas-list-item')
      return rows.length > 0
    }),
  )
  const r = await page.evaluate(() => {
    const out: Record<
      string,
      {
        hostRole: string | null
        containerRole: string | null
        rowRoles: Array<string | null>
        scrollParentOfList: boolean
        spacerHidden: boolean
        headerRoles: Array<string | null>
        groupRoles: Array<string | null>
      }
    > = {}
    for (const id of ['qa-a11y-win-h', 'qa-a11y-win-mh', 'qa-a11y-virtual', 'qa-a11y-grouped']) {
      const el = document.getElementById(id)!
      const sh = el.shadowRoot!
      const virtual = sh.querySelector('oas-virtual-list') as HTMLElement | null
      const isVirtual = !!virtual && !virtual.hidden
      const container = isVirtual
        ? virtual!.shadowRoot!.querySelector<HTMLElement>('.items')
        : sh.querySelector<HTMLElement>('[part="data-items"]')
      const rows = isVirtual
        ? [...virtual!.shadowRoot!.querySelectorAll('[part="item"]')]
        : [...sh.querySelectorAll('[part="data-items"] oas-list-item')]
      const body = sh.querySelector<HTMLElement>('[part="body"]')!
      out[id] = {
        hostRole: el.getAttribute('role'),
        containerRole: container?.getAttribute('role') ?? null,
        rowRoles: rows.slice(0, 3).map((row) => row.getAttribute('role')),
        // list 容器在滚动容器内部（滚动容器是祖先，不是 list 的 owned child）
        scrollParentOfList: isVirtual ? virtual!.parentElement === body : container?.parentElement === body,
        spacerHidden: sh.querySelector('[data-spacer="top"]')?.getAttribute('aria-hidden') === 'true',
        headerRoles: [...sh.querySelectorAll('[part="data-items"] .group-header')].map((h) => h.getAttribute('role')),
        groupRoles: [...sh.querySelectorAll('[part="data-items"] .group')].map((g) => g.getAttribute('role')),
      }
    }
    return out
  })
  for (const id of ['qa-a11y-win-h', 'qa-a11y-win-mh', 'qa-a11y-virtual', 'qa-a11y-grouped']) {
    const it = r[id]!
    expect(it.hostRole, `${id} 宿主不再保留 role=list（可聚焦滚动容器会成为非法子元素）`).toBe(null)
    expect(it.containerRole, `${id} role=list 落在行容器上`).toBe('list')
    expect(it.rowRoles.length).toBeGreaterThan(0)
    for (const role of it.rowRoles) expect(role, `${id} 行派生 listitem`).toBe('listitem')
    expect(it.scrollParentOfList, `${id} 滚动容器在 list 容器之外`).toBe(true)
    if (id === 'qa-a11y-win-h' || id === 'qa-a11y-win-mh') {
      expect(it.spacerHidden, `${id} 占位 aria-hidden（不进入 required-children）`).toBe(true)
    }
    if (id === 'qa-a11y-grouped') {
      for (const role of it.headerRoles) expect(role).toBe('presentation')
      for (const role of it.groupRoles) expect(role).toBe('presentation')
    }
  }
})

// ===== windowed 无视口：不派发全量请求 + 巨量占位；补视口后恢复正常请求 =====
test('list windowed 无视口：零请求 + 不铺 total 占位；补 max-height 后按窗口请求', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list')
  await page.evaluate(async () => {
    await customElements.whenDefined('oas-list')
    const el = document.createElement('oas-list') as HTMLElement & { data?: unknown[] }
    el.id = 'qa-no-viewport'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '500')
    el.setAttribute('row-height', '40')
    el.data = Array.from({ length: 10 }, (_, i) => ({ title: `行 ${i}` }))
    const w = window as unknown as { __nvReqs: Array<{ start: number; end: number; reason: string }> }
    w.__nvReqs = []
    el.addEventListener('oas-window-request', (e) => {
      w.__nvReqs.push((e as CustomEvent<{ start: number; end: number; reason: string }>).detail)
    })
    document.body.appendChild(el)
  })
  await page.waitForFunction(() => {
    const sh = document.getElementById('qa-no-viewport')!.shadowRoot!
    return sh.querySelectorAll('[part="data-items"] oas-list-item').length === 10
  })
  const noViewport = await page.evaluate(() => {
    const sh = document.getElementById('qa-no-viewport')!.shadowRoot!
    return {
      reqs: (window as unknown as { __nvReqs: unknown[] }).__nvReqs.length,
      toSpacer: sh.querySelectorAll('[data-spacer="top"]').length,
      bottomSpacer: sh.querySelectorAll('[data-spacer="bottom"]').length,
      rows: sh.querySelectorAll('[part="data-items"] oas-list-item').length,
    }
  })
  expect(noViewport.reqs, '无视口不派发全量区间请求').toBe(0)
  expect(noViewport.toSpacer + noViewport.bottomSpacer, '无视口不铺 total×rowH 巨量空白').toBe(0)
  expect(noViewport.rows, '已装载切片照常渲染').toBe(10)

  // 补上可测视口 → 按窗口请求 + 占位恢复
  await page.evaluate(() => document.getElementById('qa-no-viewport')!.setAttribute('max-height', '120'))
  await page.waitForFunction(() => (window as unknown as { __nvReqs: unknown[] }).__nvReqs.length > 0)
  const after = await page.evaluate(() => {
    const w = window as unknown as { __nvReqs: Array<{ start: number; end: number; reason: string }> }
    const sh = document.getElementById('qa-no-viewport')!.shadowRoot!
    return {
      req: w.__nvReqs[w.__nvReqs.length - 1]!,
      hasSpacer: sh.querySelectorAll('[data-spacer="top"]').length === 1,
    }
  })
  expect(after.req.start, '有视口后请求可算区间').toBe(0)
  expect(after.req.end).toBeGreaterThan(0)
  expect(after.req.end).toBeLessThan(500)
  expect(after.hasSpacer, '有视口后恢复占位').toBe(true)
})

// ===== M-2：window-start 越过 total（脏数据）→ 夹取 + 占位不超全量高度 =====
test('list windowed window-start 越过 total：夹取到全量末尾 + 顶部占位不超 total×rowH', async ({ page }) => {
  await page.goto('/components/list.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-list')
  await page.evaluate(async () => {
    await customElements.whenDefined('oas-list')
    const el = document.createElement('oas-list') as HTMLElement & { data?: unknown[] }
    el.id = 'qa-ws-overflow'
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '150')
    el.setAttribute('height', '120')
    el.setAttribute('row-height', '40')
    el.data = Array.from({ length: 3 }, (_, i) => ({ title: `行 ${150 + i}` }))
    document.body.appendChild(el)
  })
  // 等夹取渲染落定（顶部占位在场），不要只等 shadowRoot（shadow 建好时渲染可能未跑完）
  await page.waitForFunction(() => {
    const sh = document.getElementById('qa-ws-overflow')?.shadowRoot
    return sh?.querySelector<HTMLElement>('[data-spacer="top"]') != null
  })
  const r = await page.evaluate(() => {
    const sh = document.getElementById('qa-ws-overflow')!.shadowRoot!
    const top = sh.querySelector<HTMLElement>('[data-spacer="top"]')
    const bottom = sh.querySelector<HTMLElement>('[data-spacer="bottom"]')
    return {
      topH: top ? parseFloat(top.style.height) : -1,
      bottomH: bottom ? parseFloat(bottom.style.height) : -1,
      rows: sh.querySelectorAll('[part="data-items"] oas-list-item').length,
    }
  })
  // 不夹取会按 ws=150 铺出 6000px 的越界顶部占位；夹取后上限 = total × rowH = 4000
  expect(r.topH, '顶部占位夹到全量高度（不超过 4000）').toBeLessThanOrEqual(100 * 40)
  expect(r.topH).toBe(4000)
  expect(r.rows, '越界切片不渲染行').toBe(0)
  expect(r.bottomH).toBe(0)
  // 越界 devWarn 属 dev-only 通道（docs 为生产构建 → NODE_ENV=production 时被摇掉），e2e 不断言告警；
  // 「夹取 + devWarn 一次」由 oas-list.test.ts「M-2 window-start 越过 total」单测覆盖
  await page.evaluate(() => document.getElementById('qa-ws-overflow')?.remove())
})
