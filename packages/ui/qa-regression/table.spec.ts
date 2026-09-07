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

test('table 行内编辑几何稳定：进/出编辑列宽与行高零跳变（input 与 select 编辑器）', async ({
  page,
}) => {
  // 缺陷固化：进编辑时整列被撑宽（89→187）、邻列挤窄文字换行、行高联动 49→73——三个来源：
  // ①input 默认 size=20 的内在宽度成为 auto 布局 min-content 贡献；②select 内在宽度=最长选项
  // +下拉钮；③操作列「编辑」→「保存/取消」变宽挤压邻列。修复=不可见占位保原文本布局贡献
  // +编辑器绝对定位零贡献 + 操作列两态同槽叠放（inline-grid 同格，格宽恒为两态最大值）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#table-edit')
  await page.locator('#table-edit').first().scrollIntoViewIfNeeded()
  const measure = () =>
    page.evaluate(() => {
      const sr = document.querySelector('#table-edit')!.shadowRoot!
      return {
        cols: [...sr.querySelectorAll('thead th')].map((th) =>
          Math.round(th.getBoundingClientRect().width),
        ),
        rowH: Math.round(sr.querySelector('tbody tr.row')!.getBoundingClientRect().height),
      }
    })
  const base = await measure()

  // input 编辑器（首个可编辑单元格）
  const inputCell = page.locator('#table-edit tbody tr.row').first().locator('td.editable-cell').first()
  await inputCell.dblclick()
  await page.waitForTimeout(300)
  const inEdit = await measure()
  expect(inEdit.cols, 'input 编辑中列宽应零跳变').toEqual(base.cols)
  expect(inEdit.rowH, 'input 编辑中行高应零跳变').toBe(base.rowH)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  expect((await measure()).cols, '退出编辑列宽应还原').toEqual(base.cols)

  // select 编辑器（职位列）
  const selectCell = page
    .locator('#table-edit tbody tr.row')
    .first()
    .locator('td.editable-cell[data-col="position"]')
  await selectCell.dblclick()
  await page.waitForTimeout(300)
  const inSelect = await measure()
  expect(inSelect.cols, 'select 编辑中列宽应零跳变').toEqual(base.cols)
  expect(inSelect.rowH, 'select 编辑中行高应零跳变').toBe(base.rowH)
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

test('table 表头吸顶：非固定列表头纵向 sticky 不被覆盖失效（列宽拖拽手柄定位上下文不得写 relative）', async ({
  page,
}) => {
  // 缺陷固化：`th[data-key] { position: relative }`（列宽拖拽 ::after 手柄的定位上下文）与
  // `th { position: sticky; top: 0 }` 同权重但居后——非固定列表头（年龄/城市/邮箱）被覆盖成
  // relative 随表体滚走，仅固定列（data-fixed）表头吸顶（用户实测「3 个表头会随滚动而滚动」）。
  // 修复：删除 relative 覆盖（sticky 同为定位上下文，天然供给 ::after 手柄）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) =>
      b.textContent.includes('sticky-rows'),
    )!
    const table = block.querySelector('oas-table')!
    const sr = table.shadowRoot!
    const scroll = sr.querySelector('.table-scroll') as HTMLElement
    scroll.scrollTop = 300
    const ths = [...sr.querySelectorAll('thead th')].map((th) => ({
      text: th.textContent!.trim().slice(0, 4),
      position: getComputedStyle(th).position,
      top: Math.round(th.getBoundingClientRect().top),
    }))
    return { scrollTop: scroll.scrollTop, scrollTop0: Math.round(scroll.getBoundingClientRect().top), ths }
  })
  expect(result.scrollTop, '容器应已滚动').toBe(300)
  for (const th of result.ths) {
    expect(th.position, `${th.text} 表头应为 sticky（不被 relative 覆盖）`).toBe('sticky')
    // 吸顶生效：表头应停在容器顶缘（top:0 → th.top ≈ 容器 top，容差 2px）
    expect(Math.abs(th.top - result.scrollTop0), `${th.text} 表头应吸在容器顶缘`).toBeLessThanOrEqual(2)
  }
})

test('table 单元格模板 cellTemplate：property 通道注入的模板渲染自定义单元格（docs demo 同路径）', async ({
  page,
}) => {
  // 缺陷固化：cellTemplate demo 的 <template> 子内容被 md/Vue 编译管线吃空（dev 与生产构建
  // 处理不一致），姓名/价格列全空（用户实测）。demo 改 property 通道（JS 构造 HTMLTemplateElement，
  // whenDefined 后赋值防升级前 expando 遮蔽）。本断言锁定模板列真实渲染（含插值与样式标记）。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, '#cell-tpl-table')
  await page.waitForTimeout(300)
  const cells = await page.evaluate(() => {
    const table = document.querySelector('#cell-tpl-table')!
    const row = table.shadowRoot!.querySelector('tbody tr.row')!
    return [...row.querySelectorAll('td')].map((td) => ({
      text: td.textContent!.trim(),
      hasMark: !!td.querySelector('span, b'),
    }))
  })
  expect(cells[0]!.text, '姓名列模板插值').toBe('张三')
  expect(cells[0]!.hasMark, '姓名列模板标记（span 徽章）').toBe(true)
  expect(cells[1]!.text, '价格列模板插值').toContain('128')
  expect(cells[1]!.hasMark, '价格列模板标记（b 加粗）').toBe(true)
  expect(cells[2]!.text, '城市列常规渲染').toBe('北京')
})

test('table 多级表头：非 bordered 模式顶层头行零竖线（竖线只属 bordered 全网格模式）', async ({
  page,
}) => {
  // 设计固化：非 bordered 表全表无纵向分隔线（单层表头/正文一致），分组层级靠「居中大标题跨列 +
  // 子表头行」表达；竖线只属 :host([bordered])。曾有 th.header-group+th.header-group 左线是
  // 语言孤例（且只覆盖组/组相邻——用户实测「地址有线、成绩没线」的不一致），已删。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const table = [...document.querySelectorAll('oas-table')].find((t) =>
      [...t.shadowRoot!.querySelectorAll('th')].some((th) => th.textContent!.includes('地址')),
    )!
    const sr = table.shadowRoot!
    const topRowThs = [...sr.querySelectorAll('thead tr')][0]!.querySelectorAll('th')
    return {
      bordered: table.hasAttribute('bordered'),
      borders: [...topRowThs].map((th) => ({
        text: th.textContent!.trim().slice(0, 4),
        borderLeft: getComputedStyle(th).borderLeftWidth,
        borderRight: getComputedStyle(th).borderRightWidth,
      })),
    }
  })
  expect(result.bordered, '该 demo 应非 bordered').toBe(false)
  for (const th of result.borders) {
    expect(th.borderLeft, `${th.text} 左缘应无竖线`).toBe('0px')
    expect(th.borderRight, `${th.text} 右缘应无竖线`).toBe('0px')
  }
})

test('table 子元素声明式通道：Vue 宿主下 key 被剥离也能经 data-key 正常渲染单元格', async ({
  page,
}) => {

  // 缺陷固化：`key` 是 Vue 模板保留字（vnode key），在 Vue 宿主（含文档站）被剥离不到 DOM——
  // 声明式列 key 全空 → 表头有、内容行全空（用户实测）。修复：key 双通道（key ?? data-key），
  // demo 全部改写 data-key。本断言在真实 Vue 宿主（vitepress 页面）验证端到端。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await up(page, 'oas-table')
  const result = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.demo-block')].find((b) =>
      b.querySelector('oas-table-column'),
    )!
    const table = block.querySelector('oas-table')!
    const sr = table.shadowRoot!
    return {
      headers: [...sr.querySelectorAll('thead th')].map((th) => th.textContent!.trim()),
      firstRow: [...sr.querySelectorAll('tbody tr.row')[0]!.querySelectorAll('td')].map((td) =>
        td.textContent!.trim(),
      ),
    }
  })
  expect(result.headers.length).toBeGreaterThanOrEqual(3)
  expect(result.firstRow[0], '首行首列应有值（张三）').toBe('张三')
  expect(result.firstRow[1], '首行次列应有值（30）').toBe('30')
  expect(result.firstRow.some((c) => c === ''), '首行不应有空单元格').toBe(false)
})

test('table 行内 oas-button 点击不连带 oas-row-click（宿主无 role，排除清单须点名组件）', async ({
  page,
}) => {
  // 缺陷固化：行点击排除清单 button,a,input,select,textarea,[role],oas-popconfirm 命中不了
  // <oas-button> 宿主——自定义组件宿主自身无 role 属性，行内放 oas-button（如行编辑按钮）点击
  // 会连带派发 oas-row-click → 「行点击 + 按钮点击」双重响应（真实场景双弹窗）。修复=排除清单
  // 补 oas-button。docs 各 table demo 的行内交互按钮均为内置 .action-btn（原生 button，已被
  // 排除清单覆盖），无「行内嵌 oas-button」的 demo——本断言按 size 密度用例先例在 demo 页动态
  // 构造探针表（oas-button 同页已注册），真实浏览器点击验证事件链。
  await page.goto('/components/table.html', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => customElements.get('oas-table') != null && customElements.get('oas-button') != null,
    null,
    { timeout: 15000 },
  )
  await page.evaluate(() => {
    const t = document.createElement('oas-table')
    t.id = 'qa-inline-oas-button'
    t.setAttribute('row-key', 'name')
    t.setAttribute(
      'columns',
      JSON.stringify([
        { key: 'name', title: '姓名' },
        { key: 'op', title: '操作' },
      ]),
    )
    t.setAttribute('data', JSON.stringify([{ name: '张三' }]))
    // 计数器挂在表宿主 dataset：若误触发行点击会 update() 重建 tbody、行内按钮被移除，
    // 计数器挂按钮上会读不到——挂宿主上两者都稳
    t.dataset.rowClick = '0'
    t.dataset.btnClick = '0'
    t.addEventListener('oas-row-click', () => {
      t.dataset.rowClick = String(Number(t.dataset.rowClick!) + 1)
    })
    // 挂进正文容器而非 body 末尾：body 末尾首列会被固定侧边栏遮挡（hit-test 拦截点击）
    ;(document.querySelector('.vp-doc') ?? document.body).append(t)
    const btn = document.createElement('oas-button')
    btn.textContent = '编辑'
    btn.addEventListener('oas-click', () => {
      t.dataset.btnClick = String(Number(t.dataset.btnClick!) + 1)
    })
    const td = t.shadowRoot!.querySelector('td[data-col="op"]') as HTMLTableCellElement
    td.appendChild(btn)
  })
  // 点行内 oas-button：自身 oas-click 应触发，但不得连带 oas-row-click / 行选中重建
  await page.locator('#qa-inline-oas-button td[data-col="op"] oas-button').click()
  await page.waitForTimeout(200)
  const r1 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-inline-oas-button')!
    return {
      rowClick: Number(t.dataset.rowClick ?? '0'),
      btnClick: Number(t.dataset.btnClick ?? '0'),
      hasBtn: !!t.shadowRoot!.querySelector('td[data-col="op"] oas-button'),
    }
  })
  expect(r1.btnClick, 'oas-button 自身应被真实点击（派发 oas-click）').toBeGreaterThan(0)
  expect(r1.rowClick, 'oas-button 点击不应连带 oas-row-click').toBe(0)
  expect(r1.hasBtn, 'oas-button 点击不应触发行选中重建（按钮应仍在原格）').toBe(true)
  // 对照：普通文本单元格点击仍派发 oas-row-click（排除未误伤正常行点击）
  await page.locator('#qa-inline-oas-button td[data-col="name"]').click()
  await page.waitForTimeout(200)
  const r2 = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('#qa-inline-oas-button')!
    const v = Number(t.dataset.rowClick ?? '0')
    t.remove()
    return v
  })
  expect(r2, '普通单元格点击仍应派发 oas-row-click').toBe(1)
})

