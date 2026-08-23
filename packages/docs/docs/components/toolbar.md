# Toolbar 工具栏

工具按钮组容器：`role="toolbar"` + `aria-label`，`Tab` 进入后方向键在控件间移动（roving tabindex，只聚焦当前项）。配套切换组、分隔符、输入框三个部件，支持纵向布局、循环开关、整栏禁用、尺寸档位、溢出收纳与贴边形态。

## 基础用法（原生按钮）

<DemoBlock title="基础用法（原生按钮）">
  <oas-toolbar>
    <button>加粗</button>
    <button>斜体</button>
    <button>下划线</button>
    <button>删除线</button>
  </oas-toolbar>
</DemoBlock>

## 切换组（编辑器场景）

`oas-toolbar-toggle` 是工具栏的 toggle 组部件：单选（缺省，radio 语义——组内互斥，点已选中项不变更）与多选（`multiple`，每项独立切换）；`value` 受控（单选字符串 / 多选 JSON 数组），点击派发 `oas-change`。加粗/斜体/下划线用多选组，对齐方式用单选组——编辑器工具栏核心形态。

<DemoBlock title="切换组（加粗/斜体 + 对齐方式）">
  <oas-toolbar id="tb-editor">
    <oas-toolbar-toggle id="tb-style" multiple value='["bold","underline"]' items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toolbar-toggle>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-toolbar-toggle id="tb-align" value="left" items='[{"label":"左对齐","value":"left"},{"label":"居中","value":"center"},{"label":"右对齐","value":"right"}]'></oas-toolbar-toggle>
  </oas-toolbar>
  <oas-tag id="tb-editor-result" type="info">样式: bold, underline | 对齐: left</oas-tag>
</DemoBlock>

## 分隔符部件

`oas-toolbar-separator` 取代旧的 `oas-divider + data-toolbar-ignore` 组合：自动 `role="separator"`、自动排除出 roving 导航，线段方向随工具栏横纵自动切换（横向工具栏内是竖线、纵向工具栏内是横线）。

<DemoBlock title="oas-button + 分隔符">
  <oas-toolbar>
    <oas-button>剪切</oas-button>
    <oas-button>复制</oas-button>
    <oas-button>粘贴</oas-button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-button>撤销</oas-button>
    <oas-button>重做</oas-button>
  </oas-toolbar>
</DemoBlock>

## 纵向工具栏

`orientation="vertical"`：`aria-orientation="vertical"` + 纵向布局，`↑`/`↓` 随向导航（`←`/`→` 兼容），分隔符自动变横线。

<DemoBlock title="纵向工具栏">
  <oas-toolbar orientation="vertical">
    <oas-toolbar-toggle value="bold" items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toolbar-toggle>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>保存</button>
    <button>另存为</button>
  </oas-toolbar>
</DemoBlock>

## 循环导航开关

`loop` 缺省开启（方向键在首尾循环），`loop="false"` 时在首尾停止（radio 组在边界停住更符合表单直觉）。

<DemoBlock title="loop=false 不循环">
  <oas-toolbar loop="false">
    <button>一</button>
    <button>二</button>
    <button>三</button>
  </oas-toolbar>
</DemoBlock>

## 尺寸档位

`size`：`small` / `medium`（默认）/ `large`。作用于工具栏间距、native 按钮与内置部件（切换组/输入框自动跟随）。

<DemoBlock title="size 三档">
  <oas-space size="small">
    <oas-toolbar size="small">
      <button>保存</button>
      <button>打印</button>
      <oas-toolbar-toggle value="bold" items='[{"label":"加粗","value":"bold"}]'></oas-toolbar-toggle>
    </oas-toolbar>
    <oas-toolbar size="large">
      <button>保存</button>
      <button>打印</button>
    </oas-toolbar>
  </oas-space>
</DemoBlock>

## 整栏禁用

`disabled` 整栏禁用（`aria-disabled` + `inert`，子项不参与 roving）；叠加 `focusable-when-disabled` 时子项保持可聚焦（`aria-disabled`，点击被拦截——适合挂 tooltip 解释禁用原因）。

<DemoBlock title="整栏禁用">
  <oas-space size="small">
    <oas-toolbar disabled>
      <button>保存</button>
      <button>打印</button>
    </oas-toolbar>
    <oas-toolbar disabled focusable-when-disabled>
      <button>另存为</button>
      <button>打印</button>
    </oas-toolbar>
  </oas-space>
</DemoBlock>

## 禁用项

`disabled` / `aria-disabled` 的按钮不参与方向键导航（roving 跳过）。

<DemoBlock title="禁用项">
  <oas-toolbar>
    <button>保存</button>
    <button disabled>另存为</button>
    <button>打印</button>
  </oas-toolbar>
</DemoBlock>

## 链接项

`a[href]` 自动参与 roving 并打上 `part="link"`（统一链接样式与焦点环）。

<DemoBlock title="链接项">
  <oas-toolbar>
    <button>保存</button>
    <button>打印</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <a href="https://example.com">帮助中心</a>
  </oas-toolbar>
</DemoBlock>

## 分组右对齐（far）

子项加 `data-toolbar-far`：从该项起推到远端（横向工具栏右对齐、纵向工具栏贴底），常用于「主操作靠左、设置/帮助靠右」的布局。

<DemoBlock title="far 右对齐分组">
  <oas-toolbar>
    <button>保存</button>
    <button>打印</button>
    <button data-toolbar-far>设置</button>
    <button>帮助</button>
  </oas-toolbar>
</DemoBlock>

## start / end 命名插槽

`slot="start"` 内容渲染在工具栏前部、`slot="end"` 渲染在尾端（视觉顺序：start → 默认 → end，roving 与溢出收纳都按此顺序）。推荐用命名插槽做分区；`data-toolbar-far` 为存量兼容（把项推到远端，与 `end` 插槽语义接近），新代码优先使用 `end` 插槽。

<DemoBlock title="start / end 插槽">
  <oas-toolbar>
    <oas-toolbar-toggle slot="start" multiple value='["bold"]' items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toolbar-toggle>
    <button>保存</button>
    <button>打印</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <oas-toolbar-input slot="end" placeholder="搜索…"></oas-toolbar-input>
    <button slot="end">帮助</button>
  </oas-toolbar>
</DemoBlock>

## 工具栏内输入框

`oas-toolbar-input`：参与 roving 的单 Tab 停靠（复合组件特例——焦点在输入框内时方向键由文本编辑消费，`Tab` 离开继续工具栏导航）。`oas-input` 输入中、`oas-change` Enter/失焦提交。

<DemoBlock title="工具栏内输入框">
  <oas-toolbar id="tb-input">
    <oas-toolbar-input id="tb-search" placeholder="搜索…"></oas-toolbar-input>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>搜索</button>
    <oas-toolbar-input placeholder="禁用" disabled></oas-toolbar-input>
  </oas-toolbar>
  <oas-tag id="tb-input-result" type="info">input: -</oas-tag>
</DemoBlock>

## 溢出收纳（窄容器）

容器宽度不足时，超出项自动收进末尾「···」弹层（`ResizeObserver` 监听宽度，点击「···」展开镜像项，镜像项点击派发到原控件；被收纳的选中项会让「···」高亮）。收窄下方容器宽度试试。

<DemoBlock title="溢出收纳">
  <div style="width: 300px; overflow-x: clip">
    <oas-toolbar id="tb-overflow">
      <oas-toolbar-toggle value="bold" items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toolbar-toggle>
      <oas-toolbar-separator></oas-toolbar-separator>
      <button>复制</button>
      <button>剪切</button>
      <button>粘贴</button>
      <button>撤销</button>
      <button>重做</button>
      <button>插入表格</button>
      <button>插入图片</button>
      <button>插入链接</button>
    </oas-toolbar>
  </div>
</DemoBlock>

## 贴边形态（is-attached）

`is-attached`：容器化工具栏外观（边框 + 底色 + 内边距），适合直接贴在其他工具栏/面板边上。

<DemoBlock title="is-attached">
  <oas-toolbar is-attached>
    <button>加粗</button>
    <button>斜体</button>
    <oas-toolbar-separator></oas-toolbar-separator>
    <button>保存</button>
  </oas-toolbar>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // 编辑器工具栏：oas-change 冒泡（toggle 组 → toolbar → 页面），读回 value 更新展示
  const style = document.getElementById('tb-style')
  const align = document.getElementById('tb-align')
  const editorTag = document.getElementById('tb-editor-result')
  const syncEditor = () => {
    if (!style || !align || !editorTag) return
    const s = JSON.parse(style.getAttribute('value') || '[]')
    editorTag.textContent = `样式: ${s.join(', ') || '无'} | 对齐: ${align.getAttribute('value') || '无'}`
  }
  const tbEditor = document.getElementById('tb-editor')
  if (tbEditor) tbEditor.addEventListener('oas-change', syncEditor)
  syncEditor()

  // 工具栏输入框：读内部 input 值（value 属性是受控入口，不自动写回）
  const search = document.getElementById('tb-search')
  const inputTag = document.getElementById('tb-input-result')
  const syncInput = () => {
    if (!search || !inputTag) return
    const v = search.shadowRoot?.querySelector('input')?.value || ''
    inputTag.textContent = `input: ${v || '-'}`
  }
  if (search) {
    search.addEventListener('oas-input', syncInput)
    search.addEventListener('oas-change', syncInput)
  }
  syncInput()
})
</script>

## API

### oas-toolbar

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 整栏禁用（`aria-disabled` + `inert`，子项不参与 roving） | `boolean` | — |
| `focusable-when-disabled` | 禁用时子项保持可聚焦（`aria-disabled` + 点击拦截，适合挂 tooltip 解释禁用原因） | `boolean` | — |
| `loop` | 方向键循环导航开关：缺省开启；`false` 时在首尾停止 | `string` | — |
| `orientation` | 布局方向：`horizontal`（默认）/ `vertical`（纵向，方向键随向导航、分隔符自动变横线） | `string` | `horizontal` |
| `size` | 尺寸档位：`small` / `medium`（默认）/ `large` | `string` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 工具栏控件：按钮 / oas-button / 切换组 / 输入框 / 链接 / 分隔符等 |
| `end` | 工具栏尾端内容（渲染在默认内容之后，参与 roving 与溢出收纳；与 `data-toolbar-far` 语义接近，推荐优先使用） |
| `start` | 工具栏前部内容（渲染在默认内容之前，参与 roving 与溢出收纳） |

### oas-toolbar-toggle

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 整组禁用 | `boolean` | — |
| `items` | 选项 JSON（property 赋值单向反射 attribute） | `ToolbarToggleItem[] \| string` | `[]` |
| `multiple` | 多选模式（每项独立切换） | `boolean` | — |
| `size` | 尺寸档位（small/medium/large），缺省跟随最近 oas-toolbar | `string` | — |
| `value` | 当前值：单选为字符串；多选为 JSON 数组字符串 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value: string \| string[] }` |

### oas-toolbar-input

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `placeholder` | 占位提示 | `string` | — |
| `size` | 尺寸档位（small/medium/large），缺省跟随最近 oas-toolbar | `string` | — |
| `value` | 预设值（受控入口；事件不带写回，宿主可监听更新） | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | Enter 或失焦提交，`detail: { value }` |
| `oas-input` | 输入中，`detail: { value }` |

- 宿主 `role="toolbar"` + `aria-orientation`，`aria-label` 走 locale key（`toolbar.label`，默认「工具栏」）
- 参与 roving 的子元素：native 控件（`button`/`input`/`select`/`textarea`/`a[href]`）、交互 `role`、自定义元素（tag 含 `-`）；`oas-toolbar-separator`、`data-toolbar-ignore`、`aria-hidden` 排除，`disabled`/`aria-disabled` 自动跳过（`focusable-when-disabled` 模式下 aria-disabled 项保持可聚焦）
- 键盘：`Tab` 进入（仅当前项可 Tab 到达），`←`/`→`（或 `↑`/`↓`）在控件间移动，`Home`/`End` 跳转首末；焦点在切换组/输入框内部时方向键由部件接管（`Tab` 离开继续工具栏导航）
- 溢出收纳：`ResizeObserver` 监听宽度，超出项收进「···」弹层（仅横向）
