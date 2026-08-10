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
  <oas-tree-select value="vue" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]}]}]'></oas-tree-select>
</DemoBlock>

## 受控展开（expanded）

`expanded` 为 JSON 数组，声明展开节点的 value 集合（受控通道）：外部修改属性即时反映到下拉树。以下预设展开「前端 → 框架」，并用按钮外部驱动：

<DemoBlock title="受控展开（expanded）">
  <oas-tree-select id="tree-expanded" expanded='["fe","framework"]' placeholder="点击查看预展开节点" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
  <oas-button id="tree-expand-all" size="small">全部展开</oas-button>
  <oas-button id="tree-collapse-all" size="small">全部收起</oas-button>
</DemoBlock>

预设 `expanded='["fe","framework"]'` 使首次展开下拉时「前端」「框架」已展开；点击「全部展开」外部写入 `expanded='["fe","framework","be"]'`，全部收起写入 `'[]'`，下拉打开时即时重渲染。

## 禁用

<DemoBlock title="禁用">
  <oas-tree-select disabled value="vue" placeholder="禁用" options='[{"label":"前端","value":"fe","children":[{"label":"Vue","value":"vue"}]}]'></oas-tree-select>
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

  // expanded（受控展开）demo：外部驱动展开节点集合
  document.getElementById('tree-expand-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '["fe","framework","be"]')
  })
  document.getElementById('tree-collapse-all')?.addEventListener('click', () => {
    document.getElementById('tree-expanded')?.setAttribute('expanded', '[]')
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用 | `boolean` | — |
| `expanded` | 展开节点的 value 集合（JSON 数组，受控） | `string` | `[]` |
| `multiple` | 多选 + 父子级联 | `boolean` | — |
| `options` | 树形选项，JSON 数组，支持 `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `value` | 选中值（多选为 JSON 数组） | `string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择变化，`detail: { value }` |
