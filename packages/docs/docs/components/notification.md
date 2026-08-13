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

## 带进度条

<DemoBlock title="带进度条">
  <oas-space>
    <oas-button onclick="notification.success({ title: '下载完成', description: '通知将在 5 秒后自动关闭', duration: 5000, showProgress: true })">进度条（底部）</oas-button>
    <oas-button onclick="notification.info({ title: '部署进行中', description: '进度条显示在顶部，6 秒后自动关闭', duration: 6000, showProgress: true, progressPosition: 'top' })">进度条（顶部）</oas-button>
  </oas-space>
</DemoBlock>

## 长内容可滚动

<DemoBlock title="长内容可滚动">
  <oas-space>
    <oas-button onclick="notification.info({ title: '长内容通知', description: '这是一段用于演示超长内容的描述。通知卡片内部会限制高度并开启纵向滚动，用户可以在不撑破卡片的前提下查看全部内容。想象这里写满了若干段落：第一段说明产品更新要点，第二段列出迁移注意事项，第三段补充回滚方案与技术支持渠道，第四段…… 文字足够多时滚动条就会自然出现。' })">长内容</oas-button>
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `description` | 描述内容 | `string` | — |
| `duration` | 自动关闭时长（ms），`0` 表示不自动关闭 | `string` | `4500` |
| `progress-position` | 进度条位置：`bottom`（默认）/ `top` | `string` | `bottom` |
| `scrollable` | 描述内容超长时卡片内滚动，默认开启；传 `false` 关闭 | `string` | `true` |
| `show-progress` | 显示自动关闭倒计时进度条（动画时长与 `duration` 同步） | `boolean` | — |
| `title` | 标题文案 | `string` | — |
| `type` | 通知类型：`info`/`success`/`warning`/`error` | `string` | `info` |

### 方法

| 方法                                                       | 说明         |
| ---------------------------------------------------------- | ------------ |
| `notification.info({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })`    | 信息通知     |
| `notification.success({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | 成功通知     |
| `notification.warning({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })` | 警告通知     |
| `notification.error({ title, description?, duration?, showProgress?, progressPosition?, scrollable? })`   | 错误通知     |
| `destroyAllNotification()`                                 | 清空全部通知 |

- `duration` 默认 `4500`ms，传 `0` 表示不自动关闭。
- `showProgress` 开启自动关闭倒计时进度条，动画时长与 `duration` 同步；`progressPosition` 可选 `bottom`（默认）/ `top`。
- `scrollable` 默认开启（内容超长时卡片内滚动），传 `false` 关闭。
- 右上角堆叠，`role="region"` + `aria-label="通知"`。
