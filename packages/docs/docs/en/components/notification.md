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

## With progress bar

<DemoBlock title="With progress bar">
  <oas-space>
    <oas-button onclick="notification.success({ title: 'Download complete', description: 'This notification auto closes in 5s', duration: 5000, showProgress: true })">Progress bar (bottom)</oas-button>
    <oas-button onclick="notification.info({ title: 'Deployment in progress', description: 'Progress bar is shown on top, auto closes in 6s', duration: 6000, showProgress: true, progressPosition: 'top' })">Progress bar (top)</oas-button>
  </oas-space>
</DemoBlock>

## Scrollable long content

<DemoBlock title="Scrollable long content">
  <oas-space>
    <oas-button onclick="notification.info({ title: 'Long content', description: 'This is a long description used to demonstrate scrolling inside a notification card. The card limits its height and enables vertical scrolling, so users can read the whole content without breaking the layout. Imagine several paragraphs here: the first covers the product update highlights, the second lists migration notes, the third adds rollback steps and support channels, the fourth… the scrollbar appears naturally once the text is long enough.' })">Long content</oas-button>
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

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `description` | Description content | `string` | — |
| `duration` | Auto-close duration in ms; pass `0` to keep it open | `string` | `4500` |
| `progress-position` | Progress bar position: `bottom` (default) / `top` | `string` | `bottom` |
| `scrollable` | Scroll inside the card when the content is too long; enabled by default, pass `false` to disable | `string` | `true` |
| `show-progress` | Show the auto-close countdown progress bar (animates in sync with `duration`) | `boolean` | — |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear) | `string` | — |
| `type` | Notification type: `info`/`success`/`warning`/`error` | `string` | `info` |

### Methods

| Method | Description |
| --- | --- |
| `notification.info({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | Info notification |
| `notification.success({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | Success notification |
| `notification.warning({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | Warning notification |
| `notification.error({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | Error notification |
| `destroyAllNotification()` | Clear all notifications |

- `duration` defaults to `4500`ms; pass `0` to keep the notification open.
- `showProgress` shows the auto-close countdown progress bar, animating in sync with `duration`; `progressPosition` accepts `bottom` (default) / `top`.
- `scrollable` is enabled by default (scroll inside the card when the content is too long); pass `false` to disable.
- Stacked at the top-right, `role="region"` + `aria-label="Notification"`.
