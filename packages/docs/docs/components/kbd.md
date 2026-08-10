# Kbd 键盘按键

键盘快捷键展示组件，`keys` 按空格拆分自动渲染多块并用 `+` 连接；非交互组件。

## 基本用法

<DemoBlock title="组合快捷键">
  <oas-kbd keys="ctrl shift k"></oas-kbd>
  <oas-kbd keys="alt f4"></oas-kbd>
  <oas-kbd keys="cmd c"></oas-kbd>
</DemoBlock>

## 单键与空态

<DemoBlock title="单键与空态">
  <oas-kbd keys="enter"></oas-kbd>
  <oas-kbd keys="esc"></oas-kbd>
  <oas-kbd keys=""></oas-kbd>
</DemoBlock>

## 自定义内容

<DemoBlock title="slot 自定义内容优先">
  <oas-kbd>⌘C</oas-kbd>
  <oas-kbd>Space</oas-kbd>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `keys` | 空格分隔的按键序列，如 `"ctrl shift k"` | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：空 `keys` 渲染单个空块；提供 slot 内容时优先展示 slot。组件为纯展示，`role="text"`，不派发任何事件。
