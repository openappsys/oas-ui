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

## 无子项

<DemoBlock title="空容器">
  <oas-masonry style="width: 100%; min-height: 80px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    无子项时不报错，正常渲染空容器。
  </p>
</DemoBlock>

## API

### 属性

| 属性      | 说明                                       | 类型 | 默认值 |
| --------- | ------------------------------------------ | ---- | ------ |
| `columns` | 列数；非法值（非正整数/小数/0/负数）回退 1 | —    | —      |
| `gap`     | 列间距（px）；非法值回退默认               | —    | —      |

### 插槽

| 名称 | 说明                                       |
| ---- | ------------------------------------------ |
| 默认 | 瀑布流子项，子项自动 `break-inside: avoid` |

部件：`::part(masonry)` 瀑布流容器。
