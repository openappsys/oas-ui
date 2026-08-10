# Notification

Notification cards in the top-right corner, supporting title, description, duration, and type.

## Basic usage

<DemoBlock title="Four types">
  <oas-space>
    <oas-button onclick="notification.info({ title: '信息通知', description: '这是一条普通通知' })">信息</oas-button>
    <oas-button type="success" onclick="notification.success({ title: '成功通知', description: '操作已完成' })">成功</oas-button>
    <oas-button type="warning" onclick="notification.warning({ title: '警告通知', description: '请及时处理' })">警告</oas-button>
    <oas-button type="danger" onclick="notification.error({ title: '错误通知', description: '操作失败' })">错误</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="notification.info({ title: '长时展示', description: '8 秒后自动关闭', duration: 8000 })">8 秒</oas-button>
    <oas-button onclick="notification.success({ title: '不自动关闭', description: '需手动点击 ✕ 关闭', duration: 0 })">不自动关闭</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="notification.error({ title: '错误通知', description: '通知一' }); notification.warning({ title: '警告通知', description: '通知二' }); notification.success({ title: '成功通知', description: '通知三' })">连发三条</oas-button>
    <oas-button onclick="destroyAllNotification()">清空全部</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { notification, destroyAllNotification } = await import('@oas-ui/ui')
  window.notification = notification
  window.destroyAllNotification = destroyAllNotification
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `notification.info({ title, description?, duration? })` | Info notification |
| `notification.success({ title, description?, duration? })` | Success notification |
| `notification.warning({ title, description?, duration? })` | Warning notification |
| `notification.error({ title, description?, duration? })` | Error notification |
| `destroyAllNotification()` | Clear all notifications |

- `duration` defaults to `4500`ms; pass `0` to keep the notification open.
- Stacked at the top-right, `role="region"` + `aria-label="Notification"`.
