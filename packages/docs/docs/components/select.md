# Select 选择器

下拉选择器，支持单选、多选与禁用项，键盘可操作。

## 单选

<DemoBlock title="单选">
  <oas-select placeholder="请选择水果" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

## 预设值

<DemoBlock title="预设值（value）">
  <oas-select value="banana" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
</DemoBlock>

## 多选

<DemoBlock title="多选（multiple）">
  <oas-select multiple value='["apple","banana"]' placeholder="可多选" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-select>
</DemoBlock>

多选时 `value` 为 JSON 数组，选中项以标签展示，可单独移除。

## 禁用

<DemoBlock title="禁用">
  <oas-select disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-select>
</DemoBlock>

## 空态

<DemoBlock title="无数据">
  <oas-select placeholder="暂无选项" options='[]'></oas-select>
</DemoBlock>

选项为空时下拉显示「暂无数据」。

## 可搜索

<DemoBlock title="可搜索（searchable）">
  <oas-select searchable placeholder="输入关键词过滤" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-select>
</DemoBlock>

打开下拉后可直接输入过滤，无匹配时显示「无匹配选项」。

## 事件

<DemoBlock title="变化事件">
  <oas-select id="select-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-select>
  <span id="select-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为字符串、多选为数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('select-event')
  const out = document.getElementById('select-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
})
</script>

## API

| 属性          | 说明                                           | 默认值   |
| ------------- | ---------------------------------------------- | -------- |
| `value`       | 当前值（多选为 JSON 数组）                     | 无       |
| `options`     | 选项，JSON 数组 `[{ label, value, disabled }]` | `[]`     |
| `placeholder` | 占位提示                                       | `请选择` |
| `multiple`    | 多选                                           | `false`  |
| `disabled`    | 禁用                                           | `false`  |
| `searchable`  | 可搜索（打开下拉后输入过滤）                   | `false`  |

键盘：`Enter` / `↓` 展开，`↑`/`↓` 移动高亮，`Enter` 选中，`Esc` 关闭。

| 事件         | 说明                          |
| ------------ | ----------------------------- |
| `oas-change` | 选择变化，`detail: { value }` |
