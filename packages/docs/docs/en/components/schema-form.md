---
description: Declarative forms from a JSON schema plus uiSchema. The schema is compiled once into a render plan and mounted on the form family. Value management and field validation stay in the form kernel; error injection, array-level checks and reactions are owned by this component.
---

# SchemaForm Declarative Form

Describe a form with one `schema` (a JSON Schema subset) plus an optional `uiSchema` (UI annotations).
The component compiles it into a render plan and mounts it on the form family. Value management and
field validation state stay in `oas-form`; **error injection, array-level validation, reaction
evaluation and compilation** are owned by this component.

> **Value contract (read first)**: `getValues()` and `oas-submit.detail.values` follow the form
> kernel's string semantics — leaves are always strings (`number` yields `"42"`, `boolean` yields
> `"true"`, arrays yield JSON strings). Before evaluation and validation the component projects values
> by the schema `type` **read-only** (`"42"` → 42), while **submitted values are unchanged**.
> Type-preserving output is planned for a later version.

> Scope: V1 covers declarative compilation, rendering, validation, `whenSchema`-only reactions and
> array add/remove. Expression reactions, controlled `values` / `setValues`, custom widget registration
> and array tables come later (calling them raises a dev warning, never a silent failure). Use
> `oas-questionnaire` for multi-step flows.

## Basic usage

`schema` / `uiSchema` / `initialValues` all support **property + JSON attribute** dual channels (assign
objects in host frameworks; use `schema='{...}'` in static HTML). Field labels come from `title` and help
text from `description`; `required` on a parent object is compiled into child field requirements.

<DemoBlock title="Basic: input / number / switch / enum / email">
  <oas-schema-form id="sf-basic" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-basic-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-basic-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-basic-validate">validate()</oas-button>
    <oas-button id="sf-basic-values">getValues()</oas-button>
    <oas-button id="sf-basic-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

## Reactions (`whenSchema`)

`reactions` live on the **source field's** uiSchema node. A `whenSchema` condition is a JSON Schema
validation; `scope` defaults to the field itself (`$self`). `fulfill` accepts `visible` / `disabled` /
`required`; `otherwise` falls back to the static annotation. `visible: false` **unmounts** the field (its
value is not submitted and not validated); inside array rows the key slot is kept as an empty string.
Refresh is directed by a dependency graph — only fields whose conditions depend on the changed path
are re-evaluated.

<DemoBlock title="Hide/require fields by country, lock input by plan">
  <oas-schema-form id="sf-react" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-react-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Reactions (`when` expressions)

`when` is the restricted expression track (V1b): the condition is a string, paths use `{path}` placeholders
(dot notation plus `[i]`, array wildcard `[]`) and the source field is `$self`. Frozen syntax: values
(string / number / `true/false/null`), comparisons `== != > >= < <=` (numeric when both sides are numbers,
otherwise string comparison), logic `&& || !` with parentheses, arithmetic `+ - * / %` (numbers only),
membership `in` / `contains()`, and the function library `iif / empty / len / sum / min / max / lower / upper`.
**Assignments / statements / loops / arrow functions / template strings / regex literals / property access
chains are compile-time errors**; syntax errors, unknown fields and unknown functions only disable that single
reaction (dev warning) while the rest keep working. The two tracks differ in expressiveness — they are not
advertised as equivalent; prefer `whenSchema` when you want JSON Schema semantics.

Host functions: after `registerExprFunction(name, fn)` you can call the function by name. Their dependencies
cannot be extracted statically, so reactions using host functions **recompute on every value change**
(everything else still uses the directed dependency graph). Register before setting the schema.

<DemoBlock title="when expression: plan + seats drive invoice visibility and note requirement">
  <oas-schema-form id="sf-expr" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-expr-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Arrays and nesting

Object arrays render through `oas-form-list`: the initial array length drives row creation (one initial
row renders one row), add/remove use the existing row interactions, and row fields are re-indexed.
Array-level validation (`minItems` / `maxItems` / `uniqueItems` / required) runs in this component; errors
are injected into the array path and rendered below the list as `part="array-error"` (`role="alert"`).

<DemoBlock title="Object array: initial rows / add-remove / minItems error">
  <oas-schema-form id="sf-array" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-submit" type="primary">submit()</oas-button>
    <oas-button id="sf-array-reset">reset()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Nested arrays: users → matrix (field names users.N.matrix.M.label)">
  <oas-schema-form id="sf-nested" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-nested-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-nested-values">getValues()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Empty array + minItems: submit shows the array-level error (part=array-error)">
  <oas-schema-form id="sf-array-required" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-required-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-required-submit" type="primary">submit()</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="Nested array-level validation: inner minItems lands on that row's own error slot">
  <oas-schema-form id="sf-array-nested-error" style="width: 100%; max-width: 680px"></oas-schema-form>
  <span id="sf-array-nested-error-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex">
    <oas-button id="sf-array-nested-error-submit" type="primary">submit()</oas-button>
  </oas-space>
</DemoBlock>

## Layout: grid / group / tabs

`layout.span` (1–24) occupies grid columns when the form uses `layout="grid"`. `layout.type="group"`
renders an object node as a group container; `layout.type="tabs"` with `tabs: [{ key, title, fields }]`
renders tabs (`role=tablist`, arrow keys / Home / End switch tabs). Fields omitted from every tab are
merged into the first tab with a dev warning (never silently dropped).

<DemoBlock title="Group + tabs + grid span">
  <oas-schema-form id="sf-layout" layout="grid" style="width: 100%; max-width: 760px"></oas-schema-form>
</DemoBlock>

## Error injection (server validation)

`setErrors([{ path, message, severity? }])` injects server errors. Paths are normalized by
`parseNamePath` (`users[0].name` equals `users.0.name`). **Injected errors take precedence over rule
errors until the field value changes again.** `severity: 'warning'` only informs (`role="status"`,
no `aria-invalid`); an error on the same path takes exclusive precedence.

<DemoBlock title="setErrors / clearErrors / warning">
  <oas-schema-form id="sf-errors" style="width: 100%; max-width: 640px"></oas-schema-form>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-errors-server">Inject server error</oas-button>
    <oas-button id="sf-errors-warning">Inject warning</oas-button>
    <oas-button id="sf-errors-clear">clearErrors()</oas-button>
    <oas-button id="sf-errors-validate">validate()</oas-button>
  </oas-space>
  <span id="sf-errors-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Controlled `values` and dirty state

In controlled mode the `values` property is the source of truth: it acts as the baseline on mount, and each
later change is written as a **leaf-level diff** (only changed paths, no DOM rebuild, no focus loss). Keys
removed by the host clear the corresponding field. Host writes never emit `oas-values-change` (no echo loop);
only user interaction does. Arrays grow via `min` (rows are never removed by this channel — row removal stays
with form-list). `setValues(patch)` is the method form of the same channel; `dirty` compares against the
component-held pristine snapshot (a small explicit piece outside the kernel). When both `values` and
`initialValues` are provided, `values` wins.

<DemoBlock title="Controlled values: host change → diff write; setValues() and dirty">
  <oas-schema-form id="sf-controlled" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-controlled-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
  <oas-space style="margin-top: 12px; display: flex; flex-wrap: wrap">
    <oas-button id="sf-controlled-next" type="primary">Host writes new values</oas-button>
    <oas-button id="sf-controlled-clear">Clear email</oas-button>
    <oas-button id="sf-controlled-dirty">dirty?</oas-button>
  </oas-space>
</DemoBlock>

## Custom widgets

`registerSchemaWidget(name, tag, { reader, writer })` maps a **registration name** to a custom element; the
schema only references the name (`uiSchema.widget: 'score'`). It calls `registerFormControl` internally (the
kernel's only value-collection extension point), so `reader` / `writer` must follow the kernel contract
(read a string, write the controlled value).

> **Hard constraint**: non-custom-element widgets (Vue / React components or native tags) cannot take part in
> value collection — the kernel matches value channels by element tag. A tag without a hyphen is rejected with
> a dev warning. Register before setting the schema.

<DemoBlock title="Custom widget: five-level score control (custom element + reader/writer)">
  <oas-schema-form id="sf-widget" style="width: 100%; max-width: 640px"></oas-schema-form>
  <span id="sf-widget-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Composing with Questionnaire

The component implements the duck-typed contract (`getValues()` / `validate()` and emits
`oas-values-change`), so it can be used directly as questionnaire step content — the whole questionnaire
is driven by JSON while the questionnaire only handles step navigation and cross-step aggregation.

<DemoBlock title="A schema-form inside every questionnaire step">
  <oas-questionnaire id="sf-questionnaire" style="width: 100%; max-width: 560px" steps='[{"key":"base","title":"Basics"},{"key":"extra","title":"Extra"},{"key":"done","title":"Done"}]'>
    <oas-schema-form slot="step-base" style="width: 100%"></oas-schema-form>
    <oas-schema-form slot="step-extra" style="width: 100%"></oas-schema-form>
    <div slot="step-done" style="color: var(--oas-color-text-secondary)">Review the answers, then finish to submit the questionnaire.</div>
  </oas-questionnaire>
  <span id="sf-questionnaire-output" style="display: block; margin-top: 8px; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## Empty states

A missing or invalid `schema`, a non-object root, or zero fields all render a placeholder (never an
empty block). Compile error details are written to the placeholder `title`; empty arrays show a "no items"
hint. Every `uiSchema` path must exist in the data schema (use `users[].name` wildcards for arrays);
typos raise a dev warning.

<DemoBlock title="Empty states (no schema / invalid schema / no fields)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-schema-form id="sf-empty-none" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-bad" schema='{bad json' style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
    <oas-schema-form id="sf-empty-fields" style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: 8px"></oas-schema-form>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
import { onUpgraded } from '../../.vitepress/theme/when-defined'

onMounted(() => {
  onUpgraded(document.getElementById('sf-basic'), () => {
    const basic = document.getElementById('sf-basic')
    basic.schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', title: 'Name', minLength: 2 },
        age: { type: 'integer', title: 'Age' },
        vip: { type: 'boolean', title: 'Member' },
        plan: { type: 'string', title: 'Plan', enum: ['basic', 'pro', 'team'] },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    basic.initialValues = { vip: true, plan: 'basic' }
    const out = document.getElementById('sf-basic-output')
    basic.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    basic.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.values(e.detail.errors).join('; ')}`
    })
    document.getElementById('sf-basic-submit')?.addEventListener('click', () => basic.submit())
    document.getElementById('sf-basic-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await basic.validate()) ? 'passed' : 'failed'}`
    })
    document.getElementById('sf-basic-values')?.addEventListener('click', () => {
      out.textContent = `getValues(): ${JSON.stringify(basic.getValues())}`
    })
    document.getElementById('sf-basic-reset')?.addEventListener('click', () => {
      basic.reset()
      out.textContent = 'reset(): back to initial values'
    })
  })

  onUpgraded(document.getElementById('sf-react'), () => {
    const react = document.getElementById('sf-react')
    react.schema = {
      type: 'object',
      required: ['plan'],
      properties: {
        plan: { type: 'string', title: 'Plan', enum: ['free', 'pro'] },
        country: { type: 'string', title: 'Country', enum: ['CN', 'US'] },
        province: { type: 'string', title: 'Province (required for CN)' },
        state: { type: 'string', title: 'State (visible for US)' },
        note: { type: 'string', title: 'Note (pro only)' },
      },
    }
    react.initialValues = { plan: 'free', country: 'CN' }
    react.uiSchema = {
      country: {
        reactions: [
          { whenSchema: { schema: { const: 'CN' } }, target: 'province', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'CN' } }, target: 'state', fulfill: { visible: false } },
          { whenSchema: { schema: { const: 'US' } }, target: 'state', fulfill: { required: true } },
          { whenSchema: { schema: { const: 'US' } }, target: 'province', fulfill: { visible: false } },
        ],
      },
      plan: {
        reactions: [{ whenSchema: { schema: { const: 'free' } }, target: 'note', fulfill: { disabled: true } }],
      },
    }
    const out = document.getElementById('sf-react-output')
    react.addEventListener('oas-values-change', (e) => {
      out.textContent = `Current values: ${JSON.stringify(e.detail.values)}`
    })
  })

  onUpgraded(document.getElementById('sf-array'), () => {
    const array = document.getElementById('sf-array')
    array.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            required: ['nick'],
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              mail: { type: 'string', title: 'Email', format: 'email' },
            },
          },
        },
      },
    }
    array.initialValues = { users: [{ nick: 'Alice' }] }
    const out = document.getElementById('sf-array-output')
    array.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    array.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('; ')}`
    })
    document.getElementById('sf-array-submit')?.addEventListener('click', () => array.submit())
    document.getElementById('sf-array-reset')?.addEventListener('click', () => {
      array.reset()
      out.textContent = 'reset(): back to initial rows'
    })
  })

  onUpgraded(document.getElementById('sf-nested'), () => {
    const nested = document.getElementById('sf-nested')
    nested.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          items: {
            type: 'object',
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              matrix: {
                type: 'array',
                title: 'Label groups',
                items: { type: 'object', properties: { label: { type: 'string', title: 'Label' } } },
              },
            },
          },
        },
      },
    }
    nested.initialValues = { users: [{ nick: 'Alice', matrix: [{ label: 'A' }, { label: 'B' }] }] }
    const out = document.getElementById('sf-nested-output')
    document.getElementById('sf-nested-values')?.addEventListener('click', () => {
      out.textContent = `getValues(): ${JSON.stringify(nested.getValues())}`
    })
  })

  onUpgraded(document.getElementById('sf-array-required'), () => {
    const arrayRequired = document.getElementById('sf-array-required')
    arrayRequired.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members (at least 1)',
          minItems: 1,
          items: {
            type: 'object',
            required: ['nick'],
            properties: { nick: { type: 'string', title: 'Nickname' } },
          },
        },
      },
    }
    const out = document.getElementById('sf-array-required-output')
    arrayRequired.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors).map(([k, v]) => `${k}=${v}`).join('; ')}`
    })
    arrayRequired.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-array-required-submit')?.addEventListener('click', () => arrayRequired.submit())
  })

  onUpgraded(document.getElementById('sf-layout'), () => {
    const layout = document.getElementById('sf-layout')
    layout.schema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          title: 'Profile',
          properties: {
            nickname: { type: 'string', title: 'Nickname' },
            mail: { type: 'string', title: 'Email', format: 'email' },
            phone: { type: 'string', title: 'Phone' },
          },
        },
        advanced: {
          type: 'object',
          title: 'Advanced',
          properties: {
            region: { type: 'string', title: 'Region', enum: ['cn', 'us', 'eu'] },
            quota: { type: 'integer', title: 'Quota' },
            remark: { type: 'string', title: 'Remark' },
          },
        },
      },
    }
    layout.uiSchema = {
      profile: { layout: { span: 12, type: 'group', title: 'Profile' } },
      advanced: {
        layout: {
          span: 12,
          type: 'tabs',
          title: 'Advanced',
          tabs: [
            { key: 'region', title: 'Region', fields: ['region'] },
            { key: 'quota', title: 'Quota', fields: ['quota', 'remark'] },
          ],
        },
      },
      'profile.nickname': { layout: { span: 12 } },
      'profile.phone': { layout: { span: 12 } },
    }
  })

  onUpgraded(document.getElementById('sf-errors'), () => {
    const errors = document.getElementById('sf-errors')
    errors.schema = {
      type: 'object',
      properties: {
        account: { type: 'string', title: 'Account' },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    errors.initialValues = { account: 'alice', mail: 'alice@example.com' }
    const out = document.getElementById('sf-errors-output')
    document.getElementById('sf-errors-server')?.addEventListener('click', () => {
      errors.setErrors([
        { path: 'account', message: 'Server: account is taken' },
        { path: 'mail', message: 'Server: email is registered' },
      ])
      out.textContent = 'Two server errors injected (they fall back to rule errors after edits)'
    })
    document.getElementById('sf-errors-warning')?.addEventListener('click', () => {
      errors.clearErrors()
      errors.setErrors([{ path: 'mail', message: 'Consider a corporate email', severity: 'warning' }])
      out.textContent = 'Warning injected: informational, validate() still passes'
    })
    document.getElementById('sf-errors-clear')?.addEventListener('click', () => {
      errors.clearErrors()
      out.textContent = 'clearErrors(): injected errors cleared'
    })
    document.getElementById('sf-errors-validate')?.addEventListener('click', async () => {
      out.textContent = `validate() → ${(await errors.validate()) ? 'passed' : 'failed'}`
    })
  })

  onUpgraded(document.getElementById('sf-questionnaire'), () => {
    const q = document.getElementById('sf-questionnaire')
    const [base, extra] = q.querySelectorAll('oas-schema-form')
    base.schema = {
      type: 'object',
      required: ['nickname'],
      properties: {
        nickname: { type: 'string', title: 'Nickname', minLength: 2 },
        mail: { type: 'string', title: 'Email', format: 'email' },
      },
    }
    extra.schema = {
      type: 'object',
      properties: {
        role: { type: 'string', title: 'Role', enum: ['dev', 'ops', 'pm'] },
        tags: { type: 'array', title: 'Skills', items: { enum: ['css', 'js', 'docs'] } },
      },
    }
    const out = document.getElementById('sf-questionnaire-output')
    q.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
  })

  onUpgraded(document.getElementById('sf-empty-fields'), () => {
    const emptyFields = document.getElementById('sf-empty-fields')
    emptyFields.schema = { type: 'object', properties: {} }
  })

  // ---- when expression track ----
  onUpgraded(document.getElementById('sf-expr'), () => {
    const expr = document.getElementById('sf-expr')
    expr.schema = {
      type: 'object',
      properties: {
        plan: { type: 'string', title: 'Plan', enum: ['free', 'pro', 'team'] },
        seats: { type: 'integer', title: 'Seats' },
        invoice: { type: 'string', title: 'Invoice title' },
        note: { type: 'string', title: 'Note (required unless free)' },
      },
    }
    expr.initialValues = { plan: 'free', seats: 3 }
    expr.uiSchema = {
      plan: {
        reactions: [
          {
            when: "$self != 'free' && {seats} >= 5",
            target: 'invoice',
            fulfill: { visible: true },
            otherwise: { visible: false },
          },
          { when: "$self != 'free'", target: 'note', fulfill: { required: true } },
        ],
      },
    }
    const out = document.getElementById('sf-expr-output')
    expr.addEventListener('oas-values-change', (e) => {
      out.textContent = `values: ${JSON.stringify(e.detail.values)} (expression track refreshes via the dependency graph)`
    })
  })

  // ---- nested array-level validation ----
  onUpgraded(document.getElementById('sf-array-nested-error'), () => {
    const nestedError = document.getElementById('sf-array-nested-error')
    nestedError.schema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          title: 'Members',
          items: {
            type: 'object',
            properties: {
              nick: { type: 'string', title: 'Nickname' },
              tags: {
                type: 'array',
                title: 'Tags (at least 1)',
                minItems: 1,
                items: { type: 'object', properties: { label: { type: 'string', title: 'Tag' } } },
              },
            },
          },
        },
      },
    }
    nestedError.initialValues = { users: [{ nick: 'Alice', tags: [] }] }
    const out = document.getElementById('sf-array-nested-error-output')
    nestedError.addEventListener('oas-validate-fail', (e) => {
      out.textContent = `oas-validate-fail: ${Object.entries(e.detail.errors)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`
    })
    nestedError.addEventListener('oas-submit', (e) => {
      out.textContent = `oas-submit: ${JSON.stringify(e.detail.values)}`
    })
    document.getElementById('sf-array-nested-error-submit')?.addEventListener('click', () => nestedError.submit())
  })

  // ---- controlled values ----
  onUpgraded(document.getElementById('sf-controlled'), () => {
    const controlled = document.getElementById('sf-controlled')
    controlled.values = { name: 'Alice', mail: 'alice@example.com', level: 'basic' }
    controlled.schema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        mail: { type: 'string', title: 'Email', format: 'email' },
        level: { type: 'string', title: 'Level', enum: ['basic', 'pro'] },
      },
    }
    const out = document.getElementById('sf-controlled-output')
    const report = (label) => {
      out.textContent = `${label}: values=${JSON.stringify(controlled.values)}; dirty=${controlled.dirty}`
    }
    report('Mounted (host values are the baseline)')
    controlled.addEventListener('oas-values-change', () => report('After user edit (event still fires)'))
    document.getElementById('sf-controlled-next')?.addEventListener('click', () => {
      controlled.values = { name: 'Bob', mail: 'bob@example.com', level: 'pro' }
      report('Host writes new values → diff write')
    })
    document.getElementById('sf-controlled-clear')?.addEventListener('click', () => {
      const next = { ...controlled.values }
      delete next.mail
      controlled.values = next
      report('Removed mail key → field cleared')
    })
    document.getElementById('sf-controlled-dirty')?.addEventListener('click', () => report('dirty check'))
  })

  // ---- custom widget ----
  onUpgraded(document.getElementById('sf-widget'), () => {
    // 组件入口含 HTMLElement 依赖（SSG 阶段没有该全局）→ 页内按需动态 import
    void import('@oas-ui/ui/form/schema-form').then(({ registerSchemaWidget }) => {
    if (!customElements.get('x-score-input')) {
      customElements.define(
        'x-score-input',
        class extends HTMLElement {
          static get observedAttributes() {
            return ['value']
          }
          connectedCallback() {
            this.render()
          }
          attributeChangedCallback() {
            this.render()
          }
          render() {
            if (!this.shadowRoot) this.attachShadow({ mode: 'open' })
            const current = this.getAttribute('value') ?? ''
            const root = this.shadowRoot
            root.textContent = ''
            for (let score = 1; score <= 5; score++) {
              const button = document.createElement('button')
              const active = current === String(score)
              button.type = 'button'
              button.textContent = String(score)
              button.setAttribute('aria-pressed', String(active))
              button.style.cssText = [
                'margin-inline-end: 4px',
                'padding: 2px 8px',
                'border-radius: var(--oas-radius-sm)',
                'border: 1px solid ' + (active ? 'var(--oas-color-primary)' : 'var(--oas-color-border)'),
                'background: ' + (active ? 'var(--oas-color-bg-hover)' : 'transparent'),
                'color: var(--oas-color-text-primary)',
                'font-weight: ' + (active ? '600' : '400'),
                'cursor: pointer',
              ].join(';')
              button.addEventListener('click', () => {
                this.setAttribute('value', String(score))
                this.dispatchEvent(
                  new CustomEvent('oas-change', { bubbles: true, composed: true, detail: { value: String(score) } }),
                )
              })
              root.appendChild(button)
            }
          }
        },
      )
    }
    registerSchemaWidget('score', 'x-score-input', {
      reader: (element) => element.getAttribute('value') ?? '',
      writer: (element, value) => element.setAttribute('value', value),
    })
    const widget = document.getElementById('sf-widget')
    widget.schema = {
      type: 'object',
      properties: {
        score: { type: 'integer', title: 'Satisfaction (1-5)' },
        comment: { type: 'string', title: 'Comment' },
      },
    }
    widget.uiSchema = { score: { widget: 'score' } }
    widget.values = { score: 4 }
    const out = document.getElementById('sf-widget-output')
    widget.addEventListener('oas-values-change', (e) => {
      out.textContent = `values: ${JSON.stringify(e.detail.values)} (custom widget reads through its reader)`
    })
    })
  })
})
</script>

## API

### oas-schema-form

#### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `disabled` | Disables the whole form through the kernel form chain (fields and array add/remove buttons). | — | — |
| `initial-values` | Uncontrolled one-time baseline (nested object). Deep-merged over schema `default` with host values winning; the initial array length drives row creation. | `Record<string, unknown> \| string` | — |
| `label-align` | Forwarded to the inner oas-form label alignment (top / left / right). | — | — |
| `label-width` | Forwarded to the inner oas-form label width. | — | — |
| `layout` | Forwarded to the inner oas-form layout (with `grid`, fields occupy columns by `layout.span`). | — | — |
| `schema` | Data schema (a JSON Schema subset). Dual channel: property (object, preferred) and attribute (JSON string); an attribute changed after the property invalidates the property (drift guard). | `unknown` | — |
| `size` | Forwarded to the inner oas-form size. | — | — |
| `ui-schema` | UI annotation layer (bare keys: `widget` / `layout` / `options` / `reactions` / `keepValueOnHidden`). Dual channel; every path is verified against the data schema at compile time. | `unknown` | — |
| `validate-trigger` | Forwarded to the inner oas-form field validation trigger (input / change / blur). | — | — |
| `values` | Controlled values (V1b): dual channel — property (object) and attribute (JSON string). Applied as the baseline on mount; later changes are written as a leaf-level diff (no DOM rebuild, no focus loss). Host writes never emit `oas-values-change` (no echo loop). Takes precedence over `initialValues` when both are provided. | `Record<string, unknown> \| string` | — |

#### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `submit` | `submit(): void` | Submit: evaluates reactions, runs kernel field validation, then array-level validation and injects its errors, and finally delegates to the kernel (design order: kernel first, array-level second; oas-submit / oas-validate-fail are dispatched by the kernel and bubble out, failure payload = field errors ∪ array-level errors). |
| `validate` | `validate(): Promise<boolean>` | Validate: reactions → kernel field validation → array-level validation (union of errors); returns whether everything passes. |
| `getValues` | `getValues(): Record<string, unknown>` | Current form values using the kernel string semantics (leaves are always strings, arrays are JSON strings). |
| `setValues` | `setValues(patch: Record<string, unknown>): void` | Controlled write channel (V1b): writes field values by nested path through the kernel `oas-form.setValues` and the control writer registry. Only rendered fields are written, no events are emitted and no DOM is rebuilt; unrendered paths are skipped (array row counts stay with form-list). |
| `setErrors` | `setErrors(list: FormError[]): void` | Inject errors (for server validation). Path normalization and precedence are handled by the form kernel. |
| `clearErrors` | `clearErrors(paths?: string[]): void` | Clear injected errors (omit paths to clear all); affected fields fall back to rule errors. |
| `reset` | `reset(): void` | Reset: back to initial values, clear errors, array rows back to their initial length (no events). |
