# Toast

Imperative global toasts supporting success/error/warning/info/loading states, action buttons, and promise chains; auto-dismisses after 3 seconds by default.

## Basic usage

<DemoBlock title="Five types">
  <oas-space>
    <oas-button type="success" onclick="toast.success({ title: '保存成功' })">成功</oas-button>
    <oas-button type="danger" onclick="toast.error({ title: '网络错误' })">错误</oas-button>
    <oas-button type="warning" onclick="toast.warning({ title: '请注意' })">警告</oas-button>
    <oas-button onclick="toast.info({ title: '这是一条提示' })">信息</oas-button>
    <oas-button onclick="toast.loading({ title: '正在处理…' })">加载</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="toast.info({ title: '2 秒后自动关闭', duration: 2000 })">2 秒</oas-button>
    <oas-button onclick="toast.success({ title: '5 秒后自动关闭', duration: 5000 })">5 秒</oas-button>
    <oas-button onclick="window.toastHandle = toast.warning({ title: '持续显示，需手动关闭', duration: 0 })">不自动关闭（0）</oas-button>
    <oas-button onclick="window.toastHandle && window.toastHandle.close()">手动关闭</oas-button>
  </oas-space>
</DemoBlock>

## Action buttons

<DemoBlock title="Action buttons">
  <oas-space>
    <oas-button onclick="toast.info({ title: '已撤销删除', action: { label: '重做', onClick: () => toast.success({ title: '已重做' }) } })">带操作按钮</oas-button>
    <oas-button onclick="toast.info({ title: '不可关闭', closable: false, duration: 0 })">不可关闭</oas-button>
  </oas-space>
</DemoBlock>

## Position

<DemoBlock title="Position">
  <oas-space>
    <oas-button onclick="toast.info({ title: '右上角（默认）' })">top-right</oas-button>
    <oas-button onclick="toast.info({ title: '左上角', position: 'top-left' })">top-left</oas-button>
    <oas-button onclick="toast.info({ title: '顶部居中', position: 'top-center' })">top-center</oas-button>
    <oas-button onclick="toast.info({ title: '底部居中', position: 'bottom-center' })">bottom-center</oas-button>
  </oas-space>
</DemoBlock>

## Promise chain

<DemoBlock title="Promise chain">
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

### Methods

| Method | Description |
| --- | --- |
| `toast.info(options)` | Info toast, returns `{ close }` |
| `toast.success(options)` | Success toast, returns `{ close }` |
| `toast.warning(options)` | Warning toast, returns `{ close }` |
| `toast.error(options)` | Error toast, returns `{ close }` |
| `toast.loading(options)` | Loading toast (not closable), returns `{ close }` |
| `toast.promise(promise, opts)` | Promise chain: loading → success/error |
| `destroyAllToast()` | Clear all toasts |

### options

| Field | Description | Type | Default |
| --- | --- | --- | --- |
| `title` | Title | `string` | — |
| `description` | Description | `string` | — |
| `action` | Action button | `{ label, onClick }` | — |
| `duration` | Auto-dismiss duration (ms); 0 keeps it open | `number` | `3000` |
| `closable` | Whether it can be closed manually (loading is always unclosable) | `boolean` | `true` |
| `position` | Position | 6 directions such as `top-right` | `top-right` |

- `error` uses `role="alert"`, others use `role="status"`.
- Multiple toasts share one stack container and stack by position per direction; `duration` timers are cleaned up on close/unmount with no leaks.
