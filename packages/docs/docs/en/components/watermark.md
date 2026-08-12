# Watermark

A container-level watermark layer that sits on top of the content without intercepting any interaction, suitable for preventing sensitive information from leaking.

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

## API

### Attributes

| Attribute | Description                                                                  | Type      | Default |
| --------- | ---------------------------------------------------------------------------- | --------- | ------- |
| `image`   | Image watermark URL (takes precedence over `text` when present)              | `string`  | —       |
| `opacity` | Watermark layer transparency (0–1, auto-clamped)                             | `string`  | `0.15`  |
| `repeat`  | Boolean; when present the unit is tiled, otherwise a single unit is centered | `boolean` | —       |
| `text`    | Text watermark content (either `text` or `image`)                            | `string`  | —       |

### Slots

| Name    | Description |
| ------- | ----------- |
| default | —           |

The watermark is a decorative layer (`aria-hidden` + `pointer-events: none`): it is excluded from the accessibility tree and does not intercept interaction.
