# AspectRatio

A purely presentational component that locks a container's size to a specified aspect ratio, with preset ratio names (`square`/`landscape`/`portrait`/`wide`/`ultrawide`/`golden`) as well as fraction/decimal syntax: 100% width with height derived from the ratio, content filling the area and cropped to the ratio; with no children it still occupies space at the ratio. No events.

## Basic Usage

<DemoBlock title="16/9 video ratio">
  <oas-aspect-ratio ratio="16/9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">16:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## Common Ratios

<DemoBlock title="4:3 / 1:1 / 21:9">
  <oas-aspect-ratio ratio="4:3" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover); margin-bottom: var(--oas-space-3); width: 200px;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="21:9" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">21:9</div>
  </oas-aspect-ratio>
</DemoBlock>

## Preset Ratio Names

The `ratio` attribute supports six preset tokens mapping common ratios (coexisting with fraction/decimal syntax; token names match first):

| token       | ratio   | token      | ratio   |
| ----------- | ------- | ---------- | ------- |
| `square`    | 1 : 1   | `wide`     | 16 : 9  |
| `landscape` | 4 : 3   | `ultrawide`| 21 : 9  |
| `portrait`  | 3 : 4   | `golden`   | 1.618 : 1 |

<DemoBlock title="The six preset tokens">
  <oas-aspect-ratio ratio="square" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">square 1:1</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="landscape" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">landscape 4:3</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="portrait" style="width: 160px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">portrait 3:4</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="wide" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">wide 16:9</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="ultrawide" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">ultrawide 21:9</div>
  </oas-aspect-ratio>
  <oas-aspect-ratio ratio="golden" style="width: 320px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">golden 1.618:1</div>
  </oas-aspect-ratio>
</DemoBlock>

## Number Form

The `ratio` can also be assigned as a number property (`el.ratio = 1.5`), fully equivalent to the string form — binding a number via `:ratio` in Vue/React or assigning the property directly goes through the same parsing path.

<DemoBlock title="Decimal / number property">
  <oas-space direction="vertical" style="width: 100%">
    <oas-aspect-ratio ratio="1.5" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">ratio="1.5" (photo 3:2)</div>
    </oas-aspect-ratio>
    <oas-space size="small">
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = 1.5">el.ratio = 1.5</oas-button>
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = '16/9'">el.ratio = '16/9'</oas-button>
      <oas-button size="small" onclick="document.getElementById('ar-property').ratio = 'golden'">el.ratio = 'golden'</oas-button>
    </oas-space>
    <oas-aspect-ratio id="ar-property" ratio="1.5" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">number property assignment (click a button above)</div>
    </oas-aspect-ratio>
  </oas-space>
</DemoBlock>

## Inside a Flex Container

`oas-aspect-ratio` defaults to 100% width, but as a flex item inside a flex container it **does not stretch to fill automatically** — the height still derives from the ratio, while the width is decided by flex layout. To make it grow, give the host a `flex` property (e.g. `flex: 1`) or an explicit width.

<DemoBlock title="Behavior inside a flex container">
  <oas-flex gap="8px" style="width: 100%">
    <oas-aspect-ratio ratio="16/9" style="flex: 1; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">flex: 1</div>
    </oas-aspect-ratio>
    <oas-aspect-ratio ratio="16/9" style="flex: 1; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">flex: 1</div>
    </oas-aspect-ratio>
    <oas-aspect-ratio ratio="1/1" style="width: 96px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--oas-color-text-secondary);">width 96px</div>
    </oas-aspect-ratio>
  </oas-flex>
</DemoBlock>

> Note: without a width or `flex` property, the width of `oas-aspect-ratio` inside a flex container is decided by its content (and may collapse to 0 when empty) — always give the host a `flex` property or an explicit width.

## Empty Content Placeholder

<DemoBlock title="Keeps ratio without children (1:1)">
  <oas-aspect-ratio ratio="1:1" style="border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg-hover);"></oas-aspect-ratio>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `ratio` | Aspect ratio: preset name `square` (1/1) / `landscape` (4/3) / `portrait` (3/4) / `wide` (16/9) / `ultrawide` (21/9) / `golden` (1.618/1), or a fraction `16/9`, `4:3`, `16 / 9`, decimal `1.5`; also assignable as a number property (`el.ratio = 1.5`). Token names match first; missing/invalid values (including zero numerator or denominator) fall back to `1 / 1` with a dev warning once per invalid value (deduplicated) | `string \| number` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

- The host is 100% wide, with height derived from `aspect-ratio`; content fills the area via absolute `inset: 0` and is cropped to the ratio.
- Without children, the host still occupies space at the ratio.
- No events; purely presentational.
