// 复核回归：table——历史缺陷固化断言。

import { test, expect } from '@playwright/test'
import { up } from './helpers'

test('table SPA 导航后数据不丢（Vue property 赋值反射到 attribute）', async ({ page }) => {
  // 曾现 bug：oas-table 的 data/columns 是 class 字段，Vue SPA 渲染时走 property 赋值而非
  // setAttribute，组件只读 attribute → 表格空，强刷（SSR attribute 水合）才有数据。
  await page.goto('/components/button.html', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('a[href="/components/table.html"]', {
    state: 'attached',
    timeout: 10000,
  })
  // 折叠侧栏里的链接不可见，直接 DOM click 走 Vue Router（等价用户 SPA 点进去）
  await page.evaluate(() => {
    document.querySelector<HTMLAnchorElement>('a[href="/components/table.html"]')!.click()
  })
  await page.waitForURL('**/components/table.html')
  await page.waitForSelector('oas-table', { timeout: 10000 })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll('oas-table')].map((t) => ({
      rows: t.shadowRoot?.querySelectorAll('tbody tr').length ?? -1,
      dataLen: t.getAttribute('data')?.length ?? 0,
    })),
  )
  // dataLen>2（非空 data="[]"）的表格必须渲染出数据行
  const nonEmpty = r.filter((t) => t.dataLen > 2)
  expect(nonEmpty.length).toBeGreaterThan(5)
  for (const t of nonEmpty) {
    expect(t.rows, `表格数据 ${t.dataLen}B 但行数 ${t.rows}`).toBeGreaterThan(0)
  }
})

test('table 行内编辑：Enter 提交后编辑器退出且列高亮清除', async ({ page }) => {
  // 曾现 bug：编辑器内按 Enter 提交后，keydown 冒泡到单元格的 Enter 监听器，在已销毁的
  // td 上重入编辑 → 列高亮残留、编辑态未退出。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 直接对首行「姓名」单元格派发 dblclick 进入编辑
  // （Playwright 真实 dblclick 手势会把两次 click 派发给同一解析元素——首击触发行选中重建
  //  后该元素已脱离文档，进入编辑会落到游离节点上；这里用 DOM 事件直派更确定）
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const td = table.shadowRoot!.querySelector('tbody tr.row td')!
    td.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !!t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const entered = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
    }
  })
  expect(entered.hasEditor).toBe(true)
  expect(entered.editingCol).toBe(true)
  await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    const input = table.shadowRoot!.querySelector<HTMLInputElement>('input.cell-editor')!
    input.value = '演示提交'
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    )
  })
  await page.waitForFunction(
    () => {
      const t = document.querySelector('#table-edit')!
      return !t.shadowRoot!.querySelector('input.cell-editor')
    },
    null,
    { timeout: 5000 },
  )
  const after = await page.evaluate(() => {
    const table = document.querySelector('#table-edit')!
    return {
      hasEditor: !!table.shadowRoot!.querySelector('input.cell-editor'),
      editingCol: !!table.shadowRoot!.querySelector('th[data-editing-col="true"]'),
      cellText: table.shadowRoot!.querySelector('tbody td')!.textContent,
    }
  })
  expect(after.hasEditor, '提交后编辑器应退出').toBe(false)
  expect(after.editingCol, '提交后列高亮应清除').toBe(false)
  expect(after.cellText).toBe('演示提交')
})

test('table 行内编辑：真实双击进入编辑（真实 dblclick，非 dispatchEvent——首击行选中重建不得阻断）', async ({
  page,
}) => {
  // 缺陷固化：真实双击的首击触发行选中切换 → update() 同步重建 tbody → 被击 td 脱离文档 →
  // 浏览器判定两次点击目标不同，dblclick 事件根本不派发（事件流实证：两击后零 dblclick），
  // 编辑永不进入（dispatchEvent 直派无法暴露，上方 Enter 提交用例的注释曾把它当测试稳定性
  // 问题绕过——实质是用户可感缺陷）。修复=click 委托到稳定的 <table> 容器 + 同行同列 500ms
  // 手工双击判定 + findRow/cellOf 重查活节点（tr 选中处理器先行，命中时目标 td 已被重建）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  await page.locator('#table-edit').first().scrollIntoViewIfNeeded()
  const cell = page.locator('#table-edit td.editable-cell').first()
  await cell.dblclick()
  await page.waitForTimeout(300)
  const hasEditor = await page.evaluate(
    () => !!document.querySelector('#table-edit')!.shadowRoot!.querySelector('input.cell-editor'),
  )
  expect(hasEditor, '真实双击应进入行内编辑').toBe(true)
})

test('table 可编辑单元格可感知线索：hover 淡底色 + text 光标 + 铅笔图标显现', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  // 真实 hover（Playwright 物理移动鼠标触发 :hover；dispatchEvent 无法触发 :hover 伪类）
  const cell = page.locator('#table-edit td.editable-cell').first()
  const before = await cell.evaluate((td) => {
    const icon = td.querySelector<HTMLElement>('.cell-edit-icon')!
    return {
      bg: getComputedStyle(td).backgroundColor,
      cursor: getComputedStyle(td).cursor,
      iconOpacity: getComputedStyle(icon).opacity,
    }
  })
  expect(before.cursor, '可编辑单元格应为 text 光标').toBe('text')
  expect(before.iconOpacity, '常态下铅笔图标应隐藏（opacity 0）').toBe('0')
  await cell.hover()
  await page.waitForTimeout(300) // 图标 opacity 过渡 0.15s
  const after = await cell.evaluate((td) => {
    const icon = td.querySelector<HTMLElement>('.cell-edit-icon')!
    return {
      bg: getComputedStyle(td).backgroundColor,
      iconOpacity: getComputedStyle(icon).opacity,
    }
  })
  expect(after.bg, 'hover 应出现淡底色').not.toBe(before.bg)
  expect(after.bg, 'hover 底色应为不透明实色（非透明叠加）').not.toBe('rgba(0, 0, 0, 0)')
  expect(after.iconOpacity, 'hover 后铅笔图标应显现（opacity 1）').toBe('1')
})

test('table 吸顶行：sticky-rows 前 N 行带 data-sticky 且与固定列共存', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table[sticky-rows]')
  const r = await page.evaluate(() => {
    const table = document.querySelector('oas-table[sticky-rows]')!
    const rows = [...table.shadowRoot!.querySelectorAll('tbody tr.row')]
    return rows.slice(0, 4).map((tr) => ({
      sticky: tr.getAttribute('data-sticky'),
      left: (tr.querySelector('td') as HTMLElement).style.left,
      top: (tr.querySelector('td') as HTMLElement).style.top,
    }))
  })
  expect(r[0]!.sticky).toBe('true')
  expect(r[1]!.sticky).toBe('true')
  expect(r[2]!.sticky).toBe('true')
  expect(r[3]!.sticky).toBeNull()
  // 固定列与吸顶行共存：sticky 行的固定单元格仍保留横向偏移
  expect(r[0]!.left).toBe('0px')
  expect(parseFloat(r[0]!.top), '吸顶行 top 应大于 0（表头下方）').toBeGreaterThan(0)
})

test('table size 密度档位：small/medium/large 三档 padding+字号阶梯，组件级变量覆盖优先', async ({
  page,
}) => {
  // 设计（主流三档密度惯例）：档位全走 CSS 变量 token
  // （--_cell-py/--_cell-px/font-size），宿主 --oas-table-* 变量优先级高于档位；
  // row-height 显式值与档位正交（虚拟滚动行高由 row-height 管，不受档位影响）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  // 首个 demo table 可能不可见（演示结构），本测试自建元素只需组件类已注册
  await page.waitForFunction(() => customElements.get('oas-table') != null, null, {
    timeout: 15000,
  })
  const r = await page.evaluate(() => {
    const probe = (size: string | null) => {
      const el = document.createElement('oas-table')
      el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
      el.setAttribute('data', JSON.stringify([{ a: 1 }]))
      if (size) el.setAttribute('size', size)
      document.body.append(el)
      const td = el.shadowRoot!.querySelector('td')!
      const cs = getComputedStyle(td)
      const host = getComputedStyle(el)
      const out = {
        py: cs.paddingTop,
        px: cs.paddingLeft,
        hostFont: host.fontSize,
        tdFont: cs.fontSize,
      }
      el.remove()
      return out
    }
    const medium = probe(null)
    const small = probe('small')
    const large = probe('large')
    // 变量覆盖优先于档位：small 档 + 自定义 padding-block 20px
    const el = document.createElement('oas-table')
    el.setAttribute('columns', JSON.stringify([{ key: 'a', title: 'A' }]))
    el.setAttribute('data', JSON.stringify([{ a: 1 }]))
    el.setAttribute('size', 'small')
    el.style.setProperty('--oas-table-cell-padding-block', '20px')
    document.body.append(el)
    const overridePy = getComputedStyle(el.shadowRoot!.querySelector('td')!).paddingTop
    el.remove()
    return { medium, small, large, overridePy }
  })
  expect(r.medium, '默认 medium：12px 16px / 14px').toEqual({
    py: '12px',
    px: '16px',
    hostFont: '14px',
    tdFont: '14px',
  })
  expect(r.small, 'small：8px 12px / 13px').toEqual({
    py: '8px',
    px: '12px',
    hostFont: '13px',
    tdFont: '13px',
  })
  expect(r.large, 'large：16px 24px / 16px').toEqual({
    py: '16px',
    px: '24px',
    hostFont: '16px',
    tdFont: '16px',
  })
  expect(r.overridePy, '--oas-table-cell-padding-block 覆盖 small 档').toBe('20px')
})

// 回归：input prefix/suffix slot 空 slot 时不得产生 data-slot-*（曾用 assignedNodes({flatten:true})，
// 空 slot 扁平化会包含 fallback 子节点 → 恒判有内容 → host 残留 data-slot-suffix、input 多出右内边距）
test('table 列拖拽重排精确化：左半区插前、右半区插后 + 插入指示 + oas-column-order', async ({ page }) => {
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-col-setting')
  const r = await page.evaluate(async () => {
    const t = document.querySelector('#table-col-setting') as HTMLElement
    const sr = t.shadowRoot!
    const key = (k: string) => sr.querySelector(`th[data-key="${k}"]`) as HTMLElement
    const drag = (fromKey: string, toKey: string, half: 'left' | 'right') => {
      t.removeAttribute('column-keys')
      const src = key(fromKey)
      const tgt = key(toKey)
      const dt = new DataTransfer()
      const rect = tgt.getBoundingClientRect()
      const clientX = half === 'left' ? rect.left + 2 : rect.right - 2
      src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
      const srcDim = src.classList.contains('drag-source')
      tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt, clientX }))
      const mark = tgt.classList.contains('drop-before')
        ? 'before'
        : tgt.classList.contains('drop-after')
          ? 'after'
          : 'none'
      tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt, clientX }))
      src.dispatchEvent(new DragEvent('dragend', { bubbles: true }))
      const raw = t.getAttribute('column-keys') || '[]'
      const order = JSON.parse(raw) as string[]
      return { srcDim, mark, order }
    }
    const left = drag('age', 'name', 'left') // 拖到 name 左半区 → 插前
    const right = drag('age', 'city', 'right') // 拖到 city 右半区 → 插后
    return { left, right }
  })
  expect(r.left.srcDim, '拖拽源列应有 drag-source 淡化').toBe(true)
  expect(r.left.mark, '拖到 name 左半区应显 drop-before').toBe('before')
  expect(r.left.order, 'age 应插入 name 之前').toEqual(['age', 'name', 'city', 'position'])
  expect(r.right.mark, '拖到 city 右半区应显 drop-after').toBe('after')
  expect(r.right.order, 'age 应插入 city 之后').toEqual(['name', 'city', 'age', 'position'])
})
