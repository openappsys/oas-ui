# Tour 引导

分步功能引导，带遮罩高亮。

## 基础用法

<div class="demo">
  <oas-button onclick="document.querySelector('#demo-tour').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="demo-tour" steps='[{"selector":"#demo-tour-step1","title":"第一步","description":"这里是第一个高亮区域"},{"selector":"#demo-tour-step2","title":"第二步","description":"这里是第二个高亮区域"}]'></oas-tour>
  <div id="demo-tour-step1" style="height: 60px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; margin-top: 12px">高亮区域一</div>
  <div id="demo-tour-step2" style="height: 60px; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center; margin-top: 12px">高亮区域二</div>
</div>

## API

| 属性 | 说明 |
|---|---|
| `steps` | `[{ selector, title, description? }]` |
| `open` | 开始引导 |
| `current` | 当前步骤索引 |

| 事件 | 说明 |
|---|---|
| `oas-step` | 步骤切换，`detail: { index }` |
| `oas-finish` | 完成 |
| `oas-cancel` | Esc / 跳过 |

遮罩高亮目标，`role="dialog"`。
