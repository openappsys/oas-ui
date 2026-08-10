# Popover 气泡卡片

点击触发，可承载标题、正文与自定义内容的浮层面板。

## 基础用法

<DemoBlock title="点击触发">
  <oas-popover title="卡片标题" content="点击触发元素切换显隐，点击外部或按 Esc 关闭。" placement="bottom">
    <oas-button type="primary">点击打开</oas-button>
  </oas-popover>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
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

## 自定义内容

<DemoBlock title="自定义内容（slot=content）">
  <oas-popover title="操作面板" placement="bottom">
    <oas-button>打开面板</oas-button>
    <div slot="content" style="line-height: 1.8">
      通过 <code>slot="content"</code> 可以放置任意自定义内容。
    </div>
  </oas-popover>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 控制显隐（点击外部 / Esc 仍会关闭）。

<DemoBlock title="受控显示（open 属性）">
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `content` | 正文文本 | `string` | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `placement` | 浮层位置 | `Placement` | `top` |
| `title` | 标题文本 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `content` | — |

无对外事件。点击触发元素切换显隐，点击外部或按 Esc 关闭；`role="dialog"`。
