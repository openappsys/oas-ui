import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { OASArrayTable } from './index.js'
import { OASForm } from '../form/index.js'
import '../input/index.js'

const COLUMNS = [
  { key: 'nick', label: '昵称' },
  { key: 'age', label: '年龄', width: 80 },
]

const TEMPLATE = `
  <oas-form-item label="昵称" data-schema-key="field:users.[].nick">
    <oas-input name="nick"></oas-input>
  </oas-form-item>
  <oas-form-item label="年龄" data-schema-key="field:users.[].age">
    <oas-input name="age"></oas-input>
  </oas-form-item>
`

function makeTable(
  attrs: Record<string, string> = { name: 'users', rows: '2' },
  templateHTML = TEMPLATE,
): { form: OASForm; table: OASArrayTable } {
  const form = new OASForm()
  const table = new OASArrayTable()
  for (const [k, v] of Object.entries(attrs)) table.setAttribute(k, v)
  table.setAttribute('columns', JSON.stringify(COLUMNS))
  if (templateHTML !== '') {
    const tpl = document.createElement('template')
    tpl.innerHTML = templateHTML
    table.appendChild(tpl)
  }
  form.appendChild(table)
  document.body.appendChild(form)
  return { form, table }
}

function rows(table: OASArrayTable): HTMLElement[] {
  return [...table.querySelectorAll<HTMLElement>('[data-oas-form-list-item]')]
}

function frames(table: OASArrayTable): HTMLElement[] {
  return [...table.shadowRoot!.querySelectorAll<HTMLElement>('.row-frame')]
}

function scroller(table: OASArrayTable): HTMLElement {
  return table.shadowRoot!.querySelector<HTMLElement>('.rows')!
}

function spacerHeight(table: OASArrayTable, which: 'top' | 'bottom'): number {
  const node = table.shadowRoot!.querySelector<HTMLElement>(`[data-vspacer="${which}"]`)
  return node ? Number(parseFloat(node.style.height)) : Number.NaN
}

/**
 * 模拟真实浏览器的盒高：窗口计算与 `.rows` 盒高同源（clientHeight），happy-dom 无布局恒 0，
 * 组件回落兜底窗口；需要确定窗口规模的用例用桩供给盒高（等价于真实浏览器的 max-height 生效）。
 */
function stubViewport(table: OASArrayTable, height: number): void {
  Object.defineProperty(scroller(table), 'clientHeight', { value: height, configurable: true })
  scroller(table).dispatchEvent(new Event('scroll'))
}

describe('OASArrayTable 虚拟滚动（virtual，v2.6.9 批 A）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 大表挂载（轻量模板：oas-input 单列） */
  function makeBig(count: number, attrs: Record<string, string> = {}): OASArrayTable {
    return makeTable(
      { name: 'users', rows: String(count), ...attrs },
      '<oas-form-item label="昵称" data-schema-key="field:users.[].nick"><oas-input name="nick"></oas-input></oas-form-item>',
    ).table
  }

  it('缺省关（零漂移）：无 spacer、无滚动类、帧数=行数（全量帧）', () => {
    const table = makeBig(5)
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(frames(table).length).toBe(5)
    expect(scroller(table).classList.contains('vscroll')).toBe(false)
    expect(rows(table).length).toBe(5)
  })

  it('virtual 开启：aria-rowcount 保持总量、行数快照不窗口化', () => {
    const table = makeBig(500, { virtual: '', 'viewport-height': '320' })
    const grid = table.shadowRoot!.querySelector<HTMLElement>('[role="table"]')!
    expect(grid.getAttribute('aria-rowcount')).toBe('501')
    expect(table.rowCount).toBe(500)
    expect(rows(table).length).toBe(500)
    expect(frames(table).length).toBeLessThanOrEqual(24)
  }, 30000)

  it('1000 行性能冒烟：shadow 帧节点有界、light DOM 行齐全', () => {
    const table = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    expect(frames(table).length).toBeLessThan(50)
    expect(rows(table).length).toBe(1000)
    expect(table.querySelectorAll('oas-input').length).toBe(1000)
  }, 30000)

  it('窗口外字段仍索引化：users.999.nick 在场（name 重编号覆盖全量行）', () => {
    const table = makeBig(1000, { virtual: '', 'viewport-height': '320' })
    expect(rows(table)[999]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.999.nick')
  }, 30000)

  // 跨引擎回归：同 oas-form-list（先挂窗口后落 spacer 会让过渡态容器高少一行，Firefox 就地夹紧
  // scrollTop）。断言：每次 mountWindow 发生时上下 spacer 已等于本次窗口的定稿值。
  it('窗口挂载时 spacer 必须已按目标窗口落位（滚动夹紧跨引擎回归）', () => {
    const table = makeBig(80, { virtual: '', 'viewport-height': '240', 'estimated-row-height': '40' })
    stubViewport(table, 240)
    const api = table as unknown as {
      mountWindow: (win: { start: number; end: number }) => void
      vmodel: { offsetOf: (i: number) => number; total: () => number }
      vGap: number
    }
    const snaps: { win: string; top: number; bottom: number; topWant: number; bottomWant: number }[] = []
    const original = api.mountWindow
    api.mountWindow = function (this: unknown, win: { start: number; end: number }): void {
      snaps.push({
        win: `${win.start}-${win.end}`,
        top: spacerHeight(table, 'top'),
        bottom: spacerHeight(table, 'bottom'),
        topWant: Math.round(api.vmodel.offsetOf(win.start)),
        bottomWant: Math.max(0, Math.round(api.vmodel.total() - api.vmodel.offsetOf(win.end) + api.vGap)),
      })
      return original.call(this, win)
    }
    const sc = scroller(table)
    sc.scrollTop = 4000
    sc.dispatchEvent(new Event('scroll'))
    // 回归夹具自证：scrollTop 4000 / 估高 40 → 首可见行 100，overscan 5 → 窗口 69-80（80 行封顶）
    expect(
      snaps.map((s) => s.win),
      '回归夹具：滚动后必须真的发生窗口挂载且落在预期窗口',
    ).toEqual(['69-80'])
    for (const s of snaps) {
      expect(s.top, `窗口 ${s.win} 挂载时上 spacer 必须已落位`).toBe(s.topWant)
      expect(s.bottom, `窗口 ${s.win} 挂载时下 spacer 必须已落位`).toBe(s.bottomWant)
    }
  })

  it('滚动重算：scrollTop 变化 → 帧窗口平移、spacer 更新', () => {
    const table = makeBig(200, {
      virtual: '',
      'viewport-height': '320',
      'estimated-row-height': '50',
    })
    stubViewport(table, 320)
    expect(spacerHeight(table, 'top')).toBe(0)
    const sc = scroller(table)
    sc.scrollTop = 2000
    sc.dispatchEvent(new Event('scroll'))
    // 2000/50 → 首可见行 40，start = 35 → top spacer = 1750
    expect(spacerHeight(table, 'top')).toBe(1750)
    expect(Number(frames(table)[0]!.dataset.rowIndex)).toBe(35)
    sc.scrollTop = 0
    sc.dispatchEvent(new Event('scroll'))
    expect(spacerHeight(table, 'top')).toBe(0)
  })

  it('行操作在虚拟态可用：删除第 0 行 → 值随行保留、重编号、播报', () => {
    const table = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(table)[0]!.querySelector('oas-input')!.setAttribute('value', 'doomed')
    rows(table)[5]!.querySelector('oas-input')!.setAttribute('value', 'keepme')
    let detail: unknown
    table.addEventListener('oas-remove', (e) => (detail = (e as CustomEvent).detail))
    actionClick(table, 0, 'remove')
    expect(table.rowCount).toBe(59)
    expect(detail).toEqual({ index: 0 })
    expect(rows(table)[4]!.querySelector('oas-input')!.getAttribute('value')).toBe('keepme')
    expect(rows(table)[4]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.4.nick')
  })

  it('受控通道在虚拟态正常：setRowCount / insertRowAt 越窗行、不派发事件', () => {
    const table = makeBig(50, { virtual: '', 'viewport-height': '320' })
    const events: string[] = []
    table.addEventListener('oas-add', () => events.push('add'))
    table.addEventListener('oas-remove', () => events.push('remove'))
    table.setRowCount(80)
    expect(table.rowCount).toBe(80)
    expect(rows(table)[79]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.79.nick')
    table.setRowCount(10)
    expect(table.rowCount).toBe(10)
    expect(table.insertRowAt(3)).toBe(true)
    expect(rows(table)[3]!.querySelector('oas-input')!.getAttribute('name')).toBe('users.3.nick')
    expect(events).toEqual([])
  })

  it('虚拟态主表提交：窗口外行值完整进 values', () => {
    const { form, table } = makeTable(
      { name: 'users', rows: '30', virtual: '', 'viewport-height': '200', 'estimated-row-height': '50' },
      TEMPLATE,
    )
    const inputs = [...table.querySelectorAll('oas-input')]
    expect(inputs.length).toBe(60)
    inputs[0]!.setAttribute('value', 'first')
    inputs[59]!.setAttribute('value', 'last-age')
    let detail: unknown
    form.addEventListener('oas-submit', (e) => (detail = (e as CustomEvent).detail))
    form.submit()
    const values = (detail as { values: { users: Array<{ nick?: string; age?: string }> } }).values
    expect(values.users.length).toBe(30)
    expect(values.users[0]!.nick).toBe('first')
    // 最后一行的第 2 个字段（窗口外）也完整提交
    expect(values.users[29]!.age).toBe('last-age')
  })

  it('关闭虚拟零漂移：移除 virtual 属性恢复全量帧并拆掉 spacer', () => {
    const table = makeBig(30, { virtual: '', 'viewport-height': '320' })
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(2)
    table.removeAttribute('virtual')
    expect(table.shadowRoot!.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(frames(table).length).toBe(30)
    expect(scroller(table).classList.contains('vscroll')).toBe(false)
  })

  it('空表 spacer 无悬挂间隙：virtual + 0 行 → 上下 spacer 均 0', () => {
    const table = makeBig(0, { virtual: '', 'viewport-height': '320' })
    expect(spacerHeight(table, 'top')).toBe(0)
    expect(spacerHeight(table, 'bottom'), '空表不凭空产生末行悬挂 gap').toBe(0)
  })

  it('首帧盒高重读：0 行 → 大表后按定稿视口重排（不再只挂兜底行 + 下方大段空白）', () => {
    const table = makeBig(0, { virtual: '', 'viewport-height': '600', 'estimated-row-height': '40' })
    const sc = scroller(table)
    let reads = 0
    // 真实浏览器盒高 = min(内容高, max-height)：空表撑不满 max-height（内容高 0），
    // spacer 落位后内容高够长、盒高才等于 600。getter 忠实模拟这条布局反馈。
    Object.defineProperty(sc, 'clientHeight', {
      configurable: true,
      get() {
        reads += 1
        const content = [...sc.querySelectorAll<HTMLElement>('[data-vspacer]')].reduce(
          (sum, node) => sum + (parseFloat(node.style.height) || 0),
          0,
        )
        return content > 0 ? 600 : 0
      },
    })
    table.setRowCount(60)
    // 600 / 40 = 15 行可视 + overscan 5 → 帧覆盖整屏（旧实现按 0 视口只挂兜底 8+5 = 13 帧，
    // 一屏 600px 装不下）
    expect(frames(table).length).toBeGreaterThanOrEqual(15)
    // 下 spacer = 总高 60×40 − 窗口末行偏移 20×40 = 1600（全量高度由窗口 + 上下 spacer 拼齐）
    expect(spacerHeight(table, 'bottom'), '下 spacer 用定稿窗口补齐总高').toBe(1600)
    expect(reads, '盒高重读收敛有界（至多两轮）').toBeLessThanOrEqual(3)
  })

  it('viewport-height 与盒高同源：属性写进内联 max-height；overscan 扩窗有确定规模', () => {
    // 属性在场 → 内联 max-height 同步（盒高不再停留 CSS 缺省 320px——尾部行不可达的根因）
    const narrow = makeBig(200, { virtual: '', 'viewport-height': '100', 'estimated-row-height': '50', overscan: '0' })
    stubViewport(narrow, 100)
    expect(scroller(narrow).style.maxHeight).toBe('100px')
    const wide = makeBig(200, { virtual: '', 'viewport-height': '900', 'estimated-row-height': '50', overscan: '20' })
    stubViewport(wide, 900)
    expect(scroller(wide).style.maxHeight).toBe('900px')
    // 确定帧数：viewport 100/50 → 行 0..1 可视（行 2 顶恰在视口底不计）→ 2 帧（overscan 0）；
    // 900/50 → 18 行可视 + 底部 overscan 20 = 38 帧
    expect(frames(narrow).length).toBe(2)
    expect(frames(wide).length).toBe(38)
    // 属性移除 → 清内联（回落 CSS 缺省 / 宿主 CSS 变量覆盖）
    narrow.removeAttribute('viewport-height')
    expect(scroller(narrow).style.maxHeight).toBe('')
  }, 20000)

  it('虚拟态添加行：新行滚入视口、窗口重算挂载新帧、焦点落新行首字段（用户可见反馈）', () => {
    const table = makeBig(30, { virtual: '', 'estimated-row-height': '50', overscan: '0' })
    stubViewport(table, 150)
    let added: unknown
    table.addEventListener('oas-add', (e) => (added = (e as CustomEvent).detail))
    table.shadowRoot!.querySelector<HTMLButtonElement>('[part="add"]')!.click()
    expect(added).toEqual({ index: 30 })
    expect(table.rowCount).toBe(31)
    // 新行 30 顶 1500、高 50 > 视口底 150 → scrollTop 收到行底贴视口底：1500+50-150 = 1400
    expect(scroller(table).scrollTop).toBe(1400)
    const indexes = frames(table).map((f) => Number(f.dataset.rowIndex))
    expect(indexes).toContain(30)
    const newRowInput = rows(table)[30]!.querySelector('oas-input')!
    const inner = newRowInput.shadowRoot?.querySelector<HTMLElement>('input')
    expect(inner?.tagName).toBe('INPUT')
    // document.activeElement 对 shadow 内焦点做宿主重定向（open shadow 同样重定向到 oas-input）
    expect(document.activeElement).toBe(newRowInput)
    expect(newRowInput.shadowRoot?.activeElement).toBe(inner)
  })

  it('默认 slot 不被虚拟骨架清掉：virtual 开/关往返后 <slot> 常驻（宿主默认插槽内容不丢）', () => {
    const table = makeBig(3, { virtual: '', 'viewport-height': '320' })
    const rowsEl = scroller(table)
    expect(rowsEl.querySelector(':scope > slot')?.tagName, '虚拟开启后默认 slot 仍在').toBe('SLOT')
    table.removeAttribute('virtual')
    expect(rowsEl.querySelector(':scope > slot')?.tagName, '关闭虚拟后默认 slot 仍在').toBe('SLOT')
    expect(rowsEl.querySelector('.v-window')).toBeNull()
    expect(rowsEl.querySelectorAll('[data-vspacer]').length).toBe(0)
    expect(frames(table).length).toBe(3)
  })

  it('行操作按钮在窗口内与行号对位：复制第 8 行 → oas-duplicate {from:8,to:9}', () => {
    const table = makeBig(60, { virtual: '', 'viewport-height': '320', 'estimated-row-height': '50' })
    rows(table)[8]!.querySelector('oas-input')!.setAttribute('value', 'copy-me')
    let detail: unknown
    table.addEventListener('oas-duplicate', (e) => (detail = (e as CustomEvent).detail))
    actionClick(table, 8, 'duplicate')
    expect(detail).toEqual({ from: 8, to: 9 })
    expect(rows(table)[9]!.querySelector('oas-input')!.getAttribute('value')).toBe('copy-me')
    expect(table.rowCount).toBe(61)
  })

  it('非虚拟缺省行为零漂移：无 virtual 属性时表头列与空态照常渲染', () => {
    const table = makeBig(2)
    expect(table.shadowRoot!.querySelectorAll<HTMLElement>('[role="columnheader"]').length).toBeGreaterThan(1)
    const empty = makeBig(0)
    expect(empty.shadowRoot!.querySelector<HTMLElement>('.empty')!.hidden).toBe(false)
  })
})

/** 点击第 index 行（light DOM 行上的操作按钮，跨帧存在） */
function actionClick(table: OASArrayTable, index: number, action: string): void {
  rows(table)[index]!.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click()
}
