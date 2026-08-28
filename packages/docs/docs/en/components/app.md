# App

The host container for imperative APIs such as message / notification / loadingBar. When an app container exists, messages mount inside it (instead of `document.body`); works well with config-provider.

## Basic usage

Wrapping content with `<oas-app>` makes imperative messages mount inside the app container.

<DemoBlock title="Messages in the App container">
  <oas-app>
    <oas-space>
      <oas-button type="primary" onclick="message.success('Mounted in the App container')">Success message</oas-button>
      <oas-button type="danger" onclick="message.error('Error message')">Error message</oas-button>
      <oas-button onclick="message.info('Info message')">Info message</oas-button>
    </oas-space>
    <oas-space style="margin-top: 16px">
      <oas-button type="warning" onclick="notification.warning({ title: 'Notification in App', description: 'Notifications also mount inside App' })">Notification</oas-button>
      <oas-button onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 1500)">Loading bar</oas-button>
      <oas-button onclick="destroyAllMessage()">Clear messages</oas-button>
    </oas-space>
  </oas-app>
</DemoBlock>

## Working with ConfigProvider

app can be nested inside a config-provider to receive both the injected locale / size / theme and the message context.

<DemoBlock title="ConfigProvider + App">
  <oas-config-provider locale="en">
    <oas-app>
      <oas-space>
        <oas-button type="primary" onclick="message.success('Mounted in App (en)')">Message (en)</oas-button>
        <oas-empty hide-image></oas-empty>
      </oas-space>
    </oas-app>
  </oas-config-provider>
</DemoBlock>

## Message / Notification global defaults

The `message` / `notification` attributes declare global default config for the imperative APIs (JSON; keys aligned with existing options). Imperative functions merge the nearest app's config with call options, and **call options take precedence**.

<DemoBlock title="Message global defaults">
  <oas-space style="margin-bottom: 12px">
    <oas-button onclick="setMsgConfig()">Set global default (duration 800)</oas-button>
    <oas-button onclick="clearMsgConfig()">Clear default</oas-button>
  </oas-space>
  <oas-app id="app-cfg">
    <oas-space>
      <oas-button type="primary" onclick="message.success('Uses the global default duration')">Default duration</oas-button>
      <oas-button onclick="message.info('Overrides the duration', { duration: 5000 })">Overridden (5s)</oas-button>
    </oas-space>
  </oas-app>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { registerLocale } = await import('@oas-ui/i18n')
  const en = (await import('@oas-ui/i18n/en')).default
  registerLocale(en)
  const { message, notification, loadingBar, destroyAllMessage, destroyAllNotification, destroyAllLoadingBar } = await import('@oas-ui/ui')
  window.message = message
  window.notification = notification
  window.loadingBar = loadingBar
  window.destroyAllMessage = destroyAllMessage
  window.destroyAllNotification = destroyAllNotification
  window.destroyAllLoadingBar = destroyAllLoadingBar
  window.setMsgConfig = () =>
    document.getElementById('app-cfg')?.setAttribute('message', JSON.stringify({ duration: 800 }))
  window.clearMsgConfig = () => document.getElementById('app-cfg')?.removeAttribute('message')
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `message` | Global default config JSON for the message imperative API (keys aligned with existing options: `duration`); imperative functions merge the nearest app's config with call options, call options win; invalid JSON is ignored with a dev warning | — | — |
| `notification` | Global default config JSON for the notification imperative API (keys aligned with existing options: `duration`/`showProgress`/`progressPosition`/`scrollable`); imperative functions merge the nearest app's config with call options, call options win; invalid JSON is ignored with a dev warning | — | — |

### Slots

| Name | Description |
| --- | --- |
| default | Subtree (imperative message stacks mount inside this container instead of `document.body`) |

- When an app container exists, the message stacks of imperative APIs like message / notification / loadingBar mount into the nearest app container.
- Without an app container, behavior is unchanged and messages mount to `document.body`.
- Nearest wins: the app container registered later (inner) takes precedence.
