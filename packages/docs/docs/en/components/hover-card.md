# HoverCard

A preview card triggered on hover/focus with configurable delay.

## Basic usage

<DemoBlock title="Trigger on hover">
  <oas-hover-card title="用户信息" content="悬停查看用户详情。" placement="bottom">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-hover-card>
</DemoBlock>

## Placement

<DemoBlock title="Four directions">
  <oas-hover-card title="标题" content="内容" placement="top">
    <oas-button>上</oas-button>
  </oas-hover-card>
  <oas-hover-card title="标题" content="内容" placement="bottom">
    <oas-button>下</oas-button>
  </oas-hover-card>
  <oas-hover-card title="标题" content="内容" placement="left">
    <oas-button>左</oas-button>
  </oas-hover-card>
  <oas-hover-card title="标题" content="内容" placement="right">
    <oas-button>右</oas-button>
  </oas-hover-card>
</DemoBlock>

## Show / hide delay

<DemoBlock title="Delay">
  <oas-hover-card title="延迟卡片" content="悬停约 600ms 后出现，离开后延迟关闭。" delay="600">
    <oas-button>悬停我</oas-button>
  </oas-hover-card>
</DemoBlock>

## Controlled display

The `open` attribute is controlled: an external button can set/remove `open` to show/hide the card (hover/focus triggers still apply in addition).

<DemoBlock title="Controlled display (open attribute)">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="hcCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="hcCtrl(false)">隐藏</oas-button>
    <oas-tag id="hc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-hover-card id="hc-ctrl" title="受控卡片" content="由 open 属性控制显隐。" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-hover-card>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const hc = document.getElementById('hc-ctrl')
  const status = document.getElementById('hc-status')
  if (!hc || !status) return
  const sync = () => {
    status.textContent = `open: ${hc.hasAttribute('open')}`
  }
  window.hcCtrl = (open) => {
    if (open) hc.setAttribute('open', '')
    else hc.removeAttribute('open')
  }
  sync()
  // hover / focus 触发与外部控制都会改 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(hc, { attributes: true, attributeFilter: ['open'] })
})
</script>

## API

| Property   | Description                        | Type                             | Default |
| ---------- | ---------------------------------- | -------------------------------- | ------- |
| `title`    | Title text                         | `string`                         | —       |
| `content`  | Content text                       | `string`                         | —       |
| `placement`| Popup placement                    | `top` / `bottom` / `left` / `right` | `top` |
| `delay`    | Show/hide delay in milliseconds    | `number`                         | `100`   |
| `open`     | Controlled display (boolean attribute; shows when present) | `boolean`        | `false` |

No public events. Triggered on hover/focus, `role="dialog"`.
