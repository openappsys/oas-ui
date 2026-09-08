# Avatar

Displays a user or object avatar, supporting both text-placeholder and image forms.

## Basic Usage

<DemoBlock title="Text avatars">
  <oas-avatar>A</oas-avatar>
  <oas-avatar>B</oas-avatar>
  <oas-avatar>C</oas-avatar>
  <oas-avatar>D</oas-avatar>
</DemoBlock>

A text avatar renders the first character of its content; with no content at all, it shows a `?` placeholder.

## Sizes

<DemoBlock title="Size variants">
  <oas-avatar size="24">A</oas-avatar>
  <oas-avatar size="32">B</oas-avatar>
  <oas-avatar size="48">C</oas-avatar>
  <oas-avatar size="64">D</oas-avatar>
  <oas-avatar size="80">E</oas-avatar>
</DemoBlock>

## Image Avatars

<DemoBlock title="Image avatars">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-1/160" size="32" alt="Avatar 1"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-2/160" size="48" alt="Avatar 2"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-3/160" size="64" alt="Avatar 3"></oas-avatar>
</DemoBlock>

## Avatar Groups

<DemoBlock title="Avatar group">
  <oas-avatar-group>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g1/160" size="40" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g2/160" size="40" alt="Member 2"></oas-avatar>
    <oas-avatar size="40">A</oas-avatar>
    <oas-avatar size="40">B</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

Multiple `oas-avatar` elements wrapped in `oas-avatar-group` are laid out left-to-right with overlapping.

<DemoBlock title="Max display count">
  <oas-avatar-group max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g3/160" size="40" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g4/160" size="40" alt="Member 2"></oas-avatar>
    <oas-avatar size="40">A</oas-avatar>
    <oas-avatar size="40">B</oas-avatar>
    <oas-avatar size="40">C</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

When `max` is set, the overflow is hidden and a `+N` count badge is shown at the end.

## Unified Size

`size` sets the size of all avatars in the group (px) so it does not need to be set per avatar; combined with `max`, the `+N` count badge adapts its size accordingly.

<DemoBlock title="Unified size size">
  <oas-avatar-group size="48">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga1/160" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga2/160" alt="Member 2"></oas-avatar>
    <oas-avatar>A</oas-avatar>
    <oas-avatar>B</oas-avatar>
  </oas-avatar-group>
  <oas-avatar-group size="24" max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga3/160" alt="Member 1"></oas-avatar>
    <oas-avatar>A</oas-avatar>
    <oas-avatar>B</oas-avatar>
    <oas-avatar>C</oas-avatar>
    <oas-avatar>D</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## Group Spacing

The overlap is driven by a CSS variable: `-8px` overlap by default. The `spacing` attribute (px number) accepts positive values (gap between members) and negative values (deeper overlap); you can also override `--oas-avatar-group-overlap` directly. Members get a page-background ring so overlapping avatars never bleed into each other (dark-theme aware).

<DemoBlock title="Group spacing">
  <oas-avatar-group spacing="4">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp1/160" size="40" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp2/160" size="40" alt="Member 2"></oas-avatar>
    <oas-avatar size="40">A</oas-avatar>
    <oas-avatar size="40">B</oas-avatar>
  </oas-avatar-group>
  <oas-avatar-group spacing="-16">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp3/160" size="40" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-sp4/160" size="40" alt="Member 2"></oas-avatar>
    <oas-avatar size="40">A</oas-avatar>
    <oas-avatar size="40">B</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## Folded Members Popover

With `max` set, hover, keyboard-focus, or click the `+N` count button to open a popover listing all folded member avatars; close with `Escape`, an outside click, or moving focus away.

<DemoBlock title="Folded members popover">
  <oas-avatar-group max="4">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ov1/160" size="40" alt="Member 1"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ov2/160" size="40" alt="Member 2"></oas-avatar>
    <oas-avatar size="40">A</oas-avatar>
    <oas-avatar size="40">B</oas-avatar>
    <oas-avatar size="40">C</oas-avatar>
    <oas-avatar size="40">D</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## Badge Overlay

`badge` overlays a badge on the avatar's top-right corner (text or boolean); the boolean form (no value) shows a small dot; `badge-dot` forces the dot variant; `badge-color` switches colors; `badge-placement` moves the badge to the bottom-right.

<DemoBlock title="Text badges">
  <oas-avatar size="48" badge="99+">A</oas-avatar>
  <oas-avatar size="48" badge="VIP" badge-color="primary">B</oas-avatar>
  <oas-avatar size="48" badge="8" badge-color="success">C</oas-avatar>
  <oas-avatar size="48" badge="3" badge-color="warning">D</oas-avatar>
</DemoBlock>

<DemoBlock title="Dot badges">
  <oas-avatar size="48" badge-dot>E</oas-avatar>
  <oas-avatar size="48" badge-dot badge-color="success">F</oas-avatar>
  <oas-avatar size="48" badge-dot badge-color="warning">G</oas-avatar>
</DemoBlock>

<DemoBlock title="Placement and image avatars">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-b1/160" size="48" alt="Avatar 4" badge="7"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-b2/160" size="48" alt="Avatar 5" badge="5" badge-placement="bottom-right"></oas-avatar>
</DemoBlock>

## Load-Failure Fallback

When the image fails to load, the avatar automatically falls back to a placeholder: first the `fallback` named-slot content, then the first character of its content, and finally `?`.

<DemoBlock title="Fallback to first character">
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="Load failed">A</oas-avatar>
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="Load failed"></oas-avatar>
</DemoBlock>

<DemoBlock title="Custom fallback slot">
  <oas-avatar src="https://invalid.example.com/missing.png" size="48" alt="Load failed">
    <span slot="fallback" style="font-size: 20px; font-weight: 600">!</span>
  </oas-avatar>
</DemoBlock>

## Empty Fallback

<DemoBlock title="Empty fallback">
  <oas-avatar size="48"></oas-avatar>
  <oas-avatar size="48">M</oas-avatar>
</DemoBlock>

## text Attribute

The `text` attribute drives the text rendering and is **reactive**: changing `text` at runtime takes effect immediately (attribute change triggers a re-render). Multi-character text renders in full and shrinks to fit the container (floor 10px, see "Long Name Auto-Fit"); a single character, or the fallback to the first character of the light-DOM text content — a one-time snapshot taken at connect time — stays unchanged. Use the `text` attribute for dynamic text.

<DemoBlock title="text attribute drives rendering">
  <oas-avatar size="48" text="A"></oas-avatar>
  <oas-avatar size="48" text="Alice"></oas-avatar>
</DemoBlock>

## Shape

`shape` controls the avatar outline: `circle` (default), `square` (right-angle corners), or `round` (small corner radius from the radius token). The image, placeholder, and change-avatar mask all follow the same radius.

<DemoBlock title="Shape variants">
  <oas-avatar shape="circle" size="48" text="C"></oas-avatar>
  <oas-avatar shape="square" size="48" text="S"></oas-avatar>
  <oas-avatar shape="round" size="48" text="R"></oas-avatar>
</DemoBlock>

## Size Presets

Besides numeric px, `size` accepts enum aliases: `small` (24) / `medium` (32) / `large` (40), aligned with the library-wide size scale.

<DemoBlock title="Size presets (enum aliases)">
  <oas-avatar size="small" text="S"></oas-avatar>
  <oas-avatar size="medium" text="M"></oas-avatar>
  <oas-avatar size="large" text="L"></oas-avatar>
</DemoBlock>

## Long Name Auto-Fit

When `text` has multiple characters (organization or team names), it is no longer truncated to the first character: the full text renders and the font size shrinks to fit the container, with a 10px floor for readability.

<DemoBlock title="Long name auto-fit">
  <oas-avatar size="32" text="OAS Design Lab"></oas-avatar>
  <oas-avatar size="48" text="OAS Design Lab"></oas-avatar>
  <oas-avatar size="64" text="OAS Design Lab"></oas-avatar>
</DemoBlock>

## Background Color

`color` follows the library-wide color protocol: 4 semantic colors (`primary`/`success`/`warning`/`danger`), 11 preset palette names (`blue`, `geekblue`, `volcano`, …), or any CSS color value. The text color is picked automatically (black/white) for contrast. You can also override the CSS variables `--oas-avatar-bg` / `--oas-avatar-on-color` directly.

<DemoBlock title="Background color">
  <oas-avatar color="blue" size="40" text="O"></oas-avatar>
  <oas-avatar color="volcano" size="40" text="A"></oas-avatar>
  <oas-avatar color="success" size="40" text="B"></oas-avatar>
  <oas-avatar color="#7c3aed" size="40" text="C"></oas-avatar>
</DemoBlock>

## Image Fit

`fit` maps to the image's `object-fit`; `cover` by default (crop to fill). Use `contain` to show a tall image in full.

<DemoBlock title="Image fit">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-fit/120/240" size="64" fit="cover" alt="cover crops to fill"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-fit/120/240" size="64" fit="contain" alt="contain shows in full"></oas-avatar>
</DemoBlock>

## Icon Avatar

Place an icon in `slot="icon"` (an `oas-icon` or any svg/content): when an icon is given explicitly, the first character is no longer rendered.

<DemoBlock title="Icon avatars">
  <oas-avatar size="48"><oas-icon slot="icon" name="user"></oas-icon></oas-avatar>
  <oas-avatar size="48" color="geekblue"><oas-icon slot="icon" name="organization"></oas-icon></oas-avatar>
</DemoBlock>

## Fallback Image

The `fallback` attribute provides a fallback image URL: when the primary image fails to load, the avatar switches to the fallback image and retries once before entering the text fallback chain. Every failure dispatches an `oas-error` event (`detail.src` is the URL that failed) so hosts can track errors or customize the fallback.

<DemoBlock title="Fallback image">
  <oas-avatar src="https://invalid.example.com/primary.png" fallback="https://picsum.photos/seed/isui-avatar-fb/160" size="48" alt="Fallback image"></oas-avatar>
  <oas-avatar src="https://invalid.example.com/primary.png" fallback="https://invalid.example.com/backup.png" size="48" alt="Both levels fail">A</oas-avatar>
</DemoBlock>

## Change Avatar Trigger

Drop any `slot="trigger"` node in to enable the change-avatar entry: hovering or keyboard-focusing the avatar reveals a mask (an empty node shows the built-in camera icon; content becomes the mask content), and clicking dispatches an `oas-trigger` event — the upload flow is up to the host.

<DemoBlock title="Change avatar trigger">
  <div id="avatar-trigger-demo" style="display: flex; gap: 16px">
    <oas-avatar size="64" text="A"><span slot="trigger"></span></oas-avatar>
    <oas-avatar size="64" text="B"><span slot="trigger">Change</span></oas-avatar>
    <oas-avatar size="64" src="https://picsum.photos/seed/isui-avatar-tr/160" alt="Avatar"><span slot="trigger"></span></oas-avatar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined guard: bind listeners only after the custom element is defined
  // (pre-upgrade expando would shadow setters in preview builds)
  customElements.whenDefined('oas-avatar').then(async () => {
    const { message } = await import('@oas-ui/ui')
    window.message = message
    document.querySelectorAll('#avatar-trigger-demo oas-avatar').forEach((el) => {
      el.addEventListener('oas-trigger', () => {
        window.message?.info('Change avatar triggered — upload flow is up to the host')
      })
    })
  })
})
</script>

## Status Dot Composition

Online status and similar scenarios are not built in: compose with `oas-badge` wrapping the avatar (`dot` + semantic `color`), with position and color controlled by the badge side.

<DemoBlock title="Status dot composition (wrapped in oas-badge)">
  <oas-badge dot color="success"><oas-avatar size="40">A</oas-avatar></oas-badge>
  <oas-badge dot color="warning"><oas-avatar size="40">B</oas-avatar></oas-badge>
  <oas-badge dot><oas-avatar size="40">C</oas-avatar></oas-badge>
</DemoBlock>

## Name Tooltip

To show a name or description per avatar, compose with a wrapping `oas-tooltip` (works on hover and keyboard focus).

<DemoBlock title="Name tooltip (oas-tooltip composition)">
  <oas-tooltip content="Alice Lin" placement="top"><oas-avatar size="40">A</oas-avatar></oas-tooltip>
  <oas-tooltip content="Bob Chen" placement="top"><oas-avatar size="40" src="https://picsum.photos/seed/isui-avatar-tt1/160" alt="Bob Chen"></oas-avatar></oas-tooltip>
  <oas-tooltip content="Carol Zhao" placement="top"><oas-avatar size="40" color="geekblue">C</oas-avatar></oas-tooltip>
</DemoBlock>

## API

### oas-avatar

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `alt` | Alternative text for the image | — | — |
| `badge` | Badge text overlaid on the avatar's top-right corner; boolean form (no value) shows a dot | `string` | — |
| `badge-color` | Badge color: `primary`/`success`/`warning`/`danger` | `string` | `danger` |
| `badge-dot` | Small dot badge variant (no text) | `boolean` | — |
| `badge-placement` | Badge placement: `top-right` (default) / `bottom-right` | `string` | `top-right` |
| `color` | Text avatar background: semantic color / preset name / any color value (contrast text color auto-picked) | `string` | — |
| `fallback` | Fallback image URL: used when the main image fails (text/slot chain after that) | `string` | — |
| `fit` | Image object-fit (default `cover`) | `string` | — |
| `shape` | Shape: `circle` (default) / `square` / `round` (rounded corners) | — | — |
| `size` | Size: number in px or enum alias `small`(24) / `medium`(32) / `large`(40) | `string` | `32` |
| `src` | Image URL; renders an image avatar when present | `string` | — |
| `text` | Text content: single char renders the first character; multiple chars render in full with auto-shrinking font | `string` | — |

| Event | Description |
| --- | --- |
| `oas-error` | Fired when an image fails (once for the main src, once for the fallback), `detail: { src }` |
| `oas-trigger` | Change-avatar entry (trigger overlay) clicked; upload interaction is up to the host, `detail: { source: this }` |

| Name | Description |
| --- | --- |
| `fallback` | Custom placeholder content when the image fails to load (or the avatar has no content) |
| `icon` | Icon avatar (explicit icon content; no first-character truncation) |
| `trigger` | Custom content for the change-avatar overlay (shown on hover/focus; built-in camera icon by default) |

### oas-avatar-group

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `max` | Max number of avatars shown; overflow shows a `+N` count badge | `string` | — |
| `size` | Unified avatar size (px); the count badge adapts | `string` | — |
| `spacing` | Member spacing in px (negative = overlapping; overrides the `--oas-avatar-group-overlap` variable) | `string` | — |

| Name | Description |
| --- | --- |
| default | — |

> Note: `alt` is read on first render and is not in the observed attribute list; dynamic changes require a manual re-render.
