# Container

A fixed-width, centered container: `size` maps to `--oas-container-*` width tokens, `margin-inline: auto` centers it (logical property, RTL-compliant automatically), and `max-width: min(100%, token)` prevents overflow on narrow screens.

## Basic usage

<DemoBlock title="Default lg centered">
  <oas-container style="background: var(--oas-color-bg-hover); min-height: 80px">
    <oas-flex align="center" justify="center" style="height: 80px">
      <oas-tag type="primary">max-width: 992px</oas-tag>
    </oas-flex>
  </oas-container>
</DemoBlock>

## Sizes

`size` has six tiers: `xs`（480）/ `sm`（576）/ `md`（768）/ `lg`（992）/ `xl`（1200）/ `full`（100%）. The container uses a hover background color to mark its actual width.

<DemoBlock title="Six size tiers">
  <oas-space direction="vertical" style="width: 100%">
    <oas-container size="xs" style="background: var(--oas-color-bg-hover)">xs · 480px</oas-container>
    <oas-container size="sm" style="background: var(--oas-color-bg-hover)">sm · 576px</oas-container>
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">md · 768px</oas-container>
    <oas-container size="lg" style="background: var(--oas-color-bg-hover)">lg · 992px</oas-container>
    <oas-container size="xl" style="background: var(--oas-color-bg-hover)">xl · 1200px</oas-container>
    <oas-container size="full" style="background: var(--oas-color-bg-hover)">full · 100%</oas-container>
  </oas-space>
</DemoBlock>

## Disable centering

With `center="false"` centering is disabled (`margin-inline: 0`) and the container hugs the start of the line (the left side in LTR).

<DemoBlock title="center=false">
  <oas-container size="sm" center="false" style="background: var(--oas-color-bg-hover)">
    Left-aligned, no longer centered
  </oas-container>
</DemoBlock>

## Padding

`padding` accepts any token/value and applies to `padding-inline` (logical padding).

<DemoBlock title="padding">
  <oas-container size="md" padding="var(--oas-space-4)" style="background: var(--oas-color-bg-hover)">
    16px padding on both sides of the content
  </oas-container>
</DemoBlock>

## Fluid

The `fluid` boolean attribute removes `max-width` entirely — the container always spans 100% of its parent (pure fluid). It is orthogonal to `size`: when present, the `size` width limit is ignored. Suitable for content that must fill the width while keeping the narrow-screen protection of `width: 100%`.

<DemoBlock title="fluid vs fixed width">
  <oas-space direction="vertical" style="width: 100%">
    <oas-container fluid style="background: var(--oas-color-bg-hover)">fluid · spans 100%</oas-container>
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">size="md" · 768px fixed (comparison)</oas-container>
  </oas-space>
</DemoBlock>

## Breakout

Any slotted child with a `breakout` attribute breaks out of the fixed width to span the full viewport width (classic formula `width: 100vw` + `margin-inline: calc(50% - 50vw)`). Ideal for a "constrained content, full-width local banner" page structure.

<DemoBlock title="breakout — full-width banner">
  <div style="overflow-x: clip">
    <oas-container size="md" style="background: var(--oas-color-bg-hover)">
      First paragraph of constrained content
      <div breakout class="demo-breakout-banner">breakout banner · breaks 768px to span the viewport</div>
      Second paragraph of constrained content
    </oas-container>
  </div>
</DemoBlock>

> **Viewport scrollbar note**: `100vw` includes the vertical scrollbar width, so a breakout element can overflow horizontally when the page shows a scrollbar. Suppress it with `overflow-x: clip` (or `overflow-x: hidden`) on a top-level page wrapper — not on the container itself (that would clip the breakout).

## Empty container

An empty container causes no error and takes no placeholder.

<DemoBlock title="Empty container">
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

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `center` | Whether to center (`center="false"` disables) | `string` | `true` |
| `fluid` | Boolean; removes max-width entirely (pure fluid 100%). Orthogonal to `size` — when present, the size width limit is ignored | `boolean` | — |
| `padding` | Padding token/value (applies to `padding-inline`) | — | — |
| `size` | Fixed-width tier, mapped to `--oas-container-*` tokens | `string` | `lg` |

### Slots

| Name | Description |
| --- | --- |
| default | — |
