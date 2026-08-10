# Notification

Notification cards in the top-right corner, supporting title, description, duration, and type.

## Basic usage

<DemoBlock title="Four types">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Info notification', description: 'This is a regular notification' })">Info</oas-button>
    <oas-button type="success" onclick="notification.success({ title: 'Success notification', description: 'Operation completed' })">Success</oas-button>
    <oas-button type="warning" onclick="notification.warning({ title: 'Warning notification', description: 'Please handle it promptly' })">Warning</oas-button>
    <oas-button type="danger" onclick="notification.error({ title: 'Error notification', description: 'Operation failed' })">Error</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Long display', description: 'Auto closes after 8s', duration: 8000 })">8s</oas-button>
    <oas-button onclick="notification.success({ title: 'No auto-close', description: 'Click ✕ to close manually', duration: 0 })">No auto-close</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="notification.error({ title: 'Error notification', description: 'Notification one' }); notification.warning({ title: 'Warning notification', description: 'Notification two' }); notification.success({ title: 'Success notification', description: 'Notification three' })">Fire three</oas-button>
    <oas-button onclick="destroyAllNotification()">Clear all</oas-button>
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
