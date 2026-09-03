# Popconfirm 气泡确认

在触发元素旁显示确认气泡，常用于删除等危险操作前的二次确认。基于浮层定位引擎：12 方位 + 溢出自动翻转 + 箭头指向 + fixed 定位（不被容器裁剪）。

## 基础用法

点击触发元素弹出气泡；确定 / 取消 / Esc / 点击外部均会关闭，并派发对应事件（`oas-ok` / `oas-cancel`，detail 含 `source` 与原生 `event`）。

<DemoBlock title="基础用法">
  <oas-popconfirm id="pc-basic" title="确定删除这条数据吗？" description="删除后将无法恢复。">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

## 受控显示

`open` 属性受控；显隐变化派发 `oas-open-change`，`detail.reason` 标明来源（`trigger` / `ok` / `cancel` / `esc` / `outside` / `api`）。

<DemoBlock title="受控显示（oas-open-change）">
  <oas-space size="small" align="center">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); pcCtrl(true)">打开确认</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); pcCtrl(false)">关闭</oas-button>
    <oas-tag id="pc-status" type="info">closed</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-ctrl" title="确定删除这条数据吗？">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

## 异步确认

监听 `oas-ok` 后同步设置 `ok-loading`（确定按钮转 loading 并阻止本次自动关闭），请求完成后移除属性并关闭气泡。loading 期间再次点击确定不派发事件（防重复提交）。

<DemoBlock title="异步确认（ok-loading）">
  <oas-popconfirm id="pc-async" title="提交后归档该订单？" ok-text="提交">
    <oas-button type="primary">归档订单</oas-button>
  </oas-popconfirm>
</DemoBlock>

## 语义主题

`theme` 三态：`default` / `warning` / `danger`——联动默认图标、图标色与确定按钮色阶，危险删除一步到位。

<DemoBlock title="语义主题">
  <oas-space size="small">
    <oas-popconfirm title="同步全部配置到线上？">
      <oas-button size="small">default</oas-button>
    </oas-popconfirm>
    <oas-popconfirm theme="warning" title="该操作耗时较长，继续吗？">
      <oas-button size="small" type="warning">warning</oas-button>
    </oas-popconfirm>
    <oas-popconfirm theme="danger" title="确定清空回收站吗？" description="清空后所有项目不可恢复。">
      <oas-button size="small" type="danger">danger</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## 文案与图标

`ok-text` / `cancel-text` 自定义按钮文案（空值回落 locale）；`description` 二级说明文案（属性与 `slot="description"` 双通道）；`hide-icon` 隐藏图标；`icon` 插槽替换默认图标；`show-cancel="false"` 单按钮确认。

<DemoBlock title="文案与图标">
  <oas-space size="small">
    <oas-popconfirm title="移除该成员？" description="移除后其将失去项目访问权限。" ok-text="移除" cancel-text="再想想">
      <oas-button size="small">自定义文案</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="已保存全部修改。" ok-text="知道了" show-cancel="false">
      <oas-button size="small">单按钮</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="清空浏览器缓存？" hide-icon ok-text="清空">
      <oas-button size="small">无图标</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="订阅版本更新公告？">
      <span slot="icon" style="font-size: 16px; color: var(--oas-color-primary)">✉</span>
      <oas-button size="small">自定义图标</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## 十二方位

`placement` 支持 12 方位（`top` / `top-start` / `top-end` / `bottom` 系与 `left` / `right` 系同理）；空间不足时自动沿主轴翻转（`auto-adjust-overflow="false"` 可关闭）。旧 `position` 属性值仍然兼容。

<DemoBlock title="十二方位">
  <oas-space direction="vertical" size="large" align="center" style="width: 100%; padding: 16px 0">
    <div style="display: flex; justify-content: center; gap: 12px">
      <oas-popconfirm title="顶部起始" placement="top-start"><oas-button size="small">top-start</oas-button></oas-popconfirm>
      <oas-popconfirm title="顶部居中" placement="top"><oas-button size="small">top</oas-button></oas-popconfirm>
      <oas-popconfirm title="顶部末尾" placement="top-end"><oas-button size="small">top-end</oas-button></oas-popconfirm>
    </div>
    <div style="display: flex; justify-content: space-between; width: 100%; padding: 0 64px">
      <oas-space direction="vertical" size="small">
        <oas-popconfirm title="左侧起始" placement="left-start"><oas-button size="small">left-start</oas-button></oas-popconfirm>
        <oas-popconfirm title="左侧居中" placement="left"><oas-button size="small">left</oas-button></oas-popconfirm>
        <oas-popconfirm title="左侧末尾" placement="left-end"><oas-button size="small">left-end</oas-button></oas-popconfirm>
      </oas-space>
      <oas-space direction="vertical" size="small">
        <oas-popconfirm title="右侧起始" placement="right-start"><oas-button size="small">right-start</oas-button></oas-popconfirm>
        <oas-popconfirm title="右侧居中" placement="right"><oas-button size="small">right</oas-button></oas-popconfirm>
        <oas-popconfirm title="右侧末尾" placement="right-end"><oas-button size="small">right-end</oas-button></oas-popconfirm>
      </oas-space>
    </div>
    <div style="display: flex; justify-content: center; gap: 12px">
      <oas-popconfirm title="底部起始" placement="bottom-start"><oas-button size="small">bottom-start</oas-button></oas-popconfirm>
      <oas-popconfirm title="底部居中" placement="bottom"><oas-button size="small">bottom</oas-button></oas-popconfirm>
      <oas-popconfirm title="底部末尾" placement="bottom-end"><oas-button size="small">bottom-end</oas-button></oas-popconfirm>
    </div>
  </oas-space>
</DemoBlock>

## 触发方式与禁用

`trigger` 支持空格分隔多选（`click` / `hover` / `focus` / `contextmenu` / `manual`，默认 `click`）；`disabled` 禁用后不弹气泡（视觉降饱和）。键盘可达：打开时焦点移入气泡（确定按钮优先），关闭后焦点回到触发元素，Esc 关闭最顶层气泡。

<DemoBlock title="触发方式与禁用">
  <oas-space size="small">
    <oas-popconfirm title="悬停触发" trigger="hover">
      <oas-button size="small">hover</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="聚焦触发" trigger="focus">
      <oas-button size="small">focus</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="右键触发" trigger="contextmenu">
      <oas-button size="small">contextmenu</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="禁用状态" disabled>
      <oas-button size="small">disabled</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## 自定义操作区

`slot="actions"` 有内容时替代内置按钮区，配合 `show()` / `hide()` 方法表达确认语义（`oas-open-change` 的 `reason` 为 `api`）。

<DemoBlock title="自定义操作区（actions 插槽）">
  <oas-popconfirm id="pc-actions" title="将该项目移入归档？">
    <oas-button>归档项目</oas-button>
    <div slot="actions" style="display: flex; justify-content: flex-end; gap: 8px">
      <oas-button size="small" onclick="pcArchiveSkip(event)">跳过</oas-button>
      <oas-button size="small" type="primary" onclick="pcArchiveDo(event)">归档</oas-button>
    </div>
  </oas-popconfirm>
</DemoBlock>

## 虚拟锚点

`virtual` 模式以坐标（`virtual-x` / `virtual-y`）或元素（`virtual-anchor`）为锚点定位，触发与关闭完全由宿主控制（不响应外点关闭）。

<DemoBlock title="虚拟锚点（virtual）">
  <oas-space size="small" align="center">
    <oas-button size="small" onclick="pcVirtualToggle(event)">在标记处弹出</oas-button>
    <oas-tag id="pc-anchor" type="warning">锚点</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-virtual" virtual virtual-anchor="#pc-anchor" title="以虚拟锚点定位的气泡" trigger="manual">
  </oas-popconfirm>
</DemoBlock>

<DemoBlock title="虚拟坐标（virtual-x / virtual-y）">
  <oas-space size="small" align="center">
    <oas-button size="small" onclick="pcVirtPointToggle(event)">在 (220, 140) 处弹出</oas-button>
    <oas-tag id="pc-virt-xy-status" type="info">closed</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-virt-xy" virtual virtual-x="220" virtual-y="140" title="由坐标定位的气泡" trigger="manual">
  </oas-popconfirm>
</DemoBlock>

## 定位细节（arrow / auto-adjust-overflow / position / width）

`arrow="false"` 隐藏箭头；`auto-adjust-overflow="false"` 关闭空间不足时的自动翻转/避让；旧 `position` 属性（四基向）仍然兼容；`width` 固定面板宽度。

<DemoBlock title="定位细节">
  <oas-space size="small" wrap>
    <oas-popconfirm title="删除文件？" description="arrow=false 隐藏箭头。" placement="bottom" arrow="false">
      <oas-button size="small">无箭头</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="宽度定制" description="width=280：面板固定 280px 宽。" placement="bottom" width="280">
      <oas-button size="small">width=280</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="保持方向" description="auto-adjust-overflow=false：空间不足不翻转。" placement="bottom" auto-adjust-overflow="false">
      <oas-button size="small">不自动调整</oas-button>
    </oas-popconfirm>
    <oas-popconfirm title="旧 position" description="position=top 与 placement=top 等价。" position="top">
      <oas-button size="small">position=top</oas-button>
    </oas-popconfirm>
  </oas-space>
</DemoBlock>

## 事件绑定（onoas-*）

气泡事件可在模板上直接经 `onoas-*` 属性绑定（`onoas-ok` / `onoas-cancel`），等价于宿主框架里的 `@oas-ok` 监听。

<DemoBlock title="事件反馈">
  <oas-popconfirm id="pc-onoas" title="确定删除这条数据吗？" description="删除后将无法恢复。"
    onoas-ok="message.success('已删除')" onoas-cancel="message.info('已取消')">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  // 受控显示：oas-open-change 事件同步状态（reason 标明来源）
  const pc = document.getElementById('pc-ctrl')
  const status = document.getElementById('pc-status')
  if (pc && status) {
    pc.addEventListener('oas-open-change', (e) => {
      const { open, reason } = e.detail
      status.textContent = open ? `opened (${reason})` : `closed (${reason})`
    })
  }
  window.pcCtrl = (open) => {
    if (open) pc.setAttribute('open', '')
    else pc.removeAttribute('open')
  }

  // 异步确认：监听 oas-ok → 同步置 ok-loading（阻止本次关闭）→ 完成后关闭
  const pcAsync = document.getElementById('pc-async')
  if (pcAsync) {
    pcAsync.addEventListener('oas-ok', () => {
      pcAsync.setAttribute('ok-loading', '')
      message.loading('正在提交…')
      setTimeout(() => {
        pcAsync.removeAttribute('ok-loading')
        pcAsync.removeAttribute('open')
        message.success('已归档')
      }, 1500)
    })
  }

  // 自定义操作区：actions 插槽按钮 + hide() 方法
  const actions = document.getElementById('pc-actions')
  window.pcArchiveSkip = (e) => {
    e.stopPropagation()
    actions?.hide()
    message.info('已跳过')
  }
  window.pcArchiveDo = (e) => {
    e.stopPropagation()
    actions?.hide()
    message.success('已归档')
  }

  // 虚拟锚点：受控开关
  const virtual = document.getElementById('pc-virtual')
  window.pcVirtualToggle = (e) => {
    e.stopPropagation()
    if (virtual?.hasAttribute('open')) virtual.removeAttribute('open')
    else virtual?.setAttribute('open', '')
  }

  // 虚拟坐标：受控开关 + 状态回显
  const virtXy = document.getElementById('pc-virt-xy')
  const virtXyStatus = document.getElementById('pc-virt-xy-status')
  window.pcVirtPointToggle = (e) => {
    e.stopPropagation()
    if (virtXy?.hasAttribute('open')) virtXy.removeAttribute('open')
    else virtXy?.setAttribute('open', '')
  }
  virtXy?.addEventListener('oas-open-change', (e) => {
    if (virtXyStatus) virtXyStatus.textContent = e.detail.open ? 'opened（virtual-x/y）' : 'closed'
  })
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | — | `string` | `true` |
| `auto-adjust-overflow` | — | `string` | `true` |
| `cancel-text` | — | `string` | — |
| `description` | — | `string` | — |
| `disabled` | — | `boolean` | — |
| `hide-icon` | — | `boolean` | — |
| `ok-loading` | — | `boolean` | — |
| `ok-text` | — | `string` | — |
| `open` | 是否显示气泡 | `boolean` | — |
| `placement` | — | `string` | — |
| `position` | 气泡位置 | `string` | — |
| `show-cancel` | — | `string` | `true` |
| `theme` | — | `string` | `default` |
| `title` | 确认文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `trigger` | — | `string` | `click` |
| `virtual` | — | `boolean` | — |
| `virtual-anchor` | — | — | — |
| `virtual-x` | — | — | — |
| `virtual-y` | — | — | — |
| `width` | — | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消：取消按钮 / Esc / 外部点击，`detail: { source: this, event: e }` |
| `oas-ok` | 点击「确定」，随后气泡自动收起，`detail: { source: this, event: e }` |
| `oas-open-change` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `actions` | — |
| `description` | — |
| `icon` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

### 方法

| 方法 | 说明 |
| --- | --- |
| `show()` | 打开气泡（等价 `open` 属性，`oas-open-change` 的 `reason` 为 `api`） |
| `hide()` | 关闭气泡（等价移除 `open`，`oas-open-change` 的 `reason` 为 `api`） |
| `restoreFocus()` | 焦点还原到触发元素 |

面板 `role="alertdialog"`；打开时焦点移入气泡（确定按钮优先），关闭后焦点回到触发元素；trigger 同步 `aria-expanded` / `aria-controls`；Esc 关闭最顶层气泡（嵌套场景逐层关闭）。
