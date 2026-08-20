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

## 形态（variant）

`raised`（默认立体）/ `outline`（描边）/ `subtle`（浅底）/ `plain`（纯文字）：

<DemoBlock title="四种形态">
  <oas-kbd keys="shift tab"></oas-kbd>
  <oas-kbd keys="shift tab" variant="outline"></oas-kbd>
  <oas-kbd keys="shift tab" variant="subtle"></oas-kbd>
  <oas-kbd keys="shift tab" variant="plain"></oas-kbd>
</DemoBlock>

## 尺寸（size）

<DemoBlock title="三档尺寸">
  <oas-kbd keys="ctrl k" size="small"></oas-kbd>
  <oas-kbd keys="ctrl k"></oas-kbd>
  <oas-kbd keys="ctrl k" size="large"></oas-kbd>
</DemoBlock>

## 颜色（color）

支持 11 个预设色名（明暗主题自动适配）或任意 CSS 色值（直接生效，优先于预设与默认）。键帽底色染色：

<DemoBlock title="预设色板">
  <oas-kbd keys="ctrl" color="red"></oas-kbd>
  <oas-kbd keys="ctrl" color="orange"></oas-kbd>
  <oas-kbd keys="ctrl" color="green"></oas-kbd>
  <oas-kbd keys="ctrl" color="blue"></oas-kbd>
  <oas-kbd keys="ctrl" color="purple"></oas-kbd>
</DemoBlock>

<DemoBlock title="自定义色值">
  <oas-kbd keys="ctrl" color="#0e7490"></oas-kbd>
  <oas-kbd keys="ctrl" color="#6d28d9"></oas-kbd>
</DemoBlock>

## 组合使用

多个 kbd 组合成组用 `oas-space`（间距控制）：

<DemoBlock title="分组">
  <oas-space size="4">
    <oas-kbd keys="ctrl"></oas-kbd>
    <oas-kbd keys="shift"></oas-kbd>
    <oas-kbd keys="k"></oas-kbd>
  </oas-space>
</DemoBlock>

嵌进其他组件用 slot 投影：

<DemoBlock title="嵌套进按钮">
  <oas-button>命令面板 <oas-kbd keys="cmd k" variant="plain"></oas-kbd></oas-button>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 自定义颜色：支持 11 个预设名（映射 `--oas-preset-*-text` 达标 token）或任意 CSS 色值，键帽底色染浅 + 描边跟随 | `string` | — |
| `keys` | 空格分隔的按键序列，如 `"ctrl shift k"` | `string` | — |
| `size` | 尺寸档位：`small` / `medium`（默认）/ `large`；非法值回落 `medium` 并告警 | `string` | — |
| `variant` | 形态：`raised`（默认，立体键帽）/ `outline`（描边）/ `subtle`（浅底）/ `plain`（纯文字）；非法值回落 `raised` 并告警 | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

> 说明：空 `keys` 渲染单个空块；提供 slot 内容时优先展示 slot。组件为纯展示，`role="text"`，不派发任何事件。
