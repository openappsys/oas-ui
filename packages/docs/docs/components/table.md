# Table 表格

用于以行列表格形式展示结构化数据，支持排序、行选中、多选与加载态，可与分页组件联动。

`columns` / `data` 支持 attribute 声明式通道：直接写 JSON 字符串即可渲染表头与数据行（非法 JSON 回退空态），同时保留 property 通道（赋值数组对象，property 优先），可被 SSR 快照序列化。

## 基础用法（含排序）

<DemoBlock title="可排序列">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"email","title":"邮箱"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","email":"fengshiyi@example.com","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","email":"chenshier@example.com","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","email":"chushisan@example.com","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","email":"weishisi@example.com","position":"运维工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

点击可排列表头在升序 / 降序 / 取消之间循环。

## 列对齐与宽度

<DemoBlock title="对齐与宽度">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","width":"140px"},{"key":"age","title":"年龄","align":"center"},{"key":"city","title":"城市","align":"right"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## 受控排序与行选中

<DemoBlock title="初始排序与选中">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","position":"运维工程师"}]' sort-key="age" sort-order="desc" selected="吴九" row-key="name"></oas-table>
  </div>
</DemoBlock>

`sort-key` / `sort-order` 控制排序，`selected` 高亮选中行（点击行可切换选中）。

## 多选

<DemoBlock title="行多选（checkable）">
  <div style="width: 100%">
    <oas-table checkable columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","position":"运维工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

表头复选框一键全选/取消，行复选框单独勾选；选中变化派发 `oas-check`。

## 与分页联动

<DemoBlock title="表格 + 分页">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-paged" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"email","title":"邮箱"},{"key":"position","title":"职位"}]' data="[]"></oas-table>
    <oas-pagination id="table-pager" total="12" page-size="5" current="1"></oas-pagination>
  </oas-space>
</DemoBlock>

表格数据按每页 5 条切片，翻页时通过 `oas-change` 事件更新 `data` 属性重新渲染。

## 固定列

<DemoBlock title="左侧固定列">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","width":"120px"}]' data='[{"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="左右固定列 + 表头吸顶">
  <div style="width: 100%; max-width: 680px">
    <oas-table height="240" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"60px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]' data='[{"id":1,"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"id":2,"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"id":3,"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"id":4,"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"id":5,"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"id":6,"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"id":7,"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"id":8,"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"}]' row-key="id"></oas-table>
  </div>
</DemoBlock>

列配置中 `fixed: 'left' | 'right'` 将该列表头与单元格设为 `position: sticky`（`left` / `right` 偏移按列宽自动累加），其余列可横向滚动；表头始终吸顶。

## 大数据量（虚拟滚动）

<DemoBlock title="万级数据虚拟滚动">
  <div style="width: 100%">
    <oas-table id="table-virtual" height="360" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"70px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","sortable":true,"width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]'></oas-table>
  </div>
</DemoBlock>

设置 `height` 开启虚拟滚动（搭配 `row-height` 定高），表格只渲染可见窗口内的行，配合固定列与排序/多选使用；滚动派发 `oas-scroll`。

## 斑马纹与边框

<DemoBlock title="斑马纹（stripe）">
  <div style="width: 100%">
    <oas-table stripe columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="完整边框（bordered）">
  <div style="width: 100%">
    <oas-table bordered columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

设置 `stripe` 交替奇数/偶数行底色，设置 `bordered` 为单元格绘制完整网格边框。

## 合计行

<DemoBlock title="合计行（summary）">
  <div style="width: 100%">
    <oas-table summary='[{"key":"age","type":"sum","label":"合计"},{"key":"score","type":"avg"}]' columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"score","title":"分数"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"score":92,"city":"北京"},{"name":"李四","age":25,"score":88,"city":"上海"},{"name":"王五","age":35,"score":76,"city":"深圳"},{"name":"赵六","age":28,"score":95,"city":"杭州"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

`summary` 属性为 JSON 数组 `[{ key, type: 'sum' | 'avg' | 'count', label? }]`，表尾渲染合计行：`label` 显示在首个未聚合列，各聚合值显示在对应列；也支持在列配置上直接写 `summary: 'sum' | 'avg' | 'count'`。

## 可展开行

<DemoBlock title="可展开行（expand 字段）">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师","expand":"<div>更多信息：张三 负责前端架构与团队管理，2021 年入职。</div>"},{"name":"李四","age":25,"city":"上海","position":"产品经理","expand":"<div>更多信息：李四 主导产品规划与需求评审，2022 年入职。</div>"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

行数据存在非空 `expand` 字段时，表尾出现展开列，点击行尾按钮展开一整行展示自定义内容；展开状态保存在 `expanded` 属性（逗号分隔的 key 集合），切换时派发 `oas-expand`。

<DemoBlock title="受控展开（expanded 属性）">
  <div style="width: 100%">
    <oas-table expanded="张三" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师","expand":"<div>更多信息：张三 负责前端架构与团队管理，2021 年入职。</div>"},{"name":"李四","age":25,"city":"上海","position":"产品经理"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

`expanded` 为受控属性（逗号分隔的 key 集合）：预置展开行在首次渲染即展开，宿主可随时增删 key 驱动展开状态（树形父行与可展开行共用）。

## 树形数据

<DemoBlock title="树形数据（children）">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"部门 / 成员"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"研发部","age":"","city":"","children":[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"}]},{"name":"产品部","age":"","city":"","children":[{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"}]}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

行数据存在 `children` 数组时按树形渲染：父行首列出现展开按钮，子行按层级缩进；展开状态同样保存在 `expanded` 属性，切换时派发 `oas-expand`。

## 加载态

<DemoBlock title="加载态">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-loading" row-key="name" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]'></oas-table>
    <oas-button type="primary" onclick="simulateTableLoading()">模拟加载 2 秒</oas-button>
  </oas-space>
</DemoBlock>

设置 `loading` 属性后表头保留、数据区显示加载占位行；移除属性即恢复数据。

## 空态

<DemoBlock title="空数据">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

<DemoBlock title="自定义空态文案">
  <div style="width: 100%">
    <oas-table empty-text="暂无匹配数据" columns='[{"key":"name","title":"姓名"}]' data="[]"></oas-table>
  </div>
</DemoBlock>

## 事件

<DemoBlock title="排序与点击事件">
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bordered` | 完整边框：单元格网格描边（外框由组件自带） | — | — |
| `checkable` | 复选框多选开关 | `boolean` | — |
| `columns` | 列配置 `[{ key, title, sortable?, width?, align?, fixed?, render?, summary? }]`，JSON 字符串（attribute 声明式通道；property 赋值优先） | `TableColumn[] \| string` | `[]` |
| `data` | 行数据 `[{ [key]: value, children?, expand? }]`，JSON 字符串（attribute 声明式通道；property 赋值优先） | `Array<Record<string, unknown>> \| string` | `[]` |
| `empty-text` | 空态文案 | — | — |
| `expanded` | 已展开行 key 集合（逗号分隔；树形父行/可展开行共用） | `string` | — |
| `height` | 虚拟滚动视口高度（px）；设置后仅渲染可见窗口行 + 首尾占位行 | `string` | `320` |
| `loading` | 加载态：数据区显示加载占位行（表头保留） | `boolean` | — |
| `row-height` | 虚拟滚动每行固定高度（px） | `string` | `40` |
| `row-key` | 行唯一键字段 | `string` | `key` |
| `selected` | 选中行 key 集合（逗号分隔） | `string` | — |
| `sort-key` | 受控排序；`sort-order` 取 `asc` / `desc` / 空 | `string` | — |
| `sort-order` | 受控排序；`sort-order` 取 `asc` / `desc` / 空 | `SortOrder` | — |
| `stripe` | 斑马纹：奇数/偶数行交替浅底色 | `boolean` | — |
| `summary` | 合计配置 `[{ key, type: 'sum'\|'avg'\|'count', label? }]`，JSON 字符串 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-check` | 复选框选中变化，`detail: { keys: string[] }` |
| `oas-expand` | 行展开/收起（树形子行或可展开内容行），`detail: { key, expanded }` |
| `oas-row-click` | 点击行（非 checkable 时同时切换选中），`detail: { row, key }` |
| `oas-scroll` | 虚拟滚动滚动事件（rAF 节流），`detail: { scrollTop, start, end }` |
| `oas-sort-change` | 排序变化，`detail: { key, order: 'asc' \| 'desc' \| '' }` |

> 说明：`columns.render` 为函数类型，仅支持在 JS 侧构造后通过属性整体赋值，无法用 JSON 字符串表达；`fixed` 列建议显式声明 `width`（未声明时按 100px 兜底计算 sticky 偏移）。合计也可在列上直接写 `summary: 'sum' | 'avg' | 'count'`；`children`（树形子行）与 `expand`（可展开行内容）均为行数据字段。

加载占位行部件为 `::part(loading-row)`，合计行 `::part(summary-row)`、展开内容行 `::part(expand-row)`，均可单独定制样式。
