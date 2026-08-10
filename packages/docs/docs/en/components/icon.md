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

## On-demand import

```ts
import { checkPath } from '@oas-ui/icons'
```

## API

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `name` | Icon name (kebab-case) | `IconName` | — |
| `size` | Size (px or em) | string | `1em` |
| `color` | Color (CSS value) | string | `currentColor` |
| `label` | Accessible name; sets `role="img"` when provided | string | — |

Icon names: `alert-circle` `arrow-down` `arrow-left` `arrow-right` `arrow-up` `calendar` `check-circle` `check` `chevron-down` `chevron-left` `chevron-right` `chevron-up` `clock` `close-circle` `close` `copy` `download` `edit` `error` `external-link` `eye` `filter` `gear` `heart` `info` `loading` `lock` `mail` `menu` `minus` `more-vertical` `more` `plus` `refresh` `search` `sort` `star-filled` `star` `trash` `upload` `user` `warning`.
