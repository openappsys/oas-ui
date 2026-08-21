# Divider 分割线

区隔内容的水平/垂直分割线。

## 水平

<DemoBlock title="基础分割线">
  <oas-divider></oas-divider>
</DemoBlock>

## 带内容

<DemoBlock title="内容位置">
  <oas-divider>文字</oas-divider>
  <oas-divider content-position="left">左对齐</oas-divider>
  <oas-divider content-position="right">右对齐</oas-divider>
</DemoBlock>

<DemoBlock title="强调文字">
  <oas-divider strong content-position="left">分组标题</oas-divider>
</DemoBlock>

`strong` 加粗文字（600 字重），适合内容分组的节标题。

## 线型

<DemoBlock title="四种线型">
  <oas-divider variant="dashed">dashed 虚线</oas-divider>
  <oas-divider variant="dotted">dotted 点线</oas-divider>
  <oas-divider variant="double">double 双线</oas-divider>
</DemoBlock>

`variant` 与 `dashed` 布尔等价（`dashed` 属性 = `variant="dashed"`，显式 `variant` 优先）。

## 缩进

<DemoBlock title="inset / middle">
  <oas-divider inset>inset 起始侧留空</oas-divider>
  <oas-divider middle>middle 两侧留空</oas-divider>
</DemoBlock>

## 间距档

<DemoBlock title="size 三档">
  <oas-divider size="small">small</oas-divider>
  <oas-divider>medium（默认）</oas-divider>
  <oas-divider size="large">large</oas-divider>
</DemoBlock>

## 虚线

<DemoBlock title="虚线（兼容写法）">
  <oas-divider dashed></oas-divider>
</DemoBlock>

## 垂直

<DemoBlock title="垂直分割线">
  <span>文本</span>
  <oas-divider direction="vertical"></oas-divider>
  <span>文本</span>
</DemoBlock>

<DemoBlock title="flex 容器内自动撑满">
  <div style="display: flex; height: 48px; gap: 8px; border: 1px dashed var(--oas-color-border); padding: 0 12px;">
    <span style="display: flex; align-items: center;">卡片 A</span>
    <oas-divider direction="vertical"></oas-divider>
    <span style="display: flex; align-items: center;">卡片 B</span>
    <oas-divider direction="vertical"></oas-divider>
    <span style="display: flex; align-items: center;">卡片 C</span>
  </div>
</DemoBlock>

垂直分割线在 flex/grid 容器内自动撑满容器行高；行内语境保持 1em 文字行高。

### 垂直带文字对齐

vertical 模式下 `content-position` 支持 `top`（贴顶）/ `center`（默认，居中）/ `bottom`（贴底），文字横排、竖线按对齐分布在文字两侧（贴顶时竖线从文字向下延伸、贴底时向上、居中上下各一段）；水平模式仅 `left` / `center` / `right` 生效，跨方向使用（如 horizontal + `top`、vertical + `left`）回落 `center` 并告警。贴顶/贴底的留白大小走 `--oas-divider-title-inset` 变量（缺省 5%）。

<DemoBlock title="垂直带文字对齐">
  <div style="display: flex; height: 128px; gap: 12px; border: 1px dashed var(--oas-color-border); padding: 0 12px;">
    <oas-divider direction="vertical" content-position="top">贴顶</oas-divider>
    <oas-divider direction="vertical">居中</oas-divider>
    <oas-divider direction="vertical" content-position="bottom">贴底</oas-divider>
  </div>
</DemoBlock>

垂直分割线的文字方向：`text-orientation="vertical"` 让文字竖排（跟随竖线方向，从上到下），默认 `horizontal` 横排。仅 vertical 分割线有意义（水平分割线忽略）。

<DemoBlock title="垂直竖排文字">
  <div style="display: flex; height: 128px; gap: 24px; border: 1px dashed var(--oas-color-border); padding: 0 12px;">
    <oas-divider direction="vertical">横排文字</oas-divider>
    <oas-divider direction="vertical" text-orientation="vertical">竖排文字内容</oas-divider>
    <oas-divider direction="vertical" text-orientation="vertical" content-position="top">顶部竖排</oas-divider>
  </div>
</DemoBlock>

## 自定义样式

`color` 属性支持 11 个预设色名（明暗主题自动适配）或任意 CSS 色值（直接生效，优先于预设与默认）；线宽、间距、文字侧留空走 CSS 变量：

<DemoBlock title="预设色板">
  <oas-divider color="magenta">magenta</oas-divider>
  <oas-divider color="red">red</oas-divider>
  <oas-divider color="volcano">volcano</oas-divider>
  <oas-divider color="orange">orange</oas-divider>
  <oas-divider color="gold">gold</oas-divider>
  <oas-divider color="lime">lime</oas-divider>
  <oas-divider color="green">green</oas-divider>
  <oas-divider color="cyan">cyan</oas-divider>
  <oas-divider color="blue">blue</oas-divider>
  <oas-divider color="geekblue">geekblue</oas-divider>
  <oas-divider color="purple">purple</oas-divider>
</DemoBlock>

<DemoBlock title="自定义色值（优先于预设）">
  <oas-divider color="#0e7490" dashed>青碧色虚线</oas-divider>
  <oas-divider color="#7c3aed">紫色实线</oas-divider>
</DemoBlock>

<DemoBlock title="CSS 变量">
  <oas-divider style="--oas-divider-spacing: 8px;">紧凑间距</oas-divider>
  <oas-divider content-position="left" style="--oas-divider-title-inset: 120px;">文字侧固定留空 120px</oas-divider>
  <oas-divider style="--oas-divider-width: 2px;">2px 粗线</oas-divider>
</DemoBlock>

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-divider-width` | 线宽 | `1px` |
| `--oas-divider-color` | 线色 | 边框色 token |
| `--oas-divider-spacing` | 上下间距（size 档位的缺省值，注入后三档统一覆盖） | 档位对应 space 档 |
| `--oas-divider-title-inset` | 文字侧留空（content-position=left/right 与 inset） | `5%` |
| `--oas-divider-middle-inset` | middle 两侧留空 | `16.67%` |
| `--oas-divider-double-gap` | double 双线的线间间隙 | `3px` |

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `color` | 颜色：支持 11 个预设名（映射 `--oas-preset-*` token）或任意 CSS 色值 | `string` | — |
| `content-position` | 内容位置 | `string` | — |
| `dashed` | 虚线 | `boolean` | — |
| `direction` | 方向 | `DividerDirection` | `horizontal` |
| `inset` | 缩进：水平线起点侧内缩（默认 5%，走 `--oas-divider-title-inset` 变量），与文字缩进对齐 | `boolean` | — |
| `middle` | 对称缩进：水平线两侧等宽内缩（默认 16.67%，走 `--oas-divider-middle-inset` 变量） | `boolean` | — |
| `size` | 间距档位：`small` / `medium`（默认）/ `large`；仅水平布局生效 | `string` | — |
| `strong` | 分隔文字加重（font-weight 600） | `boolean` | — |
| `text-orientation` | 垂直分割线的文字方向：horizontal（默认横排）/ ertical（竖排，跟随竖线方向从上到下）；仅 vertical 分割线有意义 | `string` | — |
| `variant` | 线型：`solid` / `dashed` / `dotted` / `double`；显式设置优先于 `dashed` 布尔（兼容写法） | `string` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
