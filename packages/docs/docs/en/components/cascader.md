# Cascader

Multi-level linked selection supporting submission at any level and path display.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-cascader placeholder="Select province / city / district" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"},{"label":"Wenzhou","value":"wz"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"},{"label":"Suzhou","value":"sz"}]},{"label":"Sichuan","value":"sc","children":[{"label":"Chengdu","value":"cd"}]}]'></oas-cascader>
</DemoBlock>

Click to open the multi-level panel and drill down level by level until a leaf node is submitted.

## Select & Submit

<DemoBlock title="Select to submit (change-on-select)">
  <oas-cascader change-on-select placeholder="Submit at any level" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

With `change-on-select` enabled, clicking an option at any level (including nodes with children) immediately submits the current path.

## Preset Path

<DemoBlock title="Preset value (path array)">
  <oas-cascader value='["zj","hz"]' options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`value` is a JSON array holding the selected value of each level; it is displayed joined as "Zhejiang / Hangzhou".

## Disabled

<DemoBlock title="Disabled">
  <oas-cascader disabled value='["zj","hz"]' placeholder="Disabled" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## Events

<DemoBlock title="Selection events">
  <oas-cascader id="cs-event" placeholder="Select to trigger oas-change" options='[{"label":"Zhejiang","value":"zj","children":[{"label":"Hangzhou","value":"hz"},{"label":"Ningbo","value":"nb"}]},{"label":"Jiangsu","value":"js","children":[{"label":"Nanjing","value":"nj"}]}]'></oas-cascader>
  <span id="cs-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

Listen to `oas-change`; `detail.value` is the full path array:

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cs-event')
  const out = document.getElementById('cs-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
})
</script>

## API

| Property             | Description                                          | Default   |
| -------------------- | ---------------------------------------------------- | -------- |
| `value`              | Path array (JSON), e.g. `["zj","hz"]`                | `[]`     |
| `options`            | Cascade options, JSON array, supports `children` / `disabled` | `[]` |
| `placeholder`        | Placeholder text                                     | `请选择` |
| `change-on-select`   | Submit when selecting any level                      | `false`  |
| `disabled`           | Disabled                                             | `false`  |
| `show-all-levels`    | Whether to show the full path (reserved in the current version; display is always the full path) | `false` |

| Event         | Description                                |
| ------------- | ------------------------------------------ |
| `oas-change`  | Selection change, `detail: { value }` (path array) |
