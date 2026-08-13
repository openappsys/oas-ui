# Modal 对话框

模态对话框，用于需要用户确认或输入的中断场景。

## 基础用法

<DemoBlock title="基础用法">
  <oas-button type="primary" onclick="document.querySelector('#modal-basic').setAttribute('visible','')">打开对话框</oas-button>
  <oas-modal id="modal-basic" title="提示">
    <p>这是一个基础对话框示例。</p>
  </oas-modal>
</DemoBlock>

## 受控显示

`visible` 为受控属性：由宿主（按钮 / JS）设置或移除，组件不会自动恢复；关闭后可监听 `oas-ok` / `oas-cancel` 后移除 `visible`。

<DemoBlock title="受控显示（visible）">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#modal-ctrl').setAttribute('visible','')">打开（设置 visible）</oas-button>
    <oas-button onclick="document.querySelector('#modal-ctrl').removeAttribute('visible')">关闭（移除 visible）</oas-button>
  </oas-space>
  <oas-modal id="modal-ctrl" title="受控显示">
    <p>外部按钮直接设置 / 移除 <code>visible</code> 控制显隐，无需依赖底部按钮。</p>
  </oas-modal>
</DemoBlock>

## 无底部按钮

<DemoBlock title="无底部按钮">
  <oas-button onclick="document.querySelector('#modal-nofooter').setAttribute('visible','')">打开无按钮对话框</oas-button>
  <oas-modal id="modal-nofooter" title="操作说明" no-footer>
    <p>隐藏底部操作区，仅通过 ✕ / Esc / 遮罩关闭。</p>
  </oas-modal>
</DemoBlock>

## 禁止遮罩关闭

<DemoBlock title="禁止遮罩关闭">
  <oas-button onclick="document.querySelector('#modal-nomask').setAttribute('visible','')">打开对话框</oas-button>
  <oas-modal id="modal-nomask" title="必须确认" no-mask-close>
    <p>点击遮罩不会关闭，需通过按钮或 Esc 关闭。</p>
  </oas-modal>
</DemoBlock>

## 自定义宽度

<DemoBlock title="自定义宽度">
  <oas-button onclick="document.querySelector('#modal-width').setAttribute('visible','')">打开自定义宽度对话框</oas-button>
  <oas-modal id="modal-width" title="自定义宽度" width="640px">
    <p>通过 <code>width</code> 指定对话框宽度，支持像素或百分比（如 <code>50%</code>），未设置时默认 520px。</p>
  </oas-modal>
</DemoBlock>

## 垂直居中

<DemoBlock title="垂直居中">
  <oas-button onclick="document.querySelector('#modal-centered').setAttribute('visible','')">打开垂直居中对话框</oas-button>
  <oas-modal id="modal-centered" title="垂直居中" centered>
    <p>默认对话框靠上偏移（顶部 100px），添加 <code>centered</code> 后垂直居中显示。</p>
  </oas-modal>
</DemoBlock>

## 可拖拽

<DemoBlock title="可拖拽">
  <oas-button onclick="document.querySelector('#modal-drag').setAttribute('visible','')">打开可拖拽对话框</oas-button>
  <oas-modal id="modal-drag" title="按住标题栏拖动" draggable>
    <p>按住标题栏可拖动对话框；Esc、遮罩关闭与焦点行为保持不变。</p>
  </oas-modal>
</DemoBlock>

## 全屏对话框

`fullscreen` 让对话框铺满视口（无圆角、无外边距）。优先级定义：**fullscreen 胜于 `width` / `centered` / `draggable`**——`width` 被忽略、`centered` 无布局差异、拖拽被禁用；Esc / 遮罩关闭与焦点陷阱、ARIA 行为照常。

<DemoBlock title="全屏对话框">
  <oas-button type="primary" onclick="document.querySelector('#modal-fullscreen').setAttribute('visible','')">打开全屏对话框</oas-button>
  <oas-modal id="modal-fullscreen" title="全屏对话框" fullscreen width="640px" centered draggable>
    <p>全屏对话框铺满视口、无圆角与边距。<code>width</code> / <code>centered</code> 被忽略、拖拽被禁用，Esc / 遮罩关闭照常。</p>
  </oas-modal>
</DemoBlock>

## 命令式确认

`confirm()` 命令式 API 基于 Promise，底层复用 `oas-modal`（返回 `Promise<void>`，确定 resolve、取消 reject）。传 `onOk` 异步回调可实现 **loading 态确认**：点击确定后 OK 按钮进入 loading（转圈、禁止重复触发），`onOk` resolve 后自动关闭并 resolve 外层 Promise；reject 则清除 loading、对话框保持打开可重试或取消。

<DemoBlock title="命令式确认">
  <oas-space>
    <oas-button type="primary" onclick="openConfirmModal()">异步确认</oas-button>
    <oas-button onclick="openConfirmLoading()">loading 态确认</oas-button>
  </oas-space>
</DemoBlock>

## 事件反馈

<DemoBlock title="事件反馈">
  <oas-button onclick="document.querySelector('#modal-event').setAttribute('visible','')">打开并监听事件</oas-button>
  <oas-modal id="modal-event" title="删除确认" onoas-ok="closeModal('modal-event'); message.success('已删除')" onoas-cancel="closeModal('modal-event'); message.info('已取消')">
    <p>点击「确定」或「取消」，观察右上角消息提示。</p>
  </oas-modal>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, confirm } = await import('@oas-ui/ui')
  window.message = message
  window.closeModal = (id) => document.getElementById(id).removeAttribute('visible')
  window.openConfirmModal = () =>
    confirm({ title: '确认操作', content: '模拟异步确认流程：确定 resolve、取消 reject。' })
      .then(() => message.success('已确认'))
      .catch(() => message.info('已取消'))
  window.openConfirmLoading = () =>
    confirm({
      title: '确认提交',
      content: '模拟异步提交：点击确定后 OK 按钮进入 loading，1.5 秒后自动关闭。',
      onOk: () => new Promise((resolve) => setTimeout(resolve, 1500)),
    })
      .then(() => message.success('提交成功'))
      .catch(() => message.info('已取消'))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `centered` | 对话框垂直居中显示 | `boolean` | — |
| `draggable` | 可通过标题栏拖动对话框 | `boolean` | — |
| `fullscreen` | 全屏显示：对话框铺满视口、无圆角与边距（优先级高于 width / centered / draggable） | `boolean` | — |
| `loading` | 确定按钮进入 loading 态（禁用 + 转圈），禁止重复触发确定 | `boolean` | — |
| `no-footer` | 隐藏底部操作按钮 | `boolean` | — |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | — |
| `title` | 标题文案 | `string` | — |
| `visible` | 是否显示 | `boolean` | — |
| `width` | 对话框宽度（px 或百分比） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消：取消按钮 / ✕ / 遮罩点击 / Esc |
| `oas-ok` | 点击「确定」 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

`role="dialog"` + `aria-modal="true"`，打开时焦点移入「取消」按钮，关闭后还原。
