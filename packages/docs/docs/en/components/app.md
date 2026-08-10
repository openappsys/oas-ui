# App

The host container for imperative APIs such as message / notification / loadingBar. When an app container exists, messages mount inside it (instead of `document.body`); works well with config-provider.

## Basic usage

Wrapping content with `<oas-app>` makes imperative messages mount inside the app container.

<DemoBlock title="Messages in the App container">
  <oas-app>
    <oas-space>
      <oas-button type="primary" onclick="message.success('已挂载到 App 容器')">成功消息</oas-button>
      <oas-button type="danger" onclick="message.error('错误消息')">错误消息</oas-button>
      <oas-button onclick="message.info('普通消息')">信息消息</oas-button>
    </oas-space>
    <oas-space style="margin-top: 16px">
      <oas-button type="warning" onclick="notification.warning({ title: 'App 内通知', description: '通知也挂载在 App 内' })">通知</oas-button>
      <oas-button onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 1500)">加载条</oas-button>
      <oas-button onclick="destroyAllMessage()">清空消息</oas-button>
    </oas-space>
  </oas-app>
</DemoBlock>

## Working with ConfigProvider

app can be nested inside a config-provider to receive both the injected locale / size / theme and the message context.

<DemoBlock title="ConfigProvider + App">
  <oas-config-provider locale="en">
    <oas-app>
      <oas-space>
        <oas-button type="primary" onclick="message.success('Mounted in App (en)')">消息（en）</oas-button>
        <oas-empty hide-image></oas-empty>
      </oas-space>
    </oas-app>
  </oas-config-provider>
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
})
</script>

## API

| Prop | Description |
| --- | --- |
| No attributes | Serves as the host container for imperative APIs; wrapped content is passed through and rendered |

- When an app container exists, the message stacks of imperative APIs like message / notification / loadingBar mount into the nearest app container.
- Without an app container, behavior is unchanged and messages mount to `document.body`.
- Nearest wins: the app container registered later (inner) takes precedence.
