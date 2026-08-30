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

## 命令式确认框（modal API）

`modal.confirm / info / success / warning / error` 命令式 API 返回 `{ close() }` 句柄，底层复用 `oas-modal`。选项：`title`、`content`（纯文本，杜绝 HTML 注入）、`okText`、`cancelText`、`onOk`、`onCancel`。传异步 `onOk`（返回 Promise）时点击确定后 OK 按钮进入 loading（转圈、禁止重复触发），resolve 自动关闭、reject 清除 loading 保持打开可重试或取消。取消按钮 / ✕ / 遮罩 / Esc 触发 `onCancel` 后关闭；句柄 `close()` 可编程关闭（不触发 `onCancel`）。多实例可叠放共存，`destroyAllModal()` 一次关闭全部；挂载到最近 `oas-app` 容器（无则 `body`）。

<DemoBlock title="基础确认">
  <oas-space>
    <oas-button type="primary" onclick="openModalConfirm()">基础确认</oas-button>
    <oas-button type="danger" onclick="openModalConfirmDelete()">自定义文案</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="语义变体">
  <oas-space>
    <oas-button type="primary" onclick="window.modal.info({ title: '提示', content: '这是一条信息提示。' })">信息</oas-button>
    <oas-button type="success" onclick="window.modal.success({ title: '成功', content: '操作已完成。' })">成功</oas-button>
    <oas-button type="warning" onclick="window.modal.warning({ title: '警告', content: '请注意风险。' })">警告</oas-button>
    <oas-button type="danger" onclick="window.modal.error({ title: '错误', content: '操作失败，请重试。' })">错误</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="异步 onOk loading">
  <oas-button type="primary" onclick="openModalLoading()">异步提交</oas-button>
</DemoBlock>

<DemoBlock title="多例与销毁全部">
  <oas-space>
    <oas-button onclick="openModalMany()">连开三个</oas-button>
    <oas-button onclick="destroyAllModal()">销毁全部</oas-button>
  </oas-space>
</DemoBlock>

## 声明式语义变体

命令式模块内部使用的 `type` / `ok-text` / `cancel-text` / `no-cancel` / `focus-ok` 均为 `oas-modal` 公开属性，可声明式使用。

<DemoBlock title="声明式语义变体">
  <oas-space>
    <oas-button type="success" onclick="document.querySelector('#modal-semantic').setAttribute('visible','')">打开成功对话框</oas-button>
    <oas-button onclick="document.querySelector('#modal-nocancel').setAttribute('visible','')">打开单按钮对话框</oas-button>
  </oas-space>
  <oas-modal id="modal-semantic" type="success" title="操作成功" ok-text="知道了" cancel-text="关闭" focus-ok>
    <p><code>type</code> 渲染语义图标；<code>ok-text</code>/<code>cancel-text</code> 自定义按钮文案；<code>focus-ok</code> 打开时聚焦「确定」。</p>
  </oas-modal>
  <oas-modal id="modal-nocancel" title="仅确定" no-cancel>
    <p><code>no-cancel</code> 隐藏取消按钮，底部仅剩「确定」。</p>
  </oas-modal>
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
  const { message, confirm, modal, destroyAllModal } = await import('@oas-ui/ui')
  window.message = message
  window.modal = modal
  window.destroyAllModal = destroyAllModal
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
  window.openModalConfirm = () =>
    modal.confirm({
      title: '确认操作',
      content: '该操作无法撤销，是否继续？',
      onOk: () => message.success('已确认'),
      onCancel: () => message.info('已取消'),
    })
  window.openModalConfirmDelete = () =>
    modal.confirm({
      title: '删除文件',
      content: '删除后不可恢复',
      okText: '狠心删除',
      cancelText: '再想想',
      onOk: () => message.success('已删除'),
    })
  window.openModalLoading = () =>
    modal.success({
      title: '提交订单',
      content: '点击确定后进入 loading，1.5 秒后自动关闭。',
      onOk: () =>
        new Promise((resolve) =>
          setTimeout(() => {
            message.success('提交成功')
            resolve()
          }, 1500),
        ),
    })
  window.openModalMany = () => {
    modal.confirm({ title: '确认框 1', content: '第一个确认框' })
    modal.confirm({ title: '确认框 2', content: '第二个确认框' })
    modal.success({ title: '确认框 3', content: '第三个确认框' })
  }
})
</script>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `modal.confirm({ title?, content?, okText?, cancelText?, onOk?, onCancel? })` | 打开确认框（确定/取消双按钮），返回 `{ close }` |
| `modal.info(options)` / `modal.success(options)` / `modal.warning(options)` / `modal.error(options)` | 语义确认框：对应图标 + 单「确定」按钮，返回 `{ close }` |
| `destroyAllModal()` | 关闭并销毁全部命令式确认框 |

- 选项：`{ title?, content?, okText?, cancelText?, onOk?, onCancel? }`。`content` 为纯文本；`onOk` 返回 Promise 时确定按钮进入 loading（resolve 关闭、reject 保持打开可重试或取消）。
- 返回 `{ close() }` 句柄：编程关闭当前实例，不触发 `onOk` / `onCancel`。
- 挂载到最近 `oas-app` 容器（无则 `body`）；多实例可叠放。

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cancel-text` | 取消按钮文案；缺省走 locale `modal.cancel` | — | — |
| `centered` | 对话框垂直居中显示 | `boolean` | — |
| `draggable` | 可通过标题栏拖动对话框 | `boolean` | — |
| `focus-ok` | 打开时焦点移入「确定」按钮（默认移入「取消」按钮） | `boolean` | — |
| `fullscreen` | 全屏显示：对话框铺满视口、无圆角与边距（优先级高于 width / centered / draggable） | `boolean` | — |
| `loading` | 确定按钮进入 loading 态（禁用 + 转圈），禁止重复触发确定 | `boolean` | — |
| `no-cancel` | 隐藏取消按钮（底部仅剩「确定」；语义变体确认框内置） | `boolean` | — |
| `no-footer` | 隐藏底部操作按钮 | `boolean` | — |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | — |
| `ok-text` | 确定按钮文案；缺省走 locale `modal.ok` | — | — |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串） | `string` | — |
| `type` | 语义变体：`info`/`success`/`warning`/`error`，正文顶部渲染对应语义图标 | `ModalVariant` | — |
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

`role="dialog"` + `aria-modal="true"`，打开时焦点移入「取消」按钮（`focus-ok` 时移入「确定」按钮），关闭后还原。
