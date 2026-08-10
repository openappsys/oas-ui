# Spin

A loading indicator that can be used standalone or wrap content with an overlaid mask.

## Basic usage

<DemoBlock title="Sizes">
  <oas-space size="large">
    <oas-spin size="sm"></oas-spin>
    <oas-spin></oas-spin>
    <oas-spin size="lg"></oas-spin>
  </oas-space>
</DemoBlock>

## Wrapping content

<DemoBlock title="Wrapping content">
  <oas-spin spinning>
    <div style="width: 280px; height: 96px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)">
       Content area while loading
    </div>
  </oas-spin>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `size` | Indicator size | `string` | `md` |
| `spinning` | Whether loading; when set, wraps content with an overlaid mask | `boolean` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |

The indicator uses `role="status"`.
