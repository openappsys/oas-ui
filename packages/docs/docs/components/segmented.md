# Segmented 分段器

单选的线性分段选择器，用于轻度筛选 / 切换视图，`role="radiogroup"`，可禁用单项。选中态指示器带滑动过渡动画。

## 基础用法

<DemoBlock title="基础用法">
  <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## 默认选中

<DemoBlock title="受控 value">
  <oas-segmented value="week" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## 禁用单项

<DemoBlock title="禁用选项">
  <oas-segmented options='[{"label":"启用","value":"on"},{"label":"禁用","value":"off","disabled":true},{"label":"仅读","value":"ro","disabled":true}]'></oas-segmented>
</DemoBlock>

## 尺寸

`size` 支持 `small` / `medium`（默认）/ `large` 三档（对齐输入类控件的尺寸体系；就近跟随 config-provider 的 size 注入）：

<DemoBlock title="尺寸">
  <oas-space direction="vertical" size="small">
    <oas-segmented size="small" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
    <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
    <oas-segmented size="large" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
  </oas-space>
</DemoBlock>

## 铺满

`block` 铺满父宽，选项等分：

<DemoBlock title="block 铺满">
  <oas-segmented block options='[{"label":"图表","value":"chart"},{"label":"列表","value":"list"},{"label":"看板","value":"board"}]'></oas-segmented>
</DemoBlock>

## 图标选项

选项的 `icon` 字段（oas-icons 图标名）渲染在文本前；`label` 省略时为仅图标形态，图标名自动转可读文本作 `aria-label` 兜底：

<DemoBlock title="图标选项">
  <oas-segmented options='[{"label":"列表","value":"list","icon":"menu"},{"label":"分组","value":"group","icon":"organization"},{"label":"树形","value":"tree","icon":"tree"}]'></oas-segmented>
</DemoBlock>

<DemoBlock title="仅图标">
  <oas-segmented options='[{"label":"","value":"star","icon":"star"},{"label":"","value":"filled","icon":"star-filled"},{"label":"","value":"like","icon":"heart"}]'></oas-segmented>
</DemoBlock>

## 纵向

`direction="vertical"` 纵向排列（侧边工具条等场景）；键盘导航随之切换为 `↑` / `↓`：

<DemoBlock title="纵向">
  <oas-segmented direction="vertical" options='[{"label":"列表","value":"list","icon":"menu"},{"label":"分组","value":"group","icon":"organization"},{"label":"树形","value":"tree","icon":"tree"}]'></oas-segmented>
</DemoBlock>

## 只读

`readonly` 可聚焦不可改选（与 `disabled` 的表单语义分立：值只读展示）：

<DemoBlock title="readonly">
  <oas-segmented readonly value="week" options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-segmented>
</DemoBlock>

## 自定义选项渲染

`template[slot="option"]` 克隆渲染每个选项（`data-option-label` 元素绑定选项文本，对齐 select 的 option slot 惯例）：

<DemoBlock title="option slot">
  <oas-segmented options='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'>
    <template slot="option">
      <span style="display: inline-flex; align-items: center; gap: var(--oas-space-1)">
        <oas-icon name="arrow-right" size="12"></oas-icon>
        <b data-option-label></b>
      </span>
    </template>
  </oas-segmented>
</DemoBlock>

## 键盘与无障碍

底层为隐藏的原生 radio 组（`input[type="radio"]`，同名成组）：`Tab` 聚焦当前选中项，`←` / `→`（纵向 `↑` / `↓`）循环切换并跳过禁用项，`Home` / `End` 跳转首尾；焦点（roving tabindex）随选中项移动。设置 `name` 属性时透传 radio 组名，可参与原生表单提交关联（未设置时组件自动生成组名，多实例互不干扰）。

## 切换事件

<DemoBlock title="oas-change 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-segmented id="segmented-demo" options='[{"label":"图表","value":"chart"},{"label":"列表","value":"list"},{"label":"看板","value":"board"}]'></oas-segmented>
    <oas-tag type="primary" id="segmented-info">当前选中：chart</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const seg = document.getElementById('segmented-demo')
  const info = document.getElementById('segmented-info')
  seg?.addEventListener('oas-change', (e) => {
    const { value } = e.detail
    info.textContent = `当前选中：${value}`
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `block` | 铺满父容器（各项等宽均分） | — | — |
| `direction` | 排列方向：`horizontal`（默认）/ `vertical`（联动 aria-orientation 与轴向键） | `string` | `horizontal` |
| `disabled` | 禁用整个分段控件（自身显式禁用，或经 config-provider 全局禁用注入继承） | `boolean` | — |
| `name` | 原生 radio 组名（原生表单关联；未设自动生成唯一名） | `string` | — |
| `options` | `[{ label, value, disabled? }]` JSON 字符串 | `string` | `[]` |
| `readonly` | 只读：可聚焦不可改选（radiogroup aria-readonly） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `value` | 选中值（缺省选第一项，受控属性） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="option"]` | — |

容器 `role="radiogroup"`，每项 `role="radio"` + `aria-checked` / `aria-disabled`。
