---
description: "Address book: an address editor (contact, province/city/district cascade, street address, default flag), an address list with single selection and default badge, and a contact-only mode."
---

# Address

Address-book component covering three shapes in one element: an address editor, a selectable address list with a default badge, and a contact-only mode (name + phone, not a separate component).

## Basic usage

`mode` defaults to `edit`. Region data is host-injected through `regions`; the component ships no administrative-division dataset (see “Region data contract” below).

<DemoBlock title="Address editor">
  <oas-address
    regions='[{"name":"Zhejiang","children":[{"name":"Hangzhou","children":[{"name":"Xihu"},{"name":"Binjiang"},{"name":"Yuhang"}]},{"name":"Ningbo","children":[{"name":"Haishu"},{"name":"Yinzhou"}]}]},{"name":"Jiangsu","children":[{"name":"Nanjing","children":[{"name":"Xuanwu"},{"name":"Gulou"}]},{"name":"Suzhou","children":[{"name":"Gusu"},{"name":"Industrial Park"}]}]}]'
    value='{"name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road","isDefault":true}'
  ></oas-address>
</DemoBlock>

## Address list

`mode="list"` renders address cards: native radios (keyboard accessible), a default badge and a selected highlight. When `selected-id` is absent, the `isDefault` item is selected, otherwise the first item.

<DemoBlock title="Select a shipping address">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address
      id="address-list-demo"
      mode="list"
      items='[{"id":"a1","name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road","isDefault":true},{"id":"a2","name":"Li Si","phone":"13900000000","province":"Jiangsu","city":"Nanjing","district":"Xuanwu","detail":"8 Zhongshan Road"}]'
    ></oas-address>
    <oas-tag type="primary" id="address-list-info">Selected: a1</oas-tag>
  </oas-space>
</DemoBlock>

## Row edit and delete

Every address card carries an inline "Edit" button that emits `oas-edit` (detail `{ id, item }`) so the host can switch to the editor and prefill the form; with `show-delete` present a "Delete" button is added, emitting `oas-delete` (detail `{ id, item }`). **The delete confirmation is composed by the host**: wrap the delete entry in an `oas-popconfirm` and mutate `items` after confirmation (the component ships no built-in confirm dialog — deletion is part of the host's business flow, and confirm copy and undo policies differ per product):

<DemoBlock title="Row edit + delete (popconfirm recipe)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address
      id="address-edit-delete-demo"
      mode="list"
      show-delete
      items='[{"id":"a1","name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road","isDefault":true},{"id":"a2","name":"Li Si","phone":"13900000000","province":"Jiangsu","city":"Nanjing","district":"Xuanwu","detail":"8 Zhongshan Road"}]'
    ></oas-address>
    <oas-tag type="primary" id="address-edit-delete-info">Click the row "Edit" / "Delete" buttons to see the events</oas-tag>
  </oas-space>
</DemoBlock>

Host-side confirm recipe (pseudo code):

```html
<!-- oas-delete only reports intent; the confirmation interaction is composed by the host with oas-popconfirm -->
<oas-popconfirm content="Delete this address?">
  <oas-button slot="reference" danger>Delete</oas-button>
</oas-popconfirm>
```

> The inline delete button emits `oas-delete` immediately; whether to confirm first and whether to actually delete are both decided by the host in the event handler (the dialog belongs to the host, and so does the `items` mutation).

## Saving / deleting busy states

`saving` / `deleting` express that the host is submitting / deleting: the save button or the delete buttons are disabled with `aria-busy` + spinner; input channels stay as they are (the host decides whether to lock the form). Both attributes are orthogonal to `disabled` — remove them when the busy state ends:

<DemoBlock title="saving / deleting busy states">
  <oas-address
    saving
    regions='[{"name":"Zhejiang","children":[{"name":"Hangzhou","children":[{"name":"Xihu"}]}]}]'
  ></oas-address>
  <oas-address
    mode="list"
    deleting
    show-delete
    items='[{"id":"a1","name":"Zhang San","phone":"13800000000","detail":"100 Wensan Road","isDefault":true}]'
    style="margin-top: var(--oas-space-2)"
  ></oas-address>
</DemoBlock>

## Custom validation via validator

`validator` is a function property (an attribute cannot carry a function; assign it with `el.validator = fn`): signature `(key, value) => string | null`. Returning an error string marks the field invalid — the error is merged into the `oas-invalid` `fields` array and rendered under the matching field; empty string / `null` / `undefined` means valid. `key` is the field name (`name` / `phone` / `detail` / `province` / `city` / `district`). Built-in checks (required / phone format / region completeness) run first, the custom hook runs after. A throwing hook does not block submission (warns once in dev and is treated as "no error"):

<DemoBlock title="validator blocking a phone number">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address id="address-validator-demo" regions='[{"name":"Zhejiang","children":[{"name":"Hangzhou","children":[{"name":"Xihu"}]}]}]' value='{"name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road"}'></oas-address>
    <oas-tag type="primary" id="address-validator-info">Click save to trigger the custom validation</oas-tag>
  </oas-space>
</DemoBlock>

## Region codes via value-format

`value-format="name"` (default) outputs region names; `value-format="code"` outputs region codes — in the address object carried by `oas-submit` and `oas-change`, `province` / `city` / `district` become the `code` fields from the injected `regions` (nodes without `code` fall back to the name); prefill matches by `code` as well. The data contract stays the host-injected `regions` (`name` required, `code` optional); the component ships no administrative-division dataset:

<DemoBlock title="value-format=code">
  <oas-address
    value-format="code"
    regions='[{"name":"Zhejiang","code":"330000","children":[{"name":"Hangzhou","code":"330100","children":[{"name":"Xihu","code":"330106"}]}]}]'
    value='{"name":"Zhang San","phone":"13800000000","province":"330000","city":"330100","district":"330106","detail":"100 Wensan Road"}'
  ></oas-address>
</DemoBlock>

## Contact-only mode

`mode="contact"` renders only the name and phone fields (order contact, invoice recipient and similar cases). Typing emits `oas-change`; region, street address and the save button are not rendered.

<DemoBlock title="Contact details">
  <oas-address mode="contact" value='{"name":"Wang Wu","phone":"13700000000"}'></oas-address>
</DemoBlock>

## Preselected address

`selected-id` controls the selected item. When the selected item is removed from `items`, the component falls back to the `isDefault` / first item and emits `oas-select` so the host can follow.

<DemoBlock title="Second item preselected">
  <oas-address
    mode="list"
    selected-id="a2"
    items='[{"id":"a1","name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road","isDefault":true},{"id":"a2","name":"Li Si","phone":"13900000000","province":"Jiangsu","city":"Nanjing","district":"Xuanwu","detail":"8 Zhongshan Road"}]'
  ></oas-address>
</DemoBlock>

## Validation

Saving validates: name required, phone required and well-formed, all three region levels required when region data is injected, and street address required. Failure emits `oas-invalid` (`detail { fields }`) and focuses the first invalid field.

<DemoBlock title="Validation feedback">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address id="address-validate-demo"></oas-address>
    <oas-tag type="primary" id="address-validate-info">Waiting for submit</oas-tag>
  </oas-space>
</DemoBlock>

## Region data contract

The component **does not bundle** region data; `regions` is the only contract (JSON array, up to three levels). A full county-level dataset is large and changes often: bundling it would make the on-demand bundle size unpredictable and its data version untraceable. Inject it from your host (backend API, static JSON or an existing address book).

```json
[
  {
    "name": "Zhejiang",
    "children": [
      { "name": "Hangzhou", "children": [{ "name": "Xihu" }, { "name": "Binjiang" }] }
    ]
  }
]
```

- Node fields: `name` (required; display and submitted value), optional `code`, recursive `children` (three levels are used)
- When absent or invalid, region selects stay empty and are skipped in validation; the street address still works
- Changing a parent resets its children; `value` restores selections by name level by level
- The same-named property channel works too: `value` / `items` / `regions` accept objects or arrays directly (serialized and reflected into the JSON attributes; the getters return the parsed form)

## Accessibility

- Every input has a visible associated label; errors are linked via `aria-invalid` / `aria-describedby`
- The address list is a native radio group (`role="radiogroup"` + one native radio per item)
- The contact and region groups expose `role="group"` with accessible names

<DemoBlock title="Disabled">
  <oas-address
    disabled
    regions='[{"name":"Zhejiang","children":[{"name":"Hangzhou","children":[{"name":"Xihu"}]}]}]'
  ></oas-address>
</DemoBlock>

<DemoBlock title="Read-only">
  <oas-address
    readonly
    value='{"name":"Zhang San","phone":"13800000000","province":"Zhejiang","city":"Hangzhou","district":"Xihu","detail":"100 Wensan Road"}'
    regions='[{"name":"Zhejiang","children":[{"name":"Hangzhou","children":[{"name":"Xihu"}]}]}]'
  ></oas-address>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const list = document.getElementById('address-list-demo')
  const listInfo = document.getElementById('address-list-info')
  list?.addEventListener('oas-select', (e) => {
    listInfo.textContent = `Selected: ${e.detail.id}`
  })
  const form = document.getElementById('address-validate-demo')
  const info = document.getElementById('address-validate-info')
  form?.addEventListener('oas-invalid', (e) => {
    info.textContent = `Invalid: ${e.detail.fields.join(' / ')}`
  })
  form?.addEventListener('oas-submit', () => {
    info.textContent = 'Valid, submitted'
  })
  // Row edit / delete (the confirm dialog is composed by the host)
  const ed = document.getElementById('address-edit-delete-demo')
  const edInfo = document.getElementById('address-edit-delete-info')
  ed?.addEventListener('oas-edit', (e) => {
    edInfo.textContent = `oas-edit: ${e.detail.id} (${e.detail.item.name}) — host switches to the editor`
  })
  ed?.addEventListener('oas-delete', (e) => {
    edInfo.textContent = `oas-delete: ${e.detail.id} — confirm via host popconfirm, then mutate items`
  })
  // Custom validation hook (function property)
  const validatorDemo = document.getElementById('address-validator-demo')
  const validatorInfo = document.getElementById('address-validator-info')
  if (validatorDemo) {
    validatorDemo.validator = (key, value) => {
      if (key === 'phone' && value.endsWith('00000000')) return 'This phone number is blocked'
      return null
    }
    validatorDemo.addEventListener('oas-invalid', (e) => {
      validatorInfo.textContent = `Custom validation failed: ${e.detail.fields.join(' / ')}`
    })
    validatorDemo.addEventListener('oas-submit', () => {
      validatorInfo.textContent = 'Custom validation passed'
    })
  }
})
</script>

## API

### oas-address

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `deleting` | Delete busy state: delete buttons disabled with aria-busy + spinner (orthogonal to disabled; set while the host is deleting) | `boolean` | — |
| `disabled` | Disables all inputs and actions (including list selection and add) | `boolean` | — |
| `items` | Address list data (mode=list): JSON array [{ id?, name, phone, province?, city?, district?, detail?, isDefault? }]; the isDefault item is preselected | `AddressEntry[] \| string` | `[]` |
| `mode` | Shape: edit (default, address editor) / list (address list with single selection and default badge) / contact (contact-only mode, name and phone only) | `string` | `edit` |
| `readonly` | Read-only: focusable and copyable, but cannot edit / submit / select | `boolean` | — |
| `regions` | Region data (host-injected contract): JSON array [{ name, code?, children? }], up to three levels; the component ships no administrative-division dataset | `AddressRegion[] \| string` | — |
| `saving` | Save busy state: save button disabled with aria-busy + spinner (orthogonal to disabled; set while the host is submitting) | `boolean` | — |
| `selected-id` | Selected list id (controlled); defaults to the isDefault item, otherwise the first item | `string` | — |
| `show-delete` | Renders a Delete button on each address card; clicking emits oas-delete (the confirm dialog is composed by the host with oas-popconfirm) | `boolean` | — |
| `value` | Controlled address value (JSON object): { id?, name, phone, province?, city?, district?, detail?, isDefault? }; prefills edit mode and only name / phone in contact mode | `AddressEntry \| string` | — |
| `value-format` | Region value tier: name (default, outputs names) / code (outputs region codes, nodes without code fall back to the name; prefill matches by code) | `string` | `name` |

#### Events

| Event | Description |
| --- | --- |
| `oas-add` | Emitted when “Add address” is clicked in list mode; no detail |
| `oas-change` | Emitted on field input or region change; detail { field, value } (value is the current address draft) |
| `oas-delete` | Emitted when the row Delete button is clicked (requires show-delete), detail { id, item } — the confirm dialog is composed by the host |
| `oas-edit` | Emitted when the row Edit button is clicked, detail { id, item } — the host switches to the editor accordingly |
| `oas-invalid` | Emitted when submit validation fails; detail { fields } (field names), marks errors and focuses the first invalid field |
| `oas-select` | Emitted when an address is selected in list mode; detail { id, item } |
| `oas-submit` | Emitted when edit-mode validation passes; detail { value } (full address object) |

#### CSS Variables

| CSS Variable | Default |
| --- | --- |
| `--oas-address-width` | `100%` |
