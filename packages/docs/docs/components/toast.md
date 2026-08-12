# Toast 轻提示

命令式全局轻提示，支持成功/错误/警告/信息/加载态、操作按钮与 promise 链，默认 3 秒自动关闭。

## 基础用法

<DemoBlock title="五种类型">
  <oas-space>
    <oas-button type="success" onclick="toast.success({ title: '保存成功' })">成功</oas-button>
    <oas-button type="danger" onclick="toast.error({ title: '网络错误' })">错误</oas-button>
    <oas-button type="warning" onclick="toast.warning({ title: '请注意' })">警告</oas-button>
    <oas-button onclick="toast.info({ title: '这是一条提示' })">信息</oas-button>
    <oas-button onclick="toast.loading({ title: '正在处理…' })">加载</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="toast.info({ title: '2 秒后自动关闭', duration: 2000 })">2 秒</oas-button>
    <oas-button onclick="toast.success({ title: '5 秒后自动关闭', duration: 5000 })">5 秒</oas-button>
    <oas-button onclick="window.toastHandle = toast.warning({ title: '持续显示，需手动关闭', duration: 0 })">不自动关闭（0）</oas-button>
    <oas-button onclick="window.toastHandle && window.toastHandle.close()">手动关闭</oas-button>
  </oas-space>
</DemoBlock>

## 操作按钮

<DemoBlock title="操作按钮">
  <oas-space>
    <oas-button onclick="toast.info({ title: '已撤销删除', action: { label: '重做', onClick: () => toast.success({ title: '已重做' }) } })">带操作按钮</oas-button>
    <oas-button onclick="toast.info({ title: '不可关闭', closable: false, duration: 0 })">不可关闭</oas-button>
  </oas-space>
</DemoBlock>

## 位置

<DemoBlock title="位置">
  <oas-space>
    <oas-button onclick="toast.info({ title: '右上角（默认）' })">top-right</oas-button>
    <oas-button onclick="toast.info({ title: '左上角', position: 'top-left' })">top-left</oas-button>
    <oas-button onclick="toast.info({ title: '顶部居中', position: 'top-center' })">top-center</oas-button>
    <oas-button onclick="toast.info({ title: '底部居中', position: 'bottom-center' })">bottom-center</oas-button>
  </oas-space>
</DemoBlock>

## Promise 链

<DemoBlock title="Promise 链">
  <oas-space>
    <oas-button onclick="runPromise(true)">模拟成功</oas-button>
    <oas-button onclick="runPromise(false)">模拟失败</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast, destroyAllToast } = await import('@oas-ui/ui')
  window.toast = toast
  window.destroyAllToast = destroyAllToast
  window.runPromise = (ok) => {
    toast.promise(
      new Promise((resolve, reject) => setTimeout(() => (ok ? resolve('数据') : reject(new Error('请求失败'))), 1500)),
      {
        loading: '请求中…',
        success: (data) => `成功：${data}`,
        error: (err) => err.message,
      },
    )
  }
})
</script>

## API

### 方法

| 方法                           | 说明                                 |
| ------------------------------ | ------------------------------------ |
| `toast.info(options)`          | 信息提示，返回 `{ close }`           |
| `toast.success(options)`       | 成功提示，返回 `{ close }`           |
| `toast.warning(options)`       | 警告提示，返回 `{ close }`           |
| `toast.error(options)`         | 错误提示，返回 `{ close }`           |
| `toast.loading(options)`       | 加载提示（不可关），返回 `{ close }` |
| `toast.promise(promise, opts)` | promise 链：loading → success/error  |
| `destroyAllToast()`            | 清空全部 toast                       |

### options

| 字段          | 说明                           | 类型                    | 默认值      |
| ------------- | ------------------------------ | ----------------------- | ----------- |
| `title`       | 标题                           | `string`                | —           |
| `description` | 描述                           | `string`                | —           |
| `action`      | 操作按钮                       | `{ label, onClick }`    | —           |
| `duration`    | 自动关闭时长（ms），0 不关闭   | `number`                | `3000`      |
| `closable`    | 是否可手动关闭（loading 恒关） | `boolean`               | `true`      |
| `position`    | 位置                           | `top-right` 等 6 个方向 | `top-right` |

- `error` 类型使用 `role="alert"`，其余使用 `role="status"`。
- 多个 toast 共用一个栈容器，同一方向按位置堆叠；`duration` 计时器在关闭/卸载时清理，无泄漏。
