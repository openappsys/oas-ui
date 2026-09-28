# Table 表格

用于以行列表格形式展示结构化数据，支持排序、行选中、多选与加载态，可与分页组件联动。

`columns` / `data` 支持 attribute 声明式通道：直接写 JSON 字符串即可渲染表头与数据行（非法 JSON 回退空态），同时保留 property 通道（赋值数组对象，property 优先），可被 SSR 快照序列化。

> **数据通道契约（与 oas-chart 对齐阅读）**：attribute 传 JSON 字符串，property 传对象/数组（免序列化，setter 内解析，优先级高于 attribute）。`oas-table` 的 `columns` / `data` setter 会把值**反射回 attribute**——property 赋值后 `getAttribute('columns')` / `getAttribute('data')` 可读回对应 JSON 字符串（attribute 与 property 保持单一数据源同步）；这与 `oas-chart`（data 只写内部状态不反射、读取走 `el.data`）不同。例外：`columns` 含函数字段（`render` 等）时 setter 走纯内存路径不反射，此类列读取请走 `el.columns` property。

## 基础用法（含排序）

<DemoBlock title="可排序列">
  <div style="width: 100%">
    <oas-table columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"},{"key":"email","title":"邮箱"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"},{"name":"冯十一","age":38,"city":"西安","email":"fengshiyi@example.com","position":"架构师"},{"name":"陈十二","age":29,"city":"苏州","email":"chenshier@example.com","position":"数据分析师"},{"name":"褚十三","age":33,"city":"天津","email":"chushisan@example.com","position":"项目经理"},{"name":"卫十四","age":26,"city":"重庆","email":"weishisi@example.com","position":"运维工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

点击可排列表头在升序 / 降序 / 取消之间循环。

## 子元素声明式通道

<DemoBlock title="用 <oas-table-column> 声明列">
  <div style="width: 100%">
    <oas-table row-key="name" data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]'>
      <oas-table-column data-key="name" title="姓名" sortable></oas-table-column>
      <oas-table-column data-key="age" title="年龄" sortable></oas-table-column>
      <oas-table-column data-key="city" title="城市"></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="嵌套子列表达多级表头">
  <div style="width: 100%">
    <oas-table row-key="id" data='[{"id":1,"name":"张三","age":28,"city":"北京","score":92},{"id":2,"name":"李四","age":32,"city":"上海","score":85}]'>
      <oas-table-column data-key="base" title="基础信息">
        <oas-table-column data-key="name" title="姓名" sortable></oas-table-column>
        <oas-table-column data-key="age" title="年龄" sortable></oas-table-column>
      </oas-table-column>
      <oas-table-column data-key="city" title="城市"></oas-table-column>
      <oas-table-column data-key="score" title="成绩" sortable></oas-table-column>
    </oas-table>
  </div>
</DemoBlock>

<DemoBlock title="单元格模板 cellTemplate（插值 row.字段）">
  <div style="width: 100%">
    <oas-table id="cell-tpl-table" row-key="id" data='[{"id":1,"name":"张三","price":128,"city":"北京"},{"id":2,"name":"李四","price":256,"city":"上海"}]'></oas-table>
  </div>
</DemoBlock>

`columns` 除了 attribute / property 数组，还支持子元素声明式通道：`<oas-table-column data-key title sortable width align fixed ...>`，属性对齐 TableColumn 字段（布尔字段为 true/false，`serial-number` / `filters` 等 kebab-case；列标识字段叫 `key`，但 `key` 是 Vue 模板保留字会被剥离不到 DOM——**声明式请写 `data-key`**（原生 HTML 下 `key` 直写亦可，组件双通道读取））；`title` 缺省时取默认插槽文本；嵌套 `<oas-table-column>` 表达多级表头（children）。子元素变化由 MutationObserver 感知自动重渲染。`columns` attribute / property 显式设置时优先于子元素通道。单元格模板 `cellTemplate`（配合 `row.字段` 占位插值）表达自定义单元格，克隆+水合成每格内容：原生 HTML 可在列内嵌 `<template>` 声明；Vue 宿主/文档站建议经 columns **property** 通道注入（JS 构造 `HTMLTemplateElement`，写法见上例——md/Vue 编译管线对 `<template>` 子内容处理不一致，dev 下会吃空）；`render` 函数仍优先于模板。

> **⚠️ 函数型字段（“一个细节”）**：`render` / `filterMatch` / 编辑器回调（`editOptions` 的函数）等**函数类型无法经子元素 attribute、也无法经 JSON 序列化**——子元素通道与 `columns` attribute 都不能表达。含函数字段的列，请用 `columns` **property** 赋值（JS 构造数组），或用声明式的 `cellTemplate`（`<template>` + `row.字段` 占位插值，函数替代品，写法见上例）表达自定义单元格。

## 密度档位

<DemoBlock title="size：small / medium（默认）/ large">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 16px">
    <oas-table size="small" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]' row-key="name"></oas-table>
    <oas-table columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]' row-key="name"></oas-table>
    <oas-table size="large" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

档位只改单元格 padding 与字号的默认值，全部走 CSS 变量：宿主可直接用 `--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size` 覆盖（优先级高于档位）。非法值回落 `medium` 并告警。`row-height` 与档位正交：虚拟滚动等定高场景的行高由 `row-height` 决定，不受档位影响。

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

## 行单选（checkable="radio"）

<DemoBlock title="行单选（radio 互斥）">
  <div style="width: 100%">
    <oas-table id="table-radio" checkable="radio" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"},{"name":"孙七","age":32,"city":"广州","position":"测试工程师"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      当前选中：<span id="table-radio-selected">无</span>
    </p>
  </div>
</DemoBlock>

`checkable="radio"` 进入单选档（裸 `checkable` 多选行为不变）：勾选列渲染 radio、表头不再渲染全选框（保留空白列头维持列对齐），点选互斥——`selected` 为单值语义（至多一个行 key），再点已选行取消选中；`oas-check` detail 同为 `{ keys: string[] }`（单选档至多一个元素）。

## 行级状态样式（row-class）

<DemoBlock title="row-class：按行数据返回 class">
  <div style="width: 100%">
    <oas-table id="table-row-class" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"status","title":"状态"}]' data='[{"name":"张三","age":30,"status":"在职"},{"name":"李四","age":25,"status":"在职"},{"name":"王五","age":41,"status":"超标"},{"name":"赵六","age":28,"status":"停用"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      停用行灰化、超标行警色：由 row-class 返回的 class 驱动。
    </p>
  </div>
</DemoBlock>

<style>
#table-row-class::part(row-disabled) {
  background: var(--oas-color-bg-hover);
  color: var(--oas-color-text-secondary);
  text-decoration: line-through;
}
#table-row-class::part(row-warn) {
  color: var(--oas-color-danger);
  font-weight: 600;
}
</style>

`row-class` 为 property 函数通道：`(row, index) => string`（多值空格分隔），返回的 class 挂到数据行 tr，并同步暴露为该行 tr 与各单元格的 `::part()` token——页面 CSS 用 `::part()` 即可穿透 Shadow DOM 命中（上例的停用/超标行样式即此机制）。函数不可序列化：**不参与 attribute / SSR 快照**（契约同 `columns.render`），SSR 场景请在客户端水合后赋值。

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

## 行内编辑

<DemoBlock title="双击单元格编辑（含操作列）">
  <div style="width: 100%">
    <oas-table id="table-edit" editable row-key="name" columns='[{"key":"name","title":"姓名","editable":true},{"key":"age","title":"年龄","editable":true,"width":"100px"},{"key":"city","title":"城市","editable":true},{"key":"position","title":"职位","editable":true,"editor":"select","editOptions":[{"label":"前端工程师","value":"frontend"},{"label":"后端工程师","value":"backend"},{"label":"产品经理","value":"pm"},{"label":"测试工程师","value":"qa"}]},{"key":"op","title":"操作","actions":true}]' data='[{"name":"张三","age":30,"city":"北京","position":"frontend"},{"name":"李四","age":25,"city":"上海","position":"backend"},{"name":"王五","age":35,"city":"深圳","position":"pm"},{"name":"赵六","age":28,"city":"杭州","position":"qa"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      最近编辑：<span id="table-edit-feedback">—</span>
    </p>
  </div>
</DemoBlock>

设置 `editable` 开启行内编辑，列配置 `editable: true` 标记可编辑列（`editor: 'input'` 文本输入 / `editor: 'select'` 下拉选择 + `editOptions`），`actions: true` 渲染操作列（编辑/保存/取消按钮）。双击单元格或聚焦后按 Enter / F2 进入编辑：Enter 或失焦提交、Esc 取消；提交派发 `oas-edit`（`detail: { rowIndex, key, column, value }`），取消派发 `oas-edit-cancel`。空值提交默认还原旧值（非破坏）。

> **行内编辑能力（主路径已默认内含）**：主路径 `@oas-ui/ui/data/table` 已内置编辑能力（import 即注册），无需显式引用（下方 demo 走全量入口同样已内含）。若想保留不带编辑 machinery 的纯核瘦身，可改从纯核入口 `@oas-ui/ui/data/table/core` 引入——它不含该能力，此时 `<oas-table editable>` 静默失效并 dev 告警，需显式 `import '@oas-ui/ui/data/table/edit'`（import 即注册）或换回主路径。

可编辑单元格自带可感知线索：hover 或键盘聚焦（focus-visible）时显示淡底色与右上角铅笔图标（图标不拦截交互），悬停有 `title` 提示「双击编辑」；三种方式进入编辑——双击、聚焦后按 Enter、聚焦后按 F2。

行内「交互宿主」上的点击/双击不连带行级手势：落在原生控件（`button`/`a`/`input`/`select`/`textarea`）、带 `role` 的 ARIA 元素或库内交互组件（如 `oas-button`、`oas-link`、`oas-select`）内部的点击只触发该控件自身行为——不切换行选中、也不会被双击判定误带入编辑；行点击与双击进编辑共用同一份排除清单，并随组件库新增交互型组件同步维护。业务侧行内自定义交互内容（图表、迷你挂件等）无需等库发版：在容器上标注 `data-oas-row-click-ignore` 即可让整块内容豁免行点击与行编辑。交互宿主不派发行级手势，但**不阻止编辑态本身**。

### 组件编辑器（editComponent）

<DemoBlock title="editComponent：任意组件作为单元格编辑器">
  <oas-table id="table-edit-component" editable row-key="word" columns='[{"key":"word","title":"词条","editable":true,"editComponent":"oas-input"},{"key":"note","title":"备注","editable":true,"editComponent":"oas-textarea"}]' data='[{"word":"oas-ui","note":"Web Components 组件库"},{"word":"divider","note":"分隔线"}]'></oas-table>
</DemoBlock>

`editComponent`（columns JSON 字段）指定**组件编辑器**（优先于 `editor`）：双击后挂载对应组件并注入当前值。组件契约（最小集）：值可读（`getFormValue()` → value property → value attribute 三级兜底——`getFormValue` 为库内组件的 form-associated 内部通道，宿主自定义组件实现 value property 或 value attribute 其一即可）、提交事件（`oas-change` 或原生 `change` 其一）、Esc 取消；多行编辑器（textarea 内核）Enter 让路换行，提交走失焦。库内 form 组件（oas-input / oas-textarea / oas-switch 等）天然满足，宿主自定义 WC 同样可用。第一期约定为非浮层组件（date-picker / select 等浮层类后续批次支持）。注意：横向滚动触发列窗口变化时整表重渲染，进行中的编辑会被静默取消（不派 `oas-edit-cancel`）。

## 受控编辑

<DemoBlock title="受控编辑（edit-controlled）">
  <div style="width: 100%">
    <oas-table id="table-edit-controlled" editable edit-controlled row-key="name" columns='[{"key":"name","title":"姓名","editable":true},{"key":"age","title":"年龄","editable":true,"width":"100px"},{"key":"city","title":"城市","editable":true}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      该表格为受控模式：组件提交时不自动回写 data，由宿主监听 oas-edit 后自行更新。
    </p>
  </div>
</DemoBlock>

`edit-controlled` 为受控编辑：提交时不自动回写 `data`，仅派发 `oas-edit`；宿主监听后自行更新 `data`（示例见下方脚本）。

## 吸顶行

<DemoBlock title="表头 + 前 N 行吸顶">
  <div style="width: 100%">
    <oas-table height="280" row-height="40" sticky-rows="3" row-key="id" columns='[{"key":"id","title":"ID","fixed":"left","width":"60px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]' data='[{"id":1,"name":"张三","age":30,"city":"北京","email":"zhangsan@example.com","position":"前端工程师"},{"id":2,"name":"李四","age":25,"city":"上海","email":"lisi@example.com","position":"产品经理"},{"id":3,"name":"王五","age":35,"city":"深圳","email":"wangwu@example.com","position":"后端工程师"},{"id":4,"name":"赵六","age":28,"city":"杭州","email":"zhaoliu@example.com","position":"UI 设计师"},{"id":5,"name":"孙七","age":32,"city":"广州","email":"sunqi@example.com","position":"测试工程师"},{"id":6,"name":"周八","age":27,"city":"成都","email":"zhouba@example.com","position":"运营专员"},{"id":7,"name":"吴九","age":41,"city":"武汉","email":"wujiu@example.com","position":"技术总监"},{"id":8,"name":"郑十","age":24,"city":"南京","email":"zhengshi@example.com","position":"实习生"},{"id":9,"name":"冯十一","age":38,"city":"西安","email":"fengshiyi@example.com","position":"架构师"},{"id":10,"name":"陈十二","age":29,"city":"苏州","email":"chenshier@example.com","position":"数据分析师"},{"id":11,"name":"褚十三","age":33,"city":"天津","email":"chushisan@example.com","position":"项目经理"},{"id":12,"name":"卫十四","age":26,"city":"重庆","email":"weishisi@example.com","position":"运维工程师"}]'></oas-table>
  </div>
</DemoBlock>

`sticky-rows="N"` 指定前 N 行吸顶于表头下方（配合滚动容器：设置 `height` 后表体可滚动）；与固定列（`fixed: 'left' | 'right'`）共存互不冲突。

## 大数据量（虚拟滚动）

<DemoBlock title="万级数据虚拟滚动">
  <div style="width: 100%">
    <oas-table id="table-virtual" height="360" row-height="40" columns='[{"key":"id","title":"ID","fixed":"left","width":"70px"},{"key":"name","title":"姓名","fixed":"left","width":"120px"},{"key":"age","title":"年龄","sortable":true,"width":"80px"},{"key":"city","title":"城市","width":"100px"},{"key":"email","title":"邮箱","width":"220px"},{"key":"position","title":"职位","fixed":"right","width":"120px"}]'></oas-table>
  </div>
</DemoBlock>

设置 `height` 开启虚拟滚动（搭配 `row-height` 定高），表格只渲染可见窗口内的行，配合固定列与排序/多选使用；滚动派发 `oas-scroll`。

<DemoBlock title="column-virtual：宽表横向虚拟滚动">
  <oas-table id="table-col-virtual" column-virtual height="300" checkable></oas-table>
</DemoBlock>

`column-virtual` 开启横向虚拟滚动（列窗口化）：非固定列只渲染可视窗口列，窗口外列以占位格 `colSpan` 归并（宽度由 `colgroup` 求和，`table-layout: fixed` 强制启用）——60 列宽表 DOM 里只有十几列。可与 `height` 行虚拟双开；固定列须两端布局且恒渲染。约束（告警降级）：多级表头 / span-method / 合计行不兼容；建议全列显式 `width`（未设宽按预估 100px）。注意：横向滚动触发列窗口变化时整表重渲染，进行中的编辑会被静默取消。

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

## 合计范围

`summary-scope` 控制合计行统计范围：`all`（默认）对分页切片前的完整筛选结果全量合计（翻页不变），`page` 只对当前页小计。开启分页时两者差异可见。

<DemoBlock title="合计范围：all（默认）与 page 对比">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 16px">
    <oas-table pagination page-size="3" summary='[{"key":"age","type":"sum","label":"合计（all）"}]' columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"},{"name":"孙七","age":32,"city":"广州"},{"name":"周八","age":27,"city":"成都"}]' row-key="name"></oas-table>
    <oas-table pagination page-size="3" summary-scope="page" summary='[{"key":"age","type":"sum","label":"小计（page）"}]' columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"},{"name":"孙七","age":32,"city":"广州"},{"name":"周八","age":27,"city":"成都"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

上面第一张表 `summary-scope` 缺省（`all`），第 1 页合计为全部 6 行的年龄和 177；第二张表 `summary-scope="page"`，第 1 页小计为当前页 3 行（30+25+35=90），翻页后小计随页变化。

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

<DemoBlock title="空态富内容插槽（slot=&quot;empty&quot;）">
  <div style="width: 100%">
    <oas-table id="table-empty-slot" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]' data="[]">
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0">
        <oas-icon name="search" style="font-size: 28px; color: var(--oas-color-text-secondary)"></oas-icon>
        <span>暂无记录，点击按钮新增一条数据</span>
        <oas-button size="small" type="primary" onclick="window.tableEmptySlotAdd && window.tableEmptySlotAdd()">新增数据</oas-button>
      </div>
    </oas-table>
  </div>
</DemoBlock>

空态文案优先级：`slot="empty"` 插槽（`<template slot="empty">` 或普通元素均可，普通元素克隆自身、模板克隆其内容）> `empty-text` 属性 > 内置 i18n 文案；插槽内容增删会自动重渲染。

## 列设置：显隐 / 拖拽重排 / 列宽

<DemoBlock title="列拖拽重排 + 列宽拖拽">
  <div style="width: 100%">
    <oas-table id="table-col-setting" checkable row-key="name" columns='[{"key":"name","title":"姓名","width":"120px"},{"key":"age","title":"年龄","width":"90px"},{"key":"city","title":"城市","width":"100px"},{"key":"position","title":"职位","width":"120px"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"},{"name":"赵六","age":28,"city":"杭州","position":"UI 设计师"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      拖拽表头可重排列顺序，拖表头右缘热区可调列宽。· 列顺序：<span id="table-col-order">原序</span> · 列宽：<span id="table-col-width">—</span>
    </p>
  </div>
</DemoBlock>

<DemoBlock title="列显隐（受控 column-keys / hidden）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--oas-font-size-sm)">
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="name" checked> 姓名</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="age" checked> 年龄</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="city" checked> 城市</label>
      <label style="display:flex;align-items:center;gap:4px"><input type="checkbox" class="col-toggle" data-key="position" checked> 职位</label>
    </div>
    <oas-table id="table-col-hidden" row-key="name" column-keys='["name","age","city","position"]' columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"position","title":"职位"}]' data='[{"name":"张三","age":30,"city":"北京","position":"前端工程师"},{"name":"李四","age":25,"city":"上海","position":"产品经理"},{"name":"王五","age":35,"city":"深圳","position":"后端工程师"}]'></oas-table>
  </div>
</DemoBlock>

说明：列拖拽重排 / 调宽分别派发 `oas-column-order` / `oas-column-resize`（宿主持久化可用）。列显隐两种方式：受控 `column-keys`（JSON 数组，可同时控制顺序）或在列配置写 `hidden: true` 默认隐藏。

触屏适配：HTML5 拖拽（dragstart）在触屏上不可用，触控（coarse pointer）下每个列头自动提供上移 / 下移按钮（桌面隐藏）与相邻列交换顺序；表头过滤钮、展开钮、列宽拖拽手柄的命中区在触屏下扩到 44px；过滤面板定位自动避让视口边缘（空间不足时翻转，窄屏不溢出）。

## 多列排序

<DemoBlock title="Shift 点击多列排序（multi-sort）">
  <div style="width: 100%">
    <oas-table id="table-multi-sort" multi-sort='[{"key":"age","order":"asc"},{"key":"name","order":"asc"}]' row-key="name" columns='[{"key":"age","title":"年龄","sortable":true},{"key":"name","title":"姓名","sortable":true},{"key":"city","title":"城市","sortable":true}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":25,"city":"杭州"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      初始 `multi-sort='[{"key":"age","order":"asc"},{"key":"name","order":"asc"}]'` 以 JSON 声明多列排序（表头序号 1、2 表示优先级）；按住 Shift 点击多个可排序列累积/切换/移除排序并写回 `multi-sort`，普通点击重置为单列。
    </p>
  </div>
</DemoBlock>

## 序号列与省略号

<DemoBlock title="序号列 + 省略号">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"index","title":"#","serialNumber":true,"width":"60px"},{"key":"name","title":"姓名","width":"120px"},{"key":"desc","title":"简介","ellipsis":true},{"key":"city","title":"城市","width":"100px"}]' data='[{"name":"张三","city":"北京","desc":"三年前端开发经验，负责核心业务组件设计与性能优化，主导网关与监控平台重构"},{"name":"李四","city":"上海","desc":"聚焦产品规划与需求评审，推动跨团队协作"},{"name":"王五","city":"深圳","desc":"后端架构老兵，主攻高并发与微服务治理"}]'></oas-table>
  </div>
</DemoBlock>

`serialNumber: true` 的列渲染行序号（从 1 递增，不取数据字段值）；`ellipsis: true` 的列内容超出列宽时单行截断显示省略号（悬停 `title` 查看全文）。

## 多级表头

<DemoBlock title="多级表头（children）">
  <div style="width: 100%">
    <oas-table row-key="id" columns='[{"key":"base","title":"基础信息","children":[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true}]},{"key":"addr","title":"地址","children":[{"key":"city","title":"城市"},{"key":"street","title":"街道"}]},{"key":"score","title":"成绩","sortable":true}]' data='[{"id":1,"name":"张三","age":28,"city":"北京","street":"长安街","score":92},{"id":2,"name":"李四","age":32,"city":"上海","street":"南京路","score":85},{"id":3,"name":"王五","age":40,"city":"广州","street":"天河路","score":78}]'></oas-table>
  </div>
</DemoBlock>

列配置 `children` 定义组表头：组列横跨其子列（colspan），叶子列按树深落位（rowspan 对齐数据行）；数据 / 排序 / 显隐 / 拖拽均作用于叶子列。

## 内置分页

<DemoBlock title="表格内置分页（pagination）">
  <div style="width: 100%">
    <oas-table id="table-builtin-pager" pagination page-size="5" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"姓名"},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]'></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      设置 `pagination` 开启内置分页：顶层行先全局排序再切片，翻页/改页大小派发 `oas-page-change`。当前页：<span id="table-pager-page">1</span>
    </p>
  </div>
</DemoBlock>

## 列过滤

<DemoBlock title="表头列过滤（filterable + filter-values 受控）">
  <div style="width: 100%">
    <oas-table id="table-filter" filter-values='{"city":"上海"}' row-key="name" columns='[{"key":"name","title":"姓名","filterable":true},{"key":"city","title":"城市","filterable":true,"filters":[{"label":"北京","value":"北京"},{"label":"上海","value":"上海"},{"label":"深圳","value":"深圳"}]},{"key":"age","title":"年龄"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"上海"}]'></oas-table>
    <div style="width: 100%; display: flex; align-items: center; gap: 12px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      点击列头的过滤图标打开选项弹层，选择后过滤行并派发 `oas-filter-change`；`filter-values` 为受控属性（JSON `{列: 值}`，移除/置空即清除过滤）。当前过滤值：<span id="table-filter-values">无</span>
      <oas-button size="small" onclick="window.clearTableFilter && window.clearTableFilter()">清空过滤</oas-button>
    </div>
  </div>
</DemoBlock>

## 合并单元格

<DemoBlock title="合并单元格（merge）">
  <div style="width: 100%">
    <oas-table row-key="name" columns='[{"key":"dept","title":"部门","merge":true,"align":"center"},{"key":"team","title":"团队","merge":true,"align":"center"},{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]' data='[{"dept":"研发部","team":"前端组","name":"张三","age":28},{"dept":"研发部","team":"前端组","name":"李四","age":32},{"dept":"研发部","team":"后端组","name":"王五","age":40},{"dept":"市场部","team":"市场组","name":"赵六","age":26},{"dept":"市场部","team":"市场组","name":"钱七","age":30}]'></oas-table>
  </div>
</DemoBlock>

列配置 `merge: true` 将该列连续相同显示值的行合并为一个 rowspan 单元格（虚拟滚动模式下忽略合并）。

## 受控合并（span-method）

<DemoBlock title="span-method：逐格显式声明 rowspan/colspan">
  <div style="width: 100%">
    <oas-table id="table-span" columns='[{"key":"quarter","title":"季度"},{"key":"product","title":"产品"},{"key":"sales","title":"销量","merge":true},{"key":"note","title":"备注"}]' data='[{"id":1,"quarter":"Q1","product":"甲","sales":120,"note":"开门红"},{"id":2,"quarter":"Q1","product":"乙","sales":120,"note":"与上行同值"},{"id":3,"quarter":"Q2","product":"甲","sales":98,"note":""},{"id":4,"quarter":"Q2","product":"乙","sales":98,"note":"与上行同值"}]' row-key="id"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      季度列由 spanMethod 显式声明（Q1 / Q2 各跨 2 行）；销量列走列级 merge 自动同值合并——两机制按列独立并存。
    </p>
  </div>
</DemoBlock>

`span-method` 为 property 函数通道：`(row, column, rowIndex, columnIndex) => [rowspan, colspan] | {rowspan, colspan}`，逐格显式声明合并；返回 `0` 表示本格被覆盖不渲染（覆盖关系由函数声明）。与列级 `merge` 自动合并**按列独立并存**（被显式 span 覆盖而缺格的行会断开该列 merge 的连续分组）；虚拟滚动模式下忽略（与 `merge` 同级的定高限制）。`rowIndex` 按数据行序（0 起，不含 expand 内容行），`columnIndex` 按有效列顺序；函数不可序列化，不参与 attribute / SSR 快照（契约同 `columns.render`）。

## 远程数据与排序 loading

<DemoBlock title="排序触发重新请求（模拟远程）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-table id="table-remote" sort-key="age" sort-order="asc" row-key="id" columns='[{"key":"id","title":"ID","width":"60px"},{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]'></oas-table>
    <oas-button type="primary" onclick="simulateRemoteReload()">清空排序并重新请求</oas-button>
  </oas-space>
</DemoBlock>

监听 `oas-sort-change` 后置 `loading` 再请求远程分页/排序数据；本 demo 用模拟延时演示「排序 → loading → 重新渲染」的衔接，服务端实际排序由宿主在收到事件后发起请求（表格只负责派发事件与 loading 态）。

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

// column-virtual demo：60 列指标 × 40 行（数据量大走客户端注入，SSR 输出空表壳）
onMounted(() => {
  const cols = [{ key: 'name', title: '姓名', fixed: 'left', width: '100px' }]
  const cvRows = Array.from({ length: 40 }, (_, r) => ({ name: `员工${r + 1}`, level: `P${(r % 9) + 1}` }))
  for (let i = 1; i <= 60; i++) {
    cols.push({ key: `c${i}`, title: `指标${i}`, width: '110px' })
    cvRows.forEach((row, r) => (row[`c${i}`] = `${i}-${r}`))
  }
  cols.push({ key: 'level', title: '评级', fixed: 'right', width: '80px' })
  const el = document.querySelector('#table-col-virtual')
  if (el) {
    el.setAttribute('columns', JSON.stringify(cols))
    el.setAttribute('data', JSON.stringify(cvRows))
  }
})

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
  // 单元格模板 demo：模板内容经 property 通道注入（JS 构造 HTMLTemplateElement）——
  // 不经过 md/Vue 编译管线（管线对 <template> 子内容的处理在 dev 与生产构建间不一致，会吃空模板）。
  // 注意等组件注册完成再赋值：页面 onMounted 早于主题注册组件（父子 onMounted 顺序），
  // 升级前赋 property 会变成 expando 遮蔽类访问器
  const nameTpl = document.createElement('template')
  nameTpl.innerHTML = `<span style="background:#eef2ff;color:#4f46e5;border-radius:4px;padding:1px 6px;font-size:12px">{{row.name}}</span>`
  const priceTpl = document.createElement('template')
  priceTpl.innerHTML = `<b style="color: var(--oas-color-danger)">¥ {{row.price}}</b>`
  customElements.whenDefined('oas-table').then(() => {
    const tplTable = document.getElementById('cell-tpl-table')
    if (tplTable) {
      tplTable.columns = [
        { key: 'name', title: '姓名', cellTemplate: nameTpl },
        { key: 'price', title: '价格', cellTemplate: priceTpl },
        { key: 'city', title: '城市' },
      ]
    }
  })
  // 排序与点击事件 demo
  const table = document.querySelector('#table-event')
  table?.addEventListener('oas-sort-change', (e) => {
    const { key, order } = e.detail
    document.querySelector('#table-sort').textContent = order ? `${key} ${order}` : '无'
  })
  table?.addEventListener('oas-row-click', (e) => {
    document.querySelector('#table-row').textContent = e.detail.row.name ?? e.detail.key
  })

  // 行单选 demo：oas-check 反馈（单选档 detail.keys 至多一个值）
  const radioTable = document.querySelector('#table-radio')
  radioTable?.addEventListener('oas-check', (e) => {
    const keys = e.detail.keys
    const el = document.querySelector('#table-radio-selected')
    if (el) el.textContent = keys.length ? keys.join('、') : '无'
  })

  // 空态插槽 demo：点击新增一条数据（空态被数据行替换，可见反馈）
  window.tableEmptySlotAdd = () => {
    document.querySelector('#table-empty-slot')?.setAttribute('data', JSON.stringify([{ name: '新成员', age: 28 }]))
  }

  // property 函数通道（row-class / span-method）：等组件注册完成再赋值——
  // 升级前赋 property 会变成 expando 遮蔽类访问器（与上方 cellTemplate demo 同因）
  customElements.whenDefined('oas-table').then(() => {
    const rowClassTable = document.querySelector('#table-row-class')
    if (rowClassTable) {
      rowClassTable.rowClass = (row) =>
        row.status === '停用' ? 'row-disabled' : row.status === '超标' ? 'row-warn' : ''
    }
    const spanTable = document.querySelector('#table-span')
    if (spanTable) {
      spanTable.spanMethod = (_row, _column, rowIndex, columnIndex) => {
        if (columnIndex !== 0) return undefined
        return rowIndex === 0 || rowIndex === 2 ? [2, 1] : [0, 0]
      }
    }
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

  // 行内编辑 demo：编辑反馈
  // （docs 页走全量入口 @oas-ui/ui，编辑能力已内含；纯核入口 data/table/core 消费者
  //   需显式 `import '@oas-ui/ui/data/table/edit'` 后编辑能力才会启用，否则表格静默不可编辑）
  const editTable = document.querySelector('#table-edit')
  editTable?.addEventListener('oas-edit', (e) => {
    const { key, column, value } = e.detail
    const el = document.querySelector('#table-edit-feedback')
    if (el) el.textContent = `${key} 的「${column}」→ ${value}`
  })
  editTable?.addEventListener('oas-edit-cancel', () => {
    const el = document.querySelector('#table-edit-feedback')
    if (el) el.textContent = '已取消'
  })

  // 受控编辑 demo：宿主监听 oas-edit 回写 data（组件不自动更新）
  const ctlTable = document.querySelector('#table-edit-controlled')
  ctlTable?.addEventListener('oas-edit', (e) => {
    const { key, column, value } = e.detail
    const rows = JSON.parse(ctlTable.getAttribute('data'))
    const row = rows.find((r) => r.name === key)
    if (row) row[column] = value
    ctlTable.setAttribute('data', JSON.stringify(rows))
  })

  // 列设置：拖拽重排 / 调宽反馈
  document.querySelector('#table-col-setting')?.addEventListener('oas-column-order', (e) => {
    document.querySelector('#table-col-order').textContent = e.detail.keys.join(' → ')
  })
  document.querySelector('#table-col-setting')?.addEventListener('oas-column-resize', (e) => {
    document.querySelector('#table-col-width').textContent = `${e.detail.key} = ${e.detail.width}px`
  })

  // 列显隐：勾选框 → 写回 column-keys
  const hiddenTable = document.querySelector('#table-col-hidden')
  const colToggles = [...document.querySelectorAll('.col-toggle')]
  const renderColUi = () => {
    const checked = colToggles.filter((el) => el.checked).map((el) => el.dataset.key)
    hiddenTable?.setAttribute('column-keys', JSON.stringify(checked))
  }
  colToggles.forEach((el) => el.addEventListener('change', renderColUi))

  // 内置分页：当前页反馈（初始数据 12 条，page-size 5）
  const builtInPager = document.querySelector('#table-builtin-pager')
  builtInPager?.setAttribute('data', JSON.stringify(TABLE_ROWS))
  builtInPager?.addEventListener('oas-page-change', (e) => {
    document.querySelector('#table-pager-page').textContent = e.detail.page
  })

  // 列过滤：当前过滤值反馈（含初始预置值渲染 + 清空按钮）
  const filterTable = document.querySelector('#table-filter')
  const renderFilterFeedback = () => {
    let vals = []
    try {
      const raw = filterTable?.getAttribute('filter-values')
      vals = raw ? Object.values(JSON.parse(raw)) : []
    } catch {}
    document.querySelector('#table-filter-values').textContent = vals.length ? vals.join('、') : '无'
  }
  filterTable?.addEventListener('oas-filter-change', renderFilterFeedback)
  window.clearTableFilter = () => {
    filterTable?.removeAttribute('filter-values')
    renderFilterFeedback()
  }
  renderFilterFeedback()

  // 远程数据 + 排序 loading demo：排序触发置 loading，模拟延时后清空排序+回填数据
  const remote = document.querySelector('#table-remote')
  const renderRemote = () => {
    remote?.setAttribute('data', JSON.stringify(TABLE_ROWS))
  }
  const simulateRemoteReload = () => {
    remote?.removeAttribute('sort-key')
    remote?.removeAttribute('sort-order')
    remote?.setAttribute('loading', '')
    setTimeout(() => {
      remote?.removeAttribute('loading')
      renderRemote()
    }, 800)
  }
  window.simulateRemoteReload = simulateRemoteReload
  remote?.addEventListener('oas-sort-change', () => {
    remote?.setAttribute('loading', '')
    setTimeout(() => {
      remote?.removeAttribute('loading')
      renderRemote()
    }, 800)
  })
  renderRemote()

  // 表头显隐 demo：show-header 属性切换
  const showHeaderTable = document.querySelector('#table-show-header')
  const showHeaderBtn = document.querySelector('#table-show-header-toggle')
  showHeaderBtn?.addEventListener('click', () => {
    const hidden = showHeaderTable?.getAttribute('show-header') === 'false'
    if (hidden) {
      showHeaderTable?.setAttribute('show-header', 'true')
      showHeaderBtn.textContent = '隐藏表头'
    } else {
      showHeaderTable?.setAttribute('show-header', 'false')
      showHeaderBtn.textContent = '显示表头'
    }
  })

  // P2 批 demo：限高滚动数据（12 条）+ rowExpandable 谓词 + 过滤图标插槽 + 单元格/双击事件反馈
  const maxHeightTable = document.querySelector('#table-max-height')
  if (maxHeightTable) {
    const mhRows = TABLE_ROWS.slice(0, 12).map((r) => ({ name: r.name, age: r.age, city: r.city }))
    maxHeightTable.setAttribute('data', JSON.stringify(mhRows))
  }
  customElements.whenDefined('oas-table').then(() => {
    const expandableTable = document.querySelector('#table-row-expandable')
    if (expandableTable) {
      expandableTable.rowExpandable = (row) => row.key !== 'c'
    }
  })
  const filterIconTable = document.querySelector('#table-filter-icon')
  if (filterIconTable) {
    const tpl = document.createElement('template')
    tpl.innerHTML = '<oas-icon name="search" style="font-size: 12px"></oas-icon>'
    tpl.setAttribute('slot', 'filter-icon')
    filterIconTable.appendChild(tpl)
  }
  const cellEventTable = document.querySelector('#table-cell-events')
  cellEventTable?.addEventListener('oas-cell-click', (e) => {
    const { column, value } = e.detail
    const el = document.querySelector('#table-cell-feedback')
    if (el) el.textContent = `${column} = ${value}`
  })
  cellEventTable?.addEventListener('oas-row-dblclick', (e) => {
    const el = document.querySelector('#table-dbl-feedback')
    if (el) el.textContent = e.detail.row.name ?? e.detail.rowIndex
  })

  // D 类能力 demo：导出（CSV / Excel）事件反馈
  const exportTable = document.querySelector('#table-export')
  exportTable?.addEventListener('oas-export', (e) => {
    const { format, fileName, rowCount } = e.detail
    const el = document.querySelector('#table-export-feedback')
    if (el) el.textContent = `${fileName} · ${format.toUpperCase()} · ${rowCount} rows`
  })

  // 网格导航 demo：单元格点击反馈（键盘漫游看单元格焦点环）
  const gridNavTable = document.querySelector('#table-grid-nav')
  gridNavTable?.addEventListener('oas-cell-click', (e) => {
    const el = document.querySelector('#table-grid-nav-feedback')
    if (el) el.textContent = `${e.detail.row.name} · ${e.detail.column}`
  })

  // 行拖拽 demo：宿主受控重排（组件只派发 oas-row-reorder，不改 data）
  const rowDragTable = document.querySelector('#table-row-drag')
  rowDragTable?.addEventListener('oas-row-reorder', (e) => {
    const { from, to } = e.detail
    const rows = JSON.parse(rowDragTable.getAttribute('data') ?? '[]')
    const [moved] = rows.splice(from, 1)
    rows.splice(to, 0, moved)
    rowDragTable.setAttribute('data', JSON.stringify(rows))
    const el = document.querySelector('#table-row-drag-feedback')
    if (el) el.textContent = `${from} → ${to}`
  })
})
</script>

## 表头显隐

`show-header` 控制表头显隐（默认 `true` 保持现状）；设为 `"false"` 后表头不渲染，列配置仍作用于数据行对齐，适用于纯数据陈列、上方已有自绘标题行的场景。

<DemoBlock title="show-header=false（可切换）">
  <div style="width: 100%">
    <oas-table id="table-show-header" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
    <div style="margin-top: var(--oas-space-3)">
      <oas-button size="small" id="table-show-header-toggle">隐藏表头</oas-button>
    </div>
  </div>
</DemoBlock>

## 表格布局（table-layout）

`table-layout="fixed"` 把 `table-layout` 透传给内部 table：列宽严格按 `width` 声明分配（超长内容换行/截断不再撑宽列），适合列宽已定的报表场景；默认不透传（浏览器 auto 基线，列宽随内容自适应）。

<DemoBlock title="table-layout=fixed（列宽严格生效）">
  <div style="width: 100%">
    <oas-table table-layout="fixed" columns='[{"key":"name","title":"姓名","width":"25%"},{"key":"position","title":"职位","width":"25%"},{"key":"duty","title":"职责说明"}]' data='[{"name":"张三","position":"前端工程师","duty":"负责组件库设计与渲染性能优化，参与设计系统建设。"},{"name":"李四","position":"产品经理","duty":"主导需求评审与版本规划，协调跨团队资源。"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## 行 hover 开关（hover）

`hover="false"` 关闭行 hover 底色（默认开启保持现状）；适合行内容自身带交互态（内嵌按钮高亮等）、不希望整行底色变化的场景。仅影响 hover 底色视觉，行点击/选中行为不受影响。

<DemoBlock title="默认 hover 与 hover=false 对比">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <div>
      <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">默认（hover 开）</p>
      <oas-table columns='[{"key":"name","title":"姓名"},{"key":"city","title":"城市"}]' data='[{"name":"张三","city":"北京"},{"name":"李四","city":"上海"}]' row-key="name"></oas-table>
    </div>
    <div>
      <p style="margin: 0 0 var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">hover=&quot;false&quot;（关闭）</p>
      <oas-table hover="false" columns='[{"key":"name","title":"姓名"},{"key":"city","title":"城市"}]' data='[{"name":"张三","city":"北京"},{"name":"李四","city":"上海"}]' row-key="name"></oas-table>
    </div>
  </div>
</DemoBlock>

## 树形缩进（indent-size）

树形数据的每级缩进量由 `indent-size` 控制（px，默认 24）；配合更紧凑的层级展示或更深的层级结构使用。

<DemoBlock title="indent-size=32（每级缩进加大）">
  <div style="width: 100%">
    <oas-table indent-size="32" columns='[{"key":"name","title":"部门 / 成员"},{"key":"city","title":"城市"}]' data='[{"key":"r1","name":"研发部","city":"—","children":[{"key":"r1-1","name":"前端组","city":"北京","children":[{"key":"r1-1-1","name":"张三","city":"北京"}]},{"key":"r1-2","name":"后端组","city":"深圳"}]}]' expanded="r1,r1-1" row-key="name"></oas-table>
  </div>
</DemoBlock>

## 展开行谓词（row-expandable）

`rowExpandable`（property 函数通道）按行判定是否渲染行尾展开钮：返回 `false` 的行不渲染（占位格保留、列对齐不破坏）。适合部分行没有可展开内容的场景。

<DemoBlock title="仅「完整资料」的行可展开">
  <div style="width: 100%">
    <oas-table id="table-row-expandable" columns='[{"key":"name","title":"姓名"},{"key":"city","title":"城市"}]' data='[{"key":"a","name":"张三","city":"北京","expand":"<div>工号 1001 · 2021 年入职</div>"},{"key":"b","name":"李四","city":"上海","expand":"<div>工号 1002 · 2022 年入职</div>"},{"key":"c","name":"王五","city":"深圳"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">王五的资料不完整（rowExpandable 返回 false），没有展开钮。</p>
  </div>
</DemoBlock>

## 限高滚动（max-height）

`max-height` 限制表体滚动容器高度（数字按 px，也可传 CSS 值如 `50vh`）：内容超高时容器内滚动，表头吸顶（sticky）钉在容器顶部。轻量限高用它；需要虚拟滚动（万级行）用 `height`。

<DemoBlock title="max-height=200（表头吸顶）">
  <div style="width: 100%">
    <oas-table id="table-max-height" max-height="200" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## 自定义过滤图标（filter-icon 插槽）

可过滤列的表头触发图标可用 `slot="filter-icon"` 自定义（`<template>` 或普通元素均可），缺省为内置过滤图形。

<DemoBlock title="template 自定义过滤图标">
  <div style="width: 100%">
    <oas-table id="table-filter-icon" columns='[{"key":"name","title":"姓名","filterable":true},{"key":"city","title":"城市"}]' data='[{"name":"张三","city":"北京"},{"name":"李四","city":"上海"},{"name":"王五","city":"深圳"}]' row-key="name"></oas-table>
  </div>
</DemoBlock>

## 单元格与双击事件（oas-cell-click / oas-row-dblclick）

点击数据单元格派发 `oas-cell-click`（detail 含 `row / column / value / rowIndex / columnIndex`）；双击数据行派发 `oas-row-dblclick`（detail 含 `row / rowIndex`）。落在行内按钮、链接、表单控件等交互宿主上的点击/双击不派发（与行选中同一份排除清单）。

<DemoBlock title="单元格点击 / 行双击反馈">
  <div style="width: 100%">
    <oas-table id="table-cell-events" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">
      单击单元格：<span id="table-cell-feedback">—</span> · 双击行：<span id="table-dbl-feedback">—</span>
    </p>
  </div>
</DemoBlock>

## 导出 CSV / Excel（exportable）

`exportable` 在表格顶部显示导出工具栏（默认 CSV；`export-format="excel"` 切 Excel，`"csv,excel"` 两个按钮都出）。导出范围 = 表头 + **当前可见数据行**（过滤 / 排序 / 分页切片后的当前页；虚拟滚动取完整展示集合）：`actions` 列不导出（勾选列/行展开列/拖拽手柄列也不在导出矩阵内——它们不是数据列）、`serialNumber` 列导出序号、select 编辑器导出选项 label。CSV 按 RFC 4180 转义并带 UTF-8 BOM；Excel 走 SpreadsheetML（`.xls`）。`export-file-name` 配文件名（默认 `export`）。也可编程式调用 `table.exportData('csv' | 'excel')`——按钮与方法都派发 `oas-export`（detail `{ format, fileName, rowCount }`）。

<DemoBlock title="导出 CSV / Excel（点击真实下载）">
  <div style="width: 100%">
    <oas-table id="table-export" exportable export-format="csv,excel" export-file-name="员工表" columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"},{"key":"note","title":"备注"}]' data='[{"name":"张三","age":30,"city":"北京","note":"前端，5 年"},{"name":"李四","age":25,"city":"上海","note":"说 \"你好\""},{"name":"王五","age":35,"city":"深圳","note":"后端"},{"name":"赵六","age":28,"city":"杭州","note":"设计"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">最近导出：<span id="table-export-feedback">—</span></p>
  </div>
</DemoBlock>

## 网格导航（grid-navigation）

`grid-navigation` 给表格 `role="grid"` 语义（表头 `columnheader`、行 `row`、单元格 `gridcell`），数据区为单停靠点 Tab 序：Tab 聚焦滚动容器，随后方向键在单元格间漫游——左右跨行换行、上下保持同列、Home/End 到行首末、Ctrl+Home/End 到网格首末格、PageUp/PageDown 按可视区（分页时为 `page-size`）翻屏。Enter/Space 激活聚焦格内的控件（行展开钮、行勾选框），可编辑单元格在编辑态把键盘让给输入框。表头控件（全选、列筛选）保留各自 Tab 停靠。

<DemoBlock title="方向键漫游（点击表格后按方向键）">
  <div style="width: 100%">
    <oas-table id="table-grid-nav" grid-navigation columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">点击单元格后用方向键漫游 · 单元格点击：<span id="table-grid-nav-feedback">—</span></p>
  </div>
</DemoBlock>

## 行拖拽排序（row-draggable）

`row-draggable` 增加拖拽手柄列；把某行手柄拖到另一行上派发 `oas-row-reorder`，detail `{ from, to, row }`（`from`/`to` 为当前可见数据行序中的索引；`to` 为移除被拖行后的插入位，宿主可 `const [moved] = rows.splice(from, 1); rows.splice(to, 0, moved)` 直接复现）。组件自身不改 `data`（受控/事件驱动，与 sortable tabs、tree 拖拽同契约）。虚拟滚动（`height`）下禁用并 dev 告警一次。

<DemoBlock title="拖手柄换位（宿主复现 oas-row-reorder）">
  <div style="width: 100%">
    <oas-table id="table-row-drag" row-draggable columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"},{"key":"city","title":"城市"}]' data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"},{"name":"赵六","age":28,"city":"杭州"}]' row-key="name"></oas-table>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-2) 0 0">最近重排：<span id="table-row-drag-feedback">—</span></p>
  </div>
</DemoBlock>

## 字段类型（column type）

`columns` 列配置的 `type` 字段声明字段类型，作用于**默认展示渲染与默认编辑器**（`render` / `cellTemplate` 自定义渲染在场时优先于 `type`）。全部类型：`text`（缺省纯文本）/ `number` / `currency` / `select` / `multi-select` / `date` / `checkbox` / `link` / `progress` / `rate`。配套列字段：`currency`（货币符号，缺省 `¥`）、`options`（select / multi-select 选项 `[{ value, label, color? }]`，color 缺省走 token 默认色，找不到选项时显示原值文本）。数值类列（number / currency / progress / rate）与 `sortable` 并存时按原始数值排序，`date` 列按时间序；徽章 / 进度条 / 星级颜色全部走 CSS 变量 token（暗色自动可读）。

<DemoBlock title="一个表内的多种字段类型列">
  <div style="width: 100%">
    <oas-table row-key="id" columns='[{"key":"name","title":"商品","width":"110px"},{"key":"cat","title":"类目","type":"select","width":"110px","options":[{"value":"fruit","label":"水果","color":"var(--oas-color-success)"},{"value":"digital","label":"数码","color":"var(--oas-color-primary)"},{"value":"food","label":"食品"}]},{"key":"price","title":"价格","type":"currency","width":"100px"},{"key":"stock","title":"库存","type":"number","width":"90px"},{"key":"listed","title":"上架日期","type":"date","width":"110px"},{"key":"progress","title":"售罄进度","type":"progress","width":"120px"},{"key":"rating","title":"评分","type":"rate","width":"110px"},{"key":"active","title":"在售","type":"checkbox","width":"70px"},{"key":"tags","title":"标签","type":"multi-select","width":"160px","options":[{"value":"new","label":"新品"},{"value":"hot","label":"热卖"},{"value":"promo","label":"促销"}]},{"key":"site","title":"官网","type":"link","width":"200px"}]' data='[{"id":1,"name":"红富士苹果","cat":"fruit","price":12.8,"stock":15230,"listed":"2026-08-12","progress":35,"rating":4.7,"active":true,"site":"https://example.com/apple","tags":["new","hot"]},{"id":2,"name":"无线降噪耳机","cat":"digital","price":899,"stock":860,"listed":1753920000000,"progress":72,"rating":4,"active":true,"site":"https://example.com/headphone","tags":["hot","promo"]},{"id":3,"name":"冷榨橄榄油","cat":"food","price":88,"stock":"待盘点","listed":"2026-06-01T09:30:00","progress":150,"rating":5,"active":false,"site":"https://example.com/olive","tags":["promo"]},{"id":4,"name":"机械键盘","cat":"digital","price":459,"stock":2341,"listed":"2026-07-20","progress":18,"rating":3.5,"active":true,"site":"https://example.com/keyboard","tags":[]},{"id":5,"name":"阳光玫瑰葡萄","cat":"fruit","price":39.9,"stock":7600,"listed":"2026-09-01","progress":55,"rating":4.2,"active":true,"site":"https://example.com/grape","tags":["new"]},{"id":6,"name":"便携咖啡机","cat":"food","price":299,"stock":null,"listed":"未知","progress":-8,"rating":99,"active":false,"site":"https://example.com/coffee","tags":["hot"]}]'></oas-table>
  </div>
</DemoBlock>

示例同时覆盖空态：第 3 行库存为非数字（原样文本）、上架日期 ISO 串（取日期部分）；第 6 行库存为 null（空）、日期非法（原样文本）、进度条出界（夹取 0%）、评分出界（夹取 5 星）。

字段类型的行内编辑：`number` / `currency` / `link` 走原生 input（数值列提交回写 number）；`progress` / `rate` 原生 input 提交时夹取 0-100 / 0-5；`multi-select` 第一期为 input 逗号分隔编辑（提交拆回数组，多选组件编辑后续版本提供）；`date` 内置 `YYYY-MM-DD` 形态校验（非法形态保持编辑态）；`checkbox` 经组件编辑器通道挂 `oas-switch`（提交回写布尔）；`select` 走既有 select 编辑器通道（`options` 自动同步为编辑选项）。开启 `editable` 后双击任意类型列即可体验。

## 分组视图（group-by）

`group-by="字段key"` 按该字段值分节渲染：分节头行 = 折叠箭头 + 字段值 + 组内计数，点击箭头折叠 / 展开该组（默认全展开，`aria-expanded` 同步）。组间顺序按字段值首次出现序、排序作用于组内行；分组字段值缺失 / 为空的行归入「（空）」组（文案走 i18n）。分节头作为扁平行的一种参与行虚拟滚动，整行 `colSpan` 全宽（与 `column-virtual` / 固定列正交）；折叠状态在数据 / 属性变化时保留。与 merge 列 / `span-method` 同用时不兼容（告警一次并降级为普通渲染）。

<DemoBlock title="按部门分组（组内可排序，点击箭头折叠/展开）">
  <div style="width: 100%">
    <oas-table group-by="dept" row-key="name" columns='[{"key":"dept","title":"部门"},{"key":"name","title":"姓名","sortable":true},{"key":"city","title":"城市"},{"key":"role","title":"职位"}]' data='[{"dept":"前端","name":"张三","city":"北京","role":"前端工程师"},{"dept":"后端","name":"李四","city":"上海","role":"后端工程师"},{"dept":"前端","name":"王五","city":"深圳","role":"前端工程师"},{"dept":"后端","name":"赵六","city":"杭州","role":"架构师"},{"dept":"设计","name":"陈七","city":"广州","role":"UI 设计师"},{"dept":"前端","name":"周八","city":"成都","role":"前端负责人"},{"dept":"","name":"孙九","city":"武汉","role":"测试工程师"}]'></oas-table>
  </div>
</DemoBlock>

## 单元格溢出提示（cell-tooltip）

`cell-tooltip` 默认开启（设 `cell-tooltip="false"` 关闭）：纯文本单元格溢出（内容宽超出列宽）时，悬停显示全文浮层——表格级**单例浮层**（不为每格创建实例），反色 token 配色暗色可读，滚动 / 重渲染时自动隐藏。已有原生 `title` 提示的 `ellipsis` 列与富内容格（自定义渲染 / 徽章 / 进度条等）不触发，避免双重提示。

<DemoBlock title="悬停溢出格查看全文">
  <div style="width: 100%">
    <oas-table columns='[{"key":"env","title":"环境","width":"90px"},{"key":"url","title":"访问地址","width":"220px"},{"key":"owner","title":"负责人","width":"80px"}]' data='[{"env":"生产","url":"https://prod-cluster.example-assets-platform.com/dashboard/overview/health","owner":"张三"},{"env":"预发","url":"https://staging.example-assets-platform.com/monitor/health-check/status","owner":"李四"},{"env":"灰度","url":"https://canary.example-assets-platform.com/release/notes/latest","owner":"王五"}]'></oas-table>
  </div>
</DemoBlock>

访问地址列的完整 URL 远超列宽（长串不可断行）：悬停任一溢出格即可在浮层中查看全文，移开即隐藏。

## API

### oas-table

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bordered` | 完整边框：单元格网格描边（外框由组件自带） | — | — |
| `cell-tooltip` | 单元格溢出提示（默认开启，`"false"` 关闭）：纯文本单元格溢出（scrollWidth > clientWidth）时 hover 显示全文浮层——表格级单例浮层（token 反色，暗色可读），滚动/重渲染自动隐藏；富内容格与已有原生 title 的 ellipsis 列豁免（避免双重提示） | `string` | `true` |
| `checkable` | 行选择开关：存在即多选（复选框 + 全选头）；`="radio"` 单选（点选互斥、再点取消、无全选头），oas-check detail.keys ≤1 | `string` | — |
| `column-keys` | 受控列显隐与顺序（key 数组或逗号串）：在场时按有效叶序重组表头与数据列（多级表头同祖先链叶子并组） | `string[] \| string` | `[]` |
| `column-virtual` | 横向虚拟滚动（列窗口化）：非固定列只渲染可视窗口列，窗口外列以占位格 colSpan 归并（宽度由 colgroup 求和）。约束：建议全列显式 width；多级表头 / span-method / 合计行不兼容（告警降级）；固定列须两端布局 | `boolean` | — |
| `columns` | 列配置 `[{ key, title, sortable?, width?, align?, fixed?, render?, summary?, editable?, editor?, editOptions?, editComponent?, actions?, type?, currency?, options? }]`，JSON 字符串（attribute 声明式通道；property 赋值优先）；`type` 声明字段类型（number/currency/select/multi-select/date/checkbox/link/progress/rate）作用于默认展示渲染与默认编辑器，`currency` 为 currency 列货币符号（缺省 ¥），`options` 为 select/multi-select 选项 `[{ value, label, color? }]` | `TableColumn[] \| string` | `[]` |
| `current` | 当前页码（内置分页，受控） | `string` | `1` |
| `data` | 行数据 `[{ [key]: value, children?, expand? }]`，JSON 字符串（attribute 声明式通道；property 赋值优先） | `Array<Record<string, unknown>> \| string` | `[]` |
| `edit-controlled` | 受控编辑：提交时不自动回写 `data`，仅派发 `oas-edit`，由宿主监听后自行更新 `data` | `boolean` | — |
| `editable` | 行内编辑开关（需配合列配置 `editable: true`；操作列 `actions: true` 同理） | `boolean` | — |
| `empty-text` | 空态文案 | — | — |
| `expanded` | 已展开行 key 集合（逗号分隔；树形父行/可展开行共用） | `string` | — |
| `export-file-name` | 导出文件名（不含扩展名；路径分隔符与保留字符自动净化） | `string` | `export` |
| `export-format` | 导出格式：`csv`（默认）/ `excel`，或逗号组合 `csv,excel`（两个按钮）；非法回落 csv | `string` | `csv` |
| `exportable` | 导出开关：表格顶部渲染导出工具栏（默认 CSV，可配 CSV/Excel），并开放 exportData 方法 | `boolean` | — |
| `filter-values` | 受控列过滤值（JSON 对象：列 key → 选中值数组） | `string` | — |
| `grid-navigation` | 键盘网格导航：role=grid，数据区单停靠点 + 方向键在单元格间漫游（Home/End/PageUp-Down，Enter/Space 激活格内控件） | `boolean` | — |
| `group-by` | 分组视图：按字段值分节渲染（分节头 = 字段值 + 组内计数 + 折叠箭头，点击折叠/展开该组，默认全展开）；组间按字段值首次出现序、组内排序生效；空值行归入「（空）」组；与 merge 列 / span-method 同用时告警一次并降级为普通渲染；可与 column-virtual / 虚拟滚动并用（分节头整行 colSpan 全宽） | `string` | — |
| `height` | 虚拟滚动视口高度（px）；设置后仅渲染可见窗口行 + 首尾占位行 | `string` | `320` |
| `hover` | 行 hover 底色开关（仅视觉，不影响选中行为），`"false"` 关闭 | — | — |
| `indent-size` | 树形数据每级缩进量（px） | `string` | `24` |
| `loading` | 加载态：数据区显示加载占位行（表头保留） | `boolean` | — |
| `max-height` | 表体限高滚动 + 表头吸顶（虚拟 height 同设时优先） | `string` | — |
| `multi-sort` | 多列排序（JSON 数组：[{ key, order }]，按数组序依次排序） | `string` | — |
| `page-size` | 每页条数（内置分页，默认 10） | `string` | `10` |
| `pagination` | 内置分页开关（页脚分页条；宿主自管分页时不设） | `boolean` | — |
| `row-draggable` | 行拖拽排序：渲染拖拽手柄列，拖放派发 oas-row-reorder；虚拟滚动（height）下禁用并告警一次 | `boolean` | — |
| `row-height` | 虚拟滚动每行固定高度（px） | `string` | `40` |
| `row-key` | 行唯一键字段 | `string` | `key` |
| `selected` | 选中行 key 集合（逗号分隔） | `string` | — |
| `show-header` | 表头显隐（默认 true）；`false` 时不渲染表头行，列配置仍作用于数据行对齐 | `string` | `true` |
| `size` | 密度档位：`small` / `medium`（默认）/ `large`——只改单元格 padding 与字号默认值（全走 CSS 变量，可用 `--oas-table-cell-padding-block` / `--oas-table-cell-padding-inline` / `--oas-table-font-size` 覆盖，优先级高于档位）；非法值回落 `medium` 并告警；与 `row-height` 正交 | `string` | `medium` |
| `sort-key` | 受控排序；`sort-order` 取 `asc` / `desc` / 空 | `string` | — |
| `sort-order` | 受控排序；`sort-order` 取 `asc` / `desc` / 空 | `SortOrder` | — |
| `sticky-rows` | 吸顶行数（数字 N）：前 N 行吸顶于表头下方（配合滚动容器与固定列共存） | `string` | — |
| `stripe` | 斑马纹：奇数/偶数行交替浅底色 | `boolean` | — |
| `summary` | 合计配置 `[{ key, type: 'sum'\|'avg'\|'count', label? }]`，JSON 字符串 | `string` | — |
| `summary-scope` | 合计行聚合范围：`all`（默认，全量数据）/ `page`（当前页） | `string` | `all` |
| `table-layout` | 透传表格布局算法（fixed 时列宽严格按 width 声明） | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cell-click` | 点击数据单元格派发，`detail: { row, column, value, rowIndex, columnIndex }`（交互控件内不派发） |
| `oas-check` | 复选框选中变化，`detail: { keys: string[] }` |
| `oas-column-order` | 列拖拽重排后派发，`detail: { keys }`（新列序） |
| `oas-column-resize` | 列宽拖拽调整后派发，`detail: { key, width }` |
| `oas-edit` | 行内编辑提交（Enter/失焦/操作列保存），`detail: { rowIndex, key, column, value }`；受控模式组件不回写 `data` |
| `oas-edit-cancel` | 行内编辑取消（Esc/操作列取消/空值提交还原），`detail: { rowIndex, key, column, value }`（value 为原值） |
| `oas-expand` | 行展开/收起（树形子行或可展开内容行），`detail: { key, expanded }` |
| `oas-export` | 导出触发（按钮或 exportData），`detail: { format, fileName, rowCount }` |
| `oas-filter-change` | 列过滤值变化时派发，`detail: { key, values }` |
| `oas-page-change` | 内置分页翻页时派发，`detail: { current, pageSize }` |
| `oas-row-click` | 点击行（非 checkable 时同时切换选中），`detail: { row, key }` |
| `oas-row-dblclick` | 双击数据行派发，`detail: { row, rowIndex }` |
| `oas-row-reorder` | 行拖拽/Alt+↑↓ 重排，`detail: { from, to, row }`（to 为移除被拖行后的插入位；组件不改 data） |
| `oas-scroll` | 虚拟滚动滚动事件（rAF 节流），`detail: { scrollTop, start, end }` |
| `oas-sort-change` | 排序变化，`detail: { key, order: 'asc' \| 'desc' \| '' }` |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 空态富内容（优先于 empty-text 与默认空态文案） |
| `template[slot="filter-icon"]` | 自定义可过滤列表头的触发图标 |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-table-cell-padding-block` | `var(--oas-space-3)` |
| `--oas-table-cell-padding-inline` | `var(--oas-space-4)` |
| `--oas-table-font-size` | `var(--oas-font-size-md)` |
| `--oas-tooltip-bg` | `var(--oas-color-text-primary)` |
| `--oas-tooltip-color` | `var(--oas-color-bg)` |

### oas-table-column

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions` | 列操作（如行内编辑的保存/取消钮列） | — | — |
| `align` | 列内容对齐（left/center/right） | — | — |
| `currency` | currency 类型列的货币符号（缺省 ¥） | — | — |
| `data-key` | 列标识（Vue 模板保留字 key 的规避通道；原生 HTML 下 key 直写亦可，组件双通道读取） | — | — |
| `editable` | 列可编辑（双击单元格进编辑态） | — | — |
| `editor` | 编辑器类型/配置（select/input 等） | — | — |
| `ellipsis` | 列内容超宽单行截断省略号（悬停 title 看全文） | — | — |
| `filterable` | 列可过滤（表头渲染筛选触发器） | — | — |
| `filters` | 列筛选项配置 | — | — |
| `fixed` | 列固定（left/right 吸附） | — | — |
| `hidden` | 列隐藏（初始不参与渲染，列显隐面板可开） | — | — |
| `key` | 列标识字段名（原生 HTML 直写；Vue 模板请用 data-key） | — | — |
| `merge` | 列自动合并相邻同值单元格 | — | — |
| `options` | select/multi-select 类型列的展示选项 JSON `[{ value, label, color? }]`（color 缺省走 token 默认色；type=select 时自动同步为编辑选项） | — | — |
| `serial-number` | 行序号列（从 1 递增，不取数据字段） | — | — |
| `sortable` | 列可排序（表头点击切换升/降/取消） | — | — |
| `summary` | 列参与合计行（sum/avg/count） | — | — |
| `title` | 列表头标题（缺省取默认插槽文本） | — | — |
| `type` | 列字段类型（number/currency/select/multi-select/date/checkbox/link/progress/rate；text 为缺省纯文本）：驱动默认展示渲染与默认编辑器；render/cellTemplate 自定义渲染优先 | — | — |
| `width` | 列宽（px 或 CSS 值；fixed 列建议显式声明） | — | — |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 自定义单元格内容（template 内用 row.字段 占位插值，双花括号语法） |

> 说明：`columns.render` 为函数类型，仅支持在 JS 侧构造后通过属性整体赋值，无法用 JSON 字符串表达；`fixed` 列建议显式声明 `width`（未声明时按 100px 兜底计算 sticky 偏移）。合计也可在列上直接写 `summary: 'sum' | 'avg' | 'count'`；`children`（树形子行）与 `expand`（可展开行内容）均为行数据字段。

加载占位行部件为 `::part(loading-row)`，合计行 `::part(summary-row)`、展开内容行 `::part(expand-row)`，均可单独定制样式。
