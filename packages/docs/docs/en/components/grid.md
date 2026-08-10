# Grid

A 24-column grid layout system. Pair it with `oas-grid-item` to divide column widths, with support for gap, offset and a custom total column count; setting `columns` switches to an auto equal-width layout (simple-grid).

## Basic grid

<DemoBlock title="Three equal columns">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Unequal columns

<DemoBlock title="Unequal columns">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Offset

<DemoBlock title="Offset">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="8" offset="4"><div class="demo-grid-box">span 8 offset 4</div></oas-grid-item>
    <oas-grid-item span="4" offset="6"><div class="demo-grid-box">span 4 offset 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Custom total columns

<DemoBlock title="Custom cols">
  <oas-grid cols="12" gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="4"><div class="demo-grid-box">span 4</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Auto columns (simple-grid)

Setting `columns` divides the width equally with `repeat(n, 1fr)`; child `span` is ignored (span only takes effect without `columns`), and it coexists with the 24-column grid without conflict.

<DemoBlock title="columns auto equal-width">
  <oas-grid columns="3" gap="12px" style="width: 100%">
    <div class="demo-grid-box">1</div>
    <div class="demo-grid-box">2</div>
    <div class="demo-grid-box">3</div>
    <div class="demo-grid-box">4</div>
    <div class="demo-grid-box">5</div>
    <div class="demo-grid-box">6</div>
  </oas-grid>
</DemoBlock>

<DemoBlock title="columns ignores span">
  <oas-grid columns="4" gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Large gap

<DemoBlock title="Gap">
  <oas-grid gap="24px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

<style>
  .demo-grid-box {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--oas-color-bg-hover);
    border-radius: var(--oas-radius-md);
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
</style>

## API

| Component       | Property  | Description                           | Default |
| --------------- | --------- | ------------------------------------- | ------- |
| `oas-grid`      | `cols`    | Total column count                    | `24`    |
| `oas-grid`      | `columns` | Auto equal-width count (simple-grid; when set, child `span` is ignored) | —       |
| `oas-grid`      | `gap`     | Gap                                   | `0`     |
| `oas-grid-item` | `span`    | Number of columns spanned             | `24`    |
| `oas-grid-item` | `offset`  | Number of columns offset on the left  | `0`     |

`oas-grid` renders as CSS Grid where each child occupies a share of the 24 columns; `oas-grid-item` declares its footprint with `span`. Setting `columns` divides equally and ignores `span`, so plain elements can be placed directly.
