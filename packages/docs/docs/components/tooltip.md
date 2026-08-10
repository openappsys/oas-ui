# Tooltip 文字提示

简单的文字提示气泡，hover 或键盘聚焦触发。

## 基础用法

<DemoBlock title="悬停触发">
  <oas-tooltip content="这是一条提示文字">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-tooltip>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
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

空间不足时自动沿主轴翻转，并在视口边缘避让。

## 聚焦触发

<DemoBlock title="键盘聚焦触发">
  <oas-tooltip content="通过 Tab 聚焦也能看到我">
    <oas-button>Tab 聚焦我</oas-button>
  </oas-tooltip>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 即可显示 / 隐藏提示（hover / focus 触发仍叠加生效）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">隐藏</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="由 open 属性控制显隐" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-tooltip>
</DemoBlock>

## 长文本

<DemoBlock title="长文本与最大宽度">
  <oas-tooltip content="这是一段较长的提示文字，用于演示最大宽度限制与自动换行，最长不超过 240px。" placement="bottom">
    <oas-button>悬停查看长提示</oas-button>
  </oas-tooltip>
</DemoBlock>

## 边界

<DemoBlock title="空内容">
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

| 属性        | 说明                             | 类型                                | 默认值  |
| ----------- | -------------------------------- | ----------------------------------- | ------- |
| `content`   | 提示内容文本                     | `string`                            | —       |
| `placement` | 浮层位置                         | `top` / `bottom` / `left` / `right` | `top`   |
| `open`      | 受控显示（布尔属性，存在即显示） | `boolean`                           | `false` |

无对外事件。hover / focus 触发显隐；`role="tooltip"`，浮层 `pointer-events: none` 不拦截交互。
