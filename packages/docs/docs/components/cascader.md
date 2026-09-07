# Cascader 级联选择

多级联动选择：支持多选勾选、父子解绑、多选值策略、路径搜索、动态加载、受控开合与标签折叠，键盘可操作。

## 基础用法

<DemoBlock title="基础用法">
  <oas-cascader placeholder="请选择省市区" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"},{"label":"温州","value":"wz"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"},{"label":"苏州","value":"sz"}]},{"label":"四川","value":"sc","children":[{"label":"成都","value":"cd"}]}]'></oas-cascader>
</DemoBlock>

点击展开多级面板，逐级下钻直到叶子节点提交。

## 选择即提交

<DemoBlock title="选择即提交（change-on-select）">
  <oas-cascader change-on-select placeholder="选到任意级即提交" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

开启 `change-on-select` 后，点击任意层级的选项（含含子级的节点）即提交当前路径。

## 预设路径

<DemoBlock title="预设值（value 路径数组）">
  <oas-cascader value='["zj","hz"]' options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`value` 为 JSON 数组，存放各级选中值；展示时拼接为「浙江 / 杭州」。

## 多选

<DemoBlock title="多选（multiple）">
  <oas-cascader id="cs-multi" multiple placeholder="批量选址" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
  <span id="cs-multi-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

多选时 `value` 为路径数组的数组（JSON），面板行前置复选框：勾选父级会级联勾选全部子级，部分勾选时父级呈半选态；触发器以标签回显，可单独移除。勾选后面板保持展开，便于连续选择。

## 父子解绑

<DemoBlock title="父子解绑（check-strictly）">
  <oas-cascader multiple check-strictly placeholder="父子独立勾选" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`check-strictly` 下父子勾选互不联动：勾选父级只提交父级路径，值即勾选集合（此时 `value-mode` 不生效）。

## 多选值策略

<DemoBlock title="值策略（value-mode）">
  <oas-cascader multiple value-mode="all" value='[["zj"]]' placeholder="all（默认）" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
  <oas-cascader multiple value-mode="parentFirst" value='[["zj"],["zj","hz"]]' placeholder="parentFirst" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
  <oas-cascader multiple value-mode="onlyLeaf" value='[["zj"],["zj","hz"]]' placeholder="onlyLeaf" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
</DemoBlock>

`value-mode` 决定多选时提交哪些路径：`all`（默认）= 全部勾选节点（子级全选时父级自动进值，与单选全路径心智一致）；`parentFirst` = 子级全选时收敛为父级代表；`onlyLeaf` = 只保留叶子路径。回显标签与 `value` 字面一致（宿主预设不被动改写），交互提交时按各自策略收敛。

## 可搜索

<DemoBlock title="可搜索（filterable）">
  <oas-cascader id="cs-search" filterable placeholder="输入省市名搜索" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"},{"label":"温州","value":"wz"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"},{"label":"苏州","value":"sz"}]},{"label":"四川","value":"sc","children":[{"label":"成都","value":"cd"}]}]'></oas-cascader>
  <span id="cs-search-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

`filterable` 打开面板后出现搜索框，输入按「路径各级名称拼接」匹配，结果为扁平路径列表，点击直接选中该完整路径（多选则勾选）；输入时派发 `oas-search`。可通过 `el.filter = (query, path) => boolean` 自定义匹配（`path` 为各级选项数组）。

## 动态加载

<DemoBlock title="动态加载（lazy + el.load）">
  <oas-cascader id="cs-lazy" placeholder="逐级加载部门" options='[{"label":"技术中心","value":"tech"},{"label":"运营中心","value":"ops"}]'></oas-cascader>
</DemoBlock>

设置 `el.load = ({ option, path, depth }) => Promise<选项数组>` 后，展开未加载的节点会显示「加载中」并请求子级（`path` 为根时 `option` 为 null，即第一级也可懒加载）；选项可标 `isLeaf: true` 声明叶子。本例模拟 500ms 网络延迟。

## 悬停展开

<DemoBlock title="悬停展开（expand-trigger=hover）">
  <oas-cascader expand-trigger="hover" placeholder="悬停即下钻" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`expand-trigger="hover"` 时悬停父级选项（约 120ms 防误触延时）即展开子级列，点击叶子提交；默认为 `click`。

## 仅末级与自定义分隔符

<DemoBlock title="仅末级（show-all-levels）与分隔符（separator）">
  <oas-cascader show-all-levels="false" value='["zj","hz"]' placeholder="仅显示末级" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
  <oas-cascader separator=" - " value='["zj","hz"]' placeholder="自定义分隔符" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
</DemoBlock>

`show-all-levels` 默认 true（显示完整路径），设为 `false` 后触发器只显示末级名称；`separator` 自定义路径分隔符（默认 ` / `），同时作用于搜索结果行。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-cascader clearable value='["zj","hz"]' placeholder="可清空" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
  <oas-cascader clearable multiple value='[["zj","hz"],["js","nj"]]' placeholder="多选可清空" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

有选中值时显示清空按钮，点击清空并派发 `oas-clear`（detail 为清空前的值）与 `oas-change`（空值）。

## 标签折叠

<DemoBlock title="标签折叠（max-tag-count）">
  <oas-cascader multiple max-tag-count="2" value='[["zj","hz"],["zj","nb"],["js","nj"]]' placeholder="超出折叠为 +N" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

多选标签默认换行展示；显式设置 `max-tag-count` 后按数量折叠为 `+N`（悬浮列出被折叠项），与 `oas-select` 约定一致。

## 尺寸与校验态

<DemoBlock title="尺寸（size）">
  <oas-cascader size="small" placeholder="small" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
  <oas-cascader placeholder="medium（默认）" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
  <oas-cascader size="large" placeholder="large" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

<DemoBlock title="校验态（status）">
  <oas-cascader status="error" placeholder="error" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
  <oas-cascader status="warning" placeholder="warning" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
  <oas-cascader status="success" placeholder="success" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

`size` 支持 `small / medium / large`（就近继承 `oas-config-provider` 的全局尺寸）；`status` 支持 `error / warning / success`（`error` 同步 trigger 的 `aria-invalid`，表单校验亦可直接在宿主标 `aria-invalid`）。

## 受控开合

<DemoBlock title="受控开合（open + oas-open-change）">
  <oas-space size="small">
    <oas-button id="cs-open-btn" size="small">打开 / 关闭</oas-button>
    <oas-cascader id="cs-controlled" placeholder="open 属性受控" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]}]'></oas-cascader>
    <oas-tag id="cs-open-state" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

`open` 属性为展开状态的唯一数据源（受控）：组件内外的开合都写回该属性，并在任何状态翻转时派发 `oas-open-change`（`detail.open`）；宿主可拦截事件回写实现完全受控。`Esc` 关闭时焦点返回触发器。

## 空态

<DemoBlock title="空态（empty）">
  <oas-cascader placeholder="暂无选项" options='[]'></oas-cascader>
</DemoBlock>

选项为空（且未设置 `el.load`）时面板显示「暂无数据」；搜索无匹配时显示「无匹配选项」。

## 禁用

<DemoBlock title="禁用">
  <oas-cascader disabled value='["zj","hz"]' placeholder="禁用" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## 事件

<DemoBlock title="选中事件">
  <oas-cascader id="cs-event" placeholder="选择后触发 oas-change" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
  <span id="cs-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为路径数组、多选为路径数组的数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pathText = (paths) => `[${paths.map((p) => p.join('/')).join(', ')}]`

  // 多选 demo：值反馈
  const multi = document.getElementById('cs-multi')
  const multiOut = document.getElementById('cs-multi-output')
  multi?.addEventListener('oas-change', (e) => {
    multiOut.textContent = `oas-change: ${pathText(e.detail.value)}`
  })

  // 搜索 demo：oas-search / oas-change 反馈
  const search = document.getElementById('cs-search')
  const searchOut = document.getElementById('cs-search-output')
  search?.addEventListener('oas-search', (e) => {
    searchOut.textContent = `oas-search: ${e.detail.value}`
  })
  search?.addEventListener('oas-change', (e) => {
    searchOut.textContent = `oas-change: ${pathText(e.detail.value)}`
  })

  // 懒加载 demo：el.load property 通道（模拟 500ms 延迟）
  customElements.whenDefined('oas-cascader').then(() => {
    const lazy = document.getElementById('cs-lazy')
    if (lazy) {
      lazy.load = ({ path }) =>
        new Promise((resolve) => {
          setTimeout(() => {
            if (path.length === 0) {
              resolve([
                { label: '技术中心', value: 'tech' },
                { label: '运营中心', value: 'ops' },
              ])
            } else if (path[0] === 'tech') {
              resolve([
                { label: '前端组', value: 'fe', isLeaf: true },
                { label: '后端组', value: 'be', isLeaf: true },
                { label: '测试组', value: 'qa' },
              ])
            } else if (path[1] === 'qa') {
              resolve([
                { label: '功能测试', value: 'func', isLeaf: true },
                { label: '自动化', value: 'auto', isLeaf: true },
              ])
            } else {
              resolve([])
            }
          }, 500)
        })
    }
  })

  // 受控开合 demo：按钮写 open 属性 + 状态回显
  const btn = document.getElementById('cs-open-btn')
  const controlled = document.getElementById('cs-controlled')
  const state = document.getElementById('cs-open-state')
  btn?.addEventListener('click', () => {
    if (!controlled) return
    if (controlled.hasAttribute('open')) controlled.removeAttribute('open')
    else controlled.setAttribute('open', '')
  })
  controlled?.addEventListener('oas-open-change', (e) => {
    if (state) state.textContent = `open: ${e.detail.open}`
  })

  // 事件 demo
  const el = document.getElementById('cs-event')
  const out = document.getElementById('cs-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${pathText([e.detail.value])}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `change-on-select` | 选中任意层级即提交 | `boolean` | — |
| `check-strictly` | 多选父子勾选解绑（勾选父级不联动子级） | `boolean` | — |
| `clearable` | 可清空（派发 oas-clear） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `expand-trigger` | 子级展开触发方式：`click`（默认）/ `hover`（120ms 延时防误触） | `string` | `click` |
| `filterable` | 可搜索（扁平路径结果） | `boolean` | — |
| `max-tag-count` | 多选标签按数量折叠 +N（带 title 列隐藏项） | `boolean` | — |
| `multiple` | 多选（复选框级联勾选；子级全选父级自动进值） | `boolean` | — |
| `open` | 受控展开状态（唯一状态源） | `boolean` | — |
| `options` | 级联选项，JSON 数组，支持 `children` / `disabled` | `CascaderOption[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `separator` | 路径分隔符（默认 ` / `） | `string` | ` / ` |
| `show-all-levels` | 回显完整路径（默认 true）；`false` 仅末级 | `string` | `true` |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `status` | 校验态：`error` / `warning` / `success`；error 联动 aria-invalid | `string` | — |
| `value` | 路径数组（JSON），如 `["zj","hz"]` | `string` | `[]` |
| `value-mode` | 多选值策略：`all`（默认，全路径）/ `parentFirst` / `onlyLeaf` | `string` | `all` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择变化，`detail: { value }`（路径数组） |
| `oas-clear` | 点击清空按钮，`detail` 为清空前的值 |
| `oas-open-change` | 展开状态翻转，`detail: { open }` |
| `oas-search` | filterable 输入，`detail: { value }` |
