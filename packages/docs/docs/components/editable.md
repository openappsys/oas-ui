# Editable 就地编辑

点击/回车/空格进入编辑态，Enter 提交、Esc 取消，空值提交默认非破坏。

## 基础用法

<DemoBlock title="点击编辑">
  <oas-editable value="点击我修改"></oas-editable>
</DemoBlock>

点击文本（或聚焦后按 Enter/空格）进入编辑，`Enter` 提交、`Esc` 还原。

## 占位符

<DemoBlock title="空值占位">
  <oas-editable placeholder="暂无内容，点击添加"></oas-editable>
</DemoBlock>

值为空时展示 `placeholder`。

## submit-on-enter=false

<DemoBlock title="回车不提交">
  <oas-editable value="仅用确认按钮提交" submit-on-enter="false"></oas-editable>
</DemoBlock>

`submit-on-enter=false` 时 `Enter` 不提交，改用编辑态内的确认按钮。

## maxlength

<DemoBlock title="长度限制">
  <oas-editable value="最多 10 字符" maxlength="10"></oas-editable>
</DemoBlock>

## 禁用

<DemoBlock title="disabled">
  <oas-editable disabled value="不可编辑"></oas-editable>
</DemoBlock>

## 事件

<DemoBlock title="提交/取消事件">
  <oas-editable id="edit-event" value="修改我"></oas-editable>
  <span id="edit-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 240px"></span>
</DemoBlock>

监听 `oas-change`（提交）与 `oas-cancel`（取消/空值提交）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('edit-event')
  const out = document.getElementById('edit-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.value}`
  })
  el?.addEventListener('oas-cancel', (e) => {
    out.textContent = `oas-cancel`
  })
})
</script>

## API

| 属性             | 说明                        | 默认值  |
| ---------------- | --------------------------- | ------- |
| `value`          | 当前值（受控）              | `''`    |
| `placeholder`    | 空值占位                    | `''`    |
| `disabled`       | 禁用                        | `false` |
| `submit-on-enter`| 是否允许 Enter 提交         | `true`  |
| `maxlength`      | 输入最大长度                | `-1`    |

键盘：展示态 `Enter`/空格/点击进入编辑；编辑态 `Enter` 提交、`Esc` 还原失焦。

| 事件          | 说明                                |
| ------------- | ----------------------------------- |
| `oas-change`  | 提交新值，`detail: { value }`       |
| `oas-cancel`  | 取消/空值提交（还原旧值），默认非破坏 |

ARIA：展示态 `role="button"` + `aria-label="编辑"`，编辑态输入框保持同一 label。
