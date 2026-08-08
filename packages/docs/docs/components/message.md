# Message 消息提示

命令式全局消息提示，支持类型、自定义时长与手动关闭。

## 基础用法

<DemoBlock title="四种类型">
  <oas-space>
    <oas-button type="success" onclick="message.success('操作成功')">成功</oas-button>
    <oas-button type="danger" onclick="message.error('出错了')">错误</oas-button>
    <oas-button type="warning" onclick="message.warning('请注意')">警告</oas-button>
    <oas-button onclick="message.info('这是一条提示')">信息</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="message.info('2 秒后自动关闭', 2000)">2 秒</oas-button>
    <oas-button onclick="message.success('5 秒后自动关闭', 5000)">5 秒</oas-button>
    <oas-button onclick="message.warning('持续显示，需手动关闭', 0)">不自动关闭（0）</oas-button>
  </oas-space>
</DemoBlock>

## 手动关闭

<DemoBlock title="手动关闭">
  <oas-space>
    <oas-button onclick="window.msgHandle = message.info('这条消息不会自动关闭', 0)">弹出消息</oas-button>
    <oas-button onclick="window.msgHandle && window.msgHandle.close()">手动关闭</oas-button>
  </oas-space>
</DemoBlock>

## 清空全部

<DemoBlock title="清空全部">
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

### 方法

| 方法                                  | 说明                       |
| ------------------------------------- | -------------------------- |
| `message.info(content, duration?)`    | 信息提示，返回 `{ close }` |
| `message.success(content, duration?)` | 成功提示，返回 `{ close }` |
| `message.warning(content, duration?)` | 警告提示，返回 `{ close }` |
| `message.error(content, duration?)`   | 错误提示，返回 `{ close }` |
| `destroyAllMessage()`                 | 清空全部消息               |

- `duration` 默认 `3000`ms，传 `0` 表示不自动关闭。
- 顶部居中堆叠；`error` 类型使用 `role="alert"`，其余使用 `role="status"`。
