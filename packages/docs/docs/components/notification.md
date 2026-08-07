# Notification 通知

右上角通知卡片，支持标题、描述与类型。

## 基础用法

<div class="demo">
  <oas-button onclick="notification.success({ title: '成功', description: '操作已完成' })">成功通知</oas-button>
</div>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { notification } = await import('@oas-ui/ui')
  window.notification = notification
})
</script>

## API

`notification.info/success/warning/error({ title, description?, duration? })`，默认 4500ms 自动关闭。

| 说明 |
|---|
| `notification.*({ title, description?, duration? })` |
| `destroyAll()` 清空 |
| 右上角堆叠，`role="region"` + `aria-label="通知"` |
