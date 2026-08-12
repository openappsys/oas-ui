# Combobox 组合框

输入框即控件的可过滤单选组合框：**常显可编辑的输入框**显示选中项 label，输入实时过滤选项，选中后 `value` 取 `option.value`。

> **与 Select、AutoComplete 的定位差异**
>
> - **Select**：按钮触发下拉，值限定在选项内，输入框不常显；
> - **AutoComplete**：自由文本联想，值可以是任意输入内容（无需来自选项）；
> - **Combobox**：输入框即控件，输入仅用于过滤，值必须来自选项（`option.value`）。

## 基础用法

<DemoBlock title="基础用法">
  <oas-combobox placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-combobox>
</DemoBlock>

点击/聚焦展开下拉；输入关键字实时过滤（`filterable` 默认开启，子串匹配 label）；`↑`/`↓` 移动高亮、`Enter` 选中、`Esc` 关闭。

## 预设值（受控）

<DemoBlock title="预设值（受控 value）">
  <oas-combobox value="banana" placeholder="已选中的值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

`value` 为受控属性：选中后回写；外部修改属性同样即时反映到输入框 label。

## 外部受控设值

<DemoBlock title="外部受控设值">
  <oas-combobox id="cb-controlled" placeholder="点击按钮外部设值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-set-apple" size="small">设为 苹果</oas-button>
  <oas-button id="cb-clear-value" size="small">清空 value</oas-button>
</DemoBlock>

受控模式下宿主可随时通过 `value` 属性驱动组件显示：

## 过滤与关闭边界

<DemoBlock title="输入过滤 + 失焦回退">
  <oas-combobox value="apple" placeholder="输入后失焦会自动回退" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-combobox>
</DemoBlock>

输入未选中直接失焦/按 `Esc` 时，输入框回退为当前选中项 label（默认非破坏，不丢失已选值）。

## 不可过滤

<DemoBlock title='关闭过滤（filterable="false"）'>
  <oas-combobox filterable="false" placeholder="输入不过滤，仅键盘选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

`filterable="false"` 时输入不再过滤选项，仅通过键盘 `↑`/`↓` + `Enter` 或鼠标选择。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-combobox clearable value="apple" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

有选中值时显示清空按钮，点击清空 `value` 并派发 `oas-clear` 与 `oas-change`。

## 加载中

<DemoBlock title="加载中（loading）">
  <oas-combobox loading placeholder="聚焦查看加载占位" options='[]'></oas-combobox>
</DemoBlock>

`loading` 时下拉显示「加载中…」占位（远程数据场景由宿主在请求期间置位）。

## 空态

<DemoBlock title="无选项（empty）">
  <oas-combobox placeholder="暂无选项" options='[]'></oas-combobox>
</DemoBlock>

选项为空时下拉显示「暂无选项」；输入过滤无匹配时显示「无匹配选项」。

## 禁用

<DemoBlock title="禁用">
  <oas-combobox disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-combobox>
</DemoBlock>

## 事件

<DemoBlock title="事件输出">
  <oas-combobox id="cb-event" clearable placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <span id="cb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

监听 `oas-input`（过滤词）、`oas-change`（选中）、`oas-clear`（清空）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cb-event')
  const out = document.getElementById('cb-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))

  // 受控设值 demo：宿主外部驱动 value 属性
  const controlled = document.getElementById('cb-controlled')
  document.getElementById('cb-set-apple')?.addEventListener('click', () => {
    controlled?.setAttribute('value', 'apple')
  })
  document.getElementById('cb-clear-value')?.addEventListener('click', () => {
    controlled?.removeAttribute('value')
  })
})
</script>

## API

### 属性

| 属性          | 说明                                                    | 类型                 | 默认值 |
| ------------- | ------------------------------------------------------- | -------------------- | ------ |
| `clearable`   | 可清空（有值时显示清空按钮，清空派发 `oas-clear`）      | `boolean`            | —      |
| `disabled`    | 禁用（不可输入、不展开）                                | `boolean`            | —      |
| `filterable`  | 输入实时过滤 label（`filterable="false"` 关闭本地过滤） | `string`             | `true` |
| `loading`     | 加载占位（下拉显示「加载中…」）                         | `boolean`            | —      |
| `options`     | 选项，JSON 数组 `[{ label, value, disabled? }]`         | `Option[] \| string` | `[]`   |
| `placeholder` | 占位提示                                                | —                    | —      |
| `value`       | 当前值（受控，选中项 `option.value`）                   | `string`             | —      |

### 事件

| 事件         | 说明                                            |
| ------------ | ----------------------------------------------- |
| `oas-change` | 选中/清空变化，`detail: { value }`              |
| `oas-clear`  | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-input`  | 输入过滤词，`detail: { value }`                 |

键盘：`Enter` / 聚焦展开，`↑`/`↓` 移动高亮，`Enter` 选中，`Esc` 关闭并回退。
