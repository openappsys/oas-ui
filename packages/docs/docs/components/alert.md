# Alert 警告提示

内嵌式提示条，用于展示成功、信息、警告或错误信息，支持自定义标题与关闭按钮。

## 基础用法

<DemoBlock title="四种类型">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="信息提示">这是一条普通信息</oas-alert>
    <oas-alert type="success" title="成功提示">操作已成功完成</oas-alert>
    <oas-alert type="warning" title="警告提示">请注意保存当前进度</oas-alert>
    <oas-alert type="error" title="错误提示">操作失败，请稍后重试</oas-alert>
  </oas-space>
</DemoBlock>

## 无标题

<DemoBlock title="无标题">
  <oas-alert type="info">仅包含正文内容、不带标题行的提示条。</oas-alert>
</DemoBlock>

## 可关闭

<DemoBlock title="可关闭">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="可关闭提示" closeable>点击右侧 ✕ 可关闭此提示条</oas-alert>
    <oas-alert type="warning" closeable>未设置标题的关闭型提示</oas-alert>
  </oas-space>
</DemoBlock>

## 事件反馈

<DemoBlock title="事件反馈">
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `type` | 提示类型 | `info` / `success` / `warning` / `error` | `info` |
| `title` | 标题文案 | `string` | — |
| `closeable` | 是否显示关闭按钮 | `boolean` | `false` |

### 事件

| 事件 | 说明 |
|---|---|
| `oas-close` | 点击关闭按钮后触发，随后组件隐藏 |

`error` 类型使用 `role="alert"`，其余类型使用 `role="status"`。
