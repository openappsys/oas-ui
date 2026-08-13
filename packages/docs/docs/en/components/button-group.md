# ButtonGroup

Button group: combines multiple `oas-button` elements into a value-selection group; adjacent button corners merge and hover only highlights the current item.

## Basic usage

<DemoBlock title="Basic button group">
  <oas-button-group>
    <oas-button value="1">January</oas-button>
    <oas-button value="2">February</oas-button>
    <oas-button value="3">March</oas-button>
  </oas-button-group>
</DemoBlock>

## Type & size passthrough

`type` / `size` are passed through uniformly to all child buttons in the group. `size` supports five tiers: `xs` / `small` / `medium` (default) / `large` / `xl`.

<DemoBlock title="Type & size passthrough">
  <oas-button-group type="primary" size="large">
    <oas-button value="a">Left</oas-button>
    <oas-button value="b">Middle</oas-button>
    <oas-button value="c">Right</oas-button>
  </oas-button-group>
  <oas-button-group size="xs" style="margin-top: 8px">
    <oas-button value="a">XS</oas-button>
    <oas-button value="b">XS</oas-button>
    <oas-button value="c">XS</oas-button>
  </oas-button-group>
  <oas-button-group size="xl" style="margin-top: 8px">
    <oas-button value="a">XL</oas-button>
    <oas-button value="b">XL</oas-button>
    <oas-button value="c">XL</oas-button>
  </oas-button-group>
</DemoBlock>

## Single select

Declare the current selection with `value`; clicking dispatches `oas-change` with `detail: { value }`.

<DemoBlock title="Single-select group">
  <oas-button-group value="b" onoas-change="message.info('Selected: ' + event.detail.value)">
    <oas-button value="a">Option A</oas-button>
    <oas-button value="b">Option B</oas-button>
    <oas-button value="c">Option C</oas-button>
  </oas-button-group>
</DemoBlock>

## Multiple select

Add `multiple` to enable multi-select; `value` uses comma-separated selected values. Clicking dispatches `oas-change` with `detail: { value: [] }`.

<DemoBlock title="Multi-select group">
  <oas-button-group multiple value="a,c">
    <oas-button value="a">Tag A</oas-button>
    <oas-button value="b">Tag B</oas-button>
    <oas-button value="c">Tag C</oas-button>
  </oas-button-group>
</DemoBlock>

## Accessible name

`aria-label` gives the button group container an accessible name, letting screen readers announce it as a single focusable group; when unset, the built-in i18n label "button group" is used. When multiple groups exist on a page, use names to distinguish them.

<DemoBlock title="aria-label accessible name">
  <oas-button-group aria-label="View switch" value="list">
    <oas-button value="list">List view</oas-button>
    <oas-button value="grid">Grid view</oas-button>
  </oas-button-group>
  <oas-button-group aria-label="Export results" value="csv">
    <oas-button value="csv">Export CSV</oas-button>
    <oas-button value="pdf">Export PDF</oas-button>
  </oas-button-group>
</DemoBlock>

## Vertical

<DemoBlock title="Vertical button group">
  <oas-button-group vertical>
    <oas-button value="up">Top</oas-button>
    <oas-button value="mid">Middle</oas-button>
    <oas-button value="down">Bottom</oas-button>
  </oas-button-group>
</DemoBlock>

## Disabled & mixed

`disabled` disables the whole group; buttons without a `value` attribute act as regular buttons and don't participate in selection.

<DemoBlock title="Disabled & mixed">
  <oas-button-group disabled>
    <oas-button value="1">Disabled</oas-button>
    <oas-button value="2">Disabled</oas-button>
  </oas-button-group>
  <oas-button-group>
    <oas-button value="save">Save</oas-button>
    <oas-button value="delete" type="danger">Delete</oas-button>
    <oas-button>More actions</oas-button>
  </oas-button-group>
</DemoBlock>

## Pill

The `pill` attribute turns the whole group into a pill: the first/last buttons use `--oas-radius-full` (999px) corners — left rounded on the first / right rounded on the last in a horizontal group, top on the first / bottom on the last in a vertical one. Middle buttons stay square.

<DemoBlock title="Pill">
  <oas-button-group pill value="a" onoas-change="message.info('Selected: ' + event.detail.value)">
    <oas-button value="a">Option A</oas-button>
    <oas-button value="b">Option B</oas-button>
    <oas-button value="c">Option C</oas-button>
  </oas-button-group>
  <oas-button-group pill type="primary" style="margin-top: 8px">
    <oas-button value="prev">Previous</oas-button>
    <oas-button value="next">Next</oas-button>
  </oas-button-group>
  <oas-button-group pill vertical style="margin-top: 8px">
    <oas-button value="up">Top</oas-button>
    <oas-button value="mid">Middle</oas-button>
    <oas-button value="down">Bottom</oas-button>
  </oas-button-group>
</DemoBlock>

## Separator

Put an `<oas-button-group-separator>` inside the group to render a divider line: a 1px vertical line in a horizontal group, a 1px horizontal line in a vertical one (direction follows the group orientation automatically). Separators sit flush between items and don't participate in corner merging — place them between buttons/nested groups.

<DemoBlock title="Separator">
  <oas-button-group>
    <oas-button value="copy">Copy</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="cut">Cut</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="paste">Paste</oas-button>
  </oas-button-group>
  <oas-button-group vertical style="margin-top: 8px">
    <oas-button value="top">Top</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="middle">Middle</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="bottom">Bottom</oas-button>
  </oas-button-group>
</DemoBlock>

## Nested groups

An `oas-button-group` can contain another `oas-button-group` as a single whole item, participating in corner merging and flush layout. The outer group passes its start/end corner radii to the nested group via `--oas-button-group-start-radius` / `--oas-button-group-end-radius`. The nested group manages its own buttons (outer `type` / `size` are not passed through); outer `disabled` disables the nested group as a whole.

<DemoBlock title="Nested groups">
  <oas-button-group>
    <oas-button-group>
      <oas-button value="undo">Undo</oas-button>
      <oas-button value="redo">Redo</oas-button>
    </oas-button-group>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button value="save">Save</oas-button>
    <oas-button-group-separator></oas-button-group-separator>
    <oas-button-group>
      <oas-button value="prev">Prev</oas-button>
      <oas-button value="next">Next</oas-button>
    </oas-button-group>
  </oas-button-group>
</DemoBlock>

## Split Button

Compose a split button with a button-group plus `oas-dropdown split`: the main button dispatches `oas-action` (primary action), the arrow button opens the dropdown menu (menu selection goes through `oas-select`).

<DemoBlock title="Split Button">
  <oas-space size="small">
    <oas-dropdown split onoas-action="message.info('Main action: save')" onoas-select="message.info('Selected: ' + event.detail.value)" items='[{"label":"Save as","value":"save-as"},{"label":"Export PDF","value":"pdf"},{"label":"Delete","value":"delete","disabled":true}]'>
      <oas-button-group>
        <oas-button>Save</oas-button>
      </oas-button-group>
    </oas-dropdown>
    <oas-dropdown split onoas-action="message.info('Main action: publish')" onoas-select="message.info('Selected: ' + event.detail.value)" items='[{"label":"Schedule","value":"scheduled"},{"label":"Save draft","value":"draft"}]'>
      <oas-button-group>
        <oas-button type="primary">Publish</oas-button>
      </oas-button-group>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## Composition

Compose button groups with existing components such as overlays and inputs.

<DemoBlock title="Buttons + overlays">
  <oas-space size="small">
    <oas-button-group>
      <oas-button value="edit">Edit</oas-button>
      <oas-button value="copy">Copy</oas-button>
    </oas-button-group>
    <oas-dropdown items='[{"label":"Paste as plain text","value":"paste-text"},{"label":"Paste as quote","value":"paste-quote"}]'>
      <oas-button>Paste</oas-button>
    </oas-dropdown>
    <oas-popover title="Format notes" content="Markdown shortcuts are supported; press Enter to send.">
      <oas-button>?</oas-button>
    </oas-popover>
  </oas-space>
</DemoBlock>

<DemoBlock title="Buttons + input">
  <oas-space size="small">
    <oas-input placeholder="Search keywords" style="width: 220px"></oas-input>
    <oas-button-group onoas-change="message.info('Selected: ' + event.detail.value)">
      <oas-button value="search">Search</oas-button>
      <oas-button value="reset">Reset</oas-button>
    </oas-button-group>
  </oas-space>
</DemoBlock>

<DemoBlock title="Toolbar (multiple groups)">
  <oas-flex gap="8px" align="center" style="padding: 8px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); background: var(--oas-color-bg)">
    <oas-button-group aria-label="Text format">
      <oas-button value="bold">B</oas-button>
      <oas-button value="italic">I</oas-button>
      <oas-button value="underline">U</oas-button>
    </oas-button-group>
    <oas-button-group aria-label="Alignment">
      <oas-button value="left">Left</oas-button>
      <oas-button value="center">Center</oas-button>
      <oas-button value="right">Right</oas-button>
    </oas-button-group>
    <oas-button-group aria-label="Export format">
      <oas-button value="csv">CSV</oas-button>
      <oas-button value="pdf">PDF</oas-button>
    </oas-button-group>
  </oas-flex>
</DemoBlock>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `aria-label` | Group container accessible name (defaults to the built-in i18n label) | — | — |
| `disabled` | Disable the whole group | `boolean` | — |
| `multiple` | Multi-select mode | `boolean` | — |
| `pill` | Pill shape: large rounding on the group outer edges (`--oas-radius-full` / `999px`) | — | — |
| `size` | Size passed to child buttons | `string` | — |
| `type` | Type passed to child buttons | `string` | — |
| `value` | Selected value (single value in single-select, comma-separated in multi-select) | `string` | — |
| `vertical` | Stack vertically, merging corners top/bottom | `boolean` | — |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | Selection changed. Single-select `detail: { value }`; multi-select `detail: { value: [] }` |

### Slots

| Name | Description |
| --- | --- |
| default | — |

> Note: child buttons declare their selectable value via the `value` attribute; children without `value` are regular buttons and don't participate in selection or dispatch `oas-change`. The selected state is expressed through the child button's `aria-pressed`; use `oas-button[aria-pressed='true']` to customize the selected style.
