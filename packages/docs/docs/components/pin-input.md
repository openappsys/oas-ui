# PinInput 验证码

分格验证码输入：字符约束过滤（type / pattern）、分隔符分组、尺寸与形态档位、OTP 短信自动填充、填满自动提交、loading / success 校验反馈；键盘方向键移动、Backspace 回退、粘贴自动分发（含过滤）。

## 基础用法

<DemoBlock title="默认 6 位">
  <oas-pin-input></oas-pin-input>
</DemoBlock>

默认 `type="number"`（仅数字），适合绝大多数验证码场景。

## 自定义长度

<DemoBlock title="length=4">
  <oas-pin-input length="4"></oas-pin-input>
</DemoBlock>

通过 `length` 设置格子数量。

## 字符约束（type 语义化）

<DemoBlock title="number（默认）/ alphanumeric / text">
  <oas-pin-input length="4" value="1024"></oas-pin-input>
  <oas-pin-input type="alphanumeric" length="4" value="ab12"></oas-pin-input>
  <oas-pin-input type="text" length="4" value="-+#a"></oas-pin-input>
</DemoBlock>

`type` 是**语义化的字符约束档**（不再透传原生 input type）：

- `number`（默认）：仅数字 `[0-9]`，联动 `inputmode="numeric"`（移动端弹数字键盘）
- `alphanumeric`：字母 + 数字
- `text`：任意字符

内部格子恒为原生 `text` 输入并逐字符过滤——旧版 `type="number"` 透传原生时可以输入 `e` / `E` / `+` / `-` / `.`（原生 number input 的合法语法），该缺陷已修复。约束对逐位键入、粘贴分发、受控 `value` 初值三者一致生效；非法字符静默拒绝（通行做法）。设 `mask` 时格子切换为 `password` 遮罩。非法 `type` 值回落 `number` 并 console.warn（同值去重）。

## 自定义正则（pattern）

<DemoBlock title="pattern=[0-3]（仅 0–3 数字）">
  <oas-pin-input length="4" pattern="[0-3]" placeholder="?"></oas-pin-input>
</DemoBlock>

`pattern` 接收正则字符串，按**逐字符**匹配（如 `[0-3]` 限制 0–3、`[a-m]` 限制前半段字母）；设置后覆盖 `type` 的内置字符集（`inputmode` 仍随 `type`）。非法正则字符串告警后回落 `type` 约束。

## 分隔符（separator）

<DemoBlock title="3+4 手机验证码分组">
  <oas-pin-input length="7" separator="-" separator-after="3"></oas-pin-input>
</DemoBlock>

<DemoBlock title="每相邻对之间（separator-after 缺省）">
  <oas-pin-input length="6" separator="·" size="small"></oas-pin-input>
</DemoBlock>

`separator` 为分隔内容（字符串），`separator-after` 为 1 起始的格位索引列表（逗号分隔，如 `"3"` = 第 3 格后、`"2,5"` = 第 2、5 格后）；缺省时在**每相邻对之间**插入。分隔元素带 `part="separator"` 可定制样式，`aria-hidden` 对读屏不可见，不参与取值。

## 尺寸（size）

<DemoBlock title="small / medium / large">
  <oas-pin-input size="small" length="4" value="1234"></oas-pin-input>
  <oas-pin-input size="medium" length="4" value="1234"></oas-pin-input>
  <oas-pin-input size="large" length="4" value="1234"></oas-pin-input>
</DemoBlock>

`size` 三档对齐全局控件高度 token（small=24px / medium=32px 默认 / large=40px），格子宽度与字号随档位缩放；非法值回落 medium 并告警。

## 占位符（placeholder）

<DemoBlock title="placeholder 透传各格">
  <oas-pin-input length="4" placeholder="○"></oas-pin-input>
</DemoBlock>

`placeholder` 显示在每个空格内（惯例用单字符，如 `○`）。

## 形态（variant）与连体（attached）

<DemoBlock title="outlined（默认）/ filled / underlined">
  <oas-pin-input length="4" value="1234"></oas-pin-input>
  <oas-pin-input length="4" value="1234" variant="filled"></oas-pin-input>
  <oas-pin-input length="4" value="1234" variant="underlined"></oas-pin-input>
</DemoBlock>

<DemoBlock title="attached 连体（共享边框）">
  <oas-pin-input length="6" value="123456" attached></oas-pin-input>
  <oas-pin-input length="6" value="123456" attached variant="filled"></oas-pin-input>
</DemoBlock>

`variant` 形态档：`outlined` 描边（默认）/ `filled` 填充 / `underlined` 下划线；`attached` 去除格间距并合并相邻边框（仅端点圆角，聚焦格盖于邻格之上）。非法 `variant` 回落 `outlined` 并告警。样式全部走逻辑属性，`dir="rtl"` 下自动镜像。

## 遮罩（mask）

<DemoBlock title="mask">
  <oas-pin-input mask value="123456"></oas-pin-input>
</DemoBlock>

`mask` 将格子切换为密码型（平台原生圆点观感），输入值被遮罩。

## OTP 短信自动填充（otp）

<DemoBlock title="otp">
  <oas-pin-input length="6" otp></oas-pin-input>
</DemoBlock>

`otp` 布尔属性为各格设置 `autocomplete="one-time-code"`，移动端（iOS / Android）会在键盘上方弹出系统短信验证码建议，点按自动填入。

## 自动聚焦与焦点方法（autofocus / focus / blur）

<DemoBlock title="autofocus + focus(index) / blur()">
  <oas-space size="small">
    <oas-button size="small" onclick="pinFocusFirst()">聚焦首个空格</oas-button>
    <oas-button size="small" onclick="pinFocusAt()">聚焦第 3 格</oas-button>
    <oas-button size="small" onclick="pinBlur()">失焦</oas-button>
  </oas-space>
  <oas-pin-input id="pin-methods" length="4" :autofocus="true"></oas-pin-input>
</DemoBlock>

设置 autofocus 属性后，首次连接即聚焦首个空格；`focus(index?)` 聚焦指定格（缺省首个空格，全部填满时聚焦末格，越界回落默认策略），`blur()` 使当前活动格失焦。组件级进出派发 `oas-focus` / `oas-blur`（携带格 `index`），格间移动不重复派发。

> Vue 提示：`autofocus` 是 HTMLElement 反射属性，模板里裸写会被 Vue 走 property 赋值剥掉，需用 `:autofocus="true"` 绑定形态（经属性反射生效）。

## 填满自动提交（auto-submit）

<DemoBlock title="auto-submit（显式 opt-in）">
  <form id="pin-form">
    <oas-pin-input id="pin-submit" length="4" auto-submit otp></oas-pin-input>
    <oas-space size="small">
      <oas-button size="small" type="primary" onclick="pinFormSubmit()">提交</oas-button>
      <span id="pin-form-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
    </oas-space>
  </form>
</DemoBlock>

`auto-submit` 布尔属性在验证码填满时自动调用**关联 form**（最近 `form` 祖先）的 `requestSubmit()`——触发 `submit` 事件与原生约束校验（非绕过），无关联 form 时安全 no-op。OTP「填满即校验」流程无需中间按钮。

## 校验反馈（loading / success / aria-invalid）

输入正确码 `1234` 走完整流程：填满 → loading（格子锁定 + spinner）→ success 成功态；其他码 → 错误态 1.6s 后自动清空重试。

<DemoBlock title="loading → success / error">
  <oas-pin-input id="pin-verify" length="4" otp :autofocus="true"></oas-pin-input>
  <span id="pin-verify-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<DemoBlock title="aria-invalid 手动切换">
  <oas-space size="small">
    <oas-button size="small" type="danger" onclick="pinInvalid('true')">标记校验失败</oas-button>
    <oas-button size="small" onclick="pinInvalid('false')">恢复正常</oas-button>
  </oas-space>
  <oas-pin-input id="pin-invalid" length="4" value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="aria-invalid 静态示例">
  <oas-pin-input length="4" value="123" aria-invalid="true"></oas-pin-input>
  <oas-pin-input length="4" value="456" success></oas-pin-input>
</DemoBlock>

- `loading`：提交中态——格子禁用、容器 `aria-busy="true"`、覆盖层 spinner，输入与键盘全部锁定
- `success`：成功态——格子描 `--oas-color-success` 绿边（聚焦环同步变色）
- `aria-invalid`：校验失败态——格子与容器同步该状态并标 danger 边框（已列入 observedAttributes，动态 `setAttribute` 即时生效）；**error 优先于 success**（两者同设时按错误呈现）

## 受控初值（value）

<DemoBlock title="value 预填">
  <oas-pin-input value="25"></oas-pin-input>
</DemoBlock>

`value` 分发到各格；超出 `length` 的部分自动截断，不符合当前 `type` / `pattern` 约束的字符在展示层同步滤除。内部输入会写回 `value` 属性（非受控通道），宿主外部改动即时同步且不重建格子引用。

## 禁用 / 只读

<DemoBlock title="disabled">
  <oas-pin-input disabled value="123"></oas-pin-input>
</DemoBlock>

<DemoBlock title="readonly">
  <oas-pin-input readonly value="456"></oas-pin-input>
</DemoBlock>

## 事件

依次体验：点入格子（`oas-focus`）→ 逐位输入（`oas-input`）→ 填满（`oas-complete`）→ 点击页面空白处失焦（`oas-change` + `oas-blur`）。

<DemoBlock title="input / complete / change / focus / blur">
  <oas-pin-input id="pin-event" length="4"></oas-pin-input>
  <span id="pin-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 280px"></span>
</DemoBlock>

三事件正交、互不重叠：

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-input` | 每格输入（实时） | `{ value, index }` |
| `oas-complete` | 验证码填满（回退重填再次派发） | `{ value }` |
| `oas-change` | **失焦提交**：组件失焦且值相对获焦时有变化 | `{ value }` |
| `oas-focus` / `oas-blur` | 焦点进入 / 离开组件（格间移动不派发） | `{ index }` |

## RTL

<DemoBlock title="dir=rtl">
  <div dir="rtl">
    <oas-pin-input length="4" value="1234" separator="-" separator-after="2"></oas-pin-input>
  </div>
</DemoBlock>

`dir="rtl"` 下格子自右向左排布，方向键语义反转（`ArrowLeft` 前进、`ArrowRight` 后退），分隔符位置随视觉序镜像。

## 迁移说明（破坏性变更）

**`oas-change` 事件语义变更**（对齐表单族 change 惯例，与 `oas-complete` 解除重复）：

- 旧版：`oas-change` 与 `oas-complete` 在填满时**同时双发**，语义完全重复
- 新版：`oas-input`（逐位输入）/ `oas-complete`（填满）/ `oas-change`（失焦提交）三事件正交
- 迁移指引：
  - 旧监听 `oas-change` 做**实时校验 / 输入联动** → 改监听 `oas-input`
  - 旧监听 `oas-change` 做**填满即校验** → 改监听 `oas-complete`（如需自动提交配合 `auto-submit`）
  - 需要**失焦确认最终值**（表单 commit 语义）→ 继续监听 `oas-change`

**`type` 属性语义化**：

- 旧版：`type` 透传原生 input type（如 `tel`），且默认 `text` 可输任意字符；`type="number"` 下原生允许 `e` / `E` / `+` / `-` / `.`
- 新版：`type` 为语义档 `number`（**默认**）/ `text` / `alphanumeric`，内部恒原生 `text` + 逐字符过滤；非法值（含旧版 `tel` 等原生类型）回落 `number` 并告警
- 未显式设置 `type` 的存量用法从「任意字符」变为「仅数字」——需要任意字符请显式 `type="text"`

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.pinInvalid = (invalid) => {
    const el = document.getElementById('pin-invalid')
    if (invalid === 'true') el?.setAttribute('aria-invalid', 'true')
    else el?.setAttribute('aria-invalid', 'false')
  }

  // 焦点方法演示
  const methods = document.getElementById('pin-methods')
  window.pinFocusFirst = () => methods?.focus()
  window.pinFocusAt = () => methods?.focus(2)
  window.pinBlur = () => methods?.blur()

  // 校验反馈演示：1234 → loading → success；其他 → error → 清空重试
  const verify = document.getElementById('pin-verify')
  const vOut = document.getElementById('pin-verify-out')
  let verifyTimer = 0
  verify?.addEventListener('oas-complete', (e) => {
    const value = e.detail.value
    clearTimeout(verifyTimer)
    verify.setAttribute('loading', '')
    verify.removeAttribute('success')
    verify.removeAttribute('aria-invalid')
    vOut.textContent = '校验中…'
    verifyTimer = window.setTimeout(() => {
      verify.removeAttribute('loading')
      if (value === '1234') {
        verify.setAttribute('success', '')
        vOut.textContent = '✓ 校验通过'
      } else {
        verify.setAttribute('aria-invalid', 'true')
        vOut.textContent = `✗ 验证码错误（${value}），正确码 1234`
        verifyTimer = window.setTimeout(() => {
          verify.removeAttribute('aria-invalid')
          verify.setAttribute('value', '')
          verify.focus()
        }, 1600)
      }
    }, 1200)
  })

  // 填满自动提交演示
  const form = document.getElementById('pin-form')
  const fOut = document.getElementById('pin-form-out')
  window.pinFormSubmit = () => form?.requestSubmit()
  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    const value = document.getElementById('pin-submit')?.getAttribute('value') ?? ''
    fOut.textContent = `form 已提交（requestSubmit），验证码：${value || '（空）'}`
  })

  // 事件演示
  const ev = document.getElementById('pin-event')
  const out = document.getElementById('pin-output')
  const log = (msg) => {
    out.textContent = msg
  }
  ev?.addEventListener('oas-focus', (e) => log(`oas-focus: 进入第 ${e.detail.index + 1} 格`))
  ev?.addEventListener('oas-input', (e) => log(`oas-input: ${e.detail.value}`))
  ev?.addEventListener('oas-complete', (e) => log(`oas-complete: ${e.detail.value}`))
  ev?.addEventListener('oas-change', (e) => log(`oas-change（失焦提交）: ${e.detail.value}`))
  ev?.addEventListener('oas-blur', (e) => log(`oas-blur: 离开第 ${e.detail.index + 1} 格`))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-invalid` | 校验失败态（同步到容器与各格，标 danger） | `string` | — |
| `attached` | 连体形态：格间无间距共享边框，仅端点圆角 | `boolean` | — |
| `auto-submit` | 填满自动提交（找最近 form 调 requestSubmit；无 form 时 no-op） | `boolean` | — |
| `autofocus` | 首次连接聚焦首个空格 | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `length` | 验证码位数 | `string` | `6` |
| `loading` | 提交中：格禁用 + aria-busy + spinner 遮罩，键盘输入全锁 | `boolean` | — |
| `mask` | 星号遮罩 | `boolean` | — |
| `otp` | OTP 语义：内层格 autocomplete="one-time-code"（拉起系统短信验证码自动填充） | `boolean` | — |
| `pattern` | 逐字符正则约束（覆盖 type 过滤；非法正则告警回落） | `string` | — |
| `placeholder` | 空格占位符 | `string` | — |
| `readonly` | 只读 | `boolean` | — |
| `separator` | 分隔符内容（配合 separator-after） | `string` | — |
| `separator-after` | 在第 N 格后插入分隔符（1 起始索引，逗号分隔多个，如 `3,7`；缺省每相邻格之间） | `string` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `success` | 成功态绿边框（error 优先） | — | — |
| `type` | 格子输入类型 | `string` | `number` |
| `value` | 当前值（受控） | `string` | — |
| `variant` | 形态：`outlined`（默认）/ `filled` / `underlined` | `string` | `outlined` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-blur` | 焦点离开组件时派发，`detail: { index }` |
| `oas-change` | 填满时派发，`detail: { value }` |
| `oas-complete` | 填满时派发，`detail: { value }` |
| `oas-focus` | 焦点进入组件时派发（格间移动不派发），`detail: { index }` |
| `oas-input` | 每格输入，`detail: { value, index }` |

键盘：`←`/`→` 格间移动，`Backspace` 删除当前格并回退，支持粘贴自动分发；全空时每格均可聚焦（原生 caret）。

ARIA：容器 `role="group"` + `aria-label`，每格 `aria-label="第 n 位"`，`aria-invalid` 同步到容器与各格。
