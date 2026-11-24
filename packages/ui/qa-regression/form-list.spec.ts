// 用户回归：form-list / array-table 虚拟滚动（v2.6.9 批 A）
// 机制单测只证明窗口计算正确；这里用真实浏览器断言用户视角：
// 大列表只有窗口帧在渲染（节点数有界）、滚动窗口真实平移、行操作在虚拟态有可见反馈、
// demo 反馈文案出现（不许静默失败）。期望行数从 demo 反馈文案现算（数据驱动，不用本机常数）。

import { expect, test } from '@playwright/test'
import { realClick, up } from './helpers'

test('form-list 虚拟滚动：填充后帧数有界、demo 反馈可见、滚动窗口平移、删行有反馈', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-list-virtual')

  // 填充前：0 行、spacer 已就位（virtual 开但无行）
  const before = await page.evaluate(() => {
    const host = document.querySelector('#form-list-virtual')!
    return {
      rows: (host as unknown as { rowCount: number }).rowCount,
      spacers: host.shadowRoot!.querySelectorAll('[data-vspacer]').length,
    }
  })
  expect(before.rows).toBe(0)
  expect(before.spacers).toBe(2)

  // 真实点击填充按钮
  await realClick(page, '#form-list-virtual-fill', null)
  await page.waitForFunction(() =>
    /共 \d+ 行/.test(document.querySelector('#form-list-virtual-output')?.textContent ?? ''),
  )

  const afterFill = await page.evaluate(() => {
    const host = document.querySelector('#form-list-virtual')!
    const root = host.shadowRoot!
    return {
      rowCount: (host as unknown as { rowCount: number }).rowCount,
      lightRows: host.querySelectorAll('[data-oas-form-list-item]').length,
      frames: root.querySelectorAll('.item').length,
      shadowInputs: root.querySelectorAll('input').length,
      feedback: document.querySelector('#form-list-virtual-output')?.textContent ?? '',
      topSpacer: parseFloat(root.querySelector<HTMLElement>('[data-vspacer="top"]')?.style.height ?? '-1'),
    }
  })
  // 期望行数从 demo 反馈文案现算（数据驱动，不用按本机校准的常数）；requested 解析失败（0）会被下一条互证断言拦下
  const requested = Number(afterFill.feedback.match(/共 (\d+) 行/)?.[1] ?? 0)
  expect(afterFill.rowCount, '受控行数 = 请求填充行数').toBe(requested)
  expect(afterFill.lightRows, 'light DOM 行全量保留（与受控行数互证，值语义不丢）').toBe(afterFill.rowCount)
  expect(afterFill.frames, '阴影帧窗口化（远小于全量）').toBeLessThan(afterFill.lightRows / 4)
  expect(afterFill.shadowInputs, 'shadow 内渲染节点有界').toBeLessThan(afterFill.lightRows)
  expect(afterFill.feedback, 'demo 反馈可见（含挂载帧计数）').toContain('视口挂载')
  expect(afterFill.topSpacer, '顶部 spacer 从 0 起').toBe(0)

  // 真实滚动：scroller.scrollTop 置中 → 窗口平移（scroll 事件与真实滚动同一路径）
  await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    sc.scrollTop = 3000
    sc.dispatchEvent(new Event('scroll'))
  })
  const scrolled = await page.evaluate(() => {
    const root = document.querySelector('#form-list-virtual')!.shadowRoot!
    const first = root.querySelector<HTMLElement>('.item')!
    return {
      firstIndex: Number(first.dataset.rowIndex),
      topSpacer: parseFloat(root.querySelector<HTMLElement>('[data-vspacer="top"]')?.style.height ?? '-1'),
      feedback: document.querySelector('#form-list-virtual-output')?.textContent ?? '',
    }
  })
  expect(scrolled.firstIndex, '滚动后首帧行号前移到窗口起点（overscan 内）').toBeGreaterThan(40)
  expect(scrolled.topSpacer, '顶部 spacer 反映窗口前的高度（大于滚动前）').toBeGreaterThan(afterFill.topSpacer)
  expect(scrolled.feedback, '滚动反馈刷新（含挂载帧计数）').toContain('视口挂载')

  // 虚拟态行操作：滚回顶部 → 删除窗口内第 2 行 → 行数减一 + 反馈仍在刷新（用户可见）
  await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    sc.scrollTop = 0
    sc.dispatchEvent(new Event('scroll'))
  })
  const rowCountBeforeRemove = await page.evaluate(
    () => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount,
  )
  await realClick(page, '#form-list-virtual', '.item[data-row-index="2"] [data-action="remove"]')
  await page.waitForFunction(
    (n) => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount === n - 1,
    rowCountBeforeRemove,
  )
  const afterRemove = await page.evaluate(() => {
    const host = document.querySelector('#form-list-virtual')!
    return {
      rowCount: (host as unknown as { rowCount: number }).rowCount,
      lightRows: host.querySelectorAll('[data-oas-form-list-item]').length,
      feedback: document.querySelector('#form-list-virtual-output')?.textContent ?? '',
    }
  })
  expect(afterRemove.rowCount, '删行后受控行数减一').toBe(rowCountBeforeRemove - 1)
  expect(afterRemove.lightRows, 'light DOM 行同步减一').toBe(afterRemove.rowCount)
  expect(afterRemove.feedback, '反馈仍在刷新').toContain('视口挂载')
})

test('array-table 虚拟滚动：独立用法填充、帧数有界、aria-rowcount 报总量、demo 反馈可见', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-array-table-virtual')

  await realClick(page, '#sf-array-table-virtual-fill', null)
  await page.waitForFunction(() =>
    /共 \d+ 行/.test(document.querySelector('#sf-array-table-virtual-output')?.textContent ?? ''),
  )

  const state = await page.evaluate(() => {
    const host = document.querySelector('#sf-array-table-virtual')!
    const root = host.shadowRoot!
    return {
      rowCount: (host as unknown as { rowCount: number }).rowCount,
      lightRows: host.querySelectorAll('[data-oas-form-list-item]').length,
      frames: root.querySelectorAll('.row-frame').length,
      ariaRowcount: root.querySelector('[role="table"]')?.getAttribute('aria-rowcount') ?? '',
      feedback: document.querySelector('#sf-array-table-virtual-output')?.textContent ?? '',
    }
  })
  const requested = Number(state.feedback.match(/共 (\d+) 行/)?.[1] ?? 0)
  expect(state.rowCount, '受控行数 = 请求填充行数').toBe(requested)
  expect(state.lightRows, 'light DOM 行全量保留（与受控行数互证）').toBe(state.rowCount)
  expect(state.frames, '行帧窗口化（远小于全量）').toBeLessThan(state.lightRows / 4)
  expect(state.ariaRowcount, '行数快照报总量（总行数 + 表头，不窗口化）').toBe(String(state.rowCount + 1))
  expect(state.feedback, 'demo 反馈可见').toContain('aria-rowcount=')
})

// —— 复核批回归（真实浏览器，机制单测测不到的视觉/行为）——

test('form-list 虚拟 viewport-height 与盒高同源：内联 max-height 生效、滚动到底尾部行可达', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-list-virtual')
  await realClick(page, '#form-list-virtual-fill', null)
  await page.waitForFunction(
    () => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount === 300,
  )

  const box = await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    return { inlineMaxHeight: sc.style.maxHeight, clientHeight: sc.clientHeight }
  })
  // C2 回归：属性值必须同步进盒（此前盒停留 CSS 缺省 320px、窗口按属性算——两个数据源脱节，
  // 尾部行永久不可达）
  expect(box.inlineMaxHeight, 'viewport-height 属性写进内联 max-height').toBe('240px')
  expect(box.clientHeight, '盒高 = 属性值（与窗口计算同源）').toBe(240)

  // 滚动到底：最后一行（index 299）必须挂载且落在视口内（可达）
  await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    sc.scrollTop = sc.scrollHeight
    sc.dispatchEvent(new Event('scroll'))
  })
  const tail = await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    const last = sc.querySelector<HTMLElement>('.item[data-row-index="299"]')
    if (!last) return { mounted: false }
    const box = sc.getBoundingClientRect()
    const rect = last.getBoundingClientRect()
    return { mounted: true, visible: rect.bottom > box.top && rect.top < box.bottom }
  })
  expect(tail.mounted, '滚动到底后第 299 行帧已挂载').toBe(true)
  expect(tail.visible, '第 299 行在视口内可见（尾部行不再永久不可达）').toBe(true)
})

test('form-list 虚拟内容总高 ≈ 非虚拟全量渲染（行间距 gap 不丢，滚动比例不失真）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-list-virtual')
  await realClick(page, '#form-list-virtual-fill', null)
  await page.waitForFunction(
    () => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount === 300,
  )

  // 对照组：同模板同宽度的非虚拟列表（全量渲染），内容总高应为基准
  const heights = await page.evaluate(() => {
    const srcTpl = document.querySelector('#form-list-virtual template')!
    const ref = document.createElement('oas-form-list')
    ref.setAttribute('name', 'members')
    const tpl = document.createElement('template')
    tpl.innerHTML = srcTpl.innerHTML
    ref.appendChild(tpl)
    ref.style.position = 'fixed'
    ref.style.left = '-2000px'
    ref.style.top = '0'
    ref.style.width = '420px'
    document.body.appendChild(ref)
    ;(ref as unknown as { setRowCount: (n: number) => void }).setRowCount(300)
    const refHeight = ref.shadowRoot!.querySelector<HTMLElement>('.items')!.scrollHeight
    const virtualHeight = document
      .querySelector('#form-list-virtual')!
      .shadowRoot!.querySelector<HTMLElement>('.items')!.scrollHeight
    ref.remove()
    return { virtualHeight, refHeight }
  })
  // 差 = 299 × gap（此前虚拟 scrollHeight 9688 vs 全量 11992）→ 现在 gap 计入节距，总高对齐
  expect(
    Math.abs(heights.virtualHeight - heights.refHeight),
    `虚拟总高 ${heights.virtualHeight} ≈ 非虚拟全量 ${heights.refHeight}（±4px）`,
  ).toBeLessThanOrEqual(4)
})

test('form-list 虚拟态添加行：新行滚入视口、可见且焦点落新行首字段（用户可见反馈）', async ({ page }) => {
  await page.goto('/components/form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#form-list-virtual')
  await realClick(page, '#form-list-virtual-fill', null)
  await page.waitForFunction(
    () => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount === 300,
  )

  // 滚动到底后点添加（新行 index 300 在窗口外——此前不滚不聚焦，用户看不到任何变化）
  await page.evaluate(() => {
    const sc = document.querySelector('#form-list-virtual')!.shadowRoot!.querySelector<HTMLElement>('.items')!
    sc.scrollTop = sc.scrollHeight
    sc.dispatchEvent(new Event('scroll'))
  })
  await realClick(page, '#form-list-virtual', '[part="add"]')
  await page.waitForFunction(
    () => (document.querySelector('#form-list-virtual') as unknown as { rowCount: number }).rowCount === 301,
  )

  const after = await page.evaluate(() => {
    const host = document.querySelector('#form-list-virtual')!
    const sc = host.shadowRoot!.querySelector<HTMLElement>('.items')!
    const frame = sc.querySelector<HTMLElement>('.item[data-row-index="300"]')
    const box = sc.getBoundingClientRect()
    const rect = frame?.getBoundingClientRect()
    const active = document.activeElement as HTMLElement | null
    // 焦点判定走 light DOM 行 wrapper（shadow 帧与 light 字段无 contains 关系）
    const newRow = host.querySelectorAll('[data-oas-form-list-item]')[300]
    return {
      frameMounted: !!frame,
      visible: !!rect && rect.bottom > box.top && rect.top < box.bottom,
      focusInNewRow: !!active && !!newRow && newRow.contains(active),
      activeTag: active?.tagName.toLowerCase() ?? '',
    }
  })
  expect(after.frameMounted, '新行帧已挂载（滚入视口后窗口重算）').toBe(true)
  expect(after.visible, '新行在视口内可见').toBe(true)
  expect(after.focusInNewRow, `焦点落新行首字段（实际 activeElement: ${after.activeTag}）`).toBe(true)
})

test('array-table 虚拟态添加行：新行滚入视口、可见且焦点落新行首字段', async ({ page }) => {
  await page.goto('/components/schema-form.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#sf-array-table-virtual')
  await realClick(page, '#sf-array-table-virtual-fill', null)
  await page.waitForFunction(
    () => (document.querySelector('#sf-array-table-virtual') as unknown as { rowCount: number }).rowCount === 300,
  )

  await page.evaluate(() => {
    const sc = document.querySelector('#sf-array-table-virtual')!.shadowRoot!.querySelector<HTMLElement>('.rows')!
    sc.scrollTop = sc.scrollHeight
    sc.dispatchEvent(new Event('scroll'))
  })
  await realClick(page, '#sf-array-table-virtual', '[part="add"]')
  await page.waitForFunction(
    () => (document.querySelector('#sf-array-table-virtual') as unknown as { rowCount: number }).rowCount === 301,
  )

  const after = await page.evaluate(() => {
    const host = document.querySelector('#sf-array-table-virtual')!
    const sc = host.shadowRoot!.querySelector<HTMLElement>('.rows')!
    const row = sc.querySelector<HTMLElement>('.row-frame[data-row-index="300"]')
    const box = sc.getBoundingClientRect()
    const rect = row?.getBoundingClientRect()
    const active = document.activeElement as HTMLElement | null
    const rowWrapper = host.querySelectorAll('[data-oas-form-list-item]')[300]
    return {
      frameMounted: !!row,
      visible: !!rect && rect.bottom > box.top && rect.top < box.bottom,
      focusInNewRow: !!active && !!rowWrapper && rowWrapper.contains(active),
    }
  })
  expect(after.frameMounted, '新行帧已挂载').toBe(true)
  expect(after.visible, '新行在视口内可见').toBe(true)
  expect(after.focusInNewRow, '焦点落新行首字段').toBe(true)
})
