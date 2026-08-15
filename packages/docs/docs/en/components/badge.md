# Badge

A numeric/status badge, typically used for message counts or new-content indicators.

## Basic usage

<DemoBlock title="Numeric badges">
  <oas-badge value="5">
    <oas-tag>Notifications</oas-tag>
  </oas-badge>
  <oas-badge value="88">
    <oas-tag>Unread</oas-tag>
  </oas-badge>
</DemoBlock>

## Max display

When the value exceeds `max`, `max+` is displayed.

<DemoBlock title="Max display">
  <oas-badge value="120" max="99">
    <oas-tag>Comments</oas-tag>
  </oas-badge>
</DemoBlock>

## Dot

<DemoBlock title="Status dot">
  <oas-badge dot>
    <oas-tag>Online</oas-tag>
  </oas-badge>
</DemoBlock>

## Zero value

`0` is hidden by default; shown when `showZero` is set.

<DemoBlock title="Zero value control">
  <oas-badge value="0">
    <oas-tag>Hidden by default</oas-tag>
  </oas-badge>
  <oas-badge value="0" showZero>
    <oas-tag>Show 0</oas-tag>
  </oas-badge>
</DemoBlock>

## Standalone badge

When no child content is wrapped, the badge falls back from the "top-end corner" position to a static inline element (never collapses), so it can sit in a text flow or a menu row.

<DemoBlock title="Standalone badge">
  <span>New messages <oas-badge value="3"></oas-badge></span>
  <span>To-dos <oas-badge value="12" color="success"></oas-badge></span>
  <span>System running <oas-badge dot color="green"></oas-badge></span>
</DemoBlock>

## Badge colors

`color` accepts the four semantic colors (`primary` / `success` / `warning` / `danger`), any CSS color value, and the 11 preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`, mapped to `--oas-preset-*` tokens, auto-brightened in dark). It works uniformly across count / dot / ribbon modes; the solid text color is picked black/white by the background luminance for readability.

<DemoBlock title="count semantic colors">
  <oas-badge value="5" color="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>primary</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>success</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="warning" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>warning</oas-tag>
  </oas-badge>
  <oas-badge value="5" color="danger">
    <oas-tag>danger</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="count preset colors">
  <oas-badge value="3" color="magenta" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>magenta</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="geekblue" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>geekblue</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="gold" style="margin-inline-end: var(--oas-space-3)">
    <oas-tag>gold</oas-tag>
  </oas-badge>
  <oas-badge value="3" color="cyan">
    <oas-tag>cyan</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="count / dot custom colors">
  <oas-badge value="8" color="#7c3aed" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>#7c3aed purple</oas-tag>
  </oas-badge>
  <oas-badge dot color="#e11d48" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>dot #e11d48</oas-tag>
  </oas-badge>
  <oas-badge dot color="purple">
    <oas-tag>dot purple</oas-tag>
  </oas-badge>
</DemoBlock>

## Offset

`offset="x,y"` (px numbers) shifts the corner badge from its default position; x is positive rightward and y positive downward (screen coordinates, independent of the corner direction). Invalid values (non-numeric, missing coordinate) are silently ignored. It composes with `corner`: pick the corner first, then fine-tune.

<DemoBlock title="Offset">
  <oas-badge value="5" offset="10,5" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>Shift right-down</oas-tag>
  </oas-badge>
  <oas-badge value="5" offset="0,8">
    <oas-tag>Shift down</oas-tag>
  </oas-badge>
</DemoBlock>

## Corner placement

`corner` pins the badge to one of the four corners of the host: `top-right` (default) / `top-left` / `bottom-right` / `bottom-left`; invalid values silently fall back to `top-right`. `offset` is a precise fine-tune on top of the `corner` result (corner first, then shift; they compose).

<DemoBlock title="Four corners">
  <oas-badge value="5" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>top-right default</oas-tag>
  </oas-badge>
  <oas-badge value="5" corner="top-left" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>top-left</oas-tag>
  </oas-badge>
  <oas-badge value="5" corner="bottom-right" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>bottom-right</oas-tag>
  </oas-badge>
  <oas-badge value="5" corner="bottom-left">
    <oas-tag>bottom-left</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="corner + offset">
  <oas-badge value="5" corner="bottom-left" offset="4,4" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>bottom-left shifted right-down</oas-tag>
  </oas-badge>
  <oas-badge value="5" corner="top-left" offset="0,6">
    <oas-tag>top-left shifted down</oas-tag>
  </oas-badge>
</DemoBlock>

## Circular overlap

When wrapping circular content (e.g. an avatar), add `overlap` so the badge tucks inside the circle edge: the translate amount shrinks from 50% to ~29% (the 1-√2/2 geometric inset). Only affects corner badge mode.

<DemoBlock title="overlap circular inset">
  <oas-badge value="5" overlap style="margin-inline-end: var(--oas-space-5)">
    <oas-avatar size="48">张</oas-avatar>
  </oas-badge>
  <oas-badge dot overlap color="success" style="margin-inline-end: var(--oas-space-5)">
    <oas-avatar size="48">李</oas-avatar>
  </oas-badge>
  <oas-badge value="99" max="99" overlap corner="bottom-right">
    <oas-avatar size="48">王</oas-avatar>
  </oas-badge>
</DemoBlock>

## Status point

`status` renders an inline standalone element of "status dot + `text`" (not a corner badge) and is mutually exclusive with ribbon / dot / count modes (rendered first when set). The `processing` dot pulses (`prefers-reduced-motion` disables it).

<DemoBlock title="Status points">
  <oas-badge status="success" text="Published" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="processing" text="Processing" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="default" text="Default" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="error" text="Error" style="margin-inline-end: var(--oas-space-4)"></oas-badge>
  <oas-badge status="warning" text="Warning"></oas-badge>
</DemoBlock>

## Small size

`size="small"` provides a compact tier: numeric badge ~13px tall, dot shrinks to 6px.

<DemoBlock title="Small size">
  <oas-badge value="5" size="small" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>Small count</oas-tag>
  </oas-badge>
  <oas-badge value="99" max="99" size="small" style="margin-inline-end: var(--oas-space-4)">
    <oas-tag>Small 99+</oas-tag>
  </oas-badge>
  <oas-badge dot size="small">
    <oas-tag>Small dot</oas-tag>
  </oas-badge>
</DemoBlock>

## Attention animation

`attention="pulse"` makes the badge emit a periodic outward pulse ring (the pulse color can be customized via `--oas-badge-pulse-color`, defaulting to the badge background); `attention="bounce"` makes the badge bounce up and down slightly. It only applies to count / dot / standalone badges (the ribbon is unaffected) and is disabled under `prefers-reduced-motion`.

<DemoBlock title="pulse">
  <oas-badge value="5" attention="pulse" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>pulse</oas-tag>
  </oas-badge>
  <oas-badge dot attention="pulse" color="success" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>dot pulse</oas-tag>
  </oas-badge>
  <oas-badge
    value="3"
    attention="pulse"
    color="purple"
    style="--oas-badge-pulse-color: var(--oas-color-warning)"
  >
    <oas-tag>custom pulse color</oas-tag>
  </oas-badge>
</DemoBlock>

<DemoBlock title="bounce">
  <oas-badge value="5" attention="bounce" style="margin-inline-end: var(--oas-space-5)">
    <oas-tag>bounce</oas-tag>
  </oas-badge>
  <oas-badge dot attention="bounce" color="warning">
    <oas-tag>dot bounce</oas-tag>
  </oas-badge>
</DemoBlock>

## Native tooltip

Adding the native `title` attribute to the badge host gives a hover tooltip with zero JS.

<DemoBlock title="Native tooltip">
  <oas-badge value="3" title="3 unread messages">
    <oas-tag>Unread</oas-tag>
  </oas-badge>
</DemoBlock>

## Dynamic increment

`value` updates take effect immediately; the host can add an animation class on click for a transition feedback (this example uses `::part(badge)` for a scale/opacity micro-animation).

<DemoBlock title="Dynamic increment">
  <oas-badge id="badge-dyn" value="5">
    <oas-tag>Dynamic count</oas-tag>
  </oas-badge>
  <oas-button id="badge-dec" size="small" aria-label="Decrease">−</oas-button>
  <oas-button id="badge-inc" size="small" type="primary" aria-label="Increase">＋</oas-button>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const badge = document.getElementById('badge-dyn')
  const bump = () => {
    badge.classList.remove('bump')
    void badge.offsetWidth
    badge.classList.add('bump')
  }
  document.getElementById('badge-inc')?.addEventListener('click', () => {
    badge.setAttribute('value', String(Number(badge.getAttribute('value') || 0) + 1))
    bump()
  })
  document.getElementById('badge-dec')?.addEventListener('click', () => {
    badge.setAttribute('value', String(Math.max(0, Number(badge.getAttribute('value') || 0) - 1)))
    bump()
  })
})
</script>

<style>
oas-badge#badge-dyn.bump::part(badge) {
  animation: oas-badge-dyn-bump 220ms var(--oas-ease-out);
}
@keyframes oas-badge-dyn-bump {
  0%,
  100% {
    transform: translate(50%, -50%) scale(1);
    opacity: 1;
  }
  45% {
    transform: translate(50%, -50%) scale(1.22);
    opacity: 0.72;
  }
}
</style>

## Ribbon corner

The `ribbon` boolean attribute (or `mode="ribbon"`) enables a ribbon corner — an angled folded ribbon on the top edge of the wrapped content. Text is provided via the `text` attribute; it sits at the inline-end (`placement="end"`) by default and can be moved to `placement="start"`.

<DemoBlock title="Basic ribbon">
  <oas-badge ribbon text="HOT" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>Default ribbon (top-end)</p></oas-card>
  </oas-badge>
  <oas-badge mode="ribbon" text="LIMITED" placement="start">
    <oas-card><p>mode="ribbon" (top-start)</p></oas-card>
  </oas-badge>
</DemoBlock>

## Ribbon position

`ribbon-position` controls the ribbon's vertical position: `hang` (default, hangs below the top edge) / `edge` (flush with the top edge) / `cross` (straddles the top edge, pressing against the card border for the strongest wrap-around feel). All three positions are orthogonal to `placement` (start / end) and work on both sides.

<DemoBlock title="Ribbon position">
  <oas-badge ribbon text="HANG" ribbon-position="hang" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>hang (default, hangs below)</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="EDGE" ribbon-position="edge" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>edge (flush with top edge)</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="CROSS" ribbon-position="cross">
    <oas-card><p>cross (straddling top edge)</p></oas-card>
  </oas-badge>
</DemoBlock>

<DemoBlock title="Ribbon position (placement=start, left side)">
  <oas-badge ribbon text="HANG" ribbon-position="hang" placement="start" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>hang (hangs below)</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="EDGE" ribbon-position="edge" placement="start" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>edge (flush with top edge)</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="CROSS" ribbon-position="cross" placement="start">
    <oas-card><p>cross (straddling top edge)</p></oas-card>
  </oas-badge>
</DemoBlock>

## Ribbon forms

`ribbon-form` switches the ribbon shape: `fold` (default, straight band + folded corner) / `diagonal` (45° diagonal band sweeping from the top corner; the band extends outside the card, so the host needs `overflow: hidden` to clip it) / `triangle` (a pure corner triangle holding a small icon or `slot="ribbon"` content) / `bookmark` (a vertical tab hanging from the top edge with a swallow-tail notch) / `side` (a vertical strip hung at mid-height of the side edge) / `seal` (a circular serrated stamp with centered text) / `banner` (a full-width strip across the top edge with angled ends) / `flag` (a side swallow-tail banner: a horizontal band with a V notch at the protruding end, always facing the protruding side). Invalid values silently fall back to `fold`. The `ribbon-position` vertical trio only affects the `fold` shape; the other shapes have their own vertical placement. `rolled` is a boolean modifier that adds an end roll (a large end radius + an inner gradient darkening that reads as a rolled cylinder); it composes with `fold` / `banner` / `flag`. `wide` only applies to `diagonal`, turning it into a wide large-type diagonal band for big discount scenes; other shapes ignore it.

<DemoBlock title="Ribbon forms">
  <oas-badge ribbon text="HOT" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>fold</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="HOT" ribbon-form="diagonal" style="margin-inline-end: var(--oas-space-4); overflow: hidden; border-radius: var(--oas-radius-lg)">
    <oas-card style="width: 160px"><p>diagonal</p></oas-card>
  </oas-badge>
  <oas-badge ribbon ribbon-form="triangle" style="margin-inline-end: var(--oas-space-4)">
    <oas-icon slot="ribbon" name="star" size="18"></oas-icon>
    <oas-card><p>triangle</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="NEW" ribbon-form="bookmark" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>bookmark</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="HOT" ribbon-form="side" placement="start" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>side</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="BEST" ribbon-form="seal" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>seal</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="LIMITED DEAL" ribbon-form="banner" placement="start">
    <oas-card><p>banner</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="HOT" ribbon-form="flag" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>flag (side swallow-tail)</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="HOT" rolled style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>fold + rolled end</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="50% OFF" ribbon-form="diagonal" wide style="overflow: hidden; border-radius: var(--oas-radius-lg)">
    <oas-card style="width: 240px"><p>diagonal + wide</p></oas-card>
  </oas-badge>
</DemoBlock>

## Premium metallic

`premium` adds a metallic gold treatment to the ribbon: a multi-stop light-gold-to-dark-gold gradient with a deep-gold fine outline (clipped shapes get the outline traced along their clip-path silhouette), and the text color is auto-picked dark against the gold background. It composes orthogonally with `color` with the priority `premium` > `color` > semantic default, and works with every `ribbon-form`; dark theme adapts automatically (driven by the `--oas-preset-gold` token).

<DemoBlock title="Premium metallic">
  <oas-badge ribbon text="HOT" premium style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>premium fold</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="LIMITED" premium color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>premium overrides color</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="NEW" ribbon-form="bookmark" premium style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>premium bookmark</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="BEST" ribbon-form="seal" premium style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>premium seal</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="HOT" ribbon-form="diagonal" premium style="margin-inline-end: var(--oas-space-4); overflow: hidden; border-radius: var(--oas-radius-lg)">
    <oas-card style="width: 160px"><p>premium diagonal</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="DEAL" ribbon-form="banner" premium placement="start">
    <oas-card><p>premium banner</p></oas-card>
  </oas-badge>
</DemoBlock>

## Colored ribbon

`color` supports the four semantic colors `primary` / `success` / `warning` / `danger`, following the theme (light/dark); preset names and arbitrary color values are also supported (injected via `--oas-preset-*` tokens / the raw value).

<DemoBlock title="Colored ribbon">
  <oas-badge ribbon text="HOT" color="primary" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>primary</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="FREE" color="success" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>success</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="ENDING" color="warning" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>warning</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="SOLD OUT" color="danger">
    <oas-card><p>danger</p></oas-card>
  </oas-badge>
</DemoBlock>

<DemoBlock title="Ribbon preset & custom colors">
  <oas-badge ribbon text="LIMITED" color="geekblue" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>geekblue</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="DEAL" color="#7c3aed">
    <oas-card><p>#7c3aed</p></oas-card>
  </oas-badge>
</DemoBlock>

## Custom ribbon content

Besides the `text` attribute, arbitrary content can be passed through `slot="ribbon"` (the slot takes precedence when present).

<DemoBlock title="Custom content">
  <oas-badge ribbon>
    <span slot="ribbon">New - 20% off</span>
    <oas-card><p>Custom content via slot="ribbon"</p></oas-card>
  </oas-badge>
</DemoBlock>

## Comparison with count / dot

The same `oas-badge` can serve as a count badge or a ribbon: the count badge is a small number pinned to the top-end corner, `dot` is a textless status point, while the ribbon spans the top edge of the wrapped content; `status` is a standalone inline "dot + text" element.

<DemoBlock title="count / dot / ribbon comparison">
  <oas-badge value="5" style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>count numeric badge</p></oas-card>
  </oas-badge>
  <oas-badge dot style="margin-inline-end: var(--oas-space-4)">
    <oas-card><p>dot status point</p></oas-card>
  </oas-badge>
  <oas-badge ribbon text="NEW">
    <oas-card><p>ribbon</p></oas-card>
  </oas-badge>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `attention` | Attention animation: `pulse` (an outward pulse ring; the pulse color follows the `--oas-badge-pulse-color` custom property, defaulting to the badge background) / `bounce` (slight up-and-down bounce); applies only to count / dot / standalone badges (the ribbon is unaffected) and is disabled under `prefers-reduced-motion` | `BadgeAttention` | — |
| `color` | Badge color: the four semantic colors (`primary` / `success` / `warning` / `danger`), any CSS color value, or one of the 11 preset names (`magenta` / `red` / `volcano` / `orange` / `gold` / `lime` / `green` / `cyan` / `blue` / `geekblue` / `purple`, mapped to `--oas-preset-*` tokens, auto-brightened in dark). Applies uniformly across count / dot / ribbon; the solid text color is picked black/white by the background luminance for readability | `BadgeColor \| BadgePresetColor` | — |
| `corner` | Corner placement: `top-right` (default) / `top-left` / `bottom-right` / `bottom-left`, affects count / dot corner badges only (the ribbon uses `placement`); `offset` fine-tunes in screen px on top of the corner result (x positive rightward, y positive downward, independent of the corner direction), corner first then shift, they compose; invalid values silently fall back to `top-right` | `BadgeCorner` | `top-right` |
| `dot` | Dot mode | `boolean` | — |
| `max` | Upper limit | `string` | — |
| `mode` | Mode: `count` (default, numeric/dot badge) or `ribbon` (ribbon corner, same as `ribbon` attribute) | `BadgeMode` | `count` |
| `offset` | Corner offset: `"x,y"` (px numbers), shifts the badge from its corner position (x positive rightward, y positive downward); composes with `corner` (corner first, then shift); invalid values (non-numeric, missing coordinate) are silently ignored | `string` | — |
| `overlap` | Circular inset: when wrapping circular content (e.g. an avatar), the badge tucks inside the circle edge (the translate amount shrinks from 50% to ~29%, the 1-√2/2 geometric inset); affects corner badge mode only | `boolean` | — |
| `placement` | Ribbon position: `start` (inline-start) / `end` (inline-end, default) | `BadgePlacement` | `end` |
| `premium` | Metallic treatment: a multi-stop gold gradient with a deep-gold fine outline (clipped shapes get the outline traced along their clip-path silhouette), text color auto-picked dark against the gold background; composes orthogonally with `color` with the priority `premium` > `color` > semantic default; works with every `ribbon-form`, dark theme adapts automatically (driven by the `--oas-preset-gold` token) | `boolean` | — |
| `ribbon` | Ribbon corner mode (boolean, same as `mode="ribbon"`) | `boolean` | — |
| `ribbon-form` | Ribbon shape: `fold` (default, straight band + folded corner) / `diagonal` (45° diagonal band from the top corner; the band extends outside the card, so the host needs `overflow: hidden` to clip it) / `triangle` (a pure corner triangle holding a small icon or `slot="ribbon"` content) / `bookmark` (a vertical tab hanging from the top edge with a swallow-tail notch) / `side` (a vertical strip hung at mid-height of the side edge) / `seal` (a circular serrated stamp with centered text) / `banner` (a full-width strip across the top edge with angled ends) / `flag` (a side swallow-tail banner: a horizontal band with a V notch at the protruding end, always facing the protruding side); the `ribbon-position` trio only affects `fold`, the other shapes have their own vertical placement, invalid values silently fall back to `fold` | `BadgeRibbonForm` | `fold` |
| `ribbon-position` | Ribbon vertical position: `hang` (default, hangs below the top edge) / `edge` (flush with the top edge) / `cross` (straddles the top edge, pressing against the card border for the strongest wrap-around feel); orthogonal to `placement` (start / end), affects the `ribbon-form="fold"` shape only, invalid values silently fall back to `hang` | `BadgeRibbonPosition` | `hang` |
| `rolled` | End roll: a boolean modifier that adds a rolled edge to the protruding end (a large end radius + an inner gradient darkening that reads as a rolled cylinder; pure CSS). Composes with `fold` / `banner` / `flag`; other shapes silently ignore it | `boolean` | — |
| `showZero` | Whether to show when value=0 | `boolean` | — |
| `size` | Size: `small` (compact tier, numeric badge ~13px tall, dot 6px) | `string` | — |
| `status` | Status point: `success` / `processing` / `default` / `error` / `warning`, renders an inline standalone element of "status dot + `text`", mutually exclusive with ribbon / dot / count modes (rendered first when set); the `processing` dot pulses (`prefers-reduced-motion` disables it) | `BadgeStatus` | — |
| `text` | Ribbon or status text; the `ribbon` slot takes precedence when it has content | `string` | — |
| `value` | Number | `string` | — |
| `wide` | Wide large-type diagonal: only takes effect with `ribbon-form="diagonal"` (a band of about 200×32px with a raised font size and the text shift scaled to the band width, covering a larger corner area); other shapes silently ignore it | `boolean` | — |

### Slots

| Name | Description |
| --- | --- |
| default | Wrapped content (card, button, etc.); with no content the badge falls back to a standalone inline element |
| `ribbon` | Custom ribbon content |
