# Cascader 级联选择

多级联动选择，支持任意层级提交与路径回显。

## 基础用法

<DemoBlock title="基础用法">
  <oas-cascader placeholder="请选择省市区" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"},{"label":"温州","value":"wz"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"},{"label":"苏州","value":"sz"}]},{"label":"四川","value":"sc","children":[{"label":"成都","value":"cd"}]}]'></oas-cascader>
</DemoBlock>

点击展开多级面板，逐级下钻直到叶子节点提交。

## 选择即提交

<DemoBlock title="选择即提交（change-on-select）">
  <oas-cascader change-on-select placeholder="选到任意级即提交" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

开启 `change-on-select` 后，点击任意层级的选项（含含子级的节点）即提交当前路径。

## 预设路径

<DemoBlock title="预设值（value 路径数组）">
  <oas-cascader value='["zj","hz"]' options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
</DemoBlock>

`value` 为 JSON 数组，存放各级选中值；展示时拼接为「浙江 / 杭州」。

## 禁用

<DemoBlock title="禁用">
  <oas-cascader disabled value='["zj","hz"]' placeholder="禁用" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"}]}]'></oas-cascader>
</DemoBlock>

## 事件

<DemoBlock title="选中事件">
  <oas-cascader id="cs-event" placeholder="选择后触发 oas-change" options='[{"label":"浙江","value":"zj","children":[{"label":"杭州","value":"hz"},{"label":"宁波","value":"nb"}]},{"label":"江苏","value":"js","children":[{"label":"南京","value":"nj"}]}]'></oas-cascader>
  <span id="cs-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 为完整路径数组：

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

| 属性               | 说明                                                 | 默认值   |
| ------------------ | ---------------------------------------------------- | -------- |
| `value`            | 路径数组（JSON），如 `["zj","hz"]`                   | `[]`     |
| `options`          | 级联选项，JSON 数组，支持 `children` / `disabled`    | `[]`     |
| `placeholder`      | 占位提示                                             | `请选择` |
| `change-on-select` | 选中任意层级即提交                                   | `false`  |
| `disabled`         | 禁用                                                 | `false`  |
| `show-all-levels`  | 是否显示完整路径（当前版本预留，展示始终为完整路径） | `false`  |

| 事件         | 说明                                      |
| ------------ | ----------------------------------------- |
| `oas-change` | 选择变化，`detail: { value }`（路径数组） |
