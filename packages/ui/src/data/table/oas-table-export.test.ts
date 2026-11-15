import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import '@oas-ui/i18n'
import { OASTable } from './index.js'
import {
  toCSV,
  escapeCsvField,
  toExcelXml,
  escapeXml,
  normalizeExportFormat,
  parseExportFormats,
  sanitizeFileName,
  downloadText,
  EXPORT_MIME,
} from './oas-table-export.js'

// D8 `exportable`：CSV / Excel 客户端导出。
// 覆盖三层：①纯序列化（转义/格式）②核心矩阵抽取（表头文本、字段映射、可见数据集范围）
// ③下载链路（Blob + 锚点 click + oas-export 事件）。

const COLUMNS = JSON.stringify([
  { key: 'name', title: '姓名' },
  { key: 'age', title: '年龄' },
  { key: 'city', title: '城市' },
])
const DATA = JSON.stringify([
  { name: '张三', age: 30, city: '北京' },
  { name: '李四', age: 25, city: '上海' },
  { name: '王五', age: 35, city: '深圳' },
])

function mount(attrs: Record<string, string> = {}): OASTable {
  const el = new OASTable()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!('columns' in attrs)) el.setAttribute('columns', COLUMNS)
  if (!('data' in attrs)) el.setAttribute('data', DATA)
  document.body.appendChild(el)
  return el
}

describe('oas-table-export 纯序列化', () => {
  it('CSV 公式注入防护：= + - @ 开头的单元格前置单引号', () => {
    expect(escapeCsvField('=1+1')).toBe("'=1+1")
    expect(escapeCsvField('+SUM(A1)')).toBe("'+SUM(A1)")
    expect(escapeCsvField('-5')).toBe("'-5")
    expect(escapeCsvField('@x')).toBe("'@x")
    expect(escapeCsvField('\t=1')).toBe("'\t=1")
    expect(escapeCsvField('普通值')).toBe('普通值')
    expect(escapeCsvField('=带,逗号')).toBe(`"'=带,逗号"`)
  })

  it('escapeCsvField：逗号 / 引号 / 换行 触发引号包裹，双引号翻倍', () => {
    expect(escapeCsvField('plain')).toBe('plain')
    expect(escapeCsvField('a,b')).toBe('"a,b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"')
    expect(escapeCsvField('cr\rhere')).toBe('"cr\rhere"')
    // 分号分隔模式下逗号不再是特殊字符
    expect(escapeCsvField('a,b', ';')).toBe('a,b')
  })

  it('toCSV：表头 + 数据行，RFC 4180 转义，默认 CRLF', () => {
    const csv = toCSV(
      ['姓名', '备注'],
      [
        ['张三', 'a,b'],
        ['李四', 'say "hi"'],
      ],
    )
    expect(csv).toBe('姓名,备注\r\n张三,"a,b"\r\n李四,"say ""hi"""')
  })

  it('toCSV：bom 选项前置 UTF-8 BOM；自定义 delimiter/eol', () => {
    expect(toCSV(['a'], [['1']], { bom: true }).startsWith('\uFEFF')).toBe(true)
    expect(toCSV(['a', 'b'], [['1', '2']], { delimiter: ';', eol: '\n' })).toBe('a;b\n1;2')
  })

  it('escapeXml：五类实体转义', () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;',
    )
  })

  it('toExcelXml：SpreadsheetML 结构 + 转义 + sheetName', () => {
    const xml = toExcelXml(['姓名', '备注'], [['张三', '<b>&amp;</b>']], { sheetName: '数据 & 备注' })
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>')
    expect(xml).toContain('urn:schemas-microsoft-com:office:spreadsheet')
    expect(xml).toContain('ss:Name="数据 &amp; 备注"')
    expect(xml).toContain('<Data ss:Type="String">姓名</Data>')
    expect(xml).toContain('<Data ss:Type="String">&lt;b&gt;&amp;amp;&lt;/b&gt;</Data>')
    // 表头加粗样式
    expect(xml).toContain('ss:ID="oas-header"')
  })

  it('normalizeExportFormat / parseExportFormats：xls 归一 excel，逗号多格式去重，非法回落 csv', () => {
    expect(normalizeExportFormat('XLS')).toBe('excel')
    expect(normalizeExportFormat('excel')).toBe('excel')
    expect(normalizeExportFormat('nonsense')).toBe('csv')
    expect(parseExportFormats('csv,excel')).toEqual(['csv', 'excel'])
    expect(parseExportFormats('excel,csv')).toEqual(['csv', 'excel'])
    expect(parseExportFormats('csv,csv,excel')).toEqual(['csv', 'excel'])
    expect(parseExportFormats('xls')).toEqual(['excel'])
    expect(parseExportFormats('')).toEqual(['csv'])
    expect(parseExportFormats('foo,bar')).toEqual(['csv'])
  })

  it('sanitizeFileName：去路径分隔符与保留字符，空值回落', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(sanitizeFileName('   ')).toBe('export')
    expect(sanitizeFileName('report')).toBe('report')
    expect(sanitizeFileName('x', 'table')).toBe('x')
  })

  it('downloadText：Blob + createObjectURL + 锚点 click 触发下载，type 按格式', () => {
    const created: Blob[] = []
    const origCreate = URL.createObjectURL
    URL.createObjectURL = ((b: Blob) => {
      created.push(b)
      return origCreate.call(URL, b)
    }) as typeof URL.createObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      const ok = downloadText('a,b\n1,2', 'x.csv', 'csv')
      expect(ok).toBe(true)
      expect(created.length).toBe(1)
      expect(created[0]!.type).toBe(EXPORT_MIME.csv)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      downloadText('<x/>', 'x.xls', 'excel')
      expect(created[1]!.type).toBe(EXPORT_MIME.excel)
    } finally {
      URL.createObjectURL = origCreate
      clickSpy.mockRestore()
    }
  })
})

describe('OASTable exportable 集成', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.restoreAllMocks()
  })

  it('未开启 exportable：工具栏为空且无导出按钮', () => {
    const el = mount()
    const toolbar = el.shadowRoot!.querySelector('.table-toolbar')!
    expect(toolbar.children.length).toBe(0)
    expect(el.shadowRoot!.querySelector('.export-btn')).toBeNull()
  })

  it('exportable 默认单 CSV 按钮（可访问名称走内置文案兜底）', () => {
    const el = mount({ exportable: '' })
    const buttons = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.export-btn')]
    expect(buttons.length).toBe(1)
    expect(buttons[0]!.getAttribute('data-format')).toBe('csv')
    expect(buttons[0]!.textContent).toContain('CSV')
    expect(buttons[0]!.getAttribute('aria-label')).toBe('导出 CSV')
  })

  it('export-format="excel" 单 Excel 按钮；"csv,excel" 双按钮；非法回落 CSV', () => {
    const excel = mount({ exportable: '', 'export-format': 'excel' })
    const excelBtns = [...excel.shadowRoot!.querySelectorAll<HTMLButtonElement>('.export-btn')]
    expect(excelBtns.map((b) => b.getAttribute('data-format'))).toEqual(['excel'])
    expect(excelBtns[0]!.textContent).toContain('Excel')

    const both = mount({ exportable: '', 'export-format': 'csv,excel' })
    expect(
      [...both.shadowRoot!.querySelectorAll<HTMLButtonElement>('.export-btn')].map((b) =>
        b.getAttribute('data-format'),
      ),
    ).toEqual(['csv', 'excel'])

    const bad = mount({ exportable: '', 'export-format': 'foo' })
    expect(
      [...bad.shadowRoot!.querySelectorAll<HTMLButtonElement>('.export-btn')].map((b) => b.getAttribute('data-format')),
    ).toEqual(['csv'])
  })

  it('exportData("csv")：表头为列 title、字段按列 key 映射、含转义，并派发 oas-export', () => {
    const el = mount({ exportable: '', 'row-key': 'name' })
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const csv = el.exportData('csv')
    // 下载内容带 UTF-8 BOM（Excel 双击不乱码）
    expect(csv).toBe('\uFEFF姓名,年龄,城市\r\n张三,30,北京\r\n李四,25,上海\r\n王五,35,深圳')
    expect(detail).toEqual({ format: 'csv', fileName: 'export.csv', rowCount: 3 })
    expect(clickSpy).toHaveBeenCalled()
  })

  it('exportData("excel")：输出 SpreadsheetML，扩展名 .xls，fileName 可配 + 净化', () => {
    const el = mount({ exportable: '', 'export-file-name': 'a/b 报表' })
    let detail: { fileName?: string; format?: string } = {}
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const xml = el.exportData('excel')
    expect(xml).toContain('<Workbook')
    expect(xml).toContain('<Data ss:Type="String">姓名</Data>')
    expect(detail.format).toBe('excel')
    expect(detail.fileName).toBe('a_b 报表.xls')
  })

  it('property 写入 exportFileName 后导出不抛，文件名仍按 attribute 通道', () => {
    const el = mount({ exportable: '', 'export-file-name': '报表' })
    const rec = el as unknown as Record<string, unknown>
    // Vue/React 桥接的 camelCase property 会遮蔽同名原型方法；改名后仅落实例属性，不参与内部调用
    rec.exportFileName = 'hijacked'
    let detail: { fileName?: string; format?: string } = {}
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(() => el.exportData('csv')).not.toThrow()
    expect(detail.fileName).toBe('报表.csv')
  })

  it('导出按钮点击 → 派发 oas-export（默认格式）', () => {
    const el = mount({ exportable: '' })
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    el.shadowRoot!.querySelector<HTMLButtonElement>('.export-btn')!.click()
    expect((detail as { format: string }).format).toBe('csv')
    expect((detail as { rowCount: number }).rowCount).toBe(3)
  })

  it('导出范围 = 当前可见数据集：过滤 + 排序 + 分页后的当前页', () => {
    const el = mount({
      exportable: '',
      pagination: '',
      'page-size': '2',
      'sort-key': 'age',
      'sort-order': 'desc',
      'filter-values': JSON.stringify({ city: '北京' }),
      'row-key': 'name',
    })
    // 过滤后仅「北京」行；排序后仍是单行；分页第 1 页
    expect(el.shadowRoot!.querySelectorAll('tr.row').length).toBe(1)
    expect(el.exportData('csv')).toBe('\uFEFF姓名,年龄,城市\r\n张三,30,北京')

    // 换到第二页/去掉过滤后：可见集合变化，导出跟随
    el.removeAttribute('filter-values')
    el.setAttribute('page-size', '2')
    expect(el.shadowRoot!.querySelectorAll('tr.row').length).toBe(2)
    const csv = el.exportData('csv')
    expect(csv.split('\r\n').length).toBe(3)
  })

  it('列处理：actions 列不导出；serialNumber 列导出序号；select 编辑器导出 label', () => {
    const el = new OASTable()
    el.setAttribute('exportable', '')
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三', position: 'frontend' }]))
    el.columns = [
      { key: 'idx', title: '#', serialNumber: true },
      { key: 'name', title: '姓名' },
      {
        key: 'position',
        title: '职位',
        editor: 'select',
        editOptions: [{ label: '前端工程师', value: 'frontend' }],
      },
      { key: 'op', title: '操作', actions: true },
    ]
    document.body.appendChild(el)
    expect(el.exportData('csv')).toBe('\uFEFF#,姓名,职位\r\n1,张三,前端工程师')
  })

  it('exportData 在未开启 exportable 时仍可用（编程式 API 与 UI 开关解耦）', () => {
    const el = mount()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    expect(
      el
        .exportData('csv')
        .replace(/^\uFEFF/, '')
        .split('\r\n')[0],
    ).toBe('姓名,年龄,城市')
  })

  it('运行时切换 exportable / export-format：工具栏与按钮即时更新', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('.export-btn')).toBeNull()
    el.setAttribute('exportable', '')
    expect(el.shadowRoot!.querySelectorAll('.export-btn').length).toBe(1)
    el.setAttribute('export-format', 'csv,excel')
    expect(
      [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.export-btn')].map((b) => b.getAttribute('data-format')),
    ).toEqual(['csv', 'excel'])
    el.removeAttribute('exportable')
    expect(el.shadowRoot!.querySelector('.export-btn')).toBeNull()
    expect(el.shadowRoot!.querySelector('.table-toolbar')!.children.length).toBe(0)
  })
})

// 批 F（server 模式导出全量）：exportRows 由宿主传入全量数据集（宿主自取数），
// 复用 CSV / Excel / 剪贴板生成与下载/复制通道导出——与「导出当前展示集」（exportData）互不干扰。
describe('exportRows：宿主传入数据集导出（server / infinite 全量导出通道）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
    vi.restoreAllMocks()
  })

  // 传入 6 行全量；表格当前只装载 DATA（3 行）——导出内容必须等于传入集而非展示集
  const FULL_ROWS = [
    { name: '甲', age: 1, city: '北京' },
    { name: '乙', age: 2, city: '上海' },
    { name: '丙', age: 3, city: '广州' },
    { name: '丁', age: 4, city: '深圳' },
    { name: '戊', age: 5, city: '杭州' },
    { name: '己', age: 6, city: '成都' },
  ]
  const FULL_CSV = `姓名,年龄,城市\r\n${FULL_ROWS.map((r) => `${r.name},${r.age},${r.city}`).join('\r\n')}`

  it('缺省 format=csv：内容 = 传入 rows 全量（含行序/列序），与当前展示集解耦，并派发 oas-export', () => {
    const el = mount() // DATA = 3 行
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const csv = el.exportRows(FULL_ROWS)
    // 带 UTF-8 BOM（与 exportData 同口径）；内容 = 传入集 6 行，不混入展示集
    expect(csv).toBe(`\uFEFF${FULL_CSV}`)
    expect(csv).not.toContain('张三')
    expect(detail).toEqual({ format: 'csv', fileName: 'export.csv', rowCount: 6 })
  })

  it('format=excel + filename 选项：SpreadsheetML 全量行 + 文件名净化', () => {
    const el = mount()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    const xml = el.exportRows(FULL_ROWS, { format: 'excel', filename: '全量/报表' })
    expect(xml).toContain('<Workbook')
    // 表头 1 行 + 数据 6 行
    expect(xml.match(/<Row>/g)!.length).toBe(7)
    expect(detail).toEqual({ format: 'excel', fileName: '全量_报表.xls', rowCount: 6 })
  })

  it('format=clipboard：TSV 写系统剪贴板（mock 通道）+ 事件 format=clipboard + 返回文本', () => {
    const el = mount()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    const tsv = el.exportRows(FULL_ROWS, { format: 'clipboard' })
    expect(tsv.split('\n')).toEqual(['姓名\t年龄\t城市', ...FULL_ROWS.map((r) => `${r.name}\t${r.age}\t${r.city}`)])
    expect(detail).toEqual({ format: 'clipboard', fileName: '', rowCount: 6 })
    // 剪贴板写入在调用内发起（fire-and-forget），同步即可断言
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith(tsv)
  })

  it('列取当前有效列：setColumnOrder 重排后导出列序跟随；actions 列不导出', () => {
    const el = new OASTable()
    el.setAttribute('row-key', 'name')
    el.setAttribute('data', JSON.stringify([{ name: '张三', op: 'x' }]))
    el.columns = [
      { key: 'name', title: '姓名' },
      { key: 'age', title: '年龄' },
      { key: 'op', title: '操作', actions: true },
    ]
    document.body.appendChild(el)
    el.setColumnOrder(['age', 'name'])
    const csv = el.exportRows([{ name: '甲', age: 1 }])
    expect(csv.replace(/^\uFEFF/, '')).toBe('年龄,姓名\r\n1,甲')
  })

  it('serialNumber 列序号按传入集内行序（与当前展示集行号解耦）', () => {
    const el = new OASTable()
    el.columns = [
      { key: 'idx', title: '#', serialNumber: true },
      { key: 'name', title: '姓名' },
    ]
    document.body.appendChild(el)
    const csv = el.exportRows([{ name: 'a' }, { name: 'b' }])
    expect(csv.replace(/^\uFEFF/, '')).toBe('#,姓名\r\n1,a\r\n2,b')
  })

  it('server 模式：exportRows(全量) 无闸门告警；exportData 按钮路径告警口径不变（互不影响）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = new OASTable()
    el.setAttribute('row-model', 'server')
    el.setAttribute('total', '100')
    el.setAttribute('exportable', '')
    document.body.appendChild(el)
    el.setAttribute('data', JSON.stringify([{ name: '甲', age: 1 }]))
    el.setAttribute('columns', COLUMNS)
    const csv = el.exportRows(FULL_ROWS)
    expect(csv).toBe(`\uFEFF${FULL_CSV}`)
    expect(warn).not.toHaveBeenCalled()
    // 展示集导出路径仍按闸门告警一次（不阻断）
    el.exportData('csv')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('导出')
    warn.mockRestore()
  })

  it('空数组：仅表头，rowCount=0，仍派发事件并触发下载', () => {
    const el = mount()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    let detail: unknown
    el.addEventListener('oas-export', (e: Event) => (detail = (e as CustomEvent).detail))
    expect(el.exportRows([])).toBe('\uFEFF姓名,年龄,城市')
    expect(detail).toEqual({ format: 'csv', fileName: 'export.csv', rowCount: 0 })
  })

  it('clipboard 通道：单元格内制表/换行压空格，不破坏 TSV 结构', () => {
    const el = mount()
    const tsv = el.exportRows([{ name: '多\n行', age: 1, city: 'a\tb' }], { format: 'clipboard' })
    expect(tsv).toBe('姓名\t年龄\t城市\n多 行\t1\ta b')
  })

  it('exportRows 与 exportData 互不干扰：调用后展示集导出内容不变', () => {
    const el = mount()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    el.exportRows(FULL_ROWS)
    // 展示集导出仍是 DATA 3 行（金本位：exportData 路径零漂移）
    expect(el.exportData('csv')).toBe('\uFEFF姓名,年龄,城市\r\n张三,30,北京\r\n李四,25,上海\r\n王五,35,深圳')
  })
})
