# BottomSheet 底部抽屉

移动端底部抽屉承载件：底部升起面板 + 拖拽把手 + 遮罩，下滑把手/点遮罩/Esc 三种关闭手势，safe-area 刘海屏手势区与焦点陷阱内置；`passive` 被动透传模式可作浮层组件 PC 形态的结构占位。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-button type="primary" id="bs-open">打开抽屉</oas-button>
  </oas-space>
  <p>面板从底部升起并带遮罩；下滑把手（超过阈值）、点击遮罩、按 <code>Esc</code> 均会请求关闭——<code>oas-close</code> 的 <code>detail.reason</code> 区分来源（<code>drag</code> / <code>backdrop</code> / <code>esc</code>）。组件不擅自改受控 <code>open</code>，收起由宿主移除属性完成。</p>
</DemoBlock>

## max-height 与内容滚动

<DemoBlock title="max-height 与内容滚动">
  <oas-space>
    <oas-button id="bs-open-capped">限高抽屉（50vh）</oas-button>
  </oas-space>
  <p><code>max-height</code> 限制面板最大高度（默认 85vh），内容超出时在面板内部滚动，不撑破视口。</p>
</DemoBlock>

## passive 被动透传（结构占位）

<DemoBlock title="passive 被动透传（结构占位）">
  <div style="border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-2)">
    <oas-bottom-sheet passive open max-height="120px">
      <p style="margin:0">passive 模式：无遮罩、无把手、无浮层定位与手势行为，仅静态渲染结构占位——虚线框示意承载结构边界（passive 下宿主为 display:contents，不留自身盒），供浮层组件 PC 形态复用同一结构（SSR/客户端结构严格一致）。</p>
    </oas-bottom-sheet>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  const reasonLabel = (reason) =>
    reason === 'drag' ? '下滑把手' : reason === 'backdrop' ? '点击遮罩' : 'Esc 键'
  window.openBs = (id, maxHeight) => {
    let el = document.getElementById(id)
    if (el) el.remove()
    el = document.createElement('oas-bottom-sheet')
    el.id = id
    if (maxHeight) el.setAttribute('max-height', maxHeight)
    el.innerHTML =
      '<div style="padding:4px 0">' +
      '<p style="margin:0 0 12px;font-weight:600">操作面板</p>' +
      '<oas-button block style="margin-bottom:8px">收藏</oas-button>' +
      '<oas-button block style="margin-bottom:8px">分享</oas-button>' +
      '<oas-button block type="primary">完成</oas-button>' +
      '</div>'
    el.addEventListener('oas-close', (e) => {
      el.removeAttribute('open')
      toast.info({ title: `抽屉已关闭（${reasonLabel(e.detail?.reason)}）`, duration: 2000 })
    })
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
  document.getElementById('bs-open')?.addEventListener('click', () => window.openBs('bs-basic'))
  document.getElementById('bs-open-capped')?.addEventListener('click', () => window.openBs('bs-capped', '50vh'))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `max-height` | 面板最大高度，默认 85vh；内容超出时在面板内部滚动 | `string` | — |
| `open` | 受控展开态（唯一状态源）。抽屉打开时显示底部面板与遮罩；下滑把手/点遮罩/Esc 手势只派发 oas-close 请求，由宿主移除 open 完成收起（组件不擅自改受控值） | `boolean` | — |
| `passive` | 被动透传模式——隐藏遮罩与拖拽把手、取消浮层定位与手势行为，仅渲染静态结构占位（供浮层组件 PC 形态结构复用；SSR/客户端结构严格一致） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 请求关闭，detail.reason 为 drag（下滑把手超阈值）/ backdrop（点击遮罩）/ esc（Esc 键）；组件只派发事件不改 open，由宿主决定收起 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

- `open` 为受控属性：组件手势（下滑/遮罩/Esc）只派发 `oas-close`，收起由宿主移除 `open` 完成。
- 焦点陷阱内置：打开时焦点锁在面板内，关闭后归还；safe-area-inset-bottom 自动适配刘海屏手势区。
- `passive` 模式面向浮层组件的 PC 形态结构复用（select/date-picker 等移动形态的承载底座），单独使用时即静态面板。
