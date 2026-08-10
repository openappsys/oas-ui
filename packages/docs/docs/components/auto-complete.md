# AutoComplete 自动完成

输入即推荐，支持键盘上下选择、回车确认、Esc 关闭。

## 基础用法

<DemoBlock title="基础用法">
  <oas-auto-complete placeholder="输入「苹」试试" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-auto-complete>
</DemoBlock>

输入关键字会在下拉中自动过滤匹配项；支持键盘 `↑`/`↓` 移动高亮、`Enter` 选中、`Esc` 关闭。

## 预设值

<DemoBlock title="预设值（value）">
  <oas-auto-complete value="苹果" placeholder="已选中的值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-auto-complete disabled placeholder="不可输入" options='[{"label":"苹果","value":"apple"}]'></oas-auto-complete>
</DemoBlock>

## 无匹配结果

<DemoBlock title="空态">
  <oas-auto-complete placeholder="输入「梨」试试（无匹配）" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
</DemoBlock>

## 事件

<DemoBlock title="输入与选中事件">
  <oas-auto-complete id="ac-event" placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-auto-complete>
  <span id="ac-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

监听 `oas-input`（输入中）与 `oas-change`（选中）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ac-event')
  const out = document.getElementById('ac-output')
  el?.addEventListener('oas-input', (e) => {
    out.textContent = `oas-input: ${e.detail.value}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.label}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | `string` | — |
| `value` | 预设值 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中，`detail: { value, label }` |
| `oas-input` | 输入中，`detail: { value }` |

键盘：`↑`/`↓` 移动，`Enter` 选中，`Esc` 关闭。
