# Popconfirm

Shows a confirmation bubble next to the trigger element, commonly used before destructive actions like deletion.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-popconfirm title="确定删除这条数据吗？" onoas-ok="message.success('已删除')" onoas-cancel="message.info('已取消')">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

## Controlled visibility

The `open` attribute is controlled: external buttons set/remove `open` to toggle the bubble (clicking outside / Esc / OK / cancel still closes it).

<DemoBlock title="Controlled visibility (open)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); pcCtrl(true)">打开确认</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); pcCtrl(false)">关闭</oas-button>
    <oas-tag id="pc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-ctrl" title="确定删除这条数据吗？">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const pc = document.getElementById('pc-ctrl')
  const status = document.getElementById('pc-status')
  if (!pc || !status) return
  const sync = () => {
    status.textContent = `open: ${pc.hasAttribute('open')}`
  }
  window.pcCtrl = (open) => {
    if (open) pc.setAttribute('open', '')
    else pc.removeAttribute('open')
  }
  sync()
  // 确定 / 取消 / 外部点击 / Esc 由组件移除 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(pc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## Four positions

<DemoBlock title="Four positions">
  <oas-space direction="vertical" size="large" align="center" style="width: 100%; padding: 24px 0">
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="上方气泡" position="top"><oas-button size="small">上方 top</oas-button></oas-popconfirm>
      <oas-popconfirm title="下方气泡" position="bottom"><oas-button size="small">下方 bottom</oas-button></oas-popconfirm>
    </div>
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="左侧气泡" position="left"><oas-button size="small">左侧 left</oas-button></oas-popconfirm>
      <oas-popconfirm title="右侧气泡" position="right"><oas-button size="small">右侧 right</oas-button></oas-popconfirm>
    </div>
  </oas-space>
</DemoBlock>

## Long text

<DemoBlock title="Long text">
  <oas-popconfirm title="此操作会永久删除该订单及其全部子记录，且无法恢复，确定继续吗？">
    <oas-button type="danger">删除订单</oas-button>
  </oas-popconfirm>
</DemoBlock>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `open` | Whether the bubble is shown | `boolean` | `false` |
| `title` | Confirmation text | `string` | — |
| `position` | Bubble position | `top` / `bottom` / `left` / `right` | `top` |

### Events

| Event | Description |
| --- | --- |
| `oas-ok` | Clicked "OK"; the bubble then collapses automatically |
| `oas-cancel` | Cancel: cancel button / Esc / outside click |

Clicking the wrapped content toggles the bubble; the bubble uses `role="dialog"`.
