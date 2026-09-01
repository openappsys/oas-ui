# Drawer 抽屉

从屏幕边缘滑出的浮层面板，常用于筛选条件、详情信息、表单编辑等场景。

## 四向滑出

`placement` 支持 `left` / `right` / `top` / `bottom` 四向；**横向管宽、纵向管高**——`width` / `size` 在 top/bottom 下作用于面板高度。

<DemoBlock title="四向 placement">
  <oas-space>
    <oas-button type="primary" onclick="openDrawer('drawer-top')">顶部抽屉</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-bottom')">底部抽屉</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-left')">左侧抽屉</oas-button>
    <oas-button type="primary" onclick="openDrawer('drawer-right')">右侧抽屉</oas-button>
  </oas-space>
  <oas-drawer id="drawer-top" title="顶部抽屉" placement="top" size="small">
    <p>从顶部滑出；`size="small"` 此时把高度设为 256px。</p>
  </oas-drawer>
  <oas-drawer id="drawer-bottom" title="底部抽屉" placement="bottom" width="360px">
    <p>从底部滑出，移动端操作面板的主流形态。</p>
  </oas-drawer>
  <oas-drawer id="drawer-left" title="筛选条件" placement="left" width="360px">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <p>状态：全部</p>
      <p>分类：全部</p>
      <p>排序：创建时间</p>
    </oas-space>
  </oas-drawer>
  <oas-drawer id="drawer-right" title="抽屉标题" placement="right">
    <p>右侧是默认方向，点击遮罩、关闭按钮或按 Esc 均可关闭。</p>
  </oas-drawer>
</DemoBlock>

## 动画与生命周期事件

打开/关闭有过渡动画（transform/opacity，`prefers-reduced-motion` 下自动降级为直切）。生命周期事件：`oas-open` / `oas-opened` / `oas-close`（detail 含关闭来源）/ `oas-closed`。

<DemoBlock title="生命周期事件">
  <oas-button type="primary" onclick="document.querySelector('#drawer-life').setAttribute('visible','')">打开并观察事件</oas-button>
  <oas-drawer id="drawer-life" title="事件日志">
    <p>操作下方按钮/遮罩/Esc，观察右上角事件消息（`oas-close` 会带上关闭来源）。</p>
  </oas-drawer>
</DemoBlock>

## 关闭拦截（before-close）

监听可取消的 `oas-before-close`（`event.detail.source` 标明关闭来源），`preventDefault()` 可阻止关闭——表单未保存等数据保护场景。

<DemoBlock title="关闭拦截">
  <oas-button type="primary" onclick="document.querySelector('#drawer-guard').setAttribute('visible','')">打开表单抽屉</oas-button>
  <oas-drawer id="drawer-guard" title="编辑资料" ok-text="保存" cancel-text="放弃">
    <p>点「放弃」/ ✕ / 遮罩 / Esc 都会被拦截：提示「有未保存的修改」并保持打开。点「保存」正常关闭。</p>
    <oas-space direction="vertical" size="small">
      <oas-input placeholder="昵称" value="张三"></oas-input>
      <oas-input placeholder="邮箱" value="zhang@example.com"></oas-input>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## 自定义底部 / 头部扩展

`footer` 插槽有内容时自动隐藏内置确定/取消按钮；`header-actions` 插槽在标题右侧渲染扩展操作区；`ok-text` / `cancel-text` 可覆盖按钮文案。

<DemoBlock title="插槽与文案">
  <oas-button type="primary" onclick="document.querySelector('#drawer-custom').setAttribute('visible','')">打开自定义抽屉</oas-button>
  <oas-drawer id="drawer-custom" title="任务详情">
    <span slot="header-actions"><oas-tag color="green">进行中</oas-tag></span>
    <p>标题右侧的标签来自 `header-actions` 插槽。</p>
    <span slot="footer">
      <oas-button onclick="document.querySelector('#drawer-custom').removeAttribute('visible')">取消</oas-button>
      <oas-button type="primary" onclick="document.querySelector('#drawer-custom').removeAttribute('visible'); message.success('已提交')">提交任务</oas-button>
    </span>
  </oas-drawer>
</DemoBlock>

## loading 与确定按钮异步态

`loading` 在内容区显示骨架占位并禁用按钮（详情异步加载）；`ok-loading` 让确定按钮进入 loading（转圈 + 防重复触发），配合异步提交。

<DemoBlock title="loading / 确定异步态">
  <oas-space>
    <oas-button onclick="openLoadingDrawer()">打开 loading 抽屉</oas-button>
    <oas-button type="primary" onclick="openAsyncDrawer()">打开异步提交抽屉</oas-button>
  </oas-space>
  <oas-drawer id="drawer-loading" title="详情加载中" loading>
    <p>内容异步加载中，此段会被骨架占位。</p>
  </oas-drawer>
  <oas-drawer id="drawer-async" title="提交配置" ok-text="提交">
    <p>点「提交」后确定按钮进入 loading，2 秒后自动关闭并提示成功。</p>
  </oas-drawer>
</DemoBlock>

## 拖拽调宽（resizable）

`resizable` 在面板自由边显示拖拽条，可拖拽或方向键调整宽度/高度（`resize-min` / `resize-max` 钳制），结束派发 `oas-resize`。

<DemoBlock title="拖拽调宽">
  <oas-button type="primary" onclick="document.querySelector('#drawer-resize').setAttribute('visible','')">打开可调宽抽屉</oas-button>
  <oas-drawer id="drawer-resize" title="可调宽" width="480px" resizable resize-min="280" resize-max="800">
    <p>拖拽面板左侧边缘的竖条调宽（也可用方向键），释放后右上角提示新宽度。</p>
  </oas-drawer>
</DemoBlock>

## 移动端手势：拖拽关闭 + 吸附点

`swipeable` 开启拖拽关闭（把手/标题栏起手，超过阈值或快速滑动即关）；底部抽屉配 `snap-points`（视口比例或像素）可在释放后吸附最近点。

<DemoBlock title="底部手势抽屉">
  <oas-button type="primary" onclick="document.querySelector('#drawer-snap').setAttribute('visible','')">打开吸附抽屉</oas-button>
  <oas-button onclick="document.querySelector('#drawer-swipe').setAttribute('visible','')">打开拖拽关闭抽屉</oas-button>
  <oas-drawer id="drawer-snap" title="吸附点" placement="bottom" snap-points="0.4, 0.85" swipeable>
    <p>拖拽顶部把手：释放后吸附到 40% / 85% 视口高度；拖过阈值或快速滑动即关闭。</p>
  </oas-drawer>
  <oas-drawer id="drawer-swipe" title="拖拽关闭" placement="bottom" width="420px" swipeable>
    <p>向下拖拽把手即可关闭。</p>
  </oas-drawer>
</DemoBlock>

## 命令式 API

`drawer(options)` 免模板即时开启，返回 `{ close() }` 句柄；`onOk` 返回 Promise 时自动管理确定按钮 loading。

<DemoBlock title="命令式开启">
  <oas-space>
    <oas-button onclick="openImperative()">drawer() 基础</oas-button>
    <oas-button type="primary" onclick="openImperativeAsync()">drawer() 异步提交</oas-button>
  </oas-space>
</DemoBlock>

## 嵌套抽屉

多个抽屉叠开时自动栈管理：后开者层级更高（z-index 递增），Esc 逐层关闭，焦点陷阱只作用于最上层。

<DemoBlock title="嵌套层级">
  <oas-button type="primary" onclick="document.querySelector('#drawer-outer').setAttribute('visible','')">打开外层抽屉</oas-button>
  <oas-drawer id="drawer-outer" title="外层抽屉">
    <p>在外层里再打开一个内层抽屉，观察层级叠加。</p>
    <oas-button type="primary" onclick="document.querySelector('#drawer-inner').setAttribute('visible','')">打开内层抽屉</oas-button>
  </oas-drawer>
  <oas-drawer id="drawer-inner" title="内层抽屉" width="420px">
    <p>内层抽屉盖在外层之上；按 Esc 先关内层，再按一次关外层。</p>
  </oas-drawer>
</DemoBlock>

## 渲染与挂载策略

`destroy-on-close` 关闭动画结束后清空内容（下次打开重新初始化）；`append-to` 把面板挂载到指定容器（突破 overflow 裁切）。

<DemoBlock title="destroy-on-close / append-to">
  <oas-space>
    <oas-button onclick="document.querySelector('#drawer-destroy').setAttribute('visible','')">destroy-on-close</oas-button>
    <oas-button onclick="document.querySelector('#drawer-portal').setAttribute('visible','')">append-to</oas-button>
  </oas-space>
  <oas-drawer id="drawer-destroy" title="重渲染" destroy-on-close>
    <p>关闭后内容被清空，下次打开前重新填充（见下方演示按钮）。</p>
    <oas-button onclick="fillDestroyContent()">填充内容</oas-button>
  </oas-drawer>
  <oas-drawer id="drawer-portal" title="挂载到 body" append-to="body">
    <p>面板已挂载到 body 级容器，即使宿主处于 overflow:hidden 容器内也不被裁切。</p>
  </oas-drawer>
</DemoBlock>

## 标题区 / 关闭按钮 / Esc 开关

`no-header` 隐藏整个标题区、`no-close-btn` 隐藏 ✕、`no-esc-close` 禁用 Esc 关闭——把关闭入口的控制权交给宿主。

<DemoBlock title="入口开关">
  <oas-button type="primary" onclick="document.querySelector('#drawer-bare').setAttribute('visible','')">打开极简抽屉</oas-button>
  <oas-drawer id="drawer-bare" no-header no-close-btn no-esc-close>
    <p>无标题、无 ✕、Esc 不关——只能通过下方按钮或遮罩点击关闭（遮罩点击仍有效）。</p>
    <oas-button onclick="document.querySelector('#drawer-bare').removeAttribute('visible')">关闭</oas-button>
  </oas-drawer>
</DemoBlock>

## 初始焦点

`initial-focus` 指定打开时聚焦的元素（CSS 选择器，面板内优先、其次 light DOM）；无匹配回退 ✕。

<DemoBlock title="初始焦点">
  <oas-button type="primary" onclick="document.querySelector('#drawer-focus').setAttribute('visible','')">打开即聚焦输入框</oas-button>
  <oas-drawer id="drawer-focus" title="新建任务" initial-focus="#task-name" ok-text="创建">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <oas-input id="task-name" placeholder="任务名称"></oas-input>
      <oas-input placeholder="负责人"></oas-input>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## 受控显示

`visible` 为受控属性：由宿主（按钮 / JS）设置或移除；关闭后可通过监听事件移除 `visible`。

<DemoBlock title="受控显示（visible）">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#drawer-ctrl').setAttribute('visible','')">打开（设置 visible）</oas-button>
    <oas-button onclick="document.querySelector('#drawer-ctrl').removeAttribute('visible')">关闭（移除 visible）</oas-button>
  </oas-space>
  <oas-drawer id="drawer-ctrl" title="受控显示">
    <p>外部按钮直接设置 / 移除 `visible` 控制显隐，无需依赖底部按钮。</p>
  </oas-drawer>
</DemoBlock>

## 无底部按钮 / 禁止遮罩关闭

<DemoBlock title="no-footer / no-mask-close">
  <oas-space>
    <oas-button onclick="document.querySelector('#drawer-nofooter').setAttribute('visible','')">无底部按钮</oas-button>
    <oas-button type="primary" onclick="document.querySelector('#drawer-nomask').setAttribute('visible','')">禁止遮罩关闭</oas-button>
  </oas-space>
  <oas-drawer id="drawer-nofooter" title="只读详情" no-footer>
    <p>隐藏底部操作区，仅保留 ✕ 与 Esc 关闭入口。</p>
  </oas-drawer>
  <oas-drawer id="drawer-nomask" title="必须确认" no-mask-close>
    <p>点击遮罩不会关闭，需通过 ✕ / Esc 或底部按钮关闭。</p>
  </oas-drawer>
</DemoBlock>

## 尺寸档位

<DemoBlock title="尺寸档位">
  <oas-button onclick="document.querySelector('#drawer-size-small').setAttribute('visible','')">small（256px）</oas-button>
  <oas-button onclick="document.querySelector('#drawer-size-large').setAttribute('visible','')">large（736px）</oas-button>
  <oas-drawer id="drawer-size-small" title="小抽屉" size="small">
    <p>small 档：256px，适合窄屏辅助信息。</p>
  </oas-drawer>
  <oas-drawer id="drawer-size-large" title="大抽屉" size="large">
    <p>large 档：736px，适合复杂表单或详情场景。</p>
  </oas-drawer>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, drawer } = await import('@oas-ui/ui')
  window.message = message
  window.drawer = drawer
  window.openDrawer = (id) => document.getElementById(id).setAttribute('visible', '')

  // 生命周期事件演示：右上角消息反馈（oas-close 带来源）
  const life = document.getElementById('drawer-life')
  for (const name of ['open', 'opened', 'close', 'closed']) {
    life.addEventListener(`oas-${name}`, (e) => {
      const detail = e.detail && e.detail.source ? `（source=${e.detail.source}）` : ''
      message.info(`oas-${name}${detail}`)
    })
  }

  // 关闭拦截：未保存修改提示（确定按钮放行）
  const guard = document.getElementById('drawer-guard')
  guard.addEventListener('oas-before-close', (e) => {
    if (e.detail.source === 'ok') return
    e.preventDefault()
    message.warning('有未保存的修改，请先保存再关闭')
  })

  // resizable：结束提示新宽度
  const rz = document.getElementById('drawer-resize')
  rz.addEventListener('oas-resize', (e) => {
    message.info(`宽度调整为 ${e.detail.size}px`)
  })

  // loading：模拟详情异步加载，2 秒后移除 loading
  const loading = document.getElementById('drawer-loading')
  window.openLoadingDrawer = () => {
    loading.setAttribute('visible', '')
    loading.setAttribute('loading', '')
    setTimeout(() => {
      if (loading.hasAttribute('visible')) loading.removeAttribute('loading')
    }, 2000)
  }

  // ok-loading：确定按钮异步提交
  const asyncD = document.getElementById('drawer-async')
  asyncD.deferOkClose = true
  asyncD.addEventListener('oas-ok', () => {
    asyncD.setAttribute('ok-loading', '')
    setTimeout(() => {
      asyncD.removeAttribute('ok-loading')
      asyncD.removeAttribute('visible')
      message.success('提交成功')
    }, 2000)
  })
  window.openAsyncDrawer = () => asyncD.setAttribute('visible', '')

  // 命令式 API
  window.openImperative = () => {
    const handle = drawer({
      title: '命令式抽屉',
      content: 'drawer(options) 免模板开启，返回 { close() } 句柄。',
      onOk: () => message.success('已确认'),
    })
    setTimeout(() => handle.close(), 5000)
  }
  window.openImperativeAsync = () => {
    drawer({
      title: '异步提交',
      content: '点击确定后进入 loading，1.5 秒后自动关闭。',
      onOk: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            message.success('异步提交成功')
            resolve()
          }, 1500)
        }),
    })
  }

  // destroy-on-close：打开时若内容为空则填充
  const destroy = document.getElementById('drawer-destroy')
  window.fillDestroyContent = () => {
    destroy.innerHTML = '<p>重新填充的内容。</p>'
  }
  destroy.addEventListener('oas-open', () => {
    if (destroy.children.length === 0) {
      destroy.innerHTML = '<p>首次打开填充的内容。</p>'
    }
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | — | — | — |
| `cancel-text` | — | — | — |
| `destroy-on-close` | — | `boolean` | — |
| `initial-focus` | — | — | — |
| `loading` | — | `boolean` | — |
| `no-close-btn` | — | `boolean` | — |
| `no-esc-close` | — | `boolean` | — |
| `no-focus-trap` | — | `boolean` | — |
| `no-footer` | 隐藏底部操作按钮 | `boolean` | — |
| `no-header` | — | `boolean` | — |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | — |
| `no-scroll-lock` | — | `boolean` | — |
| `ok-loading` | — | `boolean` | — |
| `ok-text` | — | — | — |
| `placement` | 滑出方向 | `string` | `right` |
| `resizable` | — | `boolean` | — |
| `resize-max` | — | `string` | `1000` |
| `resize-min` | — | `string` | `160` |
| `size` | 预设尺寸档位或具体值：`small`（256px）/ `medium`（378px）/ `large`（736px），或直接写如 `512px`、`40%` | — | — |
| `snap-points` | — | — | — |
| `swipeable` | — | `boolean` | — |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `visible` | 是否显示 | `boolean` | — |
| `width` | 抽屉宽度（px 或百分比），优先级高于 `size` | — | — |
| `z-index` | — | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-close` | — |
| `oas-close` | 关闭：取消按钮 / ✕ / 遮罩点击 / Esc，`detail: { source }` |
| `oas-closed` | — |
| `oas-ok` | 点击「确定」 |
| `oas-open` | — |
| `oas-opened` | — |
| `oas-resize` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `footer` | — |
| `header-actions` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

`role="dialog"` + `aria-modal="true"`；打开时移入焦点（默认 ✕，可 `initial-focus` 指定），关闭后归还来源焦点。
