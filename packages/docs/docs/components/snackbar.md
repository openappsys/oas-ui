# Snackbar 消息条

底部（或顶部）居中的轻量反馈条。`open` 属性受控，多条自动纵向堆叠（每方向最多 3 条）；悬停/聚焦/页面隐藏时暂停计时并按剩余时长续走；`oas-close` 事件以 `detail.reason` 区分关闭途径（`timeout` / `escape` / `close` / `swipe` / `evict` / `group`），由外部负责移除 `open`。

## 基础用法

<DemoBlock title="受控打开">
  <oas-space>
    <oas-button type="primary" onclick="sbShow({ id: 'sb-basic', message: '消息已发送', closable: '' })">打开</oas-button>
  </oas-space>
  <p class="sb-event-log">最近事件：<code id="sb-log">—</code></p>
</DemoBlock>

`closable` 开启关闭按钮（建议 `duration="0"` 常驻条必开）；按 Esc 可关闭——焦点在消息条内时关当前，无焦点时关最老一条。

## 操作按钮

<DemoBlock title="操作按钮（撤销）">
  <oas-space>
    <oas-button type="primary" onclick="sbShow({ id: 'sb-action', message: '文件已删除', actionText: '撤销', closable: '' })">打开（带撤销）</oas-button>
  </oas-space>
</DemoBlock>

## 富内容插槽

<DemoBlock title="默认插槽覆盖 message 属性">
  <oas-space>
    <oas-button onclick="sbOpen('sb-slot')">打开富内容</oas-button>
  </oas-space>
  <oas-snackbar id="sb-slot" duration="0" closable onoas-close="sbClose(this)"><strong>照片已上传</strong> — <a href="javascript:void(0)">查看相册</a></oas-snackbar>
</DemoBlock>

插槽内容支持图标、链接、强调等富文本；有插槽内容时 `message` 属性不参与渲染（也不参与同内容合并）。

## 方向与偏移

<DemoBlock title="方向与偏移">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: '底部消息条' })">底部（默认）</oas-button>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: '顶部消息条', direction: 'top' })">顶部</oas-button>
    <oas-button onclick="sbShow({ id: 'sb-dir', message: '底部偏移 80px', offset: '80' })">底部 + 偏移 80</oas-button>
  </oas-space>
</DemoBlock>

## 堆叠与排队

<DemoBlock title="堆叠 / 排队">
  <oas-space>
    <oas-button onclick="sbFireFour()">连发四条（挤掉最老）</oas-button>
    <oas-button onclick="sbQueue()">连发四条（排队依次展示）</oas-button>
  </oas-space>
  <p class="sb-event-log">最近事件：<code id="sb-log-2">—</code></p>
</DemoBlock>

多条同向打开时纵向堆叠不重叠，最新一条贴屏幕边缘；默认超限（3 条）挤掉最老的一条（`reason: evict`）。加 `queue` 属性改为排队：栈满时等待，前面的关闭后依次补位（`oas-open` 在真正展示时才派发）。

## 暂停计时与进度

<DemoBlock title="hover/focus 暂停 + 计时进度条">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-progress', message: '悬停我暂停计时', duration: '6000', progress: '', closable: '' })">打开（6 秒 + 进度）</oas-button>
  </oas-space>
</DemoBlock>

悬停、聚焦（Tab 到操作/关闭按钮）或切换浏览器标签页时暂停计时，恢复后按**剩余时长**续走（不重置满时长）；进度条随暂停冻结。`no-pause` 可关闭全部自动暂停。

## 同内容合并

<DemoBlock title="group 合并 + 计数徽标">
  <oas-space>
    <oas-button onclick="sbGroupHit()">连点两次保存</oas-button>
  </oas-space>
</DemoBlock>

设置 `group` 后，同组同文案的新消息不另开一条，而是并入既有条目并展示 `×n` 计数、重置计时（被合并的元素收到 `oas-close`，`reason: group`）。

## 滑动关闭与常驻

<DemoBlock title="滑动关闭（触屏）/ 常驻条">
  <oas-space>
    <oas-button onclick="sbShow({ id: 'sb-swipe', message: '触屏上纵向滑动可关闭', duration: '0', swipe: '', closable: '' })">打开常驻条</oas-button>
  </oas-space>
</DemoBlock>

`swipe` 开启纵向滑动关闭（位移超过阈值松手抛出，`reason: swipe`）；`duration="0"` 常驻不自动关闭，必须提供关闭路径（`closable` 或操作按钮）。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  let sbSeq = 0
  window.sbLog = (msg) => {
    for (const id of ['sb-log', 'sb-log-2']) {
      const el = document.getElementById(id)
      if (el) el.textContent = msg
    }
  }
  window.sbClose = (el) => el.removeAttribute('open')
  window.sbOpen = (id) => {
    document.getElementById(id)?.setAttribute('open', '')
  }
  window.sbShow = (opts = {}) => {
    const { message, id, fresh = false, actionText, ...attrs } = opts
    let el
    let targetId = id
    if (!targetId || fresh) targetId = `sb-${++sbSeq}`
    el = document.getElementById(targetId)
    if (!el) {
      el = document.createElement('oas-snackbar')
      el.id = targetId
      el.addEventListener('oas-action', () => {
        el.removeAttribute('open')
        toast.info({ title: '已撤销删除' })
      })
      el.addEventListener('oas-close', (e) => {
        el.removeAttribute('open')
        const reason = e.detail && e.detail.reason ? `（reason: ${e.detail.reason}）` : ''
        window.sbLog(`${el.getAttribute('message') || '消息条'} 收到 oas-close${reason}`)
      })
      document.body.appendChild(el)
    }
    el.setAttribute('message', message ?? '')
    if (actionText) el.setAttribute('action-text', actionText)
    else el.removeAttribute('action-text')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.setAttribute('open', '')
  }
  window.sbFireFour = () => {
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => window.sbShow({ message: `消息 ${i}` }), i * 150)
    }
  }
  window.sbQueue = () => {
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => window.sbShow({ message: `排队消息 ${i}`, queue: '' }), i * 100)
    }
  }
  window.sbGroupHit = () => {
    window.sbShow({ message: '已保存', group: 'save', duration: '6000', fresh: true })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `action-text` | 操作按钮文案 | `string` | — |
| `closable` | — | `boolean` | — |
| `direction` | 位置方向 | — | — |
| `duration` | 自动关闭时长（ms） | `string` | `4000` |
| `group` | — | `string` | — |
| `message` | 文案 | `string` | — |
| `no-pause` | — | `boolean` | — |
| `offset` | 距屏幕边缘偏移（px） | `string` | `24` |
| `open` | 是否显示（受控） | `boolean` | — |
| `progress` | — | `boolean` | — |
| `queue` | — | `boolean` | — |
| `swipe` | — | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action` | 点击操作按钮时派发 |
| `oas-close` | 到期自动关闭时派发（受控模式不自改 `open`），`detail: { reason }` |
| `oas-open` | 打开时派发 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- `open` 受控：到期只派发 `oas-close`，由外部负责移除 `open`；单实例复用时 `message` 变更不会重启计时，新消息请先关后开或新建元素。
- 同方向最多堆叠 3 条（纵向排列不重叠，最新贴边），超出时最老的一条收到 `oas-close`（`reason: evict`）；`queue` 模式改为 FIFO 排队补位。
- 无障碍：始终为 `role="status"` + `aria-live="polite"` + `aria-atomic="true"`（反馈条不使用打断式播报）；多条堆叠时仅最新一条的按钮参与 Tab 序（其余 `inert`），组件不抢占焦点。
