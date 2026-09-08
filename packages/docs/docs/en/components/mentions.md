# Mentions

A mention input component that pops a suggestion overlay when typing `@` (or `#` etc.), suited for @member / @task / comment-posting scenarios.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-mentions style="width: 320px" placeholder="Type @ to mention a member" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"},{"label":"Charlie","value":"charlie"},{"label":"David","value":"david"}]'></oas-mentions>
</DemoBlock>

Typing `@` pops the suggestion list: `↑`/`↓` to select, `Enter` to insert (the selected item is merged into the text), `Esc` or clicking outside closes it.

## Keyword Filtering

<DemoBlock title="Keyword filtering">
  <oas-mentions style="width: 320px" placeholder="Type e.g. @alice or @ali to filter" options='[{"label":"Alice","value":"alice"},{"label":"Alex","value":"alex"},{"label":"Bob","value":"bob"},{"label":"Charlie","value":"charlie"}]'></oas-mentions>
</DemoBlock>

Continue typing after `@` to filter: **by default it fuzzy-matches `label` OR `value` (case-insensitive)** (`@alice` hits "Alice"); when nothing matches, the built-in empty state "No matching mentions" shows. For a custom matcher, set the `el.filterOption(query, option)` function (JS property channel).

## Trigger Right After Chinese Text

<DemoBlock title="Trigger without a leading space">
  <oas-mentions style="width: 320px" placeholder="Type Chinese then @ directly (no space needed)" options='[{"label":"Alice","value":"alice"},{"label":"Alex","value":"alex"},{"label":"Bob","value":"bob"}]'></oas-mentions>
</DemoBlock>

**No whitespace is required before `@`**: the scan walks back from the caret until a space/newline, so `大家好@张` (Chinese text glued to `@`) triggers. A keyword segment containing a space or newline does not trigger. While an IME is composing (pinyin candidate not yet confirmed), `Enter`/`↑`/`↓` will not select suggestions or insert a newline; the panel re-scans after the composition commits.

## Multiple Prefixes (@ for members / # for tasks)

<DemoBlock title="prefix array (@ / #)">
  <oas-mentions prefix='["@","#"]' style="width: 320px" placeholder="@ members, # tasks — both trigger" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"},{"label":"Requirement review","value":"req-review"},{"label":"Implementation","value":"impl"},{"label":"QA","value":"qa"}]'></oas-mentions>
</DemoBlock>

`prefix` defaults to `@`; it accepts a single string or a JSON array like `["@","#"]`. The `oas-search`/`oas-select` details carry the matched `prefix`, letting the host route each trigger to its own data source.

## Async Suggestions (oas-search + loading)

<DemoBlock title="Remote search (simulated)">
  <oas-mentions id="mention-async" prefix='["@","#"]' style="width: 320px" placeholder="Type @ to find people / # to find tasks" options='[]'></oas-mentions>
  <span id="mention-async-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

When a prefix is hit or the keyword changes, `oas-search` fires immediately (detail `{ query, prefix }`, no built-in debounce — debounce in the host). While the host is fetching, set `loading` and the panel shows "Loading…"; after `options` is filled in the list appears. Moving the caret within the same keyword does not re-fire; re-triggering or a keyword change does.

## Custom Option Rendering (rich labels / avatars)

<DemoBlock title="Rich options (oas-option-render)">
  <oas-mentions id="mention-render" style="width: 320px" placeholder="Type @ to try (avatar + name + dept)" options='[{"label":"Alex Chen","value":"alex","dept":"Frontend"},{"label":"Fang Wang","value":"fang","dept":"Design"},{"label":"Na Li","value":"na","dept":"Backend"}]'></oas-mentions>
</DemoBlock>

After each option row is rendered, `oas-option-render` fires with detail `{ index, option, element }` — `element` is the label container the host can rewrite (avatar / two-line rich content), and `option` carries every extra field from the options JSON. Alternatively, put a `<template slot="option">` skeleton inside the component; the `[data-option-label]` node is bound to the option text automatically.

## Disabled Options

<DemoBlock title="Disabled options (visible but not selectable)">
  <oas-mentions style="width: 320px" placeholder="Type @ to see the departed member greyed out" options='[{"label":"Alice","value":"alice"},{"label":"Bob (left)","value":"bob","disabled":true},{"label":"Charlie","value":"charlie"}]'></oas-mentions>
</DemoBlock>

Options with `disabled: true` stay visible but are not selectable: `↑`/`↓`, Home/End keyboard navigation skips them, clicks are ignored, and `aria-disabled` is synced. When every option is disabled, `Enter` just closes the panel without inserting anything.

## Clearable

<DemoBlock title="Clearable">
  <oas-mentions id="mention-clear" clearable value="Today @Alice finished QA" style="width: 320px" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"}]'></oas-mentions>
</DemoBlock>

When the text is non-empty and the field is neither disabled nor readonly, a clear button shows in the top-right corner; clicking it clears the text and fires `oas-clear` (detail carries the previous value) plus an empty `oas-change`.

## Auto-grow (autosize)

<DemoBlock title="Comment box (autosize + max-rows)">
  <oas-mentions autosize min-rows="2" max-rows="6" style="width: 320px" placeholder="A multiline comment grows; scrolls past 6 rows" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"}]'></oas-mentions>
</DemoBlock>

With `autosize`, the height adapts between `min-rows` (default 1) and `max-rows` (default 6; an explicit `"0"` means unlimited) and scrolls past the cap. `min-rows="2"` is typical for comment boxes to leave a comfortable first-line height.

## Size / Variant / Status / Readonly

<DemoBlock title="Size">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions size="small" placeholder="small" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions placeholder="medium (default)" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions size="large" placeholder="large" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`size` supports `small / medium / large` (follows the `size` injected by a nearby `oas-config-provider`).

<DemoBlock title="Variant">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions variant="filled" placeholder="filled" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions variant="borderless" placeholder="borderless" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

<DemoBlock title="Status">
  <oas-space size="small">
    <oas-mentions status="success" value="Today @Alice passed QA" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions status="warning" value="Heads-up: only 1 person mentioned" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions status="error" value="@Bob is not in this project" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`status` supports `success / warning / error`: `error` also sets `aria-invalid` on the combobox, and it can be driven by `oas-form-item` / `oas-form` validation (a host-level `aria-invalid` is mirrored onto the input automatically).

<DemoBlock title="Readonly / Disabled">
  <oas-space size="small" direction="vertical" style="display: inline-flex">
    <oas-mentions readonly value="Today @Alice finished QA (readonly)" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
    <oas-mentions disabled value="Disabled mention input" style="width: 320px" options='[{"label":"Alice","value":"alice"}]'></oas-mentions>
  </oas-space>
</DemoBlock>

`readonly` is focusable and copyable but not editable and never opens the panel; `disabled` is fully greyed out.

## Panel Slots (header / footer / empty)

<DemoBlock title="Header / footer / empty slots">
  <oas-mentions id="mention-slots" style="width: 320px" placeholder="Type @zzz to see the empty slot" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"}]'>
    <span slot="header">Hint: type @ to mention a member</span>
    <span slot="footer">2 members · right-click @ for more</span>
    <span slot="empty">Try another keyword, or type @ to list all</span>
  </oas-mentions>
</DemoBlock>

The `header` / `footer` slots render panel chrome (hint bar / summary), and the `empty` slot replaces the default "No matching mentions" text. The `split` attribute (default: space) controls the delimiter used both for scanning boundaries and for the space inserted after a mention — switch it when you need a different separator such as a comma.

## Deleting a Mention

A mention is written into the text as plain text, so `Backspace` deletes it character by character (a long member name containing spaces needs several presses — undo also helps). While the panel is open, `Home`/`End` jump to the first/last suggestion and `↑`/`↓` cycle (skipping disabled items).

## Events

<DemoBlock title="Event feedback">
  <oas-mentions id="mention-event" clearable style="width: 320px" placeholder="Type @ and select to watch events" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"},{"label":"Charlie","value":"charlie"}]'></oas-mentions>
  <span id="mention-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 260px"></span>
</DemoBlock>

`oas-select` detail is `{ value, label, option, prefix }` — `option` is the full original option object (including extra fields), so the host does not need to look up the id afterwards.

## Accessible Name (label)

<DemoBlock title="label (accessible name)">
  <oas-mentions id="mention-label" label="Meeting attendees" style="width: 320px" placeholder="Type @ to mention a member" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"}]'></oas-mentions>
  <span id="mention-label-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

`label` becomes the accessible name (`aria-label`) of the combobox input: screen readers announce it once set; otherwise it falls back to `placeholder` → built-in text "Mentions input".

## Controlled Value

<DemoBlock title="value (controlled)">
  <oas-mentions value="Today @Alice finished QA" style="width: 320px" options='[{"label":"Alice","value":"alice"},{"label":"Bob","value":"bob"}]'></oas-mentions>
</DemoBlock>

The `value` attribute is the controlled channel; external changes sync to the textarea immediately. While the user is typing, unrelated attribute changes (`options`/`loading`) never overwrite the in-progress draft.

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  // Event demo: listen to all oas-* events and print the latest one
  const el = document.getElementById('mention-event')
  const out = document.getElementById('mention-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  if (el) {
    for (const name of ['input', 'change', 'select', 'clear', 'search', 'focus', 'blur']) {
      el.addEventListener(`oas-${name}`, (e) => set(`oas-${name}`, e))
    }
  }

  // Async demo: listen to oas-search and route by prefix to simulate a remote request
  const asyncEl = document.getElementById('mention-async')
  const asyncOut = document.getElementById('mention-async-output')
  const MEMBERS = [
    { label: 'Alice', value: 'alice' },
    { label: 'Alex', value: 'alex' },
    { label: 'Bob', value: 'bob' },
    { label: 'Charlie', value: 'charlie' },
  ]
  const TAGS = [
    { label: 'Requirement review', value: 'req-review' },
    { label: 'Implementation', value: 'impl' },
    { label: 'QA', value: 'qa' },
  ]
  let timer = 0
  asyncEl?.addEventListener('oas-search', (e) => {
    const { query, prefix } = e.detail
    const pool = prefix === '#' ? TAGS : MEMBERS
    const matched = pool.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.includes(query.toLowerCase()))
    window.clearTimeout(timer)
    asyncEl.setAttribute('loading', '')
    asyncOut.textContent = `${prefix} "${query}" loading…`
    timer = window.setTimeout(() => {
      asyncEl.removeAttribute('loading')
      asyncEl.setAttribute('options', JSON.stringify(matched))
      asyncOut.textContent = `${prefix} "${query}": ${matched.length} result(s)`
    }, 400)
  })

  // Rich-option demo: rewrite element via oas-option-render (avatar + name + dept)
  const renderEl = document.getElementById('mention-render')
  renderEl?.addEventListener('oas-option-render', (e) => {
    const { option, element } = e.detail
    if (!element) return
    element.textContent = ''
    const inner = document.createElement('span')
    inner.style.display = 'inline-flex'
    inner.style.alignItems = 'center'
    inner.style.gap = 'var(--oas-space-2)'
    const avatar = document.createElement('span')
    avatar.textContent = String(option.label).charAt(0)
    avatar.style.width = '20px'
    avatar.style.height = '20px'
    avatar.style.borderRadius = '50%'
    avatar.style.background = 'var(--oas-color-bg-hover)'
    avatar.style.display = 'inline-flex'
    avatar.style.alignItems = 'center'
    avatar.style.justifyContent = 'center'
    avatar.style.fontSize = 'var(--oas-font-size-xs)'
    avatar.style.flexShrink = '0'
    const main = document.createElement('span')
    main.style.display = 'inline-block'
    main.style.lineHeight = '1.3'
    const name = document.createElement('div')
    name.textContent = option.label
    const dept = document.createElement('div')
    dept.textContent = option.dept ?? ''
    dept.style.fontSize = 'var(--oas-font-size-xs)'
    dept.style.color = 'var(--oas-color-text-secondary)'
    main.append(name, dept)
    inner.append(avatar, main)
    element.appendChild(inner)
  })

  // label (accessible name) demo: read the inner textarea's aria-label once upgraded
  const mLabel = document.getElementById('mention-label')
  const mLabelOut = document.getElementById('mention-label-output')
  const readMLabel = () => {
    const a = mLabel?.shadowRoot?.querySelector('textarea')?.getAttribute('aria-label')
    if (a !== undefined) {
      mLabelOut.textContent = `aria-label: ${a}`
    } else {
      setTimeout(readMLabel, 60)
    }
  }
  readMLabel()
})
</script>

## API
