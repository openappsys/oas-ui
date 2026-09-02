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

## Prompt 输入框

`modal.prompt(options)` 命令式输入框：打开自动聚焦输入框，结果 resolve `{ value, action }`（action：确定为 `confirm`，取消 / ✕ / 遮罩 / Esc 统一为 `cancel`）。支持 `inputValue` / `placeholder` / `inputType`（text / password / number / textarea）/ `inputPattern`（字符串正则校验，先 pattern 后 validator）/ `validator`（返回 `true` 通过、`false` 用默认文案、`string` 即错误文案）。**校验失败保持打开**并显示错误，输入修正后自动清除可再提交；异步 `onOk` 时确定按钮进入 loading。

<DemoBlock title="prompt 基础输入">
  <oas-space>
    <oas-button type="primary" onclick="openPrompt()">基础输入</oas-button>
    <oas-button onclick="openPromptValidated()">校验失败保持打开</oas-button>
  </oas-space>
</DemoBlock>

<DemoBlock title="prompt 进阶（textarea / password + pattern）">
  <oas-space>
    <oas-button onclick="openPromptTextarea()">意见反馈（textarea）</oas-button>
    <oas-button onclick="openPromptPassword()">设置密码（pattern）</oas-button>
  </oas-space>
</DemoBlock>

## body 滚动锁

打开时锁定 body 滚动（overflow hidden + 滚动条宽度补偿防跳动），关闭还原；多实例嵌套计数，**全部关闭才解锁**。`no-scroll-lock` 可关闭该行为。

<DemoBlock title="body 滚动锁">
  <oas-button type="primary" onclick="document.querySelector('#modal-scroll').setAttribute('visible','')">打开并锁定滚动</oas-button>
  <oas-modal id="modal-scroll" title="滚动锁">
    <p>打开后页面滚动被锁定；关闭后恢复。试试打开状态下滚动页面，内容不再移动。</p>
  </oas-modal>
</DemoBlock>

## 关闭拦截（before-close）

监听可取消的 `oas-before-close`（`event.detail.source` 标明来源：ok / cancel / close-btn / mask / esc），`preventDefault()` 可阻止关闭——表单未保存等数据保护场景。命令式确认框的确定路径由 `onOk` Promise 控制（resolve 才关闭），取消类路径同样可被拦截。

<DemoBlock title="关闭拦截">
  <oas-button type="primary" onclick="document.querySelector('#modal-guard').setAttribute('visible','')">打开表单对话框</oas-button>
  <oas-modal id="modal-guard" title="编辑资料" ok-text="保存">
    <p>点「取消」/ ✕ / 遮罩 / Esc 都会被拦截并提示；点「保存」正常关闭。</p>
    <oas-space direction="vertical" size="small" style="width: 100%">
      <oas-input placeholder="昵称" value="张三"></oas-input>
    </oas-space>
  </oas-modal>
</DemoBlock>

## 关闭入口三开关

`no-esc-close`（禁 Esc）、`no-mask-close`（禁遮罩点击）、`no-close-btn`（隐藏 ✕）——三个关闭入口各自独立可配，把关闭控制权交给宿主。

<DemoBlock title="关闭入口三开关">
  <oas-button onclick="document.querySelector('#modal-switch').setAttribute('visible','')">打开极简对话框</oas-button>
  <oas-modal id="modal-switch" title="仅按钮关闭" no-esc-close no-close-btn>
    <p>Esc 与 ✕ 均不可用（遮罩点击仍可关闭），关闭入口只剩底部按钮。</p>
  </oas-modal>
</DemoBlock>

## 自定义底部（footer 插槽）

`slot="footer"` 有内容时自动隐藏内置确定/取消按钮，底部完全由插槽接管。

<DemoBlock title="footer 插槽">
  <oas-button type="primary" onclick="document.querySelector('#modal-footer').setAttribute('visible','')">打开自定义底部</oas-button>
  <oas-modal id="modal-footer" title="任务详情">
    <p>底部按钮由插槽完全接管（内置确定/取消自动隐藏）。</p>
    <span slot="footer">
      <oas-button onclick="closeModal('modal-footer'); message.info('已取消')">取消</oas-button>
      <oas-button type="primary" onclick="closeModal('modal-footer'); message.success('已提交')">提交任务</oas-button>
    </span>
  </oas-modal>
</DemoBlock>

## 运行时更新（handle.update）

`handle.update(partialOptions)` 运行时增量更新标题 / 内容 / 按钮文案，不影响已绑定的回调。

<DemoBlock title="handle.update()">
  <oas-button type="primary" onclick="openUpdate()">打开并 3 秒后更新</oas-button>
</DemoBlock>

## 命令式语义 alertdialog

命令式确认框 / prompt 的 dialog 语义为 `role="alertdialog"`（读屏立即打断播报）；声明式 `<oas-modal>` 缺省保持 `dialog`，可用 `role` 属性手动指定。

<DemoBlock title="alertdialog 语义">
  <oas-button onclick="document.querySelector('#modal-alert').setAttribute('visible','')">打开 alertdialog</oas-button>
  <oas-modal id="modal-alert" title="重要操作" role="alertdialog" type="warning">
    <p><code>role="alertdialog"</code>：读屏立即打断当前播报；声明式缺省为 dialog。</p>
  </oas-modal>
</DemoBlock>

## 遮罩样式与顶部贴边

遮罩背景走 `--oas-modal-mask-bg` 变量（缺省 overlay token），`--oas-modal-mask-blur` 可选背景模糊；`position="top"` 让对话框贴视口顶缘（默认靠上偏移 100px，`centered` 时居中）。

<DemoBlock title="遮罩样式 / position top">
  <oas-space>
    <oas-button onclick="document.querySelector('#modal-mask').setAttribute('visible','')">定制遮罩</oas-button>
    <oas-button onclick="document.querySelector('#modal-top').setAttribute('visible','')">顶部贴边</oas-button>
  </oas-space>
  <oas-modal id="modal-mask" title="定制遮罩" style="--oas-modal-mask-bg: rgb(255 77 79 / 0.18); --oas-modal-mask-blur: 2px">
    <p>遮罩背景来自 <code>--oas-modal-mask-bg</code>（此处红色 18% + 2px 模糊）。</p>
  </oas-modal>
  <oas-modal id="modal-top" title="顶部贴边" position="top">
    <p><code>position="top"</code> 让对话框贴视口顶缘；默认靠上偏移 100px（centered 时垂直居中）。</p>
  </oas-modal>
</DemoBlock>

## 关闭来源事件

`oas-close` 携带 `detail.source`（ok / cancel / close-btn / mask / esc / programmatic）与 `detail.action`（confirm / cancel / close）；非确定路径保留 `oas-cancel`（旧语义）。

<DemoBlock title="关闭来源">
  <oas-button onclick="document.querySelector('#modal-source').setAttribute('visible','')">打开并观察来源</oas-button>
  <oas-modal id="modal-source" title="关闭来源">
    <p>分别用确定 / 取消 / ✕ / 遮罩 / Esc 关闭，观察右上角来源消息。</p>
  </oas-modal>
</DemoBlock>

## 渲染策略

`destroy-on-close` 关闭后清空内容节点（下次打开前重新填充）；`append-to` 把对话框挂载到指定容器（突破宿主 overflow 裁切）。

<DemoBlock title="destroy-on-close / append-to">
  <oas-space>
    <oas-button onclick="fillModalDestroy(); document.querySelector('#modal-destroy').setAttribute('visible','')">destroy-on-close</oas-button>
    <oas-button onclick="document.querySelector('#modal-portal').setAttribute('visible','')">append-to</oas-button>
  </oas-space>
  <oas-modal id="modal-destroy" title="重渲染" destroy-on-close>
    <p>关闭后内容被清空；再次打开前由按钮重新填充。</p>
  </oas-modal>
  <oas-modal id="modal-portal" title="挂载到 body" append-to="body">
    <p>对话框已挂载到 body 级容器（portal），即使宿主在 overflow:hidden 容器内也不被裁切。</p>
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

  // —— 一期能力演示：prompt / update / 事件反馈 ——
  window.openPrompt = () => {
    modal
      .prompt({
        title: '请输入项目名称',
        inputValue: 'oas-ui',
        placeholder: '项目名',
        validator: (v) => v.trim() !== '' || '不能为空',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success(`输入：${r.value}`)
        else message.info('已取消')
      })
  }
  window.openPromptValidated = () => {
    modal
      .prompt({
        title: '设置昵称',
        placeholder: '至少 4 个字符',
        validator: (v) => v.length >= 4 || '昵称至少 4 个字符',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success(`昵称：${r.value}`)
      })
  }
  window.openPromptTextarea = () => {
    modal
      .prompt({
        title: '意见反馈',
        inputType: 'textarea',
        placeholder: '请描述你的建议…',
        validator: (v) => v.trim().length >= 10 || '至少输入 10 个字符',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success('反馈已提交')
      })
  }
  window.openPromptPassword = () => {
    modal
      .prompt({
        title: '设置密码',
        inputType: 'password',
        placeholder: '8-16 位，含字母和数字',
        inputPattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,16}$',
        inputErrorMessage: '需 8-16 位且同时包含字母和数字',
      })
      .then((r) => {
        if (r.action === 'confirm') message.success('密码设置成功')
      })
  }
  window.openUpdate = () => {
    const handle = modal.confirm({
      title: '处理中…',
      content: '3 秒后自动更新标题与文案。',
      onOk: () => message.success('已完成'),
    })
    setTimeout(() => {
      handle.update({
        title: '处理完成',
        content: '状态已更新，点击「完成」结束。',
        okText: '完成',
      })
    }, 3000)
  }
  window.fillModalDestroy = () => {
    const el = document.getElementById('modal-destroy')
    if (el.children.length === 0) {
      el.innerHTML = '<p>重新填充的内容（来自 fillModalDestroy）。</p>'
    }
  }

  // 关闭拦截：确定放行，其余来源拦截提示
  const guard = document.getElementById('modal-guard')
  guard.addEventListener('oas-before-close', (e) => {
    if (e.detail.source === 'ok') return
    e.preventDefault()
    message.warning('有未保存的修改，请先保存再关闭')
  })

  // 关闭来源：右上角反馈 source + action
  const sourceModal = document.getElementById('modal-source')
  sourceModal.addEventListener('oas-close', (e) => {
    const { source, action } = e.detail
    message.info(`关闭来源：${source}（action=${action}）`)
  })
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
| `append-to` | — | — | — |
| `cancel-text` | 取消按钮文案；缺省走 locale `modal.cancel` | — | — |
| `centered` | 对话框垂直居中显示 | `boolean` | — |
| `destroy-on-close` | — | `boolean` | — |
| `draggable` | 可通过标题栏拖动对话框 | `boolean` | — |
| `focus-ok` | 打开时焦点移入「确定」按钮（默认移入「取消」按钮） | `boolean` | — |
| `fullscreen` | 全屏显示：对话框铺满视口、无圆角与边距（优先级高于 width / centered / draggable） | `boolean` | — |
| `initial-focus` | — | — | — |
| `loading` | 确定按钮进入 loading 态（禁用 + 转圈），禁止重复触发确定 | `boolean` | — |
| `no-cancel` | 隐藏取消按钮（底部仅剩「确定」；语义变体确认框内置） | `boolean` | — |
| `no-close-btn` | — | `boolean` | — |
| `no-esc-close` | — | `boolean` | — |
| `no-focus-trap` | — | `boolean` | — |
| `no-footer` | 隐藏底部操作按钮 | `boolean` | — |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | — |
| `no-scroll-lock` | — | `boolean` | — |
| `ok-text` | 确定按钮文案；缺省走 locale `modal.ok` | — | — |
| `position` | — | — | — |
| `role` | — | `string` | `dialog` |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `type` | 语义变体：`info`/`success`/`warning`/`error`，正文顶部渲染对应语义图标 | `ModalVariant` | — |
| `visible` | 是否显示 | `boolean` | — |
| `width` | 对话框宽度（px 或百分比） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-close` | — |
| `oas-cancel` | 取消：取消按钮 / ✕ / 遮罩点击 / Esc |
| `oas-close` | — |
| `oas-ok` | 点击「确定」 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `description` | — |
| `footer` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

`role="dialog"` + `aria-modal="true"`，打开时焦点移入「取消」按钮（`focus-ok` 时移入「确定」按钮），关闭后还原。
