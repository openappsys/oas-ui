# Cascader

Multi-level linked selection supporting submission at any level and path display.

## Basic Usage

<DemoBlock title="Basic usage">
  <oas-cascader placeholder="请选择省市区" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"},{"label":"温州","value":"wz"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"},{"label":"苏州","value":"sz"}]},{"label":"四川","value":"sc","children":[{"label":"成都","value":"cd"}]}]'></oas-cascader>
</DemoBlock>

Click to open the multi-level panel and drill down level by level until a leaf node is submitted.

## Select & Submit

<DemoBlock title="Select to submit (change-on-select)">
  <oas-cascader change-on-select placeholder="选到任意级即提交" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

With `change-on-select` enabled, clicking an option at any level (including nodes with children) immediately submits the current path.

## Preset Path

<DemoBlock title="Preset value (path array)">
  <oas-cascader value='["zj","hz"]' options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`value` is a JSON array holding the selected value of each level; it is displayed joined as "浙江 / 杭州".

## Disabled

<DemoBlock title="Disabled">
  <oas-cascader disabled value='["zj","hz"]' placeholder="禁用" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## Events

<DemoBlock title="Selection events">
  <oas-cascader id="cs-event" placeholder="选择后触发 oas-change" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
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
