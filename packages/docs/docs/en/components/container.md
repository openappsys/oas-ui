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
    左对齐，不再居中
  </oas-container>
</DemoBlock>

## Padding

`padding` accepts any token/value and applies to `padding-inline` (logical padding).

<DemoBlock title="padding">
  <oas-container size="md" padding="var(--oas-space-4)" style="background: var(--oas-color-bg-hover)">
    内容两侧留有 16px 内边距
  </oas-container>
</DemoBlock>

## Empty container

An empty container causes no error and takes no placeholder.

<DemoBlock title="Empty container">
  <oas-container size="sm" style="background: var(--oas-color-bg-hover)"></oas-container>
</DemoBlock>

## API

| Property  | Description                                      | Type                                                              | Default |
| --------- | ------------------------------------------------ | ----------------------------------------------------------------- | ------- |
| `size`    | Fixed-width tier, mapped to `--oas-container-*` tokens | `xs` / `sm` / `md` / `lg` / `xl` / `full` (invalid falls back to `lg`) | `lg`    |
| `center`  | Whether to center (`center="false"` disables)    | boolean                                                           | `true`  |
| `padding` | Padding token/value (applies to `padding-inline`)| string (e.g. `var(--oas-space-4)`)                                 | —       |
