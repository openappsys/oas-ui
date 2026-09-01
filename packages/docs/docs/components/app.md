# App 消息上下文容器

message / notification / loadingBar 等命令式 API 的宿主容器。app 容器存在时，消息挂载到 app 内（而非 `document.body`）；可与 config-provider 配套使用。

## 基础用法

包裹 `<oas-app>` 后，命令式消息将挂载到 app 容器内。

<DemoBlock title="App 容器消息">
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

## 与 ConfigProvider 配套

app 可嵌套在 config-provider 内：同时获得注入的 locale / size / theme 与消息上下文。

<DemoBlock title="ConfigProvider + App 配套">
  <oas-config-provider locale="en">
    <oas-app>
      <oas-space>
        <oas-button type="primary" onclick="message.success('Mounted in App (en)')">消息（en）</oas-button>
        <oas-empty hide-image></oas-empty>
      </oas-space>
    </oas-app>
  </oas-config-provider>
</DemoBlock>

## Message / Notification 全局默认配置

`message` / `notification` 属性声明命令式 API 的全局默认配置（JSON，键集对齐现有 options 已有键）。命令式函数读取最近 app 的配置与调用参数合并，**调用参数优先**。

<DemoBlock title="Message 全局默认配置">
  <oas-space style="margin-bottom: 12px">
    <oas-button onclick="setMsgConfig()">设置全局默认（duration 800）</oas-button>
    <oas-button onclick="clearMsgConfig()">清除默认</oas-button>
  </oas-space>
  <oas-app id="app-cfg">
    <oas-space>
      <oas-button type="primary" onclick="message.success('走全局默认时长')">默认时长</oas-button>
      <oas-button onclick="message.info('覆盖全局时长', { duration: 5000 })">覆盖时长（5s）</oas-button>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `message` | message 命令式 API 全局默认配置 JSON（键集对齐现有 options 已有键：`duration`）；命令式函数读取最近 app 的配置与调用参数合并，调用参数优先；非法 JSON 忽略 + dev 告警 | — | — |
| `notification` | notification 命令式 API 全局默认配置 JSON（键集对齐现有 options 已有键：`duration`/`showProgress`/`progressPosition`/`scrollable`）；命令式函数读取最近 app 的配置与调用参数合并，调用参数优先；非法 JSON 忽略 + dev 告警 | — | — |
| `toast` | — | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 子树（命令式消息栈挂载到本容器内，而非 document.body） |

- app 容器存在时，message / notification / loadingBar 等命令式 API 的消息栈挂载到最近的 app 容器内。
- 无 app 容器时保持原有行为，挂载到 `document.body`。
- 就近优先：后注册（内层）的 app 容器优先。
