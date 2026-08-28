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
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 cols</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 cols</div></oas-grid-item>
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
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 ignored</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 ignored</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 ignored</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 ignored</div></oas-grid-item>
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

## Separated row/column gutters

`gap` supports a two-value syntax: space-separated `row column` controls row-gap and column-gap independently; a single value still applies to both axes (zero regression).

<DemoBlock title="gap two values: row 8 / column 24">
  <oas-grid gap="8 24" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">row 8 / col 24</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Responsive breakpoints

`span` / `offset` accept breakpoint shorthand: a base value plus space-separated `breakpoint:value` pairs (breakpoints `sm`=640 / `md`=768 / `lg`=1024 / `xl`=1280, mobile-first). Resize the window to see the columns adapt.

<DemoBlock title="span breakpoints: 24 → md:12 → lg:8">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">&lt;640px each item fills a row; ≥768px two per row; ≥1024px three equal columns.</p>
</DemoBlock>

<DemoBlock title="offset breakpoints: 0 → md:4">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="24 md:16"><div class="demo-grid-box">span 24 / md 16</div></oas-grid-item>
    <oas-grid-item span="24 md:4" offset="0 md:4"><div class="demo-grid-box">span 4 offset 4 (md+)</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">From ≥768px the right item starts at column 5 and spans 4 columns (offset 4 / span 4).</p>
</DemoBlock>

## Auto-width columns

`span="auto"` sizes an item to its natural content width (no column span); it can be combined with `offset`.

<DemoBlock title="span=auto columns">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="auto"><div class="demo-grid-box">auto width</div></oas-grid-item>
    <oas-grid-item span="auto" offset="4"><div class="demo-grid-box">auto offset 4</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="4"><div class="demo-grid-box">span 4</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## Container alignment

`justify` controls the inline axis (justify-items), `align` the block axis (align-items); valid values are applied directly, invalid values fall back to `stretch` with a dev warning.

<DemoBlock title="justify (inline axis)">
  <div class="demo-grid-col">
    <span class="demo-grid-label">justify="start"（default behavior）</span>
    <oas-grid gap="8px" justify="start" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">justify="center"</span>
    <oas-grid gap="8px" justify="center" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">justify="end"</span>
    <oas-grid gap="8px" justify="end" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
  </div>
</DemoBlock>

<DemoBlock title="align (block axis, fixed height)">
  <div class="demo-grid-col">
    <span class="demo-grid-label">align="start"</span>
    <oas-grid gap="8px" align="start" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">short</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">h 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">h 64</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">align="center"</span>
    <oas-grid gap="8px" align="center" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">short</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">h 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">h 64</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">align="baseline"</span>
    <oas-grid gap="8px" align="baseline" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">short</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">h 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">h 64</div></oas-grid-item>
    </oas-grid>
  </div>
</DemoBlock>

## Reordering with order

Push/pull (offset-based left/right movement) is intentionally not provided — use `order` instead: the DOM/source order (and screen-reader semantics) stays unchanged, only the visual order changes.

<DemoBlock title="Last column first">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">source col 1 (order 0)</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">source col 2 (order 0)</div></oas-grid-item>
    <oas-grid-item span="8" order="-1"><div class="demo-grid-box">source col 3 (order -1 → first)</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

<DemoBlock title="Custom order">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="6" order="3"><div class="demo-grid-box">A (order 3)</div></oas-grid-item>
    <oas-grid-item span="6" order="1"><div class="demo-grid-box">B (order 1)</div></oas-grid-item>
    <oas-grid-item span="6" order="2"><div class="demo-grid-box">C (order 2)</div></oas-grid-item>
    <oas-grid-item span="6" order="0"><div class="demo-grid-box">D (order 0)</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">Visual order: D (0) → B (1) → C (2) → A (3).</p>
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
  .demo-grid-box.short {
    height: 28px;
  }
  .demo-grid-box.tall {
    height: 64px;
  }
  .demo-grid-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .demo-grid-label {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
  .demo-grid-note {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
    margin-top: 8px;
  }
</style>

## API

### oas-grid

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `align` | Block-axis alignment (align-items): `start` / `center` / `end` / `stretch` / `baseline`; invalid values fall back to `stretch` with a dev warning (deduped) | `string` | — |
| `cols` | Total column count | `string` | `24` |
| `columns` | Auto equal-width count (simple-grid; when set, child `span` is ignored) | `string` | — |
| `gap` | Gap; a single value applies to both axes, two space-separated values set `row column` (e.g. `8 16` = row 8, column 16); three or more values are invalid and silently fall back to `0` | `string` | `0` |
| `justify` | Inline-axis alignment (justify-items): `start` / `center` / `end` / `stretch`; invalid values fall back to `stretch` with a dev warning (deduped) | `string` | — |

| Name | Description |
| --- | --- |
| default | — |

### oas-grid-item

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `offset` | Number of columns offset on the left; supports breakpoint shorthand (e.g. `0 lg:4`: base value + space-separated `breakpoint:value`, breakpoints sm=640 / md=768 / lg=1024 / xl=1280) | `string` | `0` |
| `order` | Ordering weight (number, default 0); higher values appear later, for reordering columns (equivalent to offset-based push/pull scenarios) | `string` | `0` |
| `span` | Number of columns spanned; supports `auto` (natural content width) and breakpoint shorthand (e.g. `24 md:12`: base value + space-separated `breakpoint:value`, breakpoints sm=640 / md=768 / lg=1024 / xl=1280) | `string` | `24` |

| Name | Description |
| --- | --- |
| default | — |

`oas-grid` renders as CSS Grid where each child occupies a share of the 24 columns; `oas-grid-item` declares its footprint with `span`. Setting `columns` divides equally and ignores `span`, so plain elements can be placed directly.
