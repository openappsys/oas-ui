# Popover

A click-triggered popup panel that can hold a title, body text and arbitrary custom content.

## Basic usage

<DemoBlock title="Trigger on click">
  <oas-popover title="卡片标题" content="点击触发元素切换显隐，点击外部或按 Esc 关闭。" placement="bottom">
    <oas-button type="primary">点击打开</oas-button>
  </oas-popover>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-popover title="标题" content="内容" placement="top">
    <oas-button>上</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="bottom">
    <oas-button>下</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="left">
    <oas-button>左</oas-button>
  </oas-popover>
  <oas-popover title="标题" content="内容" placement="right">
    <oas-button>右</oas-button>
  </oas-popover>
</DemoBlock>

## Custom content

<DemoBlock title="Custom content (slot=content)">
  <oas-popover title="操作面板" placement="bottom">
    <oas-button>打开面板</oas-button>
    <div slot="content" style="line-height: 1.8">
      通过 <code>slot="content"</code> 可以放置任意自定义内容。
    </div>
  </oas-popover>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to control visibility (clicking outside / pressing Esc still closes it).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); popoverCtrl(true)">打开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); popoverCtrl(false)">关闭</oas-button>
    <oas-tag id="pop-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popover id="pop-ctrl" title="受控面板" content="由 open 属性控制，点击外部 / Esc 关闭。" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-popover>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const pop = document.getElementById('pop-ctrl')
  const status = document.getElementById('pop-status')
  if (!pop || !status) return
  const sync = () => {
    status.textContent = `open: ${pop.hasAttribute('open')}`
  }
  window.popoverCtrl = (open) => {
    if (open) pop.setAttribute('open', '')
    else pop.removeAttribute('open')
  }
  sync()
  // 点击外部 / Esc 由组件移除 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(pop, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

| Property   | Description                        | Type                             | Default |
| ---------- | ---------------------------------- | -------------------------------- | ------- |
| `title`    | Title text                         | `string`                         | —       |
| `content`  | Body text                          | `string`                         | —       |
| `placement` | Popup placement                    | `top` / `bottom` / `left` / `right` | `top` |
| `open`     | Controlled display (boolean attribute; shows when present) | `boolean`        | `false` |

No public events. Clicking the trigger toggles visibility; clicking outside or pressing Esc closes it; `role="dialog"`.
