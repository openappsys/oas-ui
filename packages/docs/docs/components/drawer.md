# Drawer 抽屉

从侧边滑出的面板。

## 基础用法

<div class="demo">
  <oas-button onclick="document.querySelector('#demo-drawer').setAttribute('visible','')">打开抽屉</oas-button>
  <oas-drawer id="demo-drawer" title="筛选条件">
    <p>抽屉内容</p>
  </oas-drawer>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `visible` | 显示 | `false` |
| `title` | 标题 | — |
| `placement` | `left` / `right` | `right` |
| `no-footer` | 隐藏操作按钮 | `false` |
| `no-mask-close` | 禁用遮罩关闭 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-ok` | 确定 |
| `oas-close` | 关闭 / Esc / 遮罩 / 取消 |

`role="dialog"` + `aria-modal`。
