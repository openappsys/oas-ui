# Masonry

A masonry layout container based on CSS columns; child items are automatically distributed across columns without being split.

## Basic Usage

<DemoBlock title="Four-column masonry">
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

## Columns and Gap

<DemoBlock title="Three columns, larger gap">
  <oas-masonry columns="3" gap="16" style="width: 100%">
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 A</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 B，高度不一时瀑布流自动补位。</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 C</p></oas-card>
    <oas-card style="margin-bottom: var(--oas-space-3)"><p>内容 D</p></oas-card>
  </oas-masonry>
</DemoBlock>

## No Children

<DemoBlock title="Empty container">
  <oas-masonry style="width: 100%; min-height: 80px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-masonry>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    无子项时不报错，正常渲染空容器。
  </p>
</DemoBlock>

## API

| Attribute  | Description                                         | Type   | Default |
| ---------- | ---------------------------------------------------- | ------ | ------- |
| `columns`  | Number of columns; invalid values (non-positive integers / decimals / 0 / negatives) fall back to 1 | number | `4`     |
| `gap`      | Column gap (px); invalid values fall back to the default | number | `8`     |

| Slot        | Description                                              |
| ----------- | --------------------------------------------------------- |
| Default     | Masonry child items; children automatically get `break-inside: avoid` |

Part: `::part(masonry)` the masonry container.
