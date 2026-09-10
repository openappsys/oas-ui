# Watermark

A container-level watermark layer that sits on top of the content without intercepting any interaction, suitable for preventing sensitive information from leaking.

Rendering engine: text and grayscale image watermarks are drawn on a canvas (the tile is tiled via `toDataURL` as a background), scaled by devicePixelRatio so they stay sharp on high-DPI screens; SSR and canvas-less environments automatically fall back to an SVG data-uri (`fill=currentColor` follows the theme). Both paths render an identical structure, and true hydration takes over after validating it. Tiles are cached by paint parameters and repainted only when a relevant attribute or the theme color changes; window resize is handled natively by background tiling.

## Text Watermark

<DemoBlock title="Basic text watermark">
  <oas-watermark text="内部资料 · CONFIDENTIAL" repeat>
    <div style="height: 180px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The text watermark is tiled; any content inside the container can be passed in as the slot
    </div>
  </oas-watermark>
</DemoBlock>

`text` generates a diagonally tiled unit; with `repeat` the unit is tiled, otherwise a single unit is centered.

## Single Unit and Opacity

<DemoBlock title="Single centered + opacity">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <oas-watermark text="机密" opacity="0.3" style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
    <oas-watermark text="已审核" repeat style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
  </div>
</DemoBlock>

`opacity` controls the transparency of the watermark layer (0–1, automatically clamped to bounds).

## Image Watermark

<DemoBlock title="Image watermark">
  <oas-watermark image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.25" repeat>
    <div style="height: 160px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      The `image` attribute takes an image URL; when both text and image are present, image wins
    </div>
  </oas-watermark>
</DemoBlock>

## Image Grayscale

<DemoBlock title="grayscale: grayscale image filter">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark id="wm-img-color" image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.35" repeat style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark id="wm-img-gray" image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.35" repeat grayscale style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

With `grayscale`, the image watermark is converted to grayscale via canvas `filter: grayscale(1)` (cross-origin images require CORS headers from the origin, otherwise it falls back to the original image); canvas-less environments fall back to a layer CSS filter, so the capability is never lost.

## No Interaction Interception

<DemoBlock title="Normal content interaction">
  <oas-watermark text="演示水印" repeat>
    <div style="height: 120px; display: flex; align-items: center; justify-content: center; gap: var(--oas-space-3)">
      <button class="wm-btn" onclick="window.message && window.message.success('The button is still clickable')">Clickable button</button>
      <button class="wm-btn">Another button</button>
    </div>
  </oas-watermark>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    The watermark layer has `pointer-events: none`, so interactions with buttons / inputs above are completely unaffected.
  </p>
</DemoBlock>

## Empty Container

<DemoBlock title="Watermark shown without content">
  <oas-watermark text="水印" repeat style="display: block; height: 120px"></oas-watermark>
</DemoBlock>

When the container has no slot content at all, the watermark layer still renders.

## Multi-line, Rotate and Font

<DemoBlock title="Multi-line text / rotate / font family">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text='["内部资料","CONFIDENTIAL"]' repeat rotate="-22" width="200" height="100" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="斜纹 -45°" repeat rotate="-45" font-size="20" font-weight="700" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="Georgia 衬线" repeat font-family="Georgia, serif" color="geekblue" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`text` supports a JSON array (or `\n`) for multiple lines; `rotate` controls the angle (default -30); `font-size` / `font-weight` / `font-family` are applied to the canvas text; `color` accepts 11 preset names (resolved to `--oas-preset-*` tokens, dark-adaptive) or any CSS color value. By default the watermark follows the theme text color (visible in dark mode too, and repainted automatically on theme switch).

## Gap and Offset

<DemoBlock title="gap / offset tiling parameters">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text="默认间隙" repeat style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="宽间隙" repeat gap="[180, 120]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="带偏移" repeat gap="[140, 90]" offset="[20, 8]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

`gap="[x,y]"` controls the tile spacing (defaults to the tile size 240×120) and `offset="[x,y]"` controls the starting offset (defaults to gap/2); `width` / `height` resize the text tile, and `z-index` raises the watermark layer (default 2).

## Staggered Layout

<DemoBlock title="staggered odd/even row offset">
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: var(--oas-space-4); width: 100%">
    <oas-watermark text="规则网格" repeat gap="[140, 90]" style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
    <oas-watermark text="错位排布" repeat gap="[140, 90]" staggered style="height: 150px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-watermark>
  </div>
</DemoBlock>

With `staggered`, a second background layer offset by half a tile staggers the odd/even rows (repeat mode only).

## Tamper Proof

<DemoBlock title="tamper-proof: a watermark you cannot simply delete">
  <oas-watermark id="wm-tamper" text="CONFIDENTIAL" repeat>
    <div style="height: 130px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); padding: 0 var(--oas-space-4); text-align: center">
      Open the browser devtools and delete the watermark layer inside the shadow root, or rewrite its style — the watermark re-mounts/restores itself and fires an oas-remove event
    </div>
  </oas-watermark>
  <oas-space style="margin-top: var(--oas-space-2)">
    <oas-button id="wm-tamper-simulate" size="small">Simulate tampering (delete the layer)</oas-button>
    <oas-button id="wm-tamper-off" size="small">tamper-proof="false" comparison</oas-button>
  </oas-space>
  <p id="wm-tamper-log" style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">No tampering detected yet</p>
</DemoBlock>

`tamper-proof` is on by default (`="false"` turns it off): a MutationObserver watches for the watermark layer being removed or its style being rewritten, re-mounts/restores it automatically, and fires an `oas-remove` event (detail.type is `removed` / `modified`). It deters casual removal, not determined attackers — it is not a security boundary.

## Movable Watermark

<DemoBlock title="movable: drag the watermark">
  <oas-watermark id="wm-movable" text="拖动我" repeat movable z-index="10">
    <div style="height: 150px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      Press and drag on the watermark (grab cursor); the pattern follows the gesture and offset is written back live
    </div>
  </oas-watermark>
</DemoBlock>

With `movable`, the watermark layer takes over pointer input (grab/grabbing cursor) and writes the drag displacement to the `offset` attribute — a controlled channel, so the position survives re-renders. Note that in this mode the watermark layer intercepts interactions over the area it covers.

## Fullscreen Watermark

<DemoBlock title="fullscreen: a watermark covering the whole viewport">
  <oas-button id="wm-fullscreen-toggle" size="small">Enable fullscreen watermark</oas-button>
  <p style="width: 100%; margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    Click the button to enable a fullscreen watermark: the host becomes fixed and covers the viewport, stays put while the page scrolls, and intercepts no interaction; click again to turn it off.
  </p>
</DemoBlock>

With `fullscreen`, the component itself becomes `position: fixed; inset: 0` covering the viewport (`pointer-events: none`) — no wrapper needed; it defaults to the topmost z-index, adjustable via the `z-index` attribute or the `--oas-watermark-fullscreen-z-index` CSS variable. It composes with `repeat` / `staggered` / `movable` / `grayscale`; without `fullscreen`, container mode behaves exactly as before. Note: slotted content is not laid out or interactive in fullscreen mode.

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // The import must stay inside onMounted: a top-level await import would be evaluated
  // during the vitepress build (SSR, no HTMLElement in Node) and leave the page empty
  const { message } = await import('@oas-ui/ui')
  const tamper = document.querySelector('#wm-tamper')
  const log = document.querySelector('#wm-tamper-log')
  tamper?.addEventListener('oas-remove', (e) => {
    const type = e.detail.type === 'removed' ? 'removed' : 'style rewritten'
    log.textContent = `Watermark ${type} — restored automatically (at ${new Date().toLocaleTimeString()})`
    message.warning(`Watermark ${type}; re-mounted automatically`)
  })
  // Simulate tampering: delete the shadow layer directly → MO detects it, re-mounts, and fires oas-remove
  document.querySelector('#wm-tamper-simulate')?.addEventListener('click', () => {
    const layer = tamper?.shadowRoot?.querySelector('[part="watermark"]')
    if (layer) layer.remove()
  })
  // Comparison: with tamper-proof off, deleting is permanent (reload to restore)
  document.querySelector('#wm-tamper-off')?.addEventListener('click', () => {
    if (!tamper) return
    tamper.setAttribute('tamper-proof', 'false')
    const layer = tamper.shadowRoot?.querySelector('[part="watermark"]')
    if (layer) layer.remove()
    log.textContent = 'tamper-proof="false": the layer is gone for good (reload the page to restore)'
  })
  // Fullscreen watermark toggle (the demo element is appended to body so it never stretches the docs layout)
  const full = document.createElement('oas-watermark')
  full.id = 'wm-fullscreen-demo'
  full.setAttribute('text', '全屏水印 · FULLSCREEN')
  full.setAttribute('repeat', '')
  document.body.appendChild(full)
  const toggle = document.querySelector('#wm-fullscreen-toggle')
  toggle?.addEventListener('click', () => {
    if (full.hasAttribute('fullscreen')) {
      full.removeAttribute('fullscreen')
      toggle.textContent = 'Enable fullscreen watermark'
    } else {
      full.setAttribute('fullscreen', '')
      toggle.textContent = 'Disable fullscreen watermark'
    }
  })
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `color` | Watermark text color: 11 preset names (`--oas-preset-*`) or any CSS color; defaults to the primary text token | `string` | — |
| `font-family` | Font family (default sans-serif) | `string` | `sans-serif` |
| `font-size` | Font size in px (default 16) | `string` | `16` |
| `font-weight` | Font weight (default 400) | `string` | `400` |
| `fullscreen` | Fullscreen watermark: the host becomes fixed inset:0 covering the viewport (pointer-events:none) at the topmost z-index by default (adjustable via the z-index attribute or --oas-watermark-fullscreen-z-index); stays put while scrolling | `boolean` | — |
| `gap` | Tile gap in px or JSON `[x,y]` (single value applies to both) | `string` | — |
| `grayscale` | Grayscale filter for image watermarks (canvas filter: grayscale(1)); falls back to a layer CSS filter without canvas | `boolean` | — |
| `height` | Tile height in px (default 120) | `string` | `120` |
| `image` | Image watermark URL (takes precedence over `text` when present) | `string` | — |
| `movable` | Draggable watermark (drag delta writes back to the `offset` attribute) | `boolean` | — |
| `offset` | Tiling start offset in px or JSON `[x,y]` (default gap/2, visually identical to the old centered mode) | `string` | — |
| `opacity` | Watermark layer transparency (0–1, auto-clamped) | `string` | `0.15` |
| `repeat` | Boolean; when present the unit is tiled, otherwise a single unit is centered | `boolean` | — |
| `rotate` | Rotation in degrees (default -30) | `string` | `-30` |
| `staggered` | Staggered layout (two-layer background, second layer offset by offset + gap/2; tiling mode only) | `boolean` | — |
| `tamper-proof` | Tamper protection (default true): a MutationObserver re-mounts the layer when it is removed/modified and fires `oas-remove`; `"false"` disables it | `string` | `true` |
| `text` | Text watermark content (either `text` or `image`) | `string` | — |
| `width` | Tile width in px (default 240) | `string` | `240` |
| `z-index` | Watermark layer z-index (default 2); in fullscreen mode it is written to the host, overriding the default topmost level | `string` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-remove` | Fired when tamper protection detects the layer being removed/modified, `detail: { type: "removed" \| "modified" }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

The watermark is a decorative layer (`aria-hidden` + `pointer-events: none`): it is excluded from the accessibility tree and does not intercept interaction.
