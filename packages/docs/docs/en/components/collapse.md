# Collapse

Stows content in collapsible panels to keep the focus on key information.

## Basic Usage

<DemoBlock title="Multiple panels open at once">
  <div style="width: 100%">
    <oas-collapse active="a">
      <oas-collapse-item name="a" header="Project info"><p>Includes basic info such as team, milestones, and budget.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Tech stack"><p>The component library is built on Web Components standards.</p></oas-collapse-item>
      <oas-collapse-item name="c" header="Release plan"><p>Iterates by version, running the engineering discipline checklist before each release.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

`active` controls the set of expanded panels (`name` values comma-separated); by default multiple panels can be open at the same time.

## Accordion

<DemoBlock title="Accordion mode">
  <div style="width: 100%">
    <oas-collapse accordion active="a">
      <oas-collapse-item name="a" header="Panel 1"><p>Only one panel can be open at a time.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Opening a new panel automatically collapses the previous one.</p></oas-collapse-item>
      <oas-collapse-item name="c" header="Panel 3"><p>Clicking an already-open panel collapses it.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## All Collapsed

<DemoBlock title="All collapsed by default">
  <div style="width: 100%">
    <oas-collapse>
      <oas-collapse-item name="a" header="Panel 1"><p>All panels are collapsed by default.</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Click the header to expand.</p></oas-collapse-item>
    </oas-collapse>
  </div>
</DemoBlock>

## Events

<DemoBlock title="Expansion state events">
  <div style="width: 100%">
    <oas-collapse accordion active="a" id="collapse-event">
      <oas-collapse-item name="a" header="Panel 1"><p>Content 1</p></oas-collapse-item>
      <oas-collapse-item name="b" header="Panel 2"><p>Content 2</p></oas-collapse-item>
    </oas-collapse>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      Currently open: <span id="collapse-state">a</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  document.querySelector('#collapse-event')?.addEventListener('oas-change', (e) => {
    const active = e.detail.active
    document.querySelector('#collapse-state').textContent = active.length ? active.join(', ') : '(none)'
  })
})
</script>

## API

| Component            | Attribute   | Description                         | Type    | Default |
| -------------------- | ----------- | ----------------------------------- | ------- | ------- |
| `oas-collapse`       | `active`    | Set of expanded panel `name` values (comma-separated) | string  | —       |
| `oas-collapse`       | `accordion` | Accordion mode; only one panel open at a time | boolean | `false` |
| `oas-collapse-item`  | `name`      | Unique identifier of the panel      | string  | —       |
| `oas-collapse-item`  | `header`    | Panel title                         | string  | —       |
| `oas-collapse-item`  | `open`      | Whether it is expanded (managed by the container) | boolean | `false` |

| Event         | Description                                        |
| ------------ | -------------------------------------------------- |
| `oas-change` | Expansion state change, `detail: { active: string[] }` |
