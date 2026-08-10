# Alert

An inline notice bar for success, info, warning, or error messages, with support for a custom title and a close button.

## Basic usage

<DemoBlock title="Four types">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="信息提示">这是一条普通信息</oas-alert>
    <oas-alert type="success" title="成功提示">操作已成功完成</oas-alert>
    <oas-alert type="warning" title="警告提示">请注意保存当前进度</oas-alert>
    <oas-alert type="error" title="错误提示">操作失败，请稍后重试</oas-alert>
  </oas-space>
</DemoBlock>

## No title

<DemoBlock title="No title">
  <oas-alert type="info">仅包含正文内容、不带标题行的提示条。</oas-alert>
</DemoBlock>

## Closable

<DemoBlock title="Closable">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="可关闭提示" closeable>点击右侧 ✕ 可关闭此提示条</oas-alert>
    <oas-alert type="warning" closeable>未设置标题的关闭型提示</oas-alert>
  </oas-space>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-alert type="warning" title="带事件反馈" closeable onoas-close="message.info('已关闭提示')">关闭时触发 oas-close 事件</oas-alert>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `type` | Alert type | `info` / `success` / `warning` / `error` | `info` |
| `title` | Title text | `string` | — |
| `closeable` | Whether to show the close button | `boolean` | `false` |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | Dispatched after the close button is clicked; the component then hides |

`error` uses `role="alert"`, other types use `role="status"`.
