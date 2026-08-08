# Mentions 提及

输入 `@` 触发建议浮层的提及输入组件，适合 @成员 / @任务 等场景。

## 基础用法

<DemoBlock title="基础用法">
  <oas-mentions style="width: 320px" placeholder="输入 @ 提及成员" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"},{"label":"赵六","value":"zhaoliu"}]'></oas-mentions>
</DemoBlock>

输入 `@` 后弹出建议列表：`↑`/`↓` 选择、`Enter` 插入（选中项并入文本），`Esc` 或点击外部关闭。

## 关键词过滤

<DemoBlock title="关键词过滤">
  <oas-mentions style="width: 320px" placeholder="输入 @zh 等关键词过滤" options='[{"label":"张三","value":"zhangsan"},{"label":"张伟","value":"zhangwei"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"}]'></oas-mentions>
</DemoBlock>

`@` 后继续输入即按 label 过滤，无匹配时显示空态「无匹配提及」。

## 自定义前缀

<DemoBlock title="prefix">
  <oas-mentions prefix="#" style="width: 320px" placeholder="输入 # 提及任务" options='[{"label":"需求评审","value":"req-review"},{"label":"编码实现","value":"impl"},{"label":"测试验收","value":"qa"}]'></oas-mentions>
</DemoBlock>

`prefix` 默认 `@`，可换成任意触发符（如 `#`）。

## 受控值

<DemoBlock title="value（受控）">
  <oas-mentions value="今天 @张三 完成了提测" style="width: 320px" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
</DemoBlock>

`value` 属性为受控通道，外部修改即时同步到文本域。

## 事件

<DemoBlock title="选择事件">
  <oas-mentions id="mention-event" style="width: 320px" placeholder="选择后触发 oas-select / oas-change" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"},{"label":"王五","value":"wangwu"}]'></oas-mentions>
  <span id="mention-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

选中建议项后派发 `oas-select`（`detail: { value, label }`）与 `oas-change`（`detail: { value }`，为插入后的完整文本）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('mention-event')
  const out = document.getElementById('mention-output')
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: ${e.detail.label}`
  })
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
})
</script>

## API

| 属性          | 说明                              | 默认值 |
| ------------- | --------------------------------- | ------ |
| `value`       | 值（受控，完整文本）              | 无     |
| `options`     | 选项，JSON 数组 `[{ label, value }]` | `[]`   |
| `prefix`      | 触发前缀                          | `@`    |
| `placeholder` | 占位提示                          | 无     |
| `label`       | 可访问名称（默认走内置文案）      | 无     |
| `disabled`    | 禁用                              | `false` |

键盘：输入 `@` 弹出，`↑`/`↓` 移动高亮，`Enter` 插入，`Esc` 关闭。

| 事件         | 说明                                             |
| ------------ | ------------------------------------------------ |
| `oas-select` | 选中建议项，`detail: { value, label }`           |
| `oas-change` | 插入后文本变化，`detail: { value }`（完整文本）  |
