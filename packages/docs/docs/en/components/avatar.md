# Avatar

Displays a user or object avatar, supporting both text-placeholder and image forms.

## Basic Usage

<DemoBlock title="Text avatars">
  <oas-avatar>张</oas-avatar>
  <oas-avatar>李</oas-avatar>
  <oas-avatar>王</oas-avatar>
  <oas-avatar>赵</oas-avatar>
</DemoBlock>

A text avatar renders the first character of its content; with no content at all, it shows a `?` placeholder.

## Sizes

<DemoBlock title="Size variants">
  <oas-avatar size="24">张</oas-avatar>
  <oas-avatar size="32">李</oas-avatar>
  <oas-avatar size="48">王</oas-avatar>
  <oas-avatar size="64">赵</oas-avatar>
  <oas-avatar size="80">钱</oas-avatar>
</DemoBlock>

## Image Avatars

<DemoBlock title="Image avatars">
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-1/160" size="32" alt="头像一"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-2/160" size="48" alt="头像二"></oas-avatar>
  <oas-avatar src="https://picsum.photos/seed/isui-avatar-3/160" size="64" alt="头像三"></oas-avatar>
</DemoBlock>

## Avatar Groups

<DemoBlock title="Avatar group">
  <oas-avatar-group>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g1/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g2/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

Multiple `oas-avatar` elements wrapped in `oas-avatar-group` are laid out left-to-right with overlapping.

<DemoBlock title="Max display count">
  <oas-avatar-group max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g3/160" size="40" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-g4/160" size="40" alt="成员二"></oas-avatar>
    <oas-avatar size="40">张</oas-avatar>
    <oas-avatar size="40">李</oas-avatar>
    <oas-avatar size="40">王</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

When `max` is set, the overflow is hidden and a `+N` count badge is shown at the end.

## Unified Size

`size` sets the size of all avatars in the group (px) so it does not need to be set per avatar; combined with `max`, the `+N` count badge adapts its size accordingly.

<DemoBlock title="Unified size size">
  <oas-avatar-group size="48">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga1/160" alt="成员一"></oas-avatar>
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga2/160" alt="成员二"></oas-avatar>
    <oas-avatar>张</oas-avatar>
    <oas-avatar>李</oas-avatar>
  </oas-avatar-group>
  <oas-avatar-group size="24" max="3">
    <oas-avatar src="https://picsum.photos/seed/isui-avatar-ga3/160" alt="成员一"></oas-avatar>
    <oas-avatar>张</oas-avatar>
    <oas-avatar>李</oas-avatar>
    <oas-avatar>王</oas-avatar>
    <oas-avatar>赵</oas-avatar>
  </oas-avatar-group>
</DemoBlock>

## Empty Fallback

<DemoBlock title="Empty fallback">
  <oas-avatar size="48"></oas-avatar>
  <oas-avatar size="48">多</oas-avatar>
</DemoBlock>

## API

| Attribute | Description                          | Type          | Default |
| --------- | ------------------------------------ | ------------- | ------- |
| `src`     | Image URL; renders an image avatar when present | string        | —       |
| `size`    | Avatar size (px)                     | string / number | `32`    |
| `alt`     | Alternative text for the image       | string        | `头像`  |

> Note: `alt` is read on first render and is not in the observed attribute list; dynamic changes require a manual re-render.

### oas-avatar-group

| Attribute | Description                                        | Type          | Default        |
| --------- | -------------------------------------------------- | ------------- | -------------- |
| `max`     | Max number of avatars shown; overflow shows a `+N` count badge | number        | —              |
| `size`    | Unified avatar size (px); the count badge adapts   | string / number | follows each avatar |
