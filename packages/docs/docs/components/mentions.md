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

## 禁用

<DemoBlock title="disabled">
  <oas-mentions disabled value="已禁用的提及输入" style="width: 320px" options='[{"label":"张三","value":"zhangsan"}]'></oas-mentions>
</DemoBlock>

`disabled` 下文本域不可输入、不可触发提及浮层（灰化禁用态）。

## 无障碍名称（label）

<DemoBlock title="label（可访问名称）">
  <oas-mentions id="mention-label" label="会议参与人" style="width: 320px" placeholder="输入 @ 提及成员" options='[{"label":"张三","value":"zhangsan"},{"label":"李四","value":"lisi"}]'></oas-mentions>
  <span id="mention-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`label` 作为文本域的可访问名称（`aria-label`）：设置后读屏朗读该名称；未设置时依次回退 `placeholder` → 内置文案「提及输入框」。

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

  // label（可访问名称）demo：等组件升级后读取内层 textarea 的 aria-label
  const mLabel = document.getElementById('mention-label')
  const mLabelOut = document.getElementById('mention-label-output')
  const readMLabel = () => {
    const a = mLabel?.shadowRoot?.querySelector('textarea')?.getAttribute('aria-label')
    if (a !== undefined) {
      mLabelOut.textContent = `aria-label：${a}`
    } else {
      setTimeout(readMLabel, 60)
    }
  }
  readMLabel()
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `label` | 可访问名称（默认走内置文案） | — | — |
| `options` | 选项，JSON 数组 `[{ label, value }]` | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | `string` | — |
| `prefix` | 触发前缀 | `string` | `@` |
| `value` | 值（受控，完整文本） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 插入后文本变化，`detail: { value }`（完整文本） |
| `oas-input` | — |
| `oas-select` | 选中建议项，`detail: { value, label }` |

键盘：输入 `@` 弹出，`↑`/`↓` 移动高亮，`Enter` 插入，`Esc` 关闭。
