# MessageActions 消息操作

消息操作条：复制、重试、编辑、重新生成、分支、反馈等。组件只渲染按钮并派发 `oas-action`，业务动作和会话状态由宿主持有。

## 基础用法

<DemoBlock title="消息操作：点击按钮派发 oas-action（detail: { key, messageId }）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-message-actions
      id="message-actions-basic"
      message-id="m1"
      label="消息操作"
      align="start"
      actions='[{"key":"copy","label":"复制"},{"key":"retry","label":"重试"},{"key":"edit","label":"编辑"},{"key":"regenerate","label":"重新生成"},{"key":"like","label":"赞","active":true}]'
    ></oas-message-actions>
    <span id="message-actions-output" role="status" style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)">等待操作</span>
  </div>
</DemoBlock>

## 禁用 / 危险操作

<DemoBlock title="disabled、单项 disabled 与 danger">
  <oas-message-actions
    disabled
    actions='[{"key":"delete","label":"删除","tone":"danger"},{"key":"copy","label":"复制","disabled":true}]'
  ></oas-message-actions>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-message-actions')
  const actions = document.getElementById('message-actions-basic')
  const output = document.getElementById('message-actions-output')
  actions?.addEventListener('oas-action', (event) => {
    output.textContent = `已触发：${event.detail.key}（${event.detail.messageId ?? '无消息 id'}）`
  })
})
</script>

## API

### oas-message-actions

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions` | 操作项 JSON：[{ key, label, title?, disabled?, active?, tone? }] | `string` | — |
| `align` | 对齐：start（默认）/ end | `string` | `start` |
| `disabled` | 禁用全部操作 | `boolean` | — |
| `label` | 操作组 aria-label（可选） | `string` | — |
| `message-id` | 消息 id，随 oas-action detail 回传 | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action` | 点击操作时派发，detail: { key, messageId } |
