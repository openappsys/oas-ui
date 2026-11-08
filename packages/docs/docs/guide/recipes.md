# 场景方案

以「完整可拷贝」为标准的组合模式集。每个食谱演示多个组件如何组成一个真实业务形态。

## 多维表格式记录编辑表单

**场景**：`oas-table` 用字段类型列展示结构化记录（badge / 进度 / 日期 / 勾选），点击行弹出 `oas-form` 编辑表单，校验通过后回写表格行——「表格浏览 → 表单编辑」的完整闭环。

<DemoBlock title="点击行弹出编辑表单（校验 + 回写）">
  <oas-table id="recipe-records" row-key="id"
    columns='[{"key":"name","title":"名称","type":"link","width":"150px"},{"key":"cat","title":"类目","type":"select","width":"100px","options":[{"value":"fruit","label":"水果","color":"var(--oas-color-success)"},{"value":"digital","label":"数码","color":"var(--oas-color-primary)"}]},{"key":"stock","title":"库存","type":"number","width":"80px"},{"key":"listed","title":"上架日期","type":"date","width":"110px"},{"key":"on","title":"在售","type":"checkbox","width":"60px"}]'
    data='[{"id":1,"name":"https://example.com/apple","cat":"fruit","stock":15230,"listed":"2026-08-12","on":true},{"id":2,"name":"https://example.com/headphone","cat":"digital","stock":860,"listed":"2026-09-01","on":false}]'>
  </oas-table>
  <oas-modal id="recipe-modal" title="编辑记录" style="width: 420px">
    <oas-form id="recipe-form" layout="vertical"></oas-form>
    <div slot="footer">
      <oas-button id="recipe-cancel">取消</oas-button>
      <oas-button id="recipe-save" type="primary">保存</oas-button>
    </div>
  </oas-modal>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    最近保存：<span id="recipe-log">—</span>
  </p>
</DemoBlock>

**模式要点**：

1. **字段类型列负责展示**（`type` 声明即得 badge / 日期 / 勾选态），编辑走表单——展示与编辑各用最合适的组件
2. **行点击读行数据动态构建表单**（字段按行生成）；校验规则 `rules` 声明在 **`oas-form` 上**（形状 `{ 字段名: [{ required, pattern, message, ... }] }`，按字段 `name` 取规则）——保存调 `form.submit()`，校验通过后表单派发 `oas-submit`（`detail.values` 即按 `name` 收集的全表值）
3. **回写是「读全量 → 改一行 → 整体 setAttribute」**（表格数据通道的非受控回写语义，与行内编辑通道互补）
4. 行内快速改单值用 `editable` + `editComponent`（见表格组件页）；整行多字段编辑用本食谱的表单模式

## 看板驱动任务流转

`oas-kanban` 的 `oas-change` 事件即数据变更协议——宿主把 `from/to/index` 映射到后端状态迁移即可：

```ts
const laneField = 'state' // 泳道字段（按业务实际字段名替换）
document.querySelector('oas-kanban').addEventListener('oas-change', async (e) => {
  const { id, from, to, index, ids, swimlane } = e.detail
  await api.moveCards({
    cardIds: ids ?? [id], // 多选批量时 ids 为数组
    toColumn: to,
    toIndex: index,
    ...(swimlane ? { [laneField]: swimlane.to } : {}),
  })
})
```

WIP 限制为提示语义（`data-over-limit` 标记），强制阻断由宿主在事件后自行回退。

## 画册视图（按字段分组的卡片墙）

**场景**：多维表格的「画册」形态——记录不按行展示，而是按某字段值分组，每组一叠富卡片。用 `oas-card` + 分组渲染即可拼装，无需专门组件。

<DemoBlock title="按类目分组的商品画册">
  <div id="recipe-gallery" style="display: flex; gap: var(--oas-space-4); align-items: flex-start"></div>
</DemoBlock>

**模式要点**：分组键驱动列（`new Set(records.map(r => r.cat))`）+ 卡片即记录富展示（`oas-card` + `oas-tag` 状态徽章）——画册本质是「分组 + 卡片」的组合，字段类型徽章 / 格式化沿用表格的 `type` 语义（价格 / 库存 / 状态同一套数据）。

## 日历视图（记录按日期铺格）

**场景**：多维表格的「日历」形态——把记录按日期字段铺到日历的日期格。`oas-calendar` 的 `oas-cell-render` 事件是铺格通道（每个日单元格渲染时派发，宿主追加内容）。

<DemoBlock title="上架计划日历（事件点 + 悬停明细）">
  <oas-calendar id="recipe-calendar" value="2026-08-09"></oas-calendar>
</DemoBlock>

**模式要点**：`oas-cell-render` 的 `detail.element` 即日格容器——追加 `.cell-dot`（内置标记点样式）+ `element.title` 承载悬停明细；事件数据按 `date` 字段索引——注意 `detail.date` 是 **Date 对象**（`parseISODate` 返回），需格式化为 ISO key（`YYYY-MM-DD`）再与事件数据比对（直接 `ev.date === detail.date` 会因类型错配恒 false）；与画册共用同一份记录数据时，三种视图（表格 / 画册 / 日历）是同一数据的三种投影。

<script setup>
import { onMounted } from 'vue'
import { whenTagDefined } from '../.vitepress/theme/when-defined'

onMounted(() => {
  // ① 记录编辑表单：行点击 → 动态建字段 → form.submit() 校验 → oas-submit 回写
    const table = document.querySelector('#recipe-records')
    const modal = document.querySelector('#recipe-modal')
    const form = document.querySelector('#recipe-form')
    const log = document.querySelector('#recipe-log')
    if (table && modal && form) {
      let editingId = null
      // 校验规则声明在 form 级（形状 { 字段名: Rule[] }），按字段 name 取用
      form.setAttribute(
        'rules',
        JSON.stringify({
          stock: [
            { required: true, message: '库存必填' },
            { pattern: '^\\d+$', message: '须为整数' },
          ],
        }),
      )
      table.addEventListener('oas-row-click', (e) => {
        const row = e.detail.row
        if (!row) return
        editingId = row.id
        form.innerHTML = ''
        const fields = [
          { tag: 'oas-input', name: 'stock', label: '库存', value: String(row.stock) },
          { tag: 'oas-select', name: 'cat', label: '类目', value: row.cat, options: [{ value: 'fruit', label: '水果' }, { value: 'digital', label: '数码' }] },
          { tag: 'oas-date-picker', name: 'listed', label: '上架日期', value: row.listed },
          { tag: 'oas-switch', name: 'on', label: '在售', checked: !!row.on },
        ]
        for (const f of fields) {
          const field = document.createElement(f.tag)
          field.setAttribute('name', f.name)
          if (f.label) field.setAttribute('label', f.label)
          // input / select / date-picker 走 value 属性；switch 只观察 checked（初值注入走 checked）
          if (f.value !== undefined) field.setAttribute('value', f.value)
          if (f.checked) field.setAttribute('checked', '')
          if (f.options) field.setAttribute('options', JSON.stringify(f.options))
          form.appendChild(field)
        }
        modal.setAttribute('visible', '')
      })
      document.querySelector('#recipe-cancel')?.addEventListener('oas-click', () => modal.removeAttribute('visible'))
      document.querySelector('#recipe-save')?.addEventListener('oas-click', () => form.submit())
      // 校验通过 → oas-submit（detail.values 为按 name 收集的全表值）
      form.addEventListener('oas-submit', (e) => {
        const v = e.detail.values
        const data = JSON.parse(table.getAttribute('data')).map((r) =>
          r.id === editingId ? { ...r, stock: Number(v.stock), cat: v.cat, listed: v.listed, on: v.on === 'true' } : r,
        )
        table.setAttribute('data', JSON.stringify(data))
        log.textContent = `id=${editingId}：库存 ${v.stock} / 类目 ${v.cat} / ${v.listed} / ${v.on === 'true' ? '在售' : '下架'}`
        modal.removeAttribute('visible')
      })
    }

    // ② 画册：按字段分组构建卡片墙
    const gallery = document.querySelector('#recipe-gallery')
    if (gallery) {
      const records = [
        { id: 1, name: '红富士苹果', cat: '水果', price: 12.8, stock: 15230, on: true },
        { id: 2, name: '阳光玫瑰葡萄', cat: '水果', price: 39.9, stock: 7600, on: true },
        { id: 3, name: '无线降噪耳机', cat: '数码', price: 899, stock: 860, on: false },
        { id: 4, name: '机械键盘', cat: '数码', price: 459, stock: 2341, on: true },
        { id: 5, name: '冷榨橄榄油', cat: '食品', price: 88, stock: 320, on: true },
      ]
      const groups = [...new Set(records.map((r) => r.cat))]
      for (const g of groups) {
        const col = document.createElement('div')
        col.style.cssText = 'display:flex;flex-direction:column;gap:var(--oas-space-2);min-width:180px'
        const head = document.createElement('strong')
        head.textContent = `${g}（${records.filter((r) => r.cat === g).length}）`
        head.style.color = 'var(--oas-color-text-secondary)'
        col.appendChild(head)
        for (const r of records.filter((x) => x.cat === g)) {
          const card = document.createElement('oas-card')
          card.setAttribute('title', r.name)
          const body = document.createElement('div')
          body.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px'
          const price = document.createElement('span')
          price.textContent = `¥${r.price}`
          const tag = document.createElement('oas-tag')
          tag.setAttribute('type', r.on ? 'success' : 'default')
          tag.textContent = r.on ? '在售' : '下架'
          body.append(price, tag)
          const meta = document.createElement('div')
          meta.style.cssText = 'color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm)'
          meta.textContent = `库存 ${r.stock.toLocaleString()}`
          card.append(body, meta)
          col.appendChild(card)
        }
        gallery.appendChild(col)
      }
    }

    // ③ 日历：oas-cell-render 铺事件点
    const cal = document.querySelector('#recipe-calendar')
    if (cal) {
      const events = [
        { date: '2026-08-12', name: '红富士苹果' },
        { date: '2026-08-12', name: '机械键盘' },
        { date: '2026-08-20', name: '无线降噪耳机' },
        { date: '2026-08-27', name: '冷榨橄榄油' },
      ]
      cal.addEventListener('oas-cell-render', (e) => {
        // detail.date 是 Date 对象（parseISODate 返回），格式化为 ISO key 再与事件数据比对
        const d = e.detail.date
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const dayEvents = events.filter((ev) => ev.date === dayKey)
        if (dayEvents.length === 0) return
        // 事件点（内置 cell-dot 形态）+ title 悬停明细——同日多事件合并为单点（避免绝对定位同坐标重叠）
        const dot = document.createElement('span')
        dot.className = 'cell-dot'
        dot.title = dayEvents.map((ev) => ev.name).join('、')
        e.detail.element.appendChild(dot)
        e.detail.element.title = dayEvents.map((ev) => ev.name).join('、')
      })
    }

    // ④ Action Sheet：drawer（bottom + no-mask）+ list 动作项，点项关抽屉并更新反馈徽章
    const sheet = document.querySelector('#recipe-sheet')
    const sheetOpen = document.querySelector('#recipe-sheet-open')
    const sheetAction = document.querySelector('#recipe-sheet-action')
    if (sheet && sheetOpen && sheetAction) {
      sheetOpen.addEventListener('oas-click', () => sheet.setAttribute('visible', ''))
      const sheetPick = (label) => {
        sheetAction.textContent = label
        sheet.removeAttribute('visible')
      }
      for (const item of sheet.querySelectorAll('oas-list-item[data-action]')) {
        item.addEventListener('oas-click', () => sheetPick(item.getAttribute('data-action')))
      }
      document.querySelector('#recipe-sheet-cancel')?.addEventListener('oas-click', () => sheet.removeAttribute('visible'))
    }

    // ⑤ 终端面板：黑底配方（token 覆写）+ 命令行回显（whenDefined 防升级前 expando 遮蔽 lines/value setter）
    whenTagDefined('oas-log', () => {
      const termLog = document.querySelector('#recipe-term-log')
      const termInput = document.querySelector('#recipe-term-input')
      const termClear = document.querySelector('#recipe-term-clear')
      if (!termLog || !termInput || !termClear) return
      const termLines = ['OAS 终端就绪。输入 help 查看可用命令。']
      const termLevels = ['']
      const termEcho = (text, level = '') => {
        termLines.push(text)
        termLevels.push(level)
      }
      const termFlush = () => {
        termLog.lines = [...termLines]
        // levels 只有 attribute 通道（无 property setter），必须走 setAttribute
        termLog.setAttribute('levels', JSON.stringify(termLevels))
      }
      termFlush()
      termInput.addEventListener('oas-enter', (e) => {
        const raw = (e.detail?.value ?? '').trim()
        if (!raw) return
        if (raw === 'clear') {
          termLines.length = 0
          termLevels.length = 0
        } else {
          termEcho(`$ ${raw}`, 'info')
          if (raw === 'help') termEcho('可用命令：help / date / echo <文本> / clear', 'success')
          else if (raw === 'date') termEcho(new Date().toLocaleString(), 'success')
          else if (raw.startsWith('echo')) termEcho(raw.slice(4).trim() || '（空）', '')
          else termEcho(`command not found: ${raw}（输入 help 查看可用命令）`, 'error')
        }
        termFlush()
        termInput.value = ''
      })
      termClear.addEventListener('oas-click', () => {
        termLines.length = 0
        termLevels.length = 0
        termFlush()
      })
    })

    // ⑥ JSON 格式化对照：同一数据两种读法（树形 vs 文本），数据只存一份对象
    const jsonTree = document.querySelector('#recipe-json-tree')
    const jsonDiff = document.querySelector('#recipe-json-diff')
    const jsonMode = document.querySelector('#recipe-json-mode')
    if (jsonTree && jsonDiff && jsonMode) {
      const recipeJsonData = {
        order: 'SO-2026-1103',
        status: 'shipped',
        items: [
          { sku: 'OAS-CORE-01', name: 'Core 运行时', qty: 2, price: 0 },
          { sku: 'OAS-ICN-24', name: '图标包 24px', qty: 1, price: 12 },
        ],
        shipping: { carrier: 'SF', tracking: 'SF3100110024', eta: '2026-11-05' },
        tags: ['priority', 'b2b'],
      }
      const prettyJson = JSON.stringify(recipeJsonData, null, 2)
      const compactJson = JSON.stringify(recipeJsonData)
      const applyJsonMode = (mode) => {
        const pretty = mode !== 'compact'
        jsonTree.setAttribute('text', pretty ? prettyJson : compactJson)
        jsonDiff.setAttribute('old-text', pretty ? compactJson : prettyJson)
        jsonDiff.setAttribute('new-text', pretty ? prettyJson : compactJson)
        jsonDiff.setAttribute('old-label', pretty ? '压缩原文' : '格式化')
        jsonDiff.setAttribute('new-label', pretty ? '格式化' : '压缩后')
        jsonMode.setAttribute('value', pretty ? 'pretty' : 'compact')
      }
      applyJsonMode('pretty')
      jsonMode.addEventListener('oas-change', (e) => applyJsonMode(e.detail.value))
    }
})

    // ⑦ 表格内嵌图表：render(row) 返回 oas-chart 容器（columns 走 property；whenDefined 守卫 = 全页 demo 纪律）
    onMounted(() => {
    const sparkTable = document.querySelector('#recipe-sparkline')
    if (sparkTable) {
      const sparkSeries = [
        { name: '官网', values: [12, 18, 15, 24, 30, 28, 36] },
        { name: 'App', values: [8, 9, 14, 12, 19, 22, 27] },
        { name: '小程序', values: [22, 19, 24, 21, 18, 25, 23] },
      ]
      void customElements.whenDefined('oas-table').then(() => {
        sparkTable.columns = [
          { key: 'name', title: '渠道', width: 90 },
          {
            key: 'trend',
            title: '近 7 日趋势',
            width: 180,
            render: (row) => {
              const wrap = document.createElement('div')
              wrap.style.cssText = 'width: 150px; height: 32px'
              const chart = document.createElement('oas-chart')
              chart.setAttribute('type', 'area')
              chart.style.cssText = 'width: 100%; height: 100%; display: block'
              chart.setAttribute('aria-label', `${row.name} 近 7 日趋势`)
              // oas-chart 的 data/options 也是 attribute JSON 通道（无同名 property setter）
              chart.setAttribute(
                'data',
                JSON.stringify({
                  labels: ['一', '二', '三', '四', '五', '六', '日'],
                  series: [{ name: row.name || '', data: row.trend || [] }],
                }),
              )
              chart.setAttribute('options', JSON.stringify({ showLegend: false }))
              wrap.appendChild(chart)
              return wrap
            },
          },
          { key: 'total', title: '周合计', width: 80, align: 'end' },
        ]
        sparkTable.setAttribute(
          'data',
          JSON.stringify(
            sparkSeries.map((s) => ({
              name: s.name,
              trend: s.values,
              total: s.values.reduce((a, b) => a + b, 0),
            })),
          ),
        )
      })
    }
    })

onMounted(() => {
    // ⑧ AI 会话三段式：折叠思考 + 流式气泡 + 动作条
    const aiRun = document.querySelector('#recipe-ai-run')
    const aiAnswer = document.querySelector('#recipe-ai-answer')
    const aiStatus = document.querySelector('#recipe-ai-status')
    const aiThinking = document.querySelector('#recipe-ai-thinking')
    const AI_TEXT = '已按金额降序排列昨天的 12 笔订单：最高 ¥8,420（订单 A-1007），最低 ¥36（A-1018）。合计 ¥23,904。需要导出 CSV 吗？'
    if (aiRun && aiAnswer && aiStatus) {
      let timer = null
      aiRun.addEventListener('click', () => {
        if (timer) return // 防重入：流式中再点无效
        aiRun.setAttribute('loading', '')
        aiAnswer.textContent = ''
        aiStatus.textContent = '思考中…'
        // 思考阶段：展开折叠块让读者看到推理链（真实产品里由模型侧事件驱动）
        if (aiThinking) aiThinking.setAttribute('active', 't')
        setTimeout(() => {
          aiStatus.textContent = '输出中…'
          let i = 0
          timer = setInterval(() => {
            i += 3
            aiAnswer.textContent = AI_TEXT.slice(0, i)
            if (i >= AI_TEXT.length) {
              clearInterval(timer)
              timer = null
              aiRun.removeAttribute('loading')
              aiStatus.textContent = '完成（oas-range 无关——滚动跟随由 auto-scroll 负责）'
            }
          }, 40)
        }, 700)
      })
      document
        .querySelector('#recipe-ai oas-message-actions')
        ?.addEventListener('oas-action', (e) => {
          aiStatus.textContent = `动作「${e.detail.key}」（message-id: ${e.detail.messageId}）——宿主接事件后自写业务`
        })
    }
})

</script>

## 多项目甘特树 + 资源项目优先级

多项目不引入第二个 gantt 实例：给每个项目建一个根摘要任务（`type:"summary"`），项目任务作为 `children`/`parent` 子级；项目根、任务条、依赖和虚拟滚动共用一棵树。资源侧用 task 的 `project` 字段 + `levelResources({ projectOrder })` 把「项目优先级」传给均载。

```ts
const tasks = [
  { id: `p-a`, name: `项目 A`, type: `summary`, start: `2026-03-02`, end: `2026-03-13`, children: [
    { id: `a1`, name: `A 设计`, start: `2026-03-02`, end: `2026-03-06`, project: `A` },
  ]},
]
const leveled = levelResources(resources, resourceTasks, { projectOrder: [`A`, `B`] })
```

- 项目根只负责分组/汇总，依赖写在叶子任务上；跨项目依赖与普通依赖同构。
- 资源均载仍按 `projectOrder` 排序，靠后项目先让位；不会修改 gantt 的项目根日期。

## Action Sheet：移动端动作菜单

**场景**：移动端「更多操作」——从底部滑出一组动作，危险动作单独标红，取消独立成组。`oas-drawer`（`placement="bottom"` + `no-mask`）装 `oas-list` 动作项即可拼装，不需要新增一个「动作面板」组件：滑入动画、外点/Esc 关闭与滚动锁定是抽屉内置能力（`no-mask` 为非模态形态，不提供焦点陷阱）；动作项的可聚焦、Enter/Space 触发与 `oas-click` 回传是列表内置能力。

<DemoBlock title="打开 Action Sheet（点项有反馈，外点 / Esc / 取消均可关闭）">
  <div style="width: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: var(--oas-space-3)">
    <oas-button id="recipe-sheet-open" type="primary">打开 Action Sheet</oas-button>
    <p role="status" style="margin: 0; font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">
      最近动作：<oas-tag id="recipe-sheet-action" type="default">未选择</oas-tag>
    </p>
  </div>
  <oas-drawer id="recipe-sheet" class="recipe-sheet" placement="bottom" no-mask no-header no-footer height="256" label="操作选项">
    <div style="display: flex; flex-direction: column; gap: var(--oas-space-2)">
      <oas-list split size="lg">
        <oas-list-item clickable data-action="拍照"><span slot="title">拍照</span></oas-list-item>
        <oas-list-item clickable data-action="从相册选择"><span slot="title">从相册选择</span></oas-list-item>
        <oas-list-item clickable data-action="删除"><span slot="title" style="color: var(--oas-color-danger)">删除</span></oas-list-item>
      </oas-list>
      <oas-list split size="lg">
        <oas-list-item clickable id="recipe-sheet-cancel"><span slot="title">取消</span></oas-list-item>
      </oas-list>
    </div>
  </oas-drawer>
</DemoBlock>

**模式要点**：

1. `no-mask` 不渲染遮罩但保留「点击外部关闭」的取消语义；Esc 关闭由抽屉内置（滚动锁定也是内置，`no-mask` 为非模态抽屉、无焦点陷阱），关闭来源可从 `oas-close` 的 `detail.source` 区分（`esc` / `mask`）
2. **危险项不是组件属性**——列表项没有 danger 通道，宿主给 `slot="title"` 落 `var(--oas-color-danger)` 即得语义色；这正是组合的可塑之处
3. 取消独立成组（视觉分隔 + 语义分离）；动作项点击后宿主关闭抽屉并更新反馈徽章（`role="status"` 行，读屏可感知）；`no-header` + `no-mask` 的抽屉没有可见标题，用 `label="操作选项"` 提供 `aria-label` 可访问名（否则读屏只听得到「对话框」）
4. 圆角顶部是页面级 `::part(panel)` 覆写（见本页底部样式）——抽屉面板不自带圆角，这类「最后一公里」留给配方；纵向抽屉高度必须显式声明（`height` 只接受具体长度，缺省 320px）

## 终端面板：黑底日志 + 命令行

**场景**：部署 / 构建控制台——黑底、等宽、带行号的输出流，顶部状态与清屏，底部命令行。全部用现有组件拼装：`oas-log`（行号、语义色、空态）+ `oas-tag`（运行状态）+ `oas-button`（清屏）+ `oas-input`（回车派发 `oas-enter`）。黑底靠**容器级 token 覆写**：在配方容器上覆写一组颜色 token，CSS 自定义属性穿透 shadow，子树里所有组件自动换肤——终端配色是场景固定色（不随明暗主题翻转），这正是「配方」与「组件」的分工。

<DemoBlock title="终端模拟（help / date / echo 文本 / clear）">
  <div class="recipe-term">
    <div class="recipe-term__bar">
      <oas-tag id="recipe-term-status" type="success">运行中</oas-tag>
      <span class="recipe-term__title">deploy@oas-ui:~/app</span>
      <oas-button id="recipe-term-clear" size="small">清屏</oas-button>
    </div>
    <oas-log id="recipe-term-log" line-number style="height: 220px; width: 100%"></oas-log>
    <oas-input id="recipe-term-input" placeholder="输入命令后回车（help / date / echo 文本 / clear）" style="width: 100%"></oas-input>
  </div>
</DemoBlock>

**模式要点**：

1. token 覆写只写在配方容器 `.recipe-term` 上，页面其他区域不受影响；覆写集只挑子树组件实际引用的变量（bg / bg-hover / text / border / log 与 tag 引用的语义色 `-text` 四件——黑底上语义行必须用暗底安全档，否则继承站点主题的 light 深色档会不可读）
2. 输出行与语义色用两个数组（`lines` / `levels` 索引对齐）维护：命令回显落 `info`，成功输出落 `success`，未知命令落 `error`——语义色由 log 映射 token（暗色自动换色）
3. 清屏有两条同效路径（工具行按钮 / `clear` 命令），都走数据通道 `lines = []`——清空后 log 内置空态自然浮现
4. 空命令直接忽略，不产生空行；提交后清空输入框走受控 `value` 通道（不派发事件）

## 表格内嵌图表：把 sparkline 放进单元格

**场景**：数据看板里「趋势」列——一行一个迷你图（sparkline），比一列数字直观得多。**不需要任何新组件**：`oas-table` 的列渲染通道（`columns` 的 `render` 函数字段，JS property 通道）+ `oas-chart`（`type="area"` 关图例）就是全部材料。图表是声明式标签，塞进单元格模板即完成组合。

<DemoBlock title="趋势列 = oas-chart sparkline（列 render 通道组合）">
  <oas-table id="recipe-sparkline" aria-label="各渠道周趋势"></oas-table>
</DemoBlock>

**模式要点**：

1. `columns` 带函数字段（`render`）时**必须走 JS property 赋值**（attribute 只收 JSON，函数字段无法序列化）；**签名是 `render(row)` 单参**（行对象），返回字符串走文本、**返回 Node/元素直接挂载**（富内容通道，本配方的图表容器即靠它）；`data` 本体走 attribute JSON 通道（组件无 `data` property setter）——两套通道各走各的
2. **赋值必须在 `customElements.whenDefined('oas-table')` 之后**（组件经主题动态 import 晚注册，升级前赋值会变 expando 被吞）——同页所有 demo 的既有纪律
3. sparkline 三件套：容器 div 定尺寸（150×32 级）+ `options.showLegend:false` 关图例 + `type="area"` 纯色半透明面（需要纵深感再开 `gradient`）；图表 `width/height:100%` 填满容器，颜色默认走 token 系暗色自动换档，要定制用 `options.colors`
4. 大数据量/高频更新别走全量 `data` 属性反射（序列化双份开销）——看板场景喂当前页切片；需要服务端切片时走 `windowed` 模式


## AI 会话：thinking 折叠块 + 流式气泡 + 消息动作

**场景**：AI 助手回复的标准三段式——思考过程默认折叠（点开看推理链）、正文流式逐字输出、行尾动作条（复制/重试/重新生成）。**不需要任何新组件**：`oas-collapse` 折思考、`oas-bubble` 装正文、`oas-message-actions` 挂动作，三个既有件的组合即主流 AI 产品形态。

<DemoBlock title="AI 回复三段式：折叠思考 + 流式正文 + 动作条">
  <div style="width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-message-scroller id="recipe-ai" style="max-height: 320px" default-position="end" auto-scroll>
      <oas-message-row align="end">
        <oas-avatar slot="avatar" size="32">我</oas-avatar>
        <oas-bubble variant="secondary">帮我把昨天的订单按金额排个序</oas-bubble>
      </oas-message-row>
      <oas-message-row>
        <oas-avatar slot="avatar" size="32">AI</oas-avatar>
        <span slot="header">助手 · 10:03</span>
        <oas-collapse id="recipe-ai-thinking" style="font-size: var(--oas-font-size-sm)">
          <oas-collapse-item name="t" header="思考过程（2 步）">
            <ol style="margin: 0; padding-inline-start: var(--oas-space-5); color: var(--oas-color-text-secondary)">
              <li>解析「昨天」→ 2026-11-07（宿主时区）</li>
              <li>定位订单数据并确认金额字段单位</li>
            </ol>
          </oas-collapse-item>
        </oas-collapse>
        <oas-bubble id="recipe-ai-answer">（点下方「开始流式回答」）</oas-bubble>
        <oas-message-actions slot="footer" message-id="m-1" actions='[{"key":"copy","label":"复制"},{"key":"retry","label":"重试"},{"key":"regenerate","label":"重新生成"}]'></oas-message-actions>
      </oas-message-row>
    </oas-message-scroller>
    <div style="display: flex; gap: var(--oas-space-2); align-items: center">
      <oas-button id="recipe-ai-run" size="small" type="primary">开始流式回答</oas-button>
      <span id="recipe-ai-status" role="status" style="font-size: var(--oas-font-size-sm); color: var(--oas-color-text-secondary)">待开始</span>
    </div>
  </div>
</DemoBlock>

**模式要点**：

1. **thinking 块 = 折进消息行的默认插槽**：`oas-message-row` 的默认插槽是自由 content 容器（不只放 bubble）——`oas-collapse` 折推理链，折叠头写步数/耗时，读者自选展开；建议默认收起，回答完再让宿主决定展开态
2. **流式 = 原地更新文本，不新建节点**：逐 token 改 `oas-bubble` 的文本内容（`textContent`）；`message-scroller` 的 `auto-scroll` 只跟随贴底读者——读者上翻时不抢视口（既有纪律，正是 IM/AI 双模式的分界）；**别逐 token appendChild**（DOM 爆炸 + 滚动抖动）
3. **动作条 = `oas-message-actions` 挂 footer 插槽**：`actions` 声明式 key/label；点击派 `oas-action`（detail 带 message-id + key）——复制走 `navigator.clipboard`（宿主接事件后自写），重试/重新生成是宿主业务，组件不内置语义
## JSON 格式化对照：树形 vs 文本两种读法

**场景**：排查接口数据时，同一份数据有两种读法——**树形读法**看结构（展开、搜索、复制子树），**文本读法**看字节（原文长什么样、格式化动了什么）。左 `oas-json-viewer`（树形）、右 `oas-diff-viewer`（压缩原文 ↔ 格式化文本对照）。数据只存一份对象，两种形态都是 `JSON.stringify` 的投影——不要维护两份文本。

<DemoBlock title="同一数据的两种读法（可切换格式化 / 压缩视图）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-segmented
      id="recipe-json-mode"
      options='[{"label":"格式化视图","value":"pretty"},{"label":"压缩视图","value":"compact"}]'
      value="pretty"
      aria-label="切换 JSON 视图"
    ></oas-segmented>
    <div class="recipe-json-panes">
      <div class="recipe-json-pane">
        <p>树形读法（结构）</p>
        <oas-json-viewer id="recipe-json-tree" height="320" default-expand-depth="2" aria-label="订单数据 JSON 树"></oas-json-viewer>
      </div>
      <div class="recipe-json-pane">
        <p>文本读法（字节）</p>
        <oas-diff-viewer id="recipe-json-diff" mode="split" wrap height="320" old-label="压缩原文" new-label="格式化"></oas-diff-viewer>
      </div>
    </div>
  </div>
</DemoBlock>

**模式要点**：

1. 分段器切换两种视图：**格式化**看「压缩 → 格式化」的 diff（格式化加了什么）；**压缩**方向翻转（格式化 → 压缩，看压缩去了什么）
2. 树形面板的 `text` 也随视图切换（喂压缩串或格式化串）——两种视图下树完全一致，直观证明「结构读法与空白无关」
3. diff 面板 `mode="split"`（窄容器自动降级 unified，组件内置响应式）+ `wrap` 保长行可读；列头用 `old-label` / `new-label` 写清语义
4. 树形面板配套能力随取随用：搜索框（工具栏内置）、`expandAll()` / `collapseAll()`、`copyJson()` 复制子树

<style>
/* —— Action Sheet：底部圆角顶部（抽屉面板不自带圆角，配方在页面级补） —— */
.recipe-sheet::part(panel) {
  border-radius: var(--oas-radius-lg) var(--oas-radius-lg) 0 0;
}

/* —— 终端面板：黑底配方（容器级 token 覆写穿透 shadow；终端配色固定，不随主题翻转） —— */
.recipe-term {
  --oas-color-bg: #0b0f14;
  --oas-color-bg-hover: #141a22;
  --oas-color-text-primary: #d6dee8;
  --oas-color-text-secondary: #b0bdd0;
  --oas-color-text-disabled: #5d6b7d;
  --oas-color-border: #263140;
  --oas-color-border-strong: #3a465a;
  /* log 语义行与 tag 状态徽章引用的语义色 -text：不覆写会继承站点主题的 light 深色档
     （如 success-text #11813a），压黑底感知分仅 ~26——覆写为暗底安全档（黑底上 68~73，
     离线按 packages/theme/oklab.ts 同公式逐色复核）。 */
  --oas-color-success-text: #4ade80;
  --oas-color-warning-text: #fbbf24;
  --oas-color-danger-text: #fbb2b2;
  --oas-color-info-text: #23d3ef;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-3);
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
.recipe-term__bar {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
}
.recipe-term__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}

/* —— JSON 对照：左右分栏（窄屏叠放） —— */
.recipe-json-panes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--oas-space-3);
  min-width: 0;
}
.recipe-json-pane {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.recipe-json-pane > p {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
@media (max-width: 720px) {
  .recipe-json-panes {
    grid-template-columns: 1fr;
  }
}
</style>
