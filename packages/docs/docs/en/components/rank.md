---
description: Ranking question where clicking or pressing Enter adds options to a ranked sequence; selected items show rank badges and can move up / down or be removed; the value is an ordered key array (partial ranking allowed) with min-ranks validation and aria-live rank announcements.
---

# Rank

Select options by rank: click (or press Enter) to add an option to the ranking sequence; selected options show a rank badge. Move up, move down, and remove are visible buttons — no drag required. The value is an ordered key array, so a partial ranking is simply an ordered subset.

## Basic usage

Click an option to add it; click a ranked item (or its remove button) to take it out.

<DemoBlock title="Preference ranking">
  <oas-rank
    id="rk-basic"
    label="Rank by preference"
    options='[{"key":"apple","label":"Apple"},{"key":"banana","label":"Banana"},{"key":"orange","label":"Orange"},{"key":"grape","label":"Grape"}]'
  ></oas-rank>
  <span id="rk-basic-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">Nothing ranked yet</span>
</DemoBlock>

## Reordering and minimum ranks

`min-ranks` sets the minimum number of ranked items; the count is shown live. Clicking "Submit" calls `validate()`: falling short shows an error and dispatches `oas-invalid`, and further selection re-checks silently.

<DemoBlock title="min-ranks=2">
  <oas-rank
    id="rk-min"
    label="Pick at least two priority features"
    options='[{"key":"search","label":"Search"},{"key":"filter","label":"Filter"},{"key":"export","label":"Export"},{"key":"share","label":"Share"}]'
    min-ranks="2"
  ></oas-rank>
  <oas-button id="rk-min-submit" type="primary">Submit</oas-button>
  <span id="rk-min-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Survey scenario (ranking question)

Ranking questions are common in surveys: respondents order options by preference and the ordered array is submitted. This demo prints the result directly.

<DemoBlock title="Rank the factors you value most">
  <oas-rank
    id="rk-survey"
    label="Sort by importance (most important first)"
    options='[{"key":"price","label":"Price"},{"key":"quality","label":"Quality"},{"key":"service","label":"Service"},{"key":"design","label":"Design"}]'
    min-ranks="1"
  ></oas-rank>
  <oas-button id="rk-survey-submit" type="primary">Submit survey</oas-button>
  <span id="rk-survey-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Disabled and readonly

Option-level `disabled` cannot be added; group-level `disabled` blocks everything; `readonly` keeps the normal appearance and ranking but ignores interaction.

<DemoBlock title="disabled / readonly">
  <oas-space direction="vertical" style="width: 100%">
    <oas-rank
      options='[{"key":"a","label":"Available"},{"key":"b","label":"Disabled","disabled":true},{"key":"c","label":"Another"}]'
    ></oas-rank>
    <oas-rank
      options='[{"key":"a","label":"Apple"},{"key":"b","label":"Banana"},{"key":"c","label":"Orange"}]'
      value='["b","a"]'
      readonly
    ></oas-rank>
    <oas-rank
      options='[{"key":"a","label":"Apple"},{"key":"b","label":"Banana"}]'
      value='["a"]'
      disabled
    ></oas-rank>
  </oas-space>
</DemoBlock>

## Inside oas-form (generic form scenario)

A ranking question is not a native form control: `oas-form` does not collect its value, so the host reads `value` (or listens to `oas-change`) and merges it into the submitted data. The example validates the ranking in `oas-submit` before merging.

<DemoBlock title="Ranking inside a form">
  <oas-form id="rk-form" style="width: 100%; max-width: 520px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="Name"></oas-input>
      <oas-rank
        id="rk-form-rank"
        label="Rank by preference"
        options='[{"key":"apple","label":"Apple"},{"key":"banana","label":"Banana"},{"key":"orange","label":"Orange"}]'
        min-ranks="2"
      ></oas-rank>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">Submit form</oas-button>
    </oas-space>
  </oas-form>
  <span id="rk-form-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Keyboard and accessibility

- Options and the move-up / move-down / remove controls are native `button` elements: Tab reachable, activated with Enter / Space; action labels include the option name so same-named buttons stay distinguishable
- Rank changes are announced through `aria-live="polite"` (for example "Apple is ranked #1"), independent of the visual badge
- Rank badges and spacing use logical properties, so RTL mirrors automatically

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const read = (el) => JSON.stringify(el.value)

  const basic = document.getElementById('rk-basic')
  basic?.addEventListener('oas-change', (event) => {
    text('rk-basic-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const min = document.getElementById('rk-min')
  document.getElementById('rk-min-submit')?.addEventListener('click', () => {
    const ok = min.validate()
    if (ok) text('rk-min-out', `Passed: ${read(min)}`)
  })
  min?.addEventListener('oas-invalid', (event) => {
    text('rk-min-out', `oas-invalid: ${event.detail.count} ranked / at least ${event.detail.min}`)
  })

  const survey = document.getElementById('rk-survey')
  document.getElementById('rk-survey-submit')?.addEventListener('click', () => {
    const ok = survey.validate()
    text('rk-survey-out', ok ? `Survey answer: ${read(survey)}` : 'Validation failed: rank at least 1 item')
  })

  const form = document.getElementById('rk-form')
  const formRank = document.getElementById('rk-form-rank')
  form?.addEventListener('oas-submit', (event) => {
    const ok = formRank.validate()
    if (!ok) {
      text('rk-form-out', 'Please complete the ranking first (at least 2 items)')
      return
    }
    text('rk-form-out', `oas-submit: ${JSON.stringify({ ...event.detail.values, ranking: formRank.value })}`)
  })
})
</script>

## API

### oas-rank

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disable all interaction | `boolean` | — |
| `label` | Question text (rendered as a caption and used as the group accessible name) | `string` | — |
| `min-ranks` | Minimum number of ranked items (positive integer); `validate()` fails below it | `string` | — |
| `options` | Sortable options as a JSON array `[{ key, label?, disabled?, description? }]`; string items collapse to `key=label` | `RankOption[] \| string` | — |
| `readonly` | Readonly: keeps the appearance and ranking but ignores interaction | `boolean` | — |
| `value` | Rank-ordered key array (JSON); a partial ranking is simply an ordered subset | `string[] \| string` | — |

#### Property (JS property; see each row for attribute reflection)

| Property | Description | Type | Default |
| --- | --- | --- | --- |
| `options` | Sortable option list: get+set channel (array or JSON string); assignment applies immediately without events | `RankOption[] \| string` | — |
| `value` | Current value (ordered key array): get+set channel (array or JSON string); assignment applies immediately without events | `string[] \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `validate` | `validate(): boolean` | Validate the minimum rank count and sync the visible error; returns whether it passed (dispatches `oas-invalid` on failure) |
| `clear` | `clear(): void` | Clear the ranking (dispatches `oas-change`) |

#### Events

| Event | Description |
| --- | --- |
| `oas-change` | Dispatched on add / remove / move up / move down / clear, `detail: { value, key, rank, action }` |
| `oas-invalid` | Dispatched when `validate()` is below `min-ranks`, `detail: { reason, min, count, value }` |

#### CSS Variables

| CSS Variable | Description | Default |
| --- | --- | --- |
| `--oas-rank-badge-size` | Rank badge diameter (default `--oas-control-height-sm`) | `var(--oas-control-height-sm)` |
