# Combobox 组合框

输入框即控件的可过滤单选组合框：**常显可编辑的输入框**显示选中项 label，输入实时过滤选项，选中后 `value` 取 `option.value`。

> **三者怎么选（select / combobox / auto-complete）**
>
> | 组件 | 值的来源 | 输入框形态 | 一句话定位 |
> | --- | --- | --- | --- |
> | `oas-select` | 必须来自选项集合 | 按钮触发，输入框不常显 | 收敛选择的默认形态（含多选/创建/远程全家桶） |
> | `oas-combobox` | 必须来自选项集合 | 输入框即控件，输入仅过滤 | 常显输入框形态的收敛单选 |
> | `oas-auto-complete` | **任意自由文本** | 输入框即控件 | 联想输入（值不必来自选项） |
>
> combobox 保持「值恒来自选项」的纯过滤语义：**不做** multiple（多选用 `oas-select multiple searchable`）、**不做** allow-create（创建用 `oas-select allow-create` 或 `oas-dynamic-tags`，自由文本用 `oas-auto-complete`）——与库内已有能力不重复。

## 基础用法

<DemoBlock title="基础用法">
  <oas-combobox placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"}]'></oas-combobox>
</DemoBlock>

点击/聚焦展开下拉；输入关键字实时过滤（`filterable` 默认开启，子串匹配 label）；`↑`/`↓` 移动高亮、`Enter` 选中、`Esc` 关闭。

## 预设值（受控）

<DemoBlock title="预设值（受控 value）">
  <oas-combobox value="banana" placeholder="已选中的值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

`value` 为受控属性：选中后回写；外部修改属性同样即时反映到输入框 label。

## 外部受控设值

<DemoBlock title="外部受控设值">
  <oas-combobox id="cb-controlled" placeholder="点击按钮外部设值" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-set-apple" size="small">设为 苹果</oas-button>
  <oas-button id="cb-clear-value" size="small">清空 value</oas-button>
</DemoBlock>

受控模式下宿主可随时通过 `value` 属性驱动组件显示：

## 分组

<DemoBlock title="分组（group）">
  <oas-combobox placeholder="按组浏览" options='[{"group":"温带水果","label":"苹果","value":"apple"},{"group":"温带水果","label":"梨","value":"pear"},{"group":"热带水果","label":"香蕉","value":"banana"},{"group":"热带水果","label":"芒果","value":"mango"},{"label":"其他","value":"other"}]'></oas-combobox>
</DemoBlock>

选项带 `group` 字段时按组渲染组标题（不可选），组内选项缩进；键盘 `↑`/`↓` 跨组连续导航（与 `oas-select` 同一 JSON 契约）。

## 自定义过滤函数

<DemoBlock title="自定义过滤（el.filter）">
  <oas-combobox id="cb-filter" placeholder="输入拼音缩写（pg / xj / cz）" options='[{"label":"苹果","value":"pingguo"},{"label":"香蕉","value":"xiangjiao"},{"label":"橙子","value":"chengzi"}]'></oas-combobox>
  <span id="cb-filter-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

`el.filter = (option, query) => boolean` 为 JS property 通道（attribute 传不了函数）：接管本地过滤逻辑（如拼音首字母、远程匹配），置 `null` 恢复默认 label 子串过滤；`filterable="false"` 时不参与。

## 尺寸与校验态

<DemoBlock title="尺寸（size）">
  <oas-space size="small" direction="vertical">
    <oas-combobox size="small" placeholder="small" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox placeholder="medium（默认）" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox size="large" placeholder="large" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
  </oas-space>
</DemoBlock>

<DemoBlock title="校验态（status）">
  <oas-space size="small">
    <oas-combobox status="success" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox status="warning" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
    <oas-combobox status="error" value="apple" options='[{"label":"苹果","value":"apple"}]'></oas-combobox>
  </oas-space>
</DemoBlock>

`size` 支持 `small / medium / large`（就近跟随 `oas-config-provider` 注入）；`status` 支持 `success / warning / error`（`error` 同步 `aria-invalid`，可被 `oas-form-item` 校验态驱动）。

## 只读

<DemoBlock title="只读（readonly）">
  <oas-combobox readonly value="apple" placeholder="只读" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-combobox>
</DemoBlock>

`readonly` 可聚焦可复制、不可改值，聚焦与键盘不再展开下拉。

## 受控展开（open）

<DemoBlock title="受控 open + oas-open-change">
  <oas-combobox id="cb-open" placeholder="宿主驱动展开/收起" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <oas-button id="cb-open-toggle" size="small">切换 open</oas-button>
  <span id="cb-open-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 180px"></span>
</DemoBlock>

`open` 属性为受控展开状态（组件内部开合同步写回属性），任何开合迁移都派发 `oas-open-change`（`detail.open` 布尔）——联动场景（如随外部按钮/快捷键展开）由宿主驱动属性实现。

## 大数据量（虚拟滚动）

<DemoBlock title="万级选项虚拟滚动">
  <oas-combobox id="cb-virtual" virtual item-height="48" clearable placeholder="1 万条选项，滚动流畅" options='[]'></oas-combobox>
</DemoBlock>

设置 `virtual` 后仅渲染可视窗口（复用 `oas-virtual-list` 的窗口计算），万级选项滚动流畅；`item-height` 可调定高（默认 `36`）。键盘 `↑`/`↓` 导航时窗口自动跟随高亮项，`aria-activedescendant` 保持指向可见项；带 `group` 的选项自动回退全量渲染。

## 过滤与关闭边界

<DemoBlock title="输入过滤 + 失焦回退">
  <oas-combobox value="apple" placeholder="输入后失焦会自动回退" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"},{"label":"草莓","value":"strawberry"},{"label":"西瓜","value":"watermelon"}]'></oas-combobox>
</DemoBlock>

输入未选中直接失焦/按 `Esc` 时，输入框回退为当前选中项 label（默认非破坏，不丢失已选值）——combobox 的值恒来自选项，自由文本请用 `oas-auto-complete`。

## 不可过滤

<DemoBlock title='关闭过滤（filterable="false"）'>
  <oas-combobox filterable="false" placeholder="输入不过滤，仅键盘选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

`filterable="false"` 时输入不再过滤选项，仅通过键盘 `↑`/`↓` + `Enter` 或鼠标选择。

## 可清空

<DemoBlock title="可清空（clearable）">
  <oas-combobox clearable value="apple" placeholder="可清空" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
</DemoBlock>

有选中值时显示清空按钮，点击清空 `value` 并派发 `oas-clear` 与 `oas-change`。

## 加载中

<DemoBlock title="加载中（loading）">
  <oas-combobox loading placeholder="聚焦查看加载占位" options='[]'></oas-combobox>
</DemoBlock>

`loading` 时下拉显示「加载中…」占位（远程数据场景由宿主在请求期间置位）。

## 空态

<DemoBlock title="无选项（empty）">
  <oas-combobox placeholder="暂无选项" options='[]'></oas-combobox>
</DemoBlock>

选项为空时下拉显示「暂无选项」；输入过滤无匹配时显示「无匹配选项」。

## 禁用

<DemoBlock title="禁用">
  <oas-combobox disabled value="apple" placeholder="禁用" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"}]'></oas-combobox>
</DemoBlock>

## 事件

<DemoBlock title="事件输出">
  <oas-combobox id="cb-event" clearable placeholder="输入或选择" options='[{"label":"苹果","value":"apple"},{"label":"香蕉","value":"banana"},{"label":"橙子","value":"orange"}]'></oas-combobox>
  <span id="cb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 220px"></span>
</DemoBlock>

监听 `oas-input`（过滤词）、`oas-change`（选中）、`oas-clear`（清空）、`oas-open-change`（展开迁移）：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('cb-event')
  const out = document.getElementById('cb-output')
  const set = (name, e) => {
    out.textContent = `${name}: ${JSON.stringify(e.detail)}`
  }
  el?.addEventListener('oas-input', (e) => set('oas-input', e))
  el?.addEventListener('oas-change', (e) => set('oas-change', e))
  el?.addEventListener('oas-clear', (e) => set('oas-clear', e))
  el?.addEventListener('oas-open-change', (e) => set('oas-open-change', e))

  // 受控设值 demo：宿主外部驱动 value 属性
  const controlled = document.getElementById('cb-controlled')
  document.getElementById('cb-set-apple')?.addEventListener('click', () => {
    controlled?.setAttribute('value', 'apple')
  })
  document.getElementById('cb-clear-value')?.addEventListener('click', () => {
    controlled?.removeAttribute('value')
  })

  // 自定义过滤 demo：拼音首字母匹配（JS property 通道）
  const filterEl = document.getElementById('cb-filter')
  const filterOut = document.getElementById('cb-filter-output')
  if (filterEl) {
    filterEl.filter = (option, query) => {
      // label 全拼前缀或 value（拼音缩写）前缀命中
      const q = query.toLowerCase()
      return option.value.startsWith(q) || option.label.includes(query)
    }
    filterEl.addEventListener('oas-input', (e) => {
      filterOut.textContent = `过滤词：${e.detail.value}`
    })
  }

  // 受控 open demo：宿主驱动 + 事件回显
  const openEl = document.getElementById('cb-open')
  const openOut = document.getElementById('cb-open-output')
  openEl?.addEventListener('oas-open-change', (e) => {
    openOut.textContent = `oas-open-change: ${e.detail.open}`
  })
  document.getElementById('cb-open-toggle')?.addEventListener('click', () => {
    if (!openEl) return
    if (openEl.hasAttribute('open')) openEl.removeAttribute('open')
    else openEl.setAttribute('open', '')
  })

  // 虚拟滚动 demo：1 万条选项
  const virtual = document.getElementById('cb-virtual')
  if (virtual) {
    virtual.setAttribute(
      'options',
      JSON.stringify(
        Array.from({ length: 10000 }, (_, i) => ({ label: `选项 ${i}`, value: `v${i}` })),
      ),
    )
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clearable` | 可清空（有值时显示清空按钮，清空派发 `oas-clear`） | `boolean` | — |
| `disabled` | 禁用（不可输入、不展开） | `boolean` | — |
| `filter` | 自定义过滤函数（JS property 通道 `el.filter = fn`）：接管本地过滤（如拼音首字母/远程匹配），置 null 恢复默认 label 子串过滤；`filterable="false"` 时不参与 | `((option: Option, query: string) => boolean) \| null` | — |
| `filterable` | 输入实时过滤 label（`filterable="false"` 关闭本地过滤） | `string` | `true` |
| `item-height` | 虚拟滚动定高（px，配合 `virtual`，默认 36） | `string` | `36` |
| `loading` | 加载占位（下拉显示「加载中…」） | `boolean` | — |
| `open` | 受控展开状态（组件内部开合同步写回属性，任何迁移派发 `oas-open-change`；readonly/disabled 下强制收起） | `boolean` | — |
| `options` | 选项，JSON 数组 `[{ label, value, disabled?, group? }]`（group 为分组标题，与 oas-select 同一契约） | `Option[] \| string` | `[]` |
| `placeholder` | 占位提示 | — | — |
| `readonly` | 只读（可聚焦可复制不可改值，聚焦与键盘不展开下拉） | `boolean` | — |
| `size` | 尺寸档位：small / medium / large（默认 medium，就近跟随 config-provider 注入） | `string` | `medium` |
| `status` | 校验态：success / warning / error（error 同步 aria-invalid，可被 oas-form-item 校验驱动） | `string` | — |
| `value` | 当前值（受控，选中项 `option.value`） | `string` | — |
| `virtual` | 虚拟滚动（复用 oas-virtual-list 仅渲染可视窗口；带 group 的选项自动回退全量渲染） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选中/清空变化，`detail: { value }` |
| `oas-clear` | 点击清空按钮，`detail: { value }`（清空前的值） |
| `oas-input` | 输入过滤词，`detail: { value }` |
| `oas-open-change` | 展开状态迁移（受控 setAttribute 与内部开合都派发），`detail: { open }` |

键盘：`Enter` / 聚焦展开，`↑`/`↓` 移动高亮，`Enter` 选中，`Esc` 关闭并回退。
