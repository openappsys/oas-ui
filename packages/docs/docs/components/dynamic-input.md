# DynamicInput 动态列表

数组字段的增删编辑，每行复用 `oas-input` 组件，支持受控/非受控双模式、键值对行、行内容自定义与按钮排序。

## 基础用法

<DemoBlock title="可增删列表">
  <oas-dynamic-input model-value='["vue","react"]' placeholder="输入内容"></oas-dynamic-input>
</DemoBlock>

`model-value` 为 JSON 数组属性（也支持通过 property 赋值），每行一个输入框 + 删除按钮，末尾「添加」按钮。`placeholder` 透传到每行输入框。

## 默认值

<DemoBlock title="default-value">
  <oas-dynamic-input default-value="新行"></oas-dynamic-input>
</DemoBlock>

新增行以 `default-value` 作为初值。

## 键值对模式

<DemoBlock title="preset=pair（环境变量 / 参数编辑）">
  <oas-dynamic-input preset="pair" key-placeholder="变量名" value-placeholder="变量值" model-value='[{"key":"HOST","value":"localhost"},{"key":"PORT","value":"8080"}]'></oas-dynamic-input>
</DemoBlock>

`preset="pair"` 时每行渲染 key/value 两个输入框，值通道为对象数组 `[{ key, value }]`：

- `key-placeholder` / `value-placeholder` 分别指定两个输入框的占位符
- 新增行初值固定为 `{ key: "", value: "" }`；需要非空初值直接写 `model-value`
- 切换 `preset` 时做无损映射：字符串 → `{ key: 原值, value: "" }`；对象 → `key`（key 为空时回落 `value`）

## 行内容自定义

<DemoBlock title="template[slot=row] 自定义行">
  <oas-dynamic-input id="dyn-row-slot" model-value='["apple","banana"]'>
    <template slot="row">
      <span>🏷️</span>
      <oas-input part="row-input" style="flex:1"></oas-input>
    </template>
  </oas-dynamic-input>
</DemoBlock>

`template[slot="row"]` 克隆到每一行（删除/排序按钮保留在组件侧）：

- `[data-row-value]` 节点自动绑定行值（pair 预设下 `data-row-value` 绑 value 部分、`data-row-key` 绑 key 部分）
- 行内放 `oas-input` 时其输入事件自动走值通道（composed 委托）
- 任意控件（select / input-number 等）监听 `oas-row-render`（`detail: { index, value, element }`）自行接管读写

## 排序

<DemoBlock title="sortable 上移/下移按钮">
  <oas-dynamic-input sortable model-value='["第一项","第二项","第三项"]'></oas-dynamic-input>
</DemoBlock>

`sortable` 属性在每行尾加上移/下移按钮：首行上移禁用、末行下移禁用；排序不减行数，不受 `min` 限制；重排后派发 `oas-change`。

## min / max 边界

<DemoBlock title="min=2 补足行数">
  <oas-dynamic-input min="2" model-value='["a"]'></oas-dynamic-input>
</DemoBlock>

`min` 下自动补足行数，达到 `min` 时删除按钮禁用。

<DemoBlock title="max=3 禁添加">
  <oas-dynamic-input max="3" model-value='["a","b","c"]'></oas-dynamic-input>
</DemoBlock>

`max` 达到后「添加」按钮禁用；`model-value` 超长自动截断。

## 尺寸与校验态

<DemoBlock title="size 三档">
  <oas-dynamic-input size="small" model-value='["small 行"]'></oas-dynamic-input>
  <oas-dynamic-input model-value='["medium 行（默认）"]'></oas-dynamic-input>
  <oas-dynamic-input size="large" model-value='["large 行"]'></oas-dynamic-input>
</DemoBlock>

<DemoBlock title="status 校验态">
  <oas-dynamic-input status="error" model-value='["必填项缺失"]'></oas-dynamic-input>
</DemoBlock>

`size`（`small | medium | large`）控行高与字号（就近读取 config-provider 密度注入）；`status`（`success | warning | error`）透传行内输入框着色。

## 禁用与只读

<DemoBlock title="disabled">
  <oas-dynamic-input disabled model-value='["vue"]'></oas-dynamic-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-dynamic-input readonly model-value='["只读行"]'></oas-dynamic-input>
</DemoBlock>

`disabled` 整体禁用；`readonly` 行内输入只读、增删/排序按钮禁用（值可复制，表单语义与 disabled 分立）。

## 事件

<DemoBlock title="增删与变化事件">
  <oas-dynamic-input id="dyn-event" model-value='["a"]'></oas-dynamic-input>
  <span id="dyn-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-add`（`detail: { index }`）/ `oas-remove`（`detail: { index, value }`）/ `oas-change`（`detail: { value }`）；任意行输入框聚焦/失焦派发 `oas-focus` / `oas-blur`（`detail: { index }`）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('dyn-event')
  const out = document.getElementById('dyn-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${JSON.stringify(e.detail.value)}`
  })
  el?.addEventListener('oas-add', (e) => {
    out.textContent = `oas-add: ${JSON.stringify(e.detail)}`
  })
  el?.addEventListener('oas-remove', (e) => {
    out.textContent = `oas-remove: ${JSON.stringify(e.detail)}`
  })
})
</script>

## 本页能力速览（正文说明）

- `preset`：`input | pair`，键值对双输入框行，值通道 `[{ key, value }]`
- `placeholder` / `key-placeholder` / `value-placeholder`：占位符透传
- `sortable`：按钮式上移/下移排序（不做拖拽）
- `size` / `status` / `readonly`：三档尺寸、校验态、只读（均对齐库内契约）
- 插槽：`template[slot="row"]` 行内容自定义（`data-row-value` / `data-row-key` 绑定）
- 事件：`oas-add` `{ index }`、`oas-remove` `{ index, value }`、`oas-focus` / `oas-blur` `{ index }`、`oas-row-render` `{ index, value, element }`（既有 `oas-change` 不变）

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `default-value` | 新增行的默认值 | `string` | — |
| `disabled` | 禁用（行内输入 + 按钮） | `boolean` | — |
| `key-placeholder` | pair 形态键占位文本 | `string` | — |
| `max` | 最多行数，超长截断 | `string` | — |
| `min` | 最少行数，不足自动补足 | `string` | `0` |
| `model-value` | 字符串数组（property 或 JSON） | `DynamicInputRowValue[]` | `[]` |
| `placeholder` | 行输入占位文本 | `string` | — |
| `preset` | 行形态：`input`（默认单输入）/ `pair`（键值对双输入） | `string` | — |
| `readonly` | 只读（行不可编辑、增删/排序按钮隐藏） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `sortable` | 行排序（上移/下移按钮，值交换+焦点不丢；键盘可达） | `boolean` | — |
| `status` | 校验态：`error` / `warning` / `success`（透传给行内输入框） | `string` | — |
| `value-placeholder` | pair 形态值占位文本 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 新增行，`detail: { index }` |
| `oas-blur` | 行失焦，`detail: { index }` |
| `oas-change` | 增/删/编辑后派发，`detail: { value }` |
| `oas-focus` | 行聚焦，`detail: { index }` |
| `oas-remove` | 移除行，`detail: { index, value }` |
| `oas-row-render` | 行渲染时派发（自定义行通道），`detail: { index, value, element }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="row"]` | 自定义行内容（`[data-row-value]`/`[data-row-key]` 绑定；删除/排序按钮保留组件侧） |

受控：监听 `oas-change` 后设置 `modelValue` property（或 `model-value` 属性）回填即可。
