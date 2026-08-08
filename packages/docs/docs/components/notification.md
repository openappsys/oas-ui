# Notification 通知

右上角通知卡片，支持标题、描述、时长与类型。

## 基础用法

<DemoBlock title="四种类型">
  <oas-space>
    <oas-button onclick="notification.info({ title: '信息通知', description: '这是一条普通通知' })">信息</oas-button>
    <oas-button type="success" onclick="notification.success({ title: '成功通知', description: '操作已完成' })">成功</oas-button>
    <oas-button type="warning" onclick="notification.warning({ title: '警告通知', description: '请及时处理' })">警告</oas-button>
    <oas-button type="danger" onclick="notification.error({ title: '错误通知', description: '操作失败' })">错误</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="notification.info({ title: '长时展示', description: '8 秒后自动关闭', duration: 8000 })">8 秒</oas-button>
    <oas-button onclick="notification.success({ title: '不自动关闭', description: '需手动点击 ✕ 关闭', duration: 0 })">不自动关闭</oas-button>
  </oas-space>
</DemoBlock>

## 清空全部

<DemoBlock title="清空全部">
  <oas-space>
    <oas-button onclick="notification.error({ title: '错误通知', description: '通知一' }); notification.warning({ title: '警告通知', description: '通知二' }); notification.success({ title: '成功通知', description: '通知三' })">连发三条</oas-button>
    <oas-button onclick="destroyAllNotification()">清空全部</oas-button>
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

### 方法

| 方法                                                       | 说明         |
| ---------------------------------------------------------- | ------------ |
| `notification.info({ title, description?, duration? })`    | 信息通知     |
| `notification.success({ title, description?, duration? })` | 成功通知     |
| `notification.warning({ title, description?, duration? })` | 警告通知     |
| `notification.error({ title, description?, duration? })`   | 错误通知     |
| `destroyAllNotification()`                                 | 清空全部通知 |

- `duration` 默认 `4500`ms，传 `0` 表示不自动关闭。
- 右上角堆叠，`role="region"` + `aria-label="通知"`。
