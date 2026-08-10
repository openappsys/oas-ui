# Skeleton

A placeholder skeleton for loading states, supporting an avatar, title, multiple paragraph rows, and a shimmer animation.

## Basic usage

<DemoBlock title="Basic usage">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton active avatar title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## Combinations

<DemoBlock title="Combinations">
  <div style="width: 100%; max-width: 360px">
    <oas-space direction="vertical" size="medium" style="width: 100%">
      <oas-skeleton avatar title rows="2"></oas-skeleton>
      <oas-skeleton rows="2"></oas-skeleton>
    </oas-space>
  </div>
</DemoBlock>

## No animation

<DemoBlock title="No animation">
  <div style="width: 100%; max-width: 360px">
    <oas-skeleton title rows="3"></oas-skeleton>
  </div>
</DemoBlock>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `rows` | Number of paragraph rows | `number` | `3` |
| `title` | Whether to show the title placeholder | `boolean` | `false` |
| `avatar` | Whether to show the avatar placeholder | `boolean` | `false` |
| `active` | Whether to enable the shimmer animation | `boolean` | `false` |
