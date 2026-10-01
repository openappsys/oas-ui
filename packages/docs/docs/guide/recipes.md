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
