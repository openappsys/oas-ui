// 复核回归：tree——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('tree 虚拟滚动渲染真实 label 且行样式生效', async ({ page }) => {
  // 曾现 bug1：virtual-list 先写 String(item) 兜底文本再派发 oas-item，[object Object] 与真实行并存。
  // 曾现 bug2：虚拟行样式写在 tree 的 shadow 里用 `oas-virtual-list::part(item) .row` 选择器，
  //           ::part 后不支持链后代选择器 → 全部静默失效（裸按钮、leaf 占位符外露）。
  //           修复为注入 VIRTUAL_ROW_STYLE 到 vlist 的 shadow root。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-virtual')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-virtual')!
    const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
    const vroot = vlist.shadowRoot!
    const items = [...vroot.querySelectorAll('[part=item]')]
    const firstRow = items[0]?.querySelector('.row')
    const toggle = firstRow?.querySelector('.toggle')
    const leafToggle = items[1]?.querySelector('.toggle.leaf')
    const viewport = vroot.querySelector('[part=viewport]')!
    return {
      hasObjectObject: items.some((el) => el.textContent?.includes('[object Object')),
      firstLabel: firstRow?.querySelector('.label')?.textContent ?? '',
      styleInjected: !!vroot.querySelector('style[data-oas-tree-rows]'),
      rowDisplay: firstRow ? getComputedStyle(firstRow).display : '',
      toggleBorder: toggle ? getComputedStyle(toggle).borderStyle : '',
      leafVisibility: leafToggle ? getComputedStyle(leafToggle).visibility : '',
      // 曾现 bug3：height 属性只用于窗口计算，视口 height:100% 被撑高容器拉到 16 万 px
      viewportHeight: viewport.getBoundingClientRect().height,
      viewportScrollable: viewport.scrollHeight > viewport.clientHeight,
    }
  })
  expect(r.hasObjectObject).toBe(false)
  expect(r.firstLabel).toContain('节点')
  expect(r.styleInjected).toBe(true)
  expect(r.rowDisplay).toBe('flex')
  expect(r.toggleBorder).toBe('none')
  expect(r.leafVisibility).toBe('hidden')
  expect(r.viewportHeight).toBe(360)
  expect(r.viewportScrollable).toBe(true)
  // hover 背景（Playwright CSS 选择器自动穿透 open shadow DOM）
  const firstRow = page.locator('#tree-virtual oas-virtual-list [part=item] .row').first()
  await firstRow.hover()
  await page.waitForTimeout(200)
  const hoverBg = await firstRow.evaluate((row) => getComputedStyle(row).backgroundColor)
  expect(hoverBg).not.toBe('rgba(0, 0, 0, 0)')
})

test('tree 虚拟列表滚轮增量滚动正常（overflow-anchor 回归）', async ({ page }) => {
  // 曾现 bug：同 virtual-list——tree 虚拟模式复用 oas-virtual-list，滚轮一下直接滚到底。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-virtual')
  await page.waitForTimeout(800)
  await page.locator('#tree-virtual').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-virtual')!
    const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
    const vp = vlist.shadowRoot!.querySelector('[part=viewport]')!
    const br = vp.getBoundingClientRect()
    return { x: br.x, y: br.y, w: br.width, h: br.height }
  })
  await page.mouse.move(r.x + r.w / 2, r.y + 20)
  const scrollTop = () =>
    page.evaluate(() => {
      const tree = document.querySelector('#tree-virtual')!
      const vlist = tree.shadowRoot!.querySelector('oas-virtual-list')!
      return vlist.shadowRoot!.querySelector('[part=viewport]')!.scrollTop
    })
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s1 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s2 = await scrollTop()
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(300)
  const s3 = await scrollTop()
  expect(s1).toBeGreaterThanOrEqual(100)
  expect(s2 - s1).toBeGreaterThanOrEqual(100)
  expect(s3 - s2).toBeGreaterThanOrEqual(100)
  expect(s2 - s1).toBeLessThanOrEqual(240)
  expect(s3 - s2).toBeLessThanOrEqual(240)
})

test('tree 自定义节点模板 + oas-node-render 渲染真实内容且 ARIA 保持', async ({ page }) => {
  // 曾现缺口：tree 无自定义渲染能力，图标/富文本必须走宿主整段替换方案；
  // 本次补 template[slot="node"] / template[slot="toggle"] 骨架 + oas-node-render 事件。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-custom')
  await page.waitForTimeout(600)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    const row = tree.shadowRoot!.querySelector('[part="row"]')!
    const label = row.querySelector('.label')!
    const toggle = row.querySelector('[part="toggle"]')!
    const glyph = label.querySelector('svg.node-demo-glyph') as SVGSVGElement | null
    const binder = label.querySelector('[data-node-label]') as HTMLElement | null
    return {
      glyph: !!glyph,
      glyphW: glyph ? Math.round(glyph.getBoundingClientRect().width) : null,
      boundText: binder?.textContent ?? '',
      labelW: binder ? Math.round(binder.getBoundingClientRect().width) : null,
      badge: label.querySelector('.node-demo-count')?.textContent ?? '',
      rowRole: row.getAttribute('role'),
      rowLevel: row.getAttribute('aria-level'),
      toggleTag: toggle?.tagName ?? '',
      toggleExpanded: toggle?.getAttribute('aria-expanded') ?? '',
    }
  })
  // 骨架模板渲染：图标 + [data-node-label] 绑定 + 徽标（oas-node-render 写入）
  expect(r.glyph, '自定义节点应渲染骨架图标').toBe(true)
  expect(r.glyphW, 'SVG glyph 应有显式 width 属性（14px），不能撑满容器').toBeGreaterThan(0)
  expect(r.glyphW, 'SVG glyph 渲染宽应 ≤32px（14 + 余量）').toBeLessThanOrEqual(32)
  expect(r.boundText).toBe('项目 A')
  expect(r.labelW, '[data-node-label] 文字宽度应 > 0（不被 flex 压成 0 宽）').toBeGreaterThan(0)
  expect(r.badge).toContain('3')
  // ARIA 在自定义渲染下保持
  expect(r.rowRole).toBe('treeitem')
  expect(r.rowLevel).toBe('1')
  expect(r.toggleTag, '展开按钮应为原生 button（键盘 Enter/Space 可达）').toBe('BUTTON')
  expect(r.toggleExpanded).toBe('true')
  // 展开按钮点击 → aria-expanded 翻转（自定义 toggle 模板下键盘/ARIA 不丢）
  await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    ;(tree.shadowRoot!.querySelector('[part="toggle"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('#tree-custom')!
        .shadowRoot!.querySelector('[part="toggle"]')
        ?.getAttribute('aria-expanded') === 'false',
    null,
    { timeout: 5000 },
  )
})

test('tree slot 模板：Vue CSR 直插形态（insertBefore 到模板自身、content 为空）也能克隆渲染', async ({
  page,
}) => {
  // 回归：dev（Vue CSR 挂载）下 insertBefore 直插 template 元素，子节点落在元素自身 childNodes、
  // content 为空（Chromium 不转发进 content），曾致 #tree-custom 自定义节点行空白；preview 走
  // SSR 快照 content 有值所以正常。此处用 insertBefore 在真实 Chromium 复现 CSR 形态。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  // 先等 ui bundle 加载完成（oas-tree 已注册），保证动态创建的元素立即 upgrade
  await up(page, '#tree-custom')
  await page.evaluate(() => {
    const wrap = document.createElement('div')
    wrap.innerHTML = `<oas-tree id="tree-csr-slot" data='[{"key":"a","label":"CSR 节点"}]'></oas-tree>`
    document.body.appendChild(wrap)
    const tree = document.querySelector('#tree-csr-slot')!
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'node')
    const glyph = document.createElement('svg')
    glyph.setAttribute('class', 'csr-glyph')
    const binder = document.createElement('span')
    binder.setAttribute('data-node-label', '')
    // Vue runtime-dom 的 insert 实现即 parent.insertBefore(child, anchor)
    tpl.insertBefore(glyph, null)
    tpl.insertBefore(binder, null)
    tree.appendChild(tpl)
    // 模板就位后触发 update 重建行（与 demo onMounted 重刷同路径）
    tree.setAttribute('data', tree.getAttribute('data')!)
  })
  await up(page, '#tree-csr-slot')
  await page.waitForTimeout(200)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-csr-slot')!
    const label = tree.shadowRoot!.querySelector('[part="row"] .label')!
    return {
      glyph: !!label.querySelector('svg.csr-glyph'),
      boundText: label.querySelector('[data-node-label]')?.textContent ?? '',
    }
  })
  expect(r.glyph, 'CSR 直插形态应克隆骨架图标').toBe(true)
  expect(r.boundText).toBe('CSR 节点')
})

test('tree 目录模式：文件夹/文件图标、展开态切换与 ARIA', async ({ page }) => {
  // 曾现缺口：tree 无目录模式，文件浏览器场景需宿主自绘整行；
  // 本次补 directory 属性：children/isLeaf 判定目录/文件，文件夹按展开态换图标。
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-dir')
  await page.waitForTimeout(600)
  const kinds = () =>
    page.evaluate(() => {
      const tree = document.querySelector('#tree-dir')!
      return [...tree.shadowRoot!.querySelectorAll('[part="row"]')].map((row) => ({
        kind: row.querySelector('[part="node-icon"]')?.getAttribute('data-kind') ?? '',
        iconHidden: row.querySelector('[part="node-icon"]')?.getAttribute('aria-hidden') ?? '',
        ariaExpanded: row.querySelector('[part="toggle"]')?.getAttribute('aria-expanded') ?? '',
        label: row.querySelector('.label')?.textContent ?? '',
      }))
    })
  const rows = await kinds()
  // src(folder-open，expanded 初始含 src) components(folder) index.ts(file) …
  expect(rows[0]!.label).toBe('src')
  expect(rows[0]!.kind, '已展开文件夹应为 folder-open').toBe('folder-open')
  expect(rows[1]!.label).toBe('components')
  expect(rows[1]!.kind, '未展开文件夹应为 folder').toBe('folder')
  expect(rows[2]!.label).toBe('index.ts')
  expect(rows[2]!.kind, 'isLeaf 节点应为 file').toBe('file')
  expect(rows[0]!.iconHidden, '目录图标应为纯装饰（aria-hidden）').toBe('true')
  expect(rows[1]!.ariaExpanded).toBe('false')
  // 点击 components 展开按钮 → 图标切 folder-open 且子文件出现
  await page.evaluate(() => {
    const tree = document.querySelector('#tree-dir')!
    const row = [...tree.shadowRoot!.querySelectorAll('[part="row"]')][1]!
    ;(row.querySelector('[part="toggle"]') as HTMLElement).click()
  })
  await page.waitForFunction(
    () => {
      const tree = document.querySelector('#tree-dir')!
      const row = [...tree.shadowRoot!.querySelectorAll('[part="row"]')][1]!
      return row.querySelector('[part="node-icon"]')?.getAttribute('data-kind') === 'folder-open'
    },
    null,
    { timeout: 5000 },
  )
  const expanded = await kinds()
  expect(expanded[1]!.ariaExpanded).toBe('true')
  expect(
    expanded.some((r) => r.label === 'tree.tsx' && r.kind === 'file'),
    '展开后子文件行应出现且为 file 图标',
  ).toBe(true)
})

test('tree 自定义节点：#tree-custom 每行 .label 实际渲染宽度 > 0（文字不被 flex 压没）', async ({
  page,
}) => {
  await page.goto('/components/tree.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#tree-custom')
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const tree = document.querySelector('#tree-custom')!
    return [...tree.shadowRoot!.querySelectorAll('[part="row"]')].map((row) => {
      const label = row.querySelector<HTMLElement>('.label')!
      const binder = label.querySelector<HTMLElement>('[data-node-label]')
      const lb = label.getBoundingClientRect()
      const bb = binder?.getBoundingClientRect()
      return {
        labelText: binder?.textContent ?? '',
        labelWidth: lb.width,
        binderWidth: bb?.width ?? 0,
        rowWidth: row.getBoundingClientRect().width,
      }
    })
  })
  expect(r.length).toBeGreaterThan(0)
  for (const [i, item] of r.entries()) {
    expect(item.labelText.length, `第 ${i} 行 [data-node-label] 文字缺失`).toBeGreaterThan(0)
    expect(item.labelWidth, `第 ${i} 行 .label 渲染宽度为 0（被 flex 压没）`).toBeGreaterThan(24)
    expect(item.binderWidth, `第 ${i} 行 [data-node-label] 实际宽度为 0`).toBeGreaterThan(0)
  }
  await page.screenshot({ path: 'C:\\WINDOWS\\TEMP\\opencode\\fix-tree-custom-label.png' })
})
