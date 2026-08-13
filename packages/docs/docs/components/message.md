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

## 分组消息

相同 `group` 的消息合并为一条，重复触发递增计数（`×n`）；不同 `group` 相互独立。

<DemoBlock title="分组消息">
  <oas-space>
    <oas-button onclick="message.success('保存成功', { group: 'save', duration: 0 })">保存（连点试试）</oas-button>
    <oas-button onclick="message.info('数据已同步', { group: 'sync', duration: 0 })">同步（另一组）</oas-button>
  </oas-space>
</DemoBlock>

## 更新消息

`key` 标记消息后，可用 `message.update(key, options)` 更新内容/类型，`message.destroy(key)` 关闭指定消息。

<DemoBlock title="更新消息">
  <oas-space>
    <oas-button onclick="message.info('正在处理…', { key: 'upload', duration: 0 })">开始上传</oas-button>
    <oas-button onclick="message.update('upload', { content: '上传成功', type: 'success' })">更新为成功</oas-button>
    <oas-button onclick="message.destroy('upload')">关闭该条</oas-button>
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
| `message.info(content, duration?)` / `message.info(content, options?)` | 信息提示，返回 `{ close }` |
| `message.success(content, duration?)` / `message.success(content, options?)` | 成功提示，返回 `{ close }` |
| `message.warning(content, duration?)` / `message.warning(content, options?)` | 警告提示，返回 `{ close }` |
| `message.error(content, duration?)` / `message.error(content, options?)` | 错误提示，返回 `{ close }` |
| `message.update(key, { content, type?, duration? })` | 更新已存在消息内容/类型，key 不存在则新建 |
| `message.destroy(key)`                 | 关闭指定 key 的消息 |
| `destroyAllMessage()`                 | 清空全部消息               |

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `count` | 合并计数（>1 时内容后显示 `×n`） | `string` | `0` |
| `duration` | 自动关闭时长（ms），`0` 表示不自动关闭 | `string` | `3000` |
| `group` | 分组标识：同组消息合并为一条 | — | — |
| `key` | 唯一标识：供 `message.update` / `message.destroy` 定位 | — | — |
| `type` | 消息类型：`info`/`success`/`warning`/`error` | `string` | `info` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 消息关闭时派发（自动关闭/关闭按钮/`destroy`），`detail: { key? }` |

- `options`：`{ duration?, group?, key?, onClose? }`。`group` 同组消息合并为一条并递增计数；`key` 供 `update` / `destroy` 定位；`onClose` 关闭回调。
- `duration` 默认 `3000`ms，传 `0` 表示不自动关闭。
- 消息关闭（自动关闭 / 关闭按钮 / `destroy`）时派发 `oas-close`，`detail: { key? }`。
- 顶部居中堆叠；`error` 类型使用 `role="alert"`，其余使用 `role="status"`。
