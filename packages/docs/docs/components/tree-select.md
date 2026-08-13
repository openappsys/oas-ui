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

## 勾选策略（check-strategy）

`check-strategy` 控制多选时写入 `value` 的节点集合：`all`（默认）父级与子级全部进入值；`parent` 只保留父级（子级全选时以父级为代表）；`child` 只保留叶子节点。三种策略共用同一套级联勾选逻辑，仅对外值不同：

<DemoBlock title="勾选策略对比（all / parent / child）">
  <div style="display: flex; gap: var(--oas-space-3); flex-wrap: wrap; width: 100%">
    <div>
      <oas-tree-select id="ts-strategy-all" multiple check-strategy="all" placeholder="all：勾选父级 → 父级+全部子级" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">all：值 = <span id="ts-out-all">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-parent" multiple check-strategy="parent" placeholder="parent：勾选父级 → 只父级" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">parent：值 = <span id="ts-out-parent">—</span></p>
    </div>
    <div>
      <oas-tree-select id="ts-strategy-child" multiple check-strategy="child" placeholder="child：勾选父级 → 只叶子" options='[{"label":"前端","value":"fe","children":[{"label":"框架","value":"framework","children":[{"label":"Vue","value":"vue"},{"label":"React","value":"react"}]},{"label":"样式","value":"css"}]},{"label":"后端","value":"be","children":[{"label":"Node","value":"node"}]}]'></oas-tree-select>
      <p style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">child：值 = <span id="ts-out-child">—</span></p>
    </div>
  </div>
</DemoBlock>

勾选「前端」后三个策略的 `value` 分别为：`all` → `["fe","framework","vue","react","css"]`，`parent` → `["fe"]`，`child` → `["vue","react","css"]`（顺序随 demo 数据中「框架」子节点的声明顺序）。`parent` 策略下逐个勾选叶子，待某父级子节点全选后，值自动收敛为该父级。

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

## 大数据量（虚拟滚动）

<DemoBlock title="万级节点虚拟滚动">
  <oas-tree-select id="ts-virtual" multiple virtual height="288" item-height="36" expanded='["dept-0"]' placeholder="点击展开万级部门树" options='[]'></oas-tree-select>
  <oas-button id="ts-expand-all" size="small">全部展开</oas-button>
  <oas-button id="ts-collapse-all" size="small">全部收起</oas-button>
</DemoBlock>

设置 `virtual` 开启虚拟滚动（搭配 `height` 视口高度、`item-height` 行高）：下拉复用 `oas-virtual-list` 只渲染可见窗口，10100 个节点（100 部门 × 100 成员）滚动流畅；键盘 `↑/↓` 移动高亮、`Enter` 勾选、`→/←` 展开收起，`aria-activedescendant` 随窗口滚动保持有效。数据由脚本注入（`options` 属性通道），展开集合受 `expanded` 属性控制，点击「全部展开」外部写入全量节点集合。

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

  // 勾选策略 demo：选中值回显（可见反馈）
  for (const [elId, spanId] of [
    ['ts-strategy-all', 'ts-out-all'],
    ['ts-strategy-parent', 'ts-out-parent'],
    ['ts-strategy-child', 'ts-out-child'],
  ]) {
    document.getElementById(elId)?.addEventListener('oas-change', (e) => {
      document.getElementById(spanId).textContent = `[${e.detail.value.join(', ')}]`
    })
  }

  // 万级虚拟滚动 demo：注入 100 部门 × 100 成员 = 10100 节点，外部驱动展开集合
  const tsVirtual = document.getElementById('ts-virtual')
  if (tsVirtual) {
    const roots = Array.from({ length: 100 }, (_, i) => ({
      label: `部门 ${i}`,
      value: `dept-${i}`,
      children: Array.from({ length: 100 }, (_, j) => ({
        label: `成员 ${i}-${j}`,
        value: `m-${i}-${j}`,
      })),
    }))
    tsVirtual.options = roots
    document.getElementById('ts-expand-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', JSON.stringify(roots.map((r) => r.value)))
    })
    document.getElementById('ts-collapse-all')?.addEventListener('click', () => {
      tsVirtual.setAttribute('expanded', '[]')
    })
  }

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
| `check-strategy` | 多选勾选策略：`all`（默认）父级与子级全部进入值；`parent` 只保留父级（子级全选时以父级为代表）；`child` 只保留叶子节点 | `string` | `all` |
| `disabled` | 禁用 | `boolean` | — |
| `expanded` | 展开节点的 value 集合（JSON 数组，受控） | `string` | `[]` |
| `height` | 虚拟滚动视口高度（px）；与 `virtual` 搭配生效 | `string` | `288` |
| `item-height` | 虚拟滚动每行固定高度（px） | `string` | `36` |
| `multiple` | 多选 + 父子级联 | `boolean` | — |
| `options` | 树形选项，JSON 数组，支持 `children` / `disabled` | `TreeOption[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `value` | 选中值（多选为 JSON 数组） | `string` | `[]` |
| `virtual` | 开启虚拟滚动：大数据量下拉仅渲染可见窗口（复用 oas-virtual-list），键盘/ARIA 保持 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择变化，`detail: { value }` |
