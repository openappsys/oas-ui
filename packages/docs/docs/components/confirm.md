# Confirm 确认框

命令式确认对话框，基于 Promise。

## 基础用法

<div class="demo">
  <oas-button onclick="openConfirm()">打开确认框</oas-button>
</div>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { confirm, message } = await import('@oas-ui/ui')
  window.confirm = confirm
  window.message = message
  window.openConfirm = () =>
    confirm({ title: '确认删除', content: '删除后不可恢复' }).then(() => message.success('已删除'))
})
</script>

## API

| 方法 | 说明 |
|---|---|
| `confirm({ title?, content?, okText?, cancelText? })` | 返回 Promise，确定 resolve、取消 reject |
| `destroyAll()` | 关闭全部 |

复用 `oas-modal`，Esc 取消。
