# Message 消息提示

命令式全局消息提示，支持类型与自动关闭。

## 基础用法

<div class="demo">
  <oas-space>
    <oas-button onclick="message.success('操作成功')">成功</oas-button>
    <oas-button onclick="message.error('出错了')">错误</oas-button>
    <oas-button onclick="message.warning('注意')">警告</oas-button>
    <oas-button onclick="message.info('提示')">信息</oas-button>
  </oas-space>
</div>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

命令式方法：`message.success(content, duration?)` / `.error` / `.warning` / `.info`，默认 3000ms 自动关闭，返回 `{ close }`。

| 说明 |
|---|
| `message.info/success/warning/error(content, duration?)` |
| `destroyAll()` 清空全部 |
| error 类型使用 `role="alert"`，其余 `role="status"` |
