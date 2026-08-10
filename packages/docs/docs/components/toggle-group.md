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
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `items` | 选项 JSON | `string` | `[]` |
| `multiple` | 多选模式（checkbox 语义） | `boolean` | — |
| `value` | 当前值：单选为字符串；多选为 JSON 数组字符串 | `string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value: string \| string[] }` |

`ToggleItem` 字段：

| 字段       | 说明         | 类型      |
| ---------- | ------------ | --------- |
| `label`    | 按钮文案     | `string`  |
| `value`    | 值（随事件回传） | `string`  |
| `disabled` | 禁用该项     | `boolean` |

键盘：单选模式方向键移动并选中（radio 组惯例）；多选模式方向键移动焦点（roving tabindex）、Space/Enter 切换。容器 `role="radiogroup"` / `role="group"` + `aria-label`，选中项 `aria-checked`。
