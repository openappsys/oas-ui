# 场景食谱

以「完整可拷贝」为标准的组合模式集。每个食谱演示多个组件如何组成一个真实业务形态。

## 多维表格式记录编辑表单

**场景**：`oas-table` 用字段类型列展示结构化记录（badge / 进度 / 日期 / 勾选），点击行弹出 `oas-form` 编辑表单，校验通过后回写表格行——「表格浏览 → 表单编辑」的完整闭环。

<DemoBlock title="点击行弹出编辑表单（校验 + 回写）">
  <oas-table id="recipe-records" row-key="id"
    columns='[{"key":"name","title":"名称","type":"link","width":"150px"},{"key":"cat","title":"类目","type":"select","width":"100px","options":[{"value":"fruit","label":"水果","color":"var(--oas-color-success)"},{"value":"digital","label":"数码","color":"var(--oas-color-primary)"}]},{"key":"stock","title":"库存","type":"number","width":"80px"},{"key":"listed","title":"上架日期","type":"date","width":"110px"},{"key":"on","title":"在售","type":"checkbox","width":"60px"}]'
    data='[{"id":1,"name":"https://example.com/apple","cat":"fruit","stock":15230,"listed":"2026-08-12","on":true},{"id":2,"name":"https://example.com/headphone","cat":"digital","stock":860,"listed":"2026-09-01","on":false}]'>
  </oas-table>
  <oas-dialog id="recipe-dialog" title="编辑记录" style="width: 420px">
    <oas-form id="recipe-form" layout="vertical"></oas-form>
    <div slot="footer">
      <oas-button id="recipe-cancel">取消</oas-button>
      <oas-button id="recipe-save" type="primary">保存</oas-button>
    </div>
  </oas-dialog>
  <p style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    最近保存：<span id="recipe-log">—</span>
  </p>
  <script setup>
    import { onMounted } from 'vue'
    onMounted(() => {
      const table = document.querySelector('#recipe-records')
      const dialog = document.querySelector('#recipe-dialog')
      const form = document.querySelector('#recipe-form')
      const log = document.querySelector('#recipe-log')
      let editingId = null
      // 行点击 → 读取行数据 → 动态构建表单字段 → 弹出
      table.addEventListener('oas-row-click', (e) => {
        const row = JSON.parse(table.getAttribute('data')).find((r) => String(r.id) === e.detail.key)
        if (!row) return
        editingId = row.id
        form.innerHTML = ''
        const fields = [
          { tag: 'oas-input', name: 'stock', label: '库存', value: String(row.stock), rules: [{ required: true, message: '库存必填' }, { pattern: '^\\d+$', message: '须为整数' }] },
          { tag: 'oas-select', name: 'cat', label: '类目', value: row.cat, options: [{ value: 'fruit', label: '水果' }, { value: 'digital', label: '数码' }] },
          { tag: 'oas-date-picker', name: 'listed', label: '上架日期', value: row.listed },
          { tag: 'oas-switch', name: 'on', label: '在售', value: row.on ? 'true' : 'false', 'true-value': 'true', 'false-value': 'false' },
        ]
        for (const f of fields) {
          const field = document.createElement(f.tag)
          field.setAttribute('name', f.name)
          field.setAttribute('label', f.label)
          if (f.value !== undefined) field.setAttribute('value', f.value)
          if (f.options) field.setAttribute('options', JSON.stringify(f.options))
          if (f.rules) field.setAttribute('rules', JSON.stringify(f.rules))
          if (f['true-value']) field.setAttribute('true-value', f['true-value'])
          if (f['false-value']) field.setAttribute('false-value', f['false-value'])
          form.appendChild(field)
        }
        dialog.setAttribute('open', '')
      })
      const close = () => dialog.removeAttribute('open')
      document.querySelector('#recipe-cancel').addEventListener('oas-click', close)
      // 保存 → 校验 → 回写 table data
      document.querySelector('#recipe-save').addEventListener('oas-click', async () => {
        const result = await form.validate()
        if (!result.valid) return
        const v = result.values
        const data = JSON.parse(table.getAttribute('data')).map((r) =>
          r.id === editingId ? { ...r, stock: Number(v.stock), cat: v.cat, listed: v.listed, on: v.on === 'true' } : r,
        )
        table.setAttribute('data', JSON.stringify(data))
        log.textContent = `id=${editingId}：库存 ${v.stock} / 类目 ${v.cat} / ${v.listed} / ${v.on === 'true' ? '在售' : '下架'}`
        close()
      })
    })
  </script>
</DemoBlock>

**模式要点**：

1. **字段类型列负责展示**（`type` 声明即得 badge/日期/勾选态），编辑走表单——展示与编辑各用最合适的组件
2. **行点击读行数据动态构建表单**（字段按行生成，`oas-form` 的 `validate()` 一次性收集 + 校验）
3. **回写是「读全量 → 改一行 → 整体 setAttribute」**（table 数据通道的非受控回写语义，与行内编辑的 `oas-edit` 事件通道互补）
4. 行内快速改单值用 `editable` + `editComponent`（见表格组件页）；整行多字段编辑用本食谱的表单模式

## 看板驱动任务流转

`oas-kanban` 的 `oas-change` 事件即数据变更协议——宿主把 `from/to/index` 映射到后端状态迁移即可：

```ts
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
  <script setup>
    import { onMounted } from 'vue'
    onMounted(() => {
      const records = [
        { id: 1, name: '红富士苹果', cat: '水果', price: 12.8, stock: 15230, on: true },
        { id: 2, name: '阳光玫瑰葡萄', cat: '水果', price: 39.9, stock: 7600, on: true },
        { id: 3, name: '无线降噪耳机', cat: '数码', price: 899, stock: 860, on: false },
        { id: 4, name: '机械键盘', cat: '数码', price: 459, stock: 2341, on: true },
        { id: 5, name: '冷榨橄榄油', cat: '食品', price: 88, stock: 320, on: true },
      ]
      const groups = [...new Set(records.map((r) => r.cat))]
      const host = document.querySelector('#recipe-gallery')
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
        host.appendChild(col)
      }
    })
  </script>
</DemoBlock>

**模式要点**：分组键驱动列（`new Set(records.map(r => r.cat))`）+ 卡片即记录富展示（`oas-card` + `oas-tag` 状态徽章）——画册本质是「分组 + 卡片」的组合，字段类型徽章/格式化沿用表格的 `type` 语义（价格/库存/状态同一套数据）。

## 日历视图（记录按日期铺格）

**场景**：多维表格的「日历」形态——把记录按日期字段铺到日历的日期格。`oas-calendar` 的 `oas-cell-render` 事件是铺格通道（每个日单元格渲染时派发，宿主追加内容）。

<DemoBlock title="上架计划日历（事件点 + 悬停明细）">
  <oas-calendar id="recipe-calendar" value="2026-08-09"></oas-calendar>
  <script setup>
    import { onMounted } from 'vue'
    onMounted(() => {
      const events = [
        { date: '2026-08-12', name: '红富士苹果' },
        { date: '2026-08-12', name: '机械键盘' },
        { date: '2026-08-20', name: '无线降噪耳机' },
        { date: '2026-08-27', name: '冷榨橄榄油' },
      ]
      const cal = document.querySelector('#recipe-calendar')
      cal.addEventListener('oas-cell-render', (e) => {
        // detail.date 是 Date 对象（parseISODate 返回），不是字符串——格式化为 ISO key 再比对（契约错配曾致 demo 死渲染）
        const d = e.detail.date as Date
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
    })
  </script>
</DemoBlock>

**模式要点**：`oas-cell-render` 的 `detail.element` 即日格容器——追加 `.cell-dot`（内置标记点样式）+ `element.title` 承载悬停明细；事件数据按 `date` 字段索引——注意 `detail.date` 是 **Date 对象**（parseISODate 返回），需格式化为 ISO key（`YYYY-MM-DD`）再与事件数据比对（直接 `ev.date === detail.date` 会因类型错配恒 false——本食谱 demo 曾因此死渲染）；与画册共用同一份记录数据时，三种视图（表格/画册/日历）是同一数据的三种投影。
