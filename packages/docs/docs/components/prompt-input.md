# PromptInput 提示词输入

会话输入框：多行自增高、Enter 提交、Shift+Enter 换行、建议项、发送/停止态、附件与页脚插槽。

## 基础用法

<DemoBlock title="输入消息 + 建议项（点击建议回填；Enter 提交）">
  <oas-prompt-input
    id="prompt-input-basic"
    placeholder="输入消息，Enter 发送"
    suggestions='["总结这段对话","继续写一版","解释上面的代码"]'
  ></oas-prompt-input>
  <div id="prompt-input-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

## 生成中 / 禁用

`loading` 期间宿主反射 `aria-busy="true"`，发送钮切换为「停止」并派发 `oas-stop`；`readonly` 只限制编辑，不阻止停止命令。

<DemoBlock title="loading：发送钮切换为停止；disabled：不可输入/提交">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-3)">
    <oas-prompt-input id="prompt-input-stop" loading value="正在生成回答…"></oas-prompt-input>
    <oas-prompt-input disabled placeholder="当前不可输入"></oas-prompt-input>
  </div>
</DemoBlock>

<DemoBlock title="只读 / 长度 / 初始行数 / 提交策略">
  <oas-prompt-input readonly maxlength="200" rows="3" submit-on-enter="false" clear-on-submit="false" value="这段内容只读，不会因 Enter 提交"></oas-prompt-input>
</DemoBlock>

## 插槽

<DemoBlock title="prefix / actions / footer 插槽">
  <oas-prompt-input id="prompt-input-slots" placeholder="带附件的消息…">
    <oas-tag slot="prefix">附件</oas-tag>
    <oas-button slot="actions" size="small">模板</oas-button>
    <span slot="footer" style="font-size:var(--oas-font-size-xs);color:var(--oas-color-text-secondary)">Enter 发送 · Shift+Enter 换行</span>
  </oas-prompt-input>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-prompt-input')
  const input = document.getElementById('prompt-input-basic')
  const out = document.getElementById('prompt-input-output')
  input?.addEventListener('oas-submit', (e) => {
    out.textContent = `已提交：${e.detail.value}`
  })
  input?.addEventListener('oas-suggestion-select', (e) => {
    out.textContent = `已选择建议：${e.detail.label}`
  })
  const stop = document.getElementById('prompt-input-stop')
  stop?.addEventListener('oas-stop', () => {
    stop.removeAttribute('loading')
    out.textContent = '已停止生成'
  })
})
</script>

## API

### oas-prompt-input

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `clear-on-submit` | 提交后清空（默认 true） | `string` | `true` |
| `disabled` | 禁用输入与提交 | `boolean` | — |
| `loading` | 生成中；发送钮切换为停止 | `boolean` | — |
| `maxlength` | 最大字符数 | `string` | — |
| `placeholder` | 占位文案（缺省 i18n promptInput.placeholder） | `string` | — |
| `readonly` | 只读（可聚焦/复制，不可修改） | `boolean` | — |
| `rows` | 初始行数（1+，自增高上限 160px） | `string` | `1` |
| `submit-on-enter` | Enter 提交（默认 true；false 时仅按钮提交，Shift+Enter 始终换行） | `string` | `true` |
| `suggestions` | 建议项 JSON：字符串或 { label?, value } 数组 | `string` | — |
| `value` | 当前文本（property 双通道；attribute 作为初始值） | `string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 当前文本（读写） | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `submit` | `submit(): boolean` | 提交当前文本；空值/禁用/loading 返回 false |
| `stop` | `stop(): void` | 停止生成（仅 loading 时派发 oas-stop） |
| `focusInput` | `focusInput(): void` | 聚焦内部 textarea |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-stop` | loading 时点击停止派发，`detail: {}` |
| `oas-submit` | 提交时派发，detail: { value } |
| `oas-suggestion-select` | 点击建议项时派发，detail: { value, label } |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `actions` | 发送钮前的操作区 |
| `footer` | 输入框底部说明/工具行 |
| `prefix` | 输入框前置内容 |
