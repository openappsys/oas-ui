# Container 容器

定宽居中容器：按 `size` 映射 `--oas-container-*` 宽度 token，`margin-inline: auto` 居中（逻辑属性，RTL 自动合规），`max-width: min(100%, token)` 保证窄屏不溢出。

## 基础用法

<DemoBlock title="默认 lg 居中">
  <oas-container style="background: var(--oas-color-bg-hover); min-height: 80px">
    <oas-flex align="center" justify="center" style="height: 80px">
      <oas-tag type="primary">max-width: 992px</oas-tag>
    </oas-flex>
  </oas-container>
</DemoBlock>

## 尺寸

`size` 六档：`xs`（480）/ `sm`（576）/ `md`（768）/ `lg`（992）/ `xl`（1200）/ `full`（100%）。容器用 hover 底色标出实际宽度。

<DemoBlock title="六档尺寸">
  <oas-space direction="vertical" style="width: 100%">
    <oas-container size="xs" style="background: var(--oas-color-bg-hover)">xs · 480px</oas-container>
    <oas-container size="sm" style="background: var(--oas-color-bg-hover)">sm · 576px</oas-container>
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">md · 768px</oas-container>
    <oas-container size="lg" style="background: var(--oas-color-bg-hover)">lg · 992px</oas-container>
    <oas-container size="xl" style="background: var(--oas-color-bg-hover)">xl · 1200px</oas-container>
    <oas-container size="full" style="background: var(--oas-color-bg-hover)">full · 100%</oas-container>
  </oas-space>
</DemoBlock>

## 关闭居中

`center="false"` 时取消居中（`margin-inline: 0`），容器贴行首（LTR 为左侧）。

<DemoBlock title="center=false">
  <oas-container size="sm" center="false" style="background: var(--oas-color-bg-hover)">
    左对齐，不再居中
  </oas-container>
</DemoBlock>

## 内边距

`padding` 接受任意 token/值，作用于 `padding-inline`（逻辑内边距）。

<DemoBlock title="padding 内边距">
  <oas-container size="md" padding="var(--oas-space-4)" style="background: var(--oas-color-bg-hover)">
    内容两侧留有 16px 内边距
  </oas-container>
</DemoBlock>

## 流体

`fluid` 布尔属性：完全不挂 `max-width`，容器恒为父宽 100%（纯流体）；与 `size` 正交，存在时 `size` 的限宽失效。适合需要内容铺满、但子内容仍按窄屏保护（`width: 100%`）的场景。

<DemoBlock title="fluid 流体对照限宽">
  <oas-space direction="vertical" style="width: 100%">
    <oas-container fluid style="background: var(--oas-color-bg-hover)">fluid · 100% 铺满</oas-container>
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">size="md" · 768px 定宽（对照）</oas-container>
  </oas-space>
</DemoBlock>

## 突破定宽（breakout）

slot 内任意子元素带 `breakout` 属性即突破定宽撑满视口宽（经典公式 `width: 100vw` + `margin-inline: calc(50% - 50vw)`），适合「内容限宽、局部横幅全宽」的页面结构（如容器内插一条横贯视口的 banner）。

> ⚠️ `100vw` 含滚动条宽度——PC 浏览器有滚动条时横向溢出几 px。页面顶层（body/html）加 `overflow-x: clip` 兜住（本 demo 区块即如此）。

<DemoBlock title="breakout 全宽横幅">
  <div style="overflow-x: clip">
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">
      限宽内容第一段
      <div breakout class="demo-breakout-banner">breakout 横幅 · 突破 768px 撑满视口</div>
      限宽内容第二段
    </oas-container>
  </div>
</DemoBlock>

> **视口滚动条注意**：`100vw` 含纵向滚动条宽度，页面出现滚动条时 breakout 元素会横向溢出，需在页面顶层包裹层配 `overflow-x: clip`（或 `overflow-x: hidden`）抑制——不要设在容器自身（会裁掉突破效果）。

## 空容器

无子元素不报错、不占位。

<DemoBlock title="空容器">
  <oas-container size="sm" style="background: var(--oas-color-bg-hover)"></oas-container>
</DemoBlock>

<style>
  .demo-breakout-banner {
    margin-block: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 56px;
    background: var(--oas-color-primary);
    color: var(--oas-color-primary-text);
    font-size: var(--oas-font-size-sm);
  }
</style>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `center` | 是否居中（`center="false"` 关闭） | `string` | `true` |
| `fluid` | 布尔，完全不挂 max-width（纯流体 100%）；与 `size` 正交，存在时 size 限宽失效 | `boolean` | — |
| `padding` | 内边距 token/值（作用于 `padding-inline`） | — | — |
| `size` | 定宽档位，映射 `--oas-container-*` token | `string` | `lg` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
