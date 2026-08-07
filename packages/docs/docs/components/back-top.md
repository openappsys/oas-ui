# BackTop 回到顶部

固定于视口角落的回到顶部按钮，点击平滑滚动到页面顶部。

## 基础用法

按钮默认固定于视口右下角（`bottom: 32px; right: 32px`），滚动页面后点击即可回到顶部。

<DemoBlock title="基础用法">
  <oas-back-top visible></oas-back-top>
</DemoBlock>

## 自定义位置

<DemoBlock title="自定义位置">
  <oas-back-top visible bottom="96px"></oas-back-top>
  <oas-back-top visible right="96px" bottom="32px"></oas-back-top>
</DemoBlock>

## 显隐控制

<DemoBlock title="显隐控制">
  <oas-button onclick="document.getElementById('bt-ctrl').toggleAttribute('visible')">显示 / 隐藏</oas-button>
  <oas-back-top id="bt-ctrl" bottom="180px"></oas-back-top>
</DemoBlock>

## 点击事件

<DemoBlock title="点击事件">
  <oas-button onclick="document.getElementById('bt-event').setAttribute('visible','')">显示按钮</oas-button>
  <oas-back-top id="bt-event" visible bottom="240px" onoas-click="message.info('即将平滑回到顶部')"></oas-back-top>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `visible` | 是否显示按钮 | `boolean` | `false` |
| `bottom` | 距视口底部距离 | `string` | `32px` |
| `right` | 距视口右侧距离 | `string` | `32px` |

| 事件 | 说明 |
|---|---|
| `oas-click` | 点击按钮（随后平滑滚动到顶部） |

按钮 `position: fixed` 固定于视口，`:host` 默认 `display: inline-block`；未显示时按钮 `aria-hidden="true"`。
