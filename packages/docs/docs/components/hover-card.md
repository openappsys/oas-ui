# HoverCard 悬停卡片

hover / 聚焦触发，可配置延迟的预览卡片。

## 基础用法

<DemoBlock title="悬停触发">
  <oas-hover-card title="用户信息" content="悬停查看用户详情。" placement="bottom">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-hover-card>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
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

## 显隐延迟

<DemoBlock title="延迟显隐">
  <oas-hover-card title="延迟卡片" content="悬停约 600ms 后出现，离开后延迟关闭。" delay="600">
    <oas-button>悬停我</oas-button>
  </oas-hover-card>
</DemoBlock>

## 受控显示

<DemoBlock title="受控显示（open 属性）">
  <oas-button onclick="document.getElementById('hc-ctrl').toggleAttribute('open')">切换显隐</oas-button>
  <oas-hover-card id="hc-ctrl" title="受控卡片" content="由 open 属性控制显隐。" placement="right">
    <oas-button>触发元素</oas-button>
  </oas-hover-card>
</DemoBlock>

## API

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `title` | 标题文本 | `string` | — |
| `content` | 内容文本 | `string` | — |
| `placement` | 浮层位置 | `top` / `bottom` / `left` / `right` | `top` |
| `delay` | 显隐延迟（毫秒） | `number` | `100` |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | `false` |

无对外事件。hover / focus 触发，`role="dialog"`。
