# Message

Imperative global message notifications with support for types, custom duration, and manual dismissal.

## Basic usage

<DemoBlock title="Four types">
  <oas-space>
    <oas-button type="success" onclick="message.success('操作成功')">成功</oas-button>
    <oas-button type="danger" onclick="message.error('出错了')">错误</oas-button>
    <oas-button type="warning" onclick="message.warning('请注意')">警告</oas-button>
    <oas-button onclick="message.info('这是一条提示')">信息</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="message.info('2 秒后自动关闭', 2000)">2 秒</oas-button>
    <oas-button onclick="message.success('5 秒后自动关闭', 5000)">5 秒</oas-button>
    <oas-button onclick="message.warning('持续显示，需手动关闭', 0)">不自动关闭（0）</oas-button>
  </oas-space>
</DemoBlock>

## Manual close

<DemoBlock title="Manual close">
  <oas-space>
    <oas-button onclick="window.msgHandle = message.info('这条消息不会自动关闭', 0)">弹出消息</oas-button>
    <oas-button onclick="window.msgHandle && window.msgHandle.close()">手动关闭</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="message.info('消息一'); message.success('消息二'); message.warning('消息三')">连发三条</oas-button>
    <oas-button onclick="destroyAllMessage()">清空全部</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, destroyAllMessage } = await import('@oas-ui/ui')
  window.message = message
  window.destroyAllMessage = destroyAllMessage
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `message.info(content, duration?)` | Info message, returns `{ close }` |
| `message.success(content, duration?)` | Success message, returns `{ close }` |
| `message.warning(content, duration?)` | Warning message, returns `{ close }` |
| `message.error(content, duration?)` | Error message, returns `{ close }` |
| `destroyAllMessage()` | Clear all messages |

- `duration` defaults to `3000`ms; pass `0` to keep the message open.
- Stacked and centered at the top; `error` uses `role="alert"`, others use `role="status"`.
