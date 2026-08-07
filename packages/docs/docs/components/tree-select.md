# TreeSelect 树形选择器

树形结构选择，支持父子级联多选。

## 单选

<DemoBlock title="单选">
  <oas-tree-select placeholder="请选择节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

点击节点即选中并关闭下拉，支持展开 / 收起子级。

## 多选（父子联动）

<DemoBlock title="多选（multiple）">
  <oas-tree-select multiple placeholder="可选择多个节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
</DemoBlock>

多选时选中父级会级联选中全部子级，再次点击取消；父级节点呈「全选 / 半选」态。

## 预设值

<DemoBlock title="预设值（value）">
  <oas-tree-select value='["vue"]' options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## 禁用

<DemoBlock title="禁用">
  <oas-tree-select disabled value='["vue"]' placeholder="禁用" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
</DemoBlock>

## 空态

<DemoBlock title="无数据">
  <oas-tree-select placeholder="暂无数据" options='[]'></oas-tree-select>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-tree-select id="tree-event" multiple placeholder="选择后触发 oas-change" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <span id="tree-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

监听 `oas-change`，`detail.value` 单选为字符串、多选为数组：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tree-event')
  const out = document.getElementById('tree-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
  })
})
</script>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `value` | 选中值（多选为 JSON 数组） | 无 |
| `options` | 树形选项，JSON 数组，支持 `children` / `disabled` | `[]` |
| `placeholder` | 占位提示 | `请选择` |
| `multiple` | 多选 + 父子级联 | `false` |
| `disabled` | 禁用 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-change` | 选择变化，`detail: { value }` |
