# Table

Displays structured data in a row-and-column grid with sorting, row selection, multi-select, and a loading state. It can be wired together with a pagination component.

## Basic Usage (with Sorting)

<DemoBlock title="Sortable columns">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"email","title":"邮箱"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","email":"fengshiyi@example.com","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","email":"chenshier@example.com","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","email":"chushisan@example.com","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","email":"weishisi@example.com","position":"运维工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Click a sortable column header to cycle through ascending / descending / no sort.

## Column Alignment and Width

<DemoBlock title="Alignment and width">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","width":"140px"},{"key":"age","title":"年龄","align":"center"},{"key":"city","title":"城市","align":"right"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## Controlled Sorting and Row Selection

<DemoBlock title="Initial sort and selection">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","position":"运维工程师"}]' sort-key="age" sort-order="desc" selected="吴九" row-key="name"></oas-table>
  </div>
</DemoBlock>

`sort-key` / `sort-order` control the sort; `selected` highlights the selected row (clicking a row toggles the selection).

## Multi-Select

<DemoBlock title="Row multi-select (checkable)">
  <div style="width: 100%">
    <oas-table checkable columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","position":"运维工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

The header checkbox selects / clears all rows at once; row checkboxes toggle individually. Selection changes emit `oas-check`.

## Integration with Pagination

<DemoBlock title="Table + pagination">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-paged" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"email","title":"邮箱"},{"key":"position","title":"职位"}]' data="[]"></oas-table>
    <oas-pagination id="table-pager" total="12" page-size="5" current="1"></oas-pagination>
  </oas-space>
</DemoBlock>

Table data is sliced into 5 rows per page; on page change the `data` attribute is updated via the `oas-change` event and the table re-renders.

## Fixed Columns

<DemoBlock title="Left fixed column">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","width":"120px"}]' data='[{"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Left/right fixed columns + sticky header">
  <div style="width: 100%; max-width: 680px">
    <oas-table height="240" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"60px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]' data='[{"id":1,"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"id":2,"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"id":3,"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"id":4,"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"id":5,"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"id":6,"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"id":7,"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"id":8,"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"}]' row-key="id"></oas-table>
  </div>
</DemoBlock>

In the column config, `fixed: 'left' | 'right'` makes that column's header and cells `position: sticky` (the `left` / `right` offset is accumulated automatically from column widths); the remaining columns scroll horizontally, and the header always stays sticky.

## Large Data Sets (Virtual Scroll)

<DemoBlock title="Virtual scroll with 10k rows">
  <div style="width: 100%">
    <oas-table id="table-virtual" height="360" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"70px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","sortable":true,"width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]'></oas-table>
  </div>
</DemoBlock>

Setting `height` enables virtual scrolling (with a fixed `row-height`): only rows within the visible window are rendered. It works together with fixed columns, sorting, and multi-select; scrolling emits `oas-scroll`.

## Stripes and Borders

<DemoBlock title="Striped rows (stripe)">
  <div style="width: 100%">
    <oas-table stripe columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Full border (bordered)">
  <div style="width: 100%">
    <oas-table bordered columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Set `stripe` to alternate the background of odd/even rows, or `bordered` to draw a full grid border around the cells.

## Summary Row

<DemoBlock title="Summary row (summary)">
  <div style="width: 100%">
    <oas-table summary='[{"key":"age","type":"sum","label":"合计"},{"key":"score","type":"avg"}]' columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"score","title":"分数"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"score":92,"city":"北京"},{"name":"李四","age":25,"score":88,"city":"上海"},{"name":"王五","age":35,"score":76,"city":"深圳"},{"name":"赵六","age":28,"score":95,"city":"杭州"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

The `summary` attribute is a JSON array `[{ key, type: 'sum' | 'avg' | 'count', label? }]` rendered as a summary row at the table footer: `label` is shown in the first non-aggregated column, and each aggregated value in its corresponding column. You can also write `summary: 'sum' | 'avg' | 'count'` directly on a column config.

## Expandable Rows

<DemoBlock title="Expandable rows (expand field)">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师","expand":"<div>更多信息：张三 负责前端架构与团队管理，2021 年入职。</div>"},{"name":"李四","age":25,"city":"上海","position":"产品经理","expand":"<div>更多信息：李四 主导产品规划与需求评审，2022 年入职。</div>"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

When a row's data has a non-empty `expand` field, an expand column appears at the end of the table; clicking the button expands the whole row to show custom content. The expanded state is stored in the `expanded` attribute (a comma-separated set of keys), and toggling emits `oas-expand`.

<DemoBlock title="Controlled expansion (expanded attribute)">
  <div style="width: 100%">
    <oas-table expanded="张三" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师","expand":"<div>更多信息：张三 负责前端架构与团队管理，2021 年入职。</div>"},{"name":"李四","age":25,"city":"上海","position":"产品经理"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

`expanded` is a controlled attribute (a comma-separated set of keys): pre-expanded rows open on the first render, and the host can add or remove keys at any time to drive the expansion state (shared by tree parent rows and expandable rows).

## Tree Data

<DemoBlock title="Tree data (children)">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"部门 / 成员"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"研发部","age":"","city":"","children":[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"}]},{"name":"产品部","age":"","city":"","children":[{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"}]}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

Rows with a `children` array are rendered as a tree: parent rows show an expand button in the first column, and child rows are indented by depth. The expanded state is stored in the same `expanded` attribute, and toggling emits `oas-expand`.

## Loading State

<DemoBlock title="Loading state">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-loading" row-key="name" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]'></oas-table>
    <oas-button type="primary" onclick="simulateTableLoading()">模拟加载 2 秒</oas-button>
  </oas-space>
</DemoBlock>

With the `loading` attribute, the header stays visible and the data area shows placeholder rows; removing the attribute restores the data.

## Empty State

<DemoBlock title="Empty data">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="Custom empty text">
  <div style="width: 100%">
    <oas-table empty-text="暂无匹配数据" columns='[{"key":"name","title":"姓名"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Sort and click events">
  <div style="width: 100%">
    <oas-table id="table-event" columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      排序：<span id="table-sort">无</span> · 点击行：<span id="table-row">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

// 通用演示数据集（12 条）
const MOCK = [
  ['张三', 30, '北京', 'zhangsan@example.com', '前端工程师'],
  ['李四', 25, '上海', 'lisi@example.com', '产品经理'],
  ['王五', 35, '深圳', 'wangwu@example.com', '后端工程师'],
  ['赵六', 28, '杭州', 'zhaoliu@example.com', 'UI 设计师'],
  ['孙七', 32, '广州', 'sunqi@example.com', '测试工程师'],
  ['周八', 27, '成都', 'zhouba@example.com', '运营专员'],
  ['吴九', 41, '武汉', 'wujiu@example.com', '技术总监'],
  ['郑十', 24, '南京', 'zhengshi@example.com', '实习生'],
  ['冯十一', 38, '西安', 'fengshiyi@example.com', '架构师'],
  ['陈十二', 29, '苏州', 'chenshier@example.com', '数据分析师'],
  ['褚十三', 33, '天津', 'chushisan@example.com', '项目经理'],
  ['卫十四', 26, '重庆', 'weishisi@example.com', '运维工程师'],
]
const TABLE_ROWS = MOCK.map(([name, age, city, email, position], i) => ({
  id: i + 1,
  name,
  age,
  city,
  email,
  position,
}))

onMounted(() => {
  // 排序与点击事件 demo
  const table = document.querySelector('#table-event')
  table?.addEventListener('oas-sort-change', (e) => {
    const { key, order } = e.detail
    document.querySelector('#table-sort').textContent = order ? `${key} ${order}` : '无'
  })
  table?.addEventListener('oas-row-click', (e) => {
    document.querySelector('#table-row').textContent = e.detail.row.name ?? e.detail.key
  })

  // 大数据量虚拟滚动 demo：1 万行
  const virtual = document.querySelector('#table-virtual')
  if (virtual) {
    const cities = ['北京', '上海', '深圳', '杭州', '广州']
    const positions = ['前端工程师', '后端工程师', '产品经理', '测试工程师', '运营专员']
    const rows = Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `用户 ${i + 1}`,
      age: 20 + (i % 30),
      city: cities[i % cities.length],
      email: `user${i + 1}@example.com`,
      position: positions[i % positions.length],
    }))
    virtual.setAttribute('data', JSON.stringify(rows))
  }

  // 分页联动 demo：按每页 5 条切片写入 data
  const pager = document.querySelector('#table-pager')
  const paged = document.querySelector('#table-paged')
  const pageSize = 5
  const renderPage = (page) => {
    const start = (page - 1) * pageSize
    paged?.setAttribute('data', JSON.stringify(TABLE_ROWS.slice(start, start + pageSize)))
  }
  pager?.addEventListener('oas-change', (e) => renderPage(e.detail.page))
  renderPage(1)

  // 加载态 demo：模拟加载 2 秒
  window.simulateTableLoading = () => {
    const table = document.querySelector('#table-loading')
    table?.setAttribute('loading', '')
    setTimeout(() => table?.removeAttribute('loading'), 2000)
  }
})
</script>

## API

| Attribute                | Description                                                                        | Type    | Default    |
| ------------------------ | ---------------------------------------------------------------------------------- | ------- | ---------- |
| `columns`                | Column config `[{ key, title, sortable?, width?, align?, fixed?, render?, summary? }]`, JSON string | string  | `[]`       |
| `data`                   | Row data `[{ [key]: value, children?, expand? }]`, JSON string                     | string  | `[]`       |
| `sort-key` / `sort-order`| Controlled sort; `sort-order` is `asc` / `desc` / empty                            | string  | —          |
| `row-key`                | Unique key field of a row                                                          | string  | `key`      |
| `selected`               | Set of selected row keys (comma-separated)                                         | string  | —          |
| `empty-text`             | Empty state text                                                                   | string  | `暂无数据` |
| `checkable`              | Enables checkbox multi-select                                                      | boolean | `false`    |
| `loading`                | Loading state: shows placeholder rows in the data area (header retained)           | boolean | `false`    |
| `height`                 | Virtual scroll viewport height (px); when set, only visible-window rows plus head/tail placeholders are rendered | number  | —          |
| `row-height`             | Fixed row height for virtual scrolling (px)                                        | number  | `40`       |
| `stripe`                 | Zebra striping: alternating light background for odd/even rows                     | boolean | `false`    |
| `bordered`               | Full border: draws a grid outline around cells (the outer frame is built in)       | boolean | `false`    |
| `expanded`               | Set of expanded row keys (comma-separated; shared by tree parent rows and expandable rows) | string  | —          |
| `summary`                | Summary config `[{ key, type: 'sum'\|'avg'\|'count', label? }]`, JSON string       | string  | —          |

> Note: `columns.render` is a function type and can only be assigned via the property from JS — it cannot be expressed as a JSON string. For `fixed` columns it is recommended to declare `width` explicitly (sticky offsets fall back to 100px when omitted). Summary can also be written directly on a column as `summary: 'sum' | 'avg' | 'count'`; `children` (tree child rows) and `expand` (expandable row content) are both row data fields.

| Event            | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `oas-sort-change`| Sort change, `detail: { key, order: 'asc' \| 'desc' \| '' }`          |
| `oas-row-click`  | Row click (also toggles selection when not checkable), `detail: { row, key }` |
| `oas-check`      | Checkbox selection change, `detail: { keys: string[] }`               |
| `oas-scroll`     | Virtual scroll event (rAF throttled), `detail: { scrollTop, start, end }` |
| `oas-expand`     | Row expand/collapse (tree child rows or expandable content rows), `detail: { key, expanded }` |

The loading placeholder row is exposed as `::part(loading-row)`, the summary row as `::part(summary-row)`, and the expandable content row as `::part(expand-row)`; each can be styled independently.
