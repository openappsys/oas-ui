# Tooltip

A simple text prompt bubble triggered on hover or keyboard focus.

## Basic usage

<DemoBlock title="Trigger on hover">
  <oas-tooltip content="这是一条提示文字">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-tooltip>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-tooltip content="提示在上方" placement="top">
    <oas-button>上</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在下方" placement="bottom">
    <oas-button>下</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在左侧" placement="left">
    <oas-button>左</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在右侧" placement="right">
    <oas-button>右</oas-button>
  </oas-tooltip>
</DemoBlock>

When space is insufficient, the tooltip automatically flips along the main axis and avoids the viewport edges.

## Focus trigger

<DemoBlock title="Trigger on keyboard focus">
  <oas-tooltip content="通过 Tab 聚焦也能看到我">
    <oas-button>Tab 聚焦我</oas-button>
  </oas-tooltip>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the tooltip (hover/focus triggers still apply in addition).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">隐藏</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="由 open 属性控制显隐" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-tooltip>
</DemoBlock>

## Long text

<DemoBlock title="Long text and max width">
  <oas-tooltip content="这是一段较长的提示文字，用于演示最大宽度限制与自动换行，最长不超过 240px。" placement="bottom">
    <oas-button>悬停查看长提示</oas-button>
  </oas-tooltip>
</DemoBlock>

## Edge cases

<DemoBlock title="Empty content">
  <oas-tooltip placement="bottom">
    <oas-button>无内容提示</oas-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tip = document.getElementById('tip-ctrl')
  const status = document.getElementById('tip-status')
  if (!tip || !status) return
  const sync = () => {
    status.textContent = `open: ${tip.hasAttribute('open')}`
  }
  window.tipCtrl = (open) => {
    if (open) tip.setAttribute('open', '')
    else tip.removeAttribute('open')
  }
  sync()
  // hover / focus 触发与外部控制都会改 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

| Property   | Description                        | Type                             | Default |
| ---------- | ---------------------------------- | -------------------------------- | ------- |
| `content`  | Tooltip content text               | `string`                         | —       |
| `placement` | Popup placement                    | `top` / `bottom` / `left` / `right` | `top` |
| `open`     | Controlled display (boolean attribute; shows when present) | `boolean`        | `false` |

No public events. Shown/hidden on hover or focus; `role="tooltip"`, the popup uses `pointer-events: none` so it never blocks interactions.
