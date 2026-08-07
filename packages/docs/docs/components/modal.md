# Modal 对话框

模态对话框，支持标题、内容与操作按钮。

## 基础用法

<div class="demo">
  <oas-button onclick="document.querySelector('#demo-modal').setAttribute('visible','')">打开对话框</oas-button>
  <oas-modal id="demo-modal" title="提示" style="width: 360px">
    <p>这是一个对话框示例。</p>
  </oas-modal>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `visible` | 显示 | `false` |
| `title` | 标题 | — |
| `no-footer` | 隐藏操作按钮 | `false` |
| `no-mask-close` | 禁用遮罩点击关闭 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-ok` | 点击确定 |
| `oas-cancel` | 取消 / Esc / 遮罩点击 |

`role="dialog"` + `aria-modal`，打开时焦点移入对话框、关闭后还原。
