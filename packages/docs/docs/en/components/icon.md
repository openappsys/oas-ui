# Icon

An original linear icon set that renders inline SVGs by name; tree-shakable.

## Usage

<DemoBlock title="Common icons">
  <oas-icon name="check"></oas-icon>
  <oas-icon name="close"></oas-icon>
  <oas-icon name="search" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="star" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="user"></oas-icon>
  <oas-icon name="heart" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="gear" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## Size & color

<DemoBlock title="Size & color">
  <oas-icon name="check" size="16"></oas-icon>
  <oas-icon name="check" size="24"></oas-icon>
  <oas-icon name="check" size="32"></oas-icon>
  <oas-icon name="check" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

## Accessible name

Setting `label` exposes a readable name to screen readers.

<DemoBlock title="Icons with labels">
  <oas-icon name="info" label="Info" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="warning" label="Warning" color="var(--oas-color-warning)"></oas-icon>
</DemoBlock>

## Rotation & flipping

The `spin` attribute spins the icon infinitely (great for loading states); `rotate` rotates by a fixed angle; `flip` mirrors it (combinable with `rotate`).

<DemoBlock title="spin">
  <oas-icon name="loading" spin size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="gear" spin size="24"></oas-icon>
  <oas-icon name="refresh" spin size="24" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="rotate">
  <oas-icon name="arrow-right" rotate="45" size="24"></oas-icon>
  <oas-icon name="arrow-right" rotate="90" size="24"></oas-icon>
  <oas-icon name="arrow-right" rotate="135" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="arrow-right" rotate="180" size="24" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="flip">
  <oas-icon name="arrow-right" flip="x" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="y" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="both" size="24"></oas-icon>
  <oas-icon name="arrow-right" flip="x" rotate="45" size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## Custom icons

Four channels (pick by scenario):

- **slot**: put an inline `<svg>` inside the tag; it takes priority over `name` — one-off custom usage
- **`src`**: fetch a local or CORS-enabled SVG URL and render it inline (color follows `color` / `currentColor`) — your own SVG assets
- **`registerIcon(name, svg)`**: register once, then use via `name` (same-name overrides built-ins) — **the proper path for app-level custom icon sets**
- **`registerIconLibrary`**: hook up a whole remote icon library (resolver → URL fetched on demand, sprite supported) — external icon libraries

> ⚠️ **Do not mutate `iconRegistry` directly** (the built-in registry object exported by `@oas-ui/icons`): it is an internal data structure with no override/cleanup semantics. The proper path is `registerIcon()` (official API, pure function, SSR-safe).

<DemoBlock title="src SVG">
  <oas-icon src="/demo-icon.svg" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon src="/demo-icon.svg" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon src="/demo-icon.svg" size="32" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="slot inline SVG (takes priority over name)">
  <oas-icon size="24" color="var(--oas-color-primary)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2 L12 22 M2 12 L22 12" />
    </svg>
  </oas-icon>
  <oas-icon size="24" color="var(--oas-color-danger)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 6 L12 18 L22 6" />
    </svg>
  </oas-icon>
</DemoBlock>

## Icon library registration

`registerIcon(name, svg)` registers a custom icon for reuse by `name` (overriding built-in icons with the same name).

<DemoBlock title="registerIcon custom icons">
  <oas-icon name="custom-star" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="custom-heart" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="custom-star" spin size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## Remote icon libraries

`registerIconLibrary(name, { resolver, mutator, spriteSheet })` registers a remote icon library:
`resolver` maps an icon name to an SVG URL, which the component fetches on demand and inlines (color follows `color` / `currentColor`);
`mutator` adjusts the SVG after inlining (e.g. restoring `stroke="currentColor"` for outline icons);
`spriteSheet` renders `<use href="url#name">` instead of inlining the whole SVG.

<DemoBlock title="CDN library (Lucide via jsDelivr, mutator for outline icons)" :script="cdnScript">
  <oas-icon library="lucide" name="heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="lucide" name="star" size="28" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon library="lucide" name="arrow-right" rotate="90" size="28" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

<DemoBlock title="Local sprite sheet (<use> reference)" :script="spriteScript">
  <oas-icon library="demo-sprite" name="sprite-star" size="28" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon library="demo-sprite" name="sprite-heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="demo-sprite" name="sprite-check" size="28" color="var(--oas-color-success)"></oas-icon>
</DemoBlock>

<DemoBlock title="family variants (local demo-set)" :script="familyScript">
  <oas-icon library="demo-set" name="star" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-set" name="star" family="fill" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-set" name="heart" size="28" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon library="demo-set" name="heart" family="fill" size="28" color="var(--oas-color-danger)"></oas-icon>
</DemoBlock>

<DemoBlock title="variant (e.g. stroke weight)" :script="variantScript">
  <oas-icon library="demo-weight" name="demo-icon" size="28" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon library="demo-weight" name="demo-icon" variant="bold" size="28" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## Animation presets

The `animation` attribute provides ready-to-use animations (respecting `prefers-reduced-motion`).

<DemoBlock title="Animation presets">
  <oas-icon name="gear" animation="spin" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="gear" animation="spin-pulse" size="24" color="var(--oas-color-primary)"></oas-icon>
  <oas-icon name="heart" animation="beat" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="heart" animation="beat-fade" size="24" color="var(--oas-color-danger)"></oas-icon>
  <oas-icon name="star" animation="bounce" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="arrow-right" animation="shake" size="24"></oas-icon>
  <oas-icon name="refresh" animation="float" size="24" color="var(--oas-color-success)"></oas-icon>
  <oas-icon name="mail" animation="swing" size="24"></oas-icon>
  <oas-icon name="menu" animation="wag" size="24"></oas-icon>
  <oas-icon name="close" animation="buzz" size="24"></oas-icon>
  <oas-icon name="gear" animation="jello" size="24" color="var(--oas-color-primary)"></oas-icon>
</DemoBlock>

## Duotone

`duotone` colors icon layers separately: `data-layer="primary"` / `data-layer="secondary"` (or the first two shape elements) are tinted with `--oas-icon-primary-color` / `--oas-icon-secondary-color`, with default opacity 1 / 0.4 (overridable on the host). `swap-opacity` swaps the two opacities. Built-in icons are monochrome, so this is mainly for custom two-layer SVGs.

<DemoBlock title="Duotone">
  <oas-icon duotone size="32" style="--oas-icon-primary-color: var(--oas-color-primary); --oas-icon-secondary-color: color-mix(in srgb, var(--oas-color-primary) 35%, var(--oas-color-bg));">
    <svg viewBox="0 0 24 24">
      <path data-layer="secondary" d="M12 1.5 C6.2 1.5 1.5 6.2 1.5 12 C1.5 17.8 6.2 22.5 12 22.5 C17.8 22.5 22.5 17.8 22.5 12 C22.5 6.2 17.8 1.5 12 1.5 Z"/>
      <path data-layer="primary" d="M12 6.5 L13.6 9.8 L17.2 10.4 L14.7 12.9 L15.3 16.4 L12 14.7 L8.7 16.4 L9.3 12.9 L6.8 10.4 L10.4 9.8 Z"/>
    </svg>
  </oas-icon>
  <oas-icon duotone swap-opacity size="32" style="--oas-icon-primary-color: var(--oas-color-primary); --oas-icon-secondary-color: color-mix(in srgb, var(--oas-color-primary) 35%, var(--oas-color-bg));">
    <svg viewBox="0 0 24 24">
      <path data-layer="secondary" d="M12 1.5 C6.2 1.5 1.5 6.2 1.5 12 C1.5 17.8 6.2 22.5 12 22.5 C17.8 22.5 22.5 17.8 22.5 12 C22.5 6.2 17.8 1.5 12 1.5 Z"/>
      <path data-layer="primary" d="M12 6.5 L13.6 9.8 L17.2 10.4 L14.7 12.9 L15.3 16.4 L12 14.7 L8.7 16.4 L9.3 12.9 L6.8 10.4 L10.4 9.8 Z"/>
    </svg>
  </oas-icon>
</DemoBlock>

## Canvas modes

`canvas` controls the icon placeholder box: `fixed` (1.25×1em) / `auto` (natural width × 1em) / `square` (1.25×1.25em) / `roomy` (1.5×1.5em); an explicit `size` wins.

<DemoBlock title="Canvas modes">
  <div style="display:flex; align-items:flex-end; gap: var(--oas-space-5); font-size: 32px;">
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="fixed" color="var(--oas-color-primary)"></oas-icon>
      <span>fixed</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="auto" color="var(--oas-color-primary)"></oas-icon>
      <span>auto</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="square" color="var(--oas-color-primary)"></oas-icon>
      <span>square</span>
    </div>
    <div style="display:flex; flex-direction:column; align-items:center; gap: 4px; font-size: 12px;">
      <oas-icon name="check" canvas="roomy" color="var(--oas-color-primary)"></oas-icon>
      <span>roomy</span>
    </div>
  </div>
</DemoBlock>

## Depth

`depth` controls opacity levels (1=100% … 5=20%), useful for creating hierarchy in icon groups.

<DemoBlock title="Depth">
  <oas-icon name="star" depth="1" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="2" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="3" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="4" size="24" color="var(--oas-color-warning)"></oas-icon>
  <oas-icon name="star" depth="5" size="24" color="var(--oas-color-warning)"></oas-icon>
</DemoBlock>

## On-demand import

```ts
import { checkPath } from '@oas-ui/icons'
import { registerIcon } from '@oas-ui/ui'

registerIcon('my-icon', '<path d="..."/>')
```

## Icon gallery

<DemoBlock title="All icons (click to copy name)">
  <div id="icon-wall" style="width: 100%"></div>
</DemoBlock>

<style>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--oas-space-2);
  width: 100%;
}
.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3) var(--oas-space-1);
  border-radius: var(--oas-radius-md);
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out);
}
.icon-cell:hover {
  background: var(--oas-color-bg-hover);
}
.icon-cell:hover oas-icon {
  color: var(--oas-color-primary);
}
.icon-cell .icon-name {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  user-select: none;
}
</style>

<script setup>
import { onMounted } from 'vue'
// Full example code for the code view (script prop): how registerIconLibrary is written
const cdnScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('lucide', {
  resolver: (name) => \`https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/\${name}.svg\`,
  mutator: (svg) => {
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
  },
})`
const spriteScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-sprite', {
  resolver: () => '/demo-sprite.svg',
  spriteSheet: true,
})`
const familyScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-set', {
  resolver: (name, family = 'outline') => \`/demo-set/\${family}/\${name}.svg\`,
})`
const variantScript = `import { registerIconLibrary } from '@oas-ui/ui'

registerIconLibrary('demo-weight', {
  resolver: (name, family, variant) =>
    variant === 'bold' ? '/demo-icon-bold.svg' : \`/\${name}.svg\`,
})`
onMounted(async () => {
  const [{ iconNames }, ui] = await Promise.all([
    import('@oas-ui/icons'),
    import('@oas-ui/ui'),
  ])
  // registerIcon registers custom icons; re-set name afterwards to trigger a refresh
  ui.registerIcon(
    'custom-star',
    '<path d="M8 1.2 L10.1 5.6 L14.9 6.3 L11.4 9.6 L12.3 14.4 L8 12 L3.7 14.4 L4.6 9.6 L1.1 6.3 L5.9 5.6 Z" fill="currentColor"/>',
  )
  ui.registerIcon(
    'custom-heart',
    '<path d="M8 14.2 C7.6 13.8 4.5 11.1 2.6 8.8 C1.1 7 0.8 5.4 1.6 4.1 C2.5 2.7 4.2 2.5 5.6 3.3 C6.4 3.8 7.3 4.9 8 6 C8.7 4.9 9.6 3.8 10.4 3.3 C11.8 2.5 13.5 2.7 14.4 4.1 C15.2 5.4 14.9 7 13.4 8.8 C11.5 11.1 8.4 13.8 8 14.2 Z" fill="currentColor"/>',
  )
  // registerIconLibrary registers remote icon libraries (resolver resolves SVG URLs on demand)
  ui.registerIconLibrary('lucide', {
    resolver: (name) => `https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/${name}.svg`,
    mutator: (svg) => {
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      svg.setAttribute('stroke-width', '2')
      svg.setAttribute('stroke-linecap', 'round')
      svg.setAttribute('stroke-linejoin', 'round')
    },
  })
  ui.registerIconLibrary('demo-sprite', {
    resolver: () => '/demo-sprite.svg',
    spriteSheet: true,
  })
  ui.registerIconLibrary('demo-set', {
    resolver: (name, family = 'outline') => `/demo-set/${family}/${name}.svg`,
  })
  ui.registerIconLibrary('demo-weight', {
    resolver: (name, family, variant) =>
      variant === 'bold' ? '/demo-icon-bold.svg' : `/${name}.svg`,
  })
  // Re-set name/library after registration to trigger an update
  for (const el of document.querySelectorAll('oas-icon[name="custom-star"], oas-icon[name="custom-heart"]')) {
    const name = el.getAttribute('name')
    if (!name) continue
    el.removeAttribute('name')
    el.setAttribute('name', name)
  }
  for (const el of document.querySelectorAll('oas-icon[library]')) {
    const lib = el.getAttribute('library')
    if (!lib) continue
    el.removeAttribute('library')
    el.setAttribute('library', lib)
  }
  const gallery = document.querySelector('#icon-wall')
  if (!gallery) return
  const grid = document.createElement('div')
  grid.className = 'icon-grid'
  for (const name of iconNames) {
    const cell = document.createElement('div')
    cell.className = 'icon-cell'
    cell.title = `Click to copy ${name}`
    const icon = document.createElement('oas-icon')
    icon.setAttribute('name', name)
    icon.setAttribute('size', '22')
    const label = document.createElement('span')
    label.className = 'icon-name'
    label.textContent = name
    cell.append(icon, label)
    cell.addEventListener('click', async () => {
      await navigator.clipboard.writeText(name)
      ui.message.success(`Copied ${name}`)
    })
    grid.appendChild(cell)
  }
  gallery.appendChild(grid)
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `animation` | Animation presets: `spin` / `spin-pulse` / `spin-reverse` / `spin-snap` / `beat` / `fade` / `beat-fade` / `bounce` / `shake` / `swing` / `wag` / `buzz` / `float` / `jello` (respects prefers-reduced-motion) | `string` | — |
| `canvas` | Canvas mode: `fixed` (default 1.25×1em) / `auto` (natural width × 1em) / `square` (1.25×1.25em) / `roomy` (1.5×1.5em) | `string` | — |
| `color` | Color (CSS value) | `string` | — |
| `depth` | Opacity depth level: `1` (100%) ~ `5` (20%), for layered icon hierarchy | `string` | — |
| `duotone` | Duotone icon: layered coloring (`--oas-icon-primary-color` / `--oas-icon-secondary-color` + opacity), mainly for custom dual-layer SVG | `boolean` | — |
| `family` | Icon family (passed to the library resolver, e.g. outline/filled) | `string` | — |
| `flip` | Flip mirror (`x` / `y` / `both` axes), combinable with `rotate` | `string` | — |
| `label` | Accessible name; sets `role="img"` when provided | `string` | — |
| `library` | Remote icon library name (registered via `registerIconLibrary`), takes precedence over the built-in `name` registry | `string` | — |
| `name` | Icon name (kebab-case) | `IconName` | — |
| `rotate` | Rotate by any angle (`rotate="45"` degrees) | `string` | — |
| `size` | Size (px or em) | `string` | — |
| `spin` | Spin animation: continuous rotation (loading) | `boolean` | — |
| `src` | Custom icon URL: remote/local SVG, fetched and inlined (color follows `color` / `currentColor`) | `string` | — |
| `swap-opacity` | Swap primary / secondary opacity of a duotone icon | `boolean` | — |
| `variant` | Icon variant (passed to the library resolver, e.g. weight) | `string` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

Icon names: `alert-circle` `arrow-down` `arrow-left` `arrow-right` `arrow-up` `calendar` `check-circle` `check` `chevron-down` `chevron-left` `chevron-right` `chevron-up` `clock` `close-circle` `close` `copy` `download` `edit` `error` `external-link` `eye` `filter` `form` `gear` `heart` `info` `language` `loading` `lock` `mail` `menu` `minus` `more-vertical` `more` `plus` `refresh` `search` `sort` `star-filled` `star` `translate` `trash` `upload` `user` `warning`.
