# Alert

An inline notice bar for success, info, warning, or error messages, with support for a custom title and a close button.

## Basic usage

<DemoBlock title="Four types">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="Info notice">This is a regular info message</oas-alert>
    <oas-alert type="success" title="Success notice">The operation completed successfully</oas-alert>
    <oas-alert type="warning" title="Warning notice">Please save your current progress</oas-alert>
    <oas-alert type="error" title="Error notice">Operation failed, please try again later</oas-alert>
  </oas-space>
</DemoBlock>

## No title

<DemoBlock title="No title">
  <oas-alert type="info">An alert with only body content and no title line.</oas-alert>
</DemoBlock>

## Closable

<DemoBlock title="Closable">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="Closable notice" closeable>Click the ✕ on the right to close this alert</oas-alert>
    <oas-alert type="warning" closeable>A closable alert without a title</oas-alert>
  </oas-space>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-alert type="warning" title="With event feedback" closeable onoas-close="message.info('Alert closed')">Dispatches the oas-close event when closed</oas-alert>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `closeable` | Whether to show the close button | — | — |
| `title` | Title text | — | — |
| `type` | Alert type | — | `info` |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched after the close button is clicked; the component then hides |

### Slots

| Name | Description |
| --- | --- |
| default | — |

`error` uses `role="alert"`, other types use `role="status"`.
