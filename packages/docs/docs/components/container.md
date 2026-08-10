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

## 空容器

无子元素不报错、不占位。

<DemoBlock title="空容器">
  <oas-container size="sm" style="background: var(--oas-color-bg-hover)"></oas-container>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `center` | 是否居中（`center="false"` 关闭） | `string` | `true` |
| `padding` | 内边距 token/值（作用于 `padding-inline`） | — | — |
| `size` | 定宽档位，映射 `--oas-container-*` token | `string` | `lg` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
