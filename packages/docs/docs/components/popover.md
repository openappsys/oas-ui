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

<DemoBlock title="受控显示（open 属性）">
  <oas-button onclick="event.stopPropagation(); document.getElementById('pop-ctrl').toggleAttribute('open')">切换显隐</oas-button>
  <oas-popover id="pop-ctrl" title="受控面板" content="由 open 属性控制，点击外部 / Esc 关闭。" placement="right">
    <oas-button>触发元素</oas-button>
  </oas-popover>
</DemoBlock>

## API

| 属性        | 说明                             | 类型                                | 默认值  |
| ----------- | -------------------------------- | ----------------------------------- | ------- |
| `title`     | 标题文本                         | `string`                            | —       |
| `content`   | 正文文本                         | `string`                            | —       |
| `placement` | 浮层位置                         | `top` / `bottom` / `left` / `right` | `top`   |
| `open`      | 受控显示（布尔属性，存在即显示） | `boolean`                           | `false` |

无对外事件。点击触发元素切换显隐，点击外部或按 Esc 关闭；`role="dialog"`。
