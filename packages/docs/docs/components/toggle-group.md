# ToggleGroup 切换组

单选/多选互斥的按钮组：单选组用 radio 语义、多选组用 checkbox 语义，键盘方向键切换，受控 `value`。

## 单选

不设 `multiple` 时为单选（`role="radiogroup"` + `radio`），`value` 为字符串，同一时刻只有一项按下。

<DemoBlock title="单选">
  <oas-toggle-group id="tg-single" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  <span id="tg-single-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：day</span>
</DemoBlock>

## 多选

设置 `multiple` 后为多选（`role="group"` + `checkbox`），`value` 为 JSON 数组字符串。

<DemoBlock title="多选">
  <oas-toggle-group id="tg-multi" multiple items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toggle-group>
  <span id="tg-multi-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：[]</span>
</DemoBlock>

## 禁用

项级 `disabled: true` 禁选；禁用项不参与键盘导航。

<DemoBlock title="禁用项">
  <oas-toggle-group items='[{"label":"可编辑","value":"editable"},{"label":"只读","value":"readonly","disabled":true},{"label":"可删除","value":"deletable"}]'></oas-toggle-group>
</DemoBlock>

## 受控选中（value）

`value` 为受控通道：单选为字符串、多选为 JSON 数组字符串；外部设置属性即时反映到选中态（组内点击也会回写该属性）。以下用按钮外部驱动选中：

<DemoBlock title="受控 value">
  <oas-toggle-group id="tg-controlled" value="week" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  <oas-toggle-group id="tg-controlled-multi" multiple value='["bold"]' items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toggle-group>
  <oas-button id="tg-set-day" size="small">单选：日</oas-button>
  <oas-button id="tg-set-month" size="small">单选：月</oas-button>
  <oas-button id="tg-set-multi" size="small">多选：斜体+下划线</oas-button>
</DemoBlock>

预设 `value="week"` / `value='["bold"]'` 使两个组初始即带选中态；按钮外部写入 `value` 属性后选中态即时切换。

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-toggle-item>` 子元素声明式书写选项（`items` 属性*显式设置时优先*，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `ToggleItem` 字段：`value` / `disabled`。子元素增删、属性与文本变化会自动重渲染（MutationObserver）；单选/多选（`multiple`）语义与 items 通道完全一致。

<DemoBlock title="子元素声明式（单选 + 多选）">
  <oas-space size="small">
    <oas-toggle-group id="tg-decl" value="week">
      <oas-toggle-item value="day">日</oas-toggle-item>
      <oas-toggle-item value="week">周</oas-toggle-item>
      <oas-toggle-item value="month" disabled>月（禁用）</oas-toggle-item>
    </oas-toggle-group>
    <oas-toggle-group id="tg-decl-multi" multiple>
      <oas-toggle-item value="bold">加粗</oas-toggle-item>
      <oas-toggle-item value="italic">斜体</oas-toggle-item>
      <oas-toggle-item value="underline">下划线</oas-toggle-item>
    </oas-toggle-group>
    <oas-button id="tg-decl-add" size="small">动态追加一项</oas-button>
  </oas-space>
</DemoBlock>

## 事件

点击或键盘切换派发 `oas-change`，单选 `detail: { value: string }`，多选 `detail: { value: string[] }`。

<DemoBlock title="变化事件">
  <oas-toggle-group id="tg-event" items='[{"label":"左","value":"left"},{"label":"中","value":"center"},{"label":"右","value":"right"}]'></oas-toggle-group>
  <span id="tg-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">oas-change: { value: "left" }</span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const single = document.getElementById('tg-single')
  const singleOut = document.getElementById('tg-single-out')
  single?.addEventListener('oas-change', (e) => {
    single.setAttribute('value', e.detail.value)
    singleOut.textContent = `当前：${e.detail.value}`
  })

  const multi = document.getElementById('tg-multi')
  const multiOut = document.getElementById('tg-multi-out')
  multi?.addEventListener('oas-change', (e) => {
    multi.setAttribute('value', JSON.stringify(e.detail.value))
    multiOut.textContent = `当前：${JSON.stringify(e.detail.value)}`
  })

  const evt = document.getElementById('tg-event')
  const evtOut = document.getElementById('tg-event-out')
  evt?.addEventListener('oas-change', (e) => {
    evt.setAttribute('value', e.detail.value)
    evtOut.textContent = `oas-change: { value: "${e.detail.value}" }`
  })

  // 受控 value demo：外部驱动选中态
  document.getElementById('tg-set-day')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'day')
  })
  document.getElementById('tg-set-month')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'month')
  })
  document.getElementById('tg-set-multi')?.addEventListener('click', () => {
    document.getElementById('tg-controlled-multi')?.setAttribute('value', '["italic","underline"]')
  })

  // 子元素声明式通道：动态追加（MutationObserver 自动刷新）
  const decl = document.getElementById('tg-decl')
  document.getElementById('tg-decl-add')?.addEventListener('click', () => {
    if (!decl) return
    const n = decl.children.length + 1
    const item = document.createElement('oas-toggle-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `动态 ${n}`
    decl.appendChild(item)
  })
})
</script>

## API

### oas-toggle-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 选项 JSON（property 赋值单向反射 attribute） | `ToggleItem[] \| string` | `[]` |
| `multiple` | 多选模式（checkbox 语义） | `boolean` | — |
| `value` | 当前值：单选为字符串；多选为 JSON 数组字符串 | `string` | `[]` |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value: string \| string[] }` |

### oas-toggle-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用该项（点击不可选，方向键跳过） | — | — |
| `value` | 选项值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 按钮文案（默认插槽文本） |

`ToggleItem` 字段：

| 字段       | 说明         | 类型      |
| ---------- | ------------ | --------- |
| `label`    | 按钮文案     | `string`  |
| `value`    | 值（随事件回传） | `string`  |
| `disabled` | 禁用该项     | `boolean` |

键盘：单选模式方向键移动并选中（radio 组惯例）；多选模式方向键移动焦点（roving tabindex）、Space/Enter 切换。容器 `role="radiogroup"` / `role="group"` + `aria-label`，选中项 `aria-checked`。
