# Masonry 瀑布流

基于 CSS columns 的瀑布流布局容器，子项自动均分到各列且不被拆分。

## 基础用法

<DemoBlock title="四列瀑布流">
  <oas-masonry style="width: 100%">
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>短卡片</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>这是一段比较高的内容，用于演示瀑布流下不同高度的卡片如何错落排布，这里再补几行文字撑高卡片。</p><p>第二段文字。</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>中等高度</p><p>附加说明。</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>又一短卡片</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>高一点的卡片，包含多行描述文字与列表。</p><ul><li>要点一</li><li>要点二</li></ul></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>普通卡片</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-2)"><p>最后一列示例。</p></oas-card>
  </oas-masonry>
</DemoBlock>

## 列数与间距

<DemoBlock title="三列、加大间距">
  <oas-masonry columns="3" gap="16" style="width: 100%">
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 A</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 B，高度不一时瀑布流自动补位。</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 C</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 D</p></oas-card>
  </oas-masonry>
</DemoBlock>

## 响应式列数

<DemoBlock title="基础 1 列、md 2 列、lg 4 列">
  <oas-masonry columns="1 md:2 lg:4" style="width: 100%">
    <oas-card><p>拖窄浏览器窗口，列数会在 1 → 2 → 4 之间自动切换。</p></oas-card>
    <oas-card><p>断点表：`sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px（移动优先 min-width），低于断点用基础值。</p></oas-card>
    <oas-card><p>这是第三张卡片，用于演示多列分布。</p></oas-card>
    <oas-card><p>第四张卡片。</p></oas-card>
    <oas-card><p>第五张卡片，列数变化时子项自动重排，无需任何 JS。</p></oas-card>
    <oas-card><p>第六张卡片。</p></oas-card>
  </oas-masonry>
</DemoBlock>

## 行列间距分离

<DemoBlock title="行距 12、列距 24">
  <oas-masonry columns="3" gap="12 24" style="width: 100%">
    <oas-card><p>行间距 12px（子项 margin-bottom）、列间距 24px（column-gap），两值用空格分隔：`gap="行 列"`。</p></oas-card>
    <oas-card><p>内容 B。</p></oas-card>
    <oas-card><p>内容 C。</p></oas-card>
    <oas-card><p>内容 D。</p></oas-card>
    <oas-card><p>内容 E。</p></oas-card>
  </oas-masonry>
</DemoBlock>

## fresh 持续重排

<DemoBlock title="fresh：监听子项尺寸变化">
  <oas-masonry columns="3" fresh style="width: 100%">
    <oas-card><p>开启 `fresh` 后，组件用 ResizeObserver 持续监听子项尺寸变化（如图片晚到导致高度变化），每次变化触发一次重算机会。</p></oas-card>
    <oas-card><p>内容 B。</p></oas-card>
    <oas-card><p>内容 C，较高。</p><p>补充说明。</p></oas-card>
    <oas-card><p>内容 D。</p></oas-card>
    <oas-card><p>内容 E。</p></oas-card>
  </oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    CSS columns 实现下子项尺寸变化时浏览器本就自动重排；`fresh` 保证组件有额外的重算/重排机会（语义对齐 + 未来切换 JS 实现的钩子）。
  </p>
</DemoBlock>

## column 指定列

<DemoBlock title="指定子项所属列">
  <oas-masonry columns="4" style="width: 100%">
    <oas-card column="2"><p>这张卡片带 `column="2"`，被重排到第 2 列。</p></oas-card>
    <oas-card column="4"><p>这张卡片带 `column="4"`，被重排到第 4 列。</p></oas-card>
    <oas-card><p>普通卡片 A，自动填充。</p></oas-card>
    <oas-card><p>普通卡片 B。</p></oas-card>
    <oas-card><p>普通卡片 C。</p></oas-card>
    <oas-card><p>普通卡片 D。</p></oas-card>
    <oas-card><p>普通卡片 E。</p></oas-card>
  </oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    子项 `column`（1-based）指定所属列，超出当前列数/非数字的值被忽略（dev 告警）。配合响应式列数时按当前生效列数重算。
  </p>
</DemoBlock>

## 无子项

<DemoBlock title="空容器">
  <oas-masonry style="width: 100%; min-height: 80px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    无子项时不报错，正常渲染空容器。
  </p>
</DemoBlock>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 列数（默认 4）；支持断点简写：空格分隔的基础值 + 若干 `断点:值`（如 `1 md:2 lg:4`，断点表 `sm`=640px / `md`=768px / `lg`=1024px / `xl`=1280px，移动优先 min-width，低于断点用基础值）；非正整数/非数字回退 1 | — | — |
| `fresh` | 持续监听子项尺寸变化（ResizeObserver），变化时触发一次重算机会；CSS columns 实现下浏览器本就自动重排，fresh 为语义对齐与未来切换 JS 实现的钩子 | `boolean` | — |
| `gap` | 间距（px，默认 8）。单值=列距；两值「行 列」（如 `8 16`）行距作用于子项 margin-bottom、列距作用于 column-gap；纯数字自动补 px；非法值回退默认 | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 瀑布流子项，子项自动 `break-inside: avoid`；带 `column` 属性（1-based）的子项会被重排到指定列 |

### 子元素属性

| 子项属性 | 说明 |
| --- | --- |
| `column` | 指定子项所属列（1-based）：CSS columns 实现下按列重排 DOM，把子项物理移动到目标列；配合响应式列数时按当前生效列数重算。非法值（非整数/≤0/超出当前列数）忽略 + dev 告警 |

部件：`::part(masonry)` 瀑布流容器。
