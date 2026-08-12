# Snackbar 消息条

底部（或顶部）弹出的轻量反馈条，`open` 属性受控，可带操作按钮，默认 4 秒后派发 `oas-close` 由外部负责关闭。

## 基础用法

<DemoBlock title="受控打开">
  <oas-space>
    <oas-button type="primary" onclick="openSnackbar('消息已发送')">打开</oas-button>
  </oas-space>
  <oas-snackbar id="snackbar-basic" message="消息已发送" onoas-close="closeSnackbar()"></oas-snackbar>
</DemoBlock>

## 操作按钮

<DemoBlock title="操作按钮">
  <oas-space>
    <oas-button type="primary" onclick="openSnackbar('文件已删除', '撤销')">打开（带撤销）</oas-button>
  </oas-space>
  <oas-snackbar id="snackbar-action" message="文件已删除" action-text="撤销" onoas-action="closeSnackbar(); toast.info({ title: '已撤销删除' })" onoas-close="closeSnackbar()"></oas-snackbar>
</DemoBlock>

## 方向与偏移

<DemoBlock title="方向与偏移">
  <oas-space>
    <oas-button onclick="showSnackbar('bottom')">底部（默认）</oas-button>
    <oas-button onclick="showSnackbar('top')">顶部</oas-button>
    <oas-button onclick="showSnackbar('bottom', 80)">底部 + 偏移 80</oas-button>
  </oas-space>
</DemoBlock>

## 堆叠上限

<DemoBlock title="堆叠上限 3">
  <oas-space>
    <oas-button onclick="for (let i = 1; i <= 4; i++) openSnackbar('消息 ' + i, undefined, i)">连发四条</oas-button>
  </oas-space>
  <p>同时最多展示 3 条，第 4 条出现时最老的一条会收到 <code>oas-close</code>。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  window.closeSnackbar = () => {
    document.querySelectorAll('oas-snackbar').forEach((el) => el.removeAttribute('open'))
  }
  window.openSnackbar = (message, actionText, seq = 0) => {
    const id = seq ? `sb-${seq}` : 'snackbar-tmp'
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('oas-snackbar')
      el.id = id
      if (actionText) el.setAttribute('action-text', actionText)
      el.addEventListener('oas-close', () => el.removeAttribute('open'))
      document.body.appendChild(el)
    }
    el.setAttribute('message', message)
    el.setAttribute('open', '')
  }
  window.showSnackbar = (direction, offset) => {
    const el = document.getElementById('snackbar-tmp') || (() => {
      const e = document.createElement('oas-snackbar')
      e.id = 'snackbar-tmp'
      e.addEventListener('oas-close', () => e.removeAttribute('open'))
      document.body.appendChild(e)
      return e
    })()
    el.setAttribute('direction', direction)
    if (offset) el.setAttribute('offset', String(offset))
    el.setAttribute('message', direction === 'top' ? '顶部消息条' : offset ? '底部偏移 80px' : '底部消息条')
    el.setAttribute('open', '')
  }
})
</script>

## API

### 属性

| 属性          | 说明                 | 类型      | 默认值 |
| ------------- | -------------------- | --------- | ------ |
| `action-text` | 操作按钮文案         | `string`  | —      |
| `direction`   | 位置方向             | —         | —      |
| `duration`    | 自动关闭时长（ms）   | `string`  | `4000` |
| `message`     | 文案                 | `string`  | —      |
| `offset`      | 距屏幕边缘偏移（px） | `string`  | `24`   |
| `open`        | 是否显示（受控）     | `boolean` | —      |

### 事件

| 事件         | 说明                                        |
| ------------ | ------------------------------------------- |
| `oas-action` | 点击操作按钮时派发                          |
| `oas-close`  | 到期自动关闭时派发（受控模式不自改 `open`） |
| `oas-open`   | 打开时派发                                  |

- 无 `action-text` 时 `role="status"`；有操作按钮时 `role="alertdialog"` + `aria-live="assertive"`。
- `open` 受控：到期只派发 `oas-close`，由外部负责移除 `open`；同时最多堆叠 3 条，超出时最老的一条收到 `oas-close`。
