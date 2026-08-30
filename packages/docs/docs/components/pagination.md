# Pagination 分页

数据分页导航，支持页码省略、前后翻页、自定义相邻页码数、总数展示、每页条数切换与快速跳转。

## 基础用法

<DemoBlock title="基础用法">
  <oas-pagination total="100" page-size="10" current="1"></oas-pagination>
</DemoBlock>

## 页码省略

<DemoBlock title="多页省略">
  <oas-pagination total="500" page-size="10" current="25"></oas-pagination>
</DemoBlock>

## 相邻页码数

<DemoBlock title="siblings 控制">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">siblings="1"（默认）</oas-tag>
    <oas-pagination total="200" page-size="10" current="10"></oas-pagination>
    <oas-tag type="info">siblings="2"</oas-tag>
    <oas-pagination total="200" page-size="10" current="10" siblings="2"></oas-pagination>
  </oas-space>
</DemoBlock>

## 页码上限

<DemoBlock title="pager-count 页码按钮数量上限">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">siblings="2"（不设上限，7 个页码钮）</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" siblings="2"></oas-pagination>
    <oas-tag type="info">siblings="2" + pager-count="5"（截断优先，只显示 5 个）</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" siblings="2" pager-count="5"></oas-pagination>
    <oas-tag type="info">pager-count="5"（100 页只显示 5 个页码钮）</oas-tag>
    <oas-pagination total="1000" page-size="10" current="45" pager-count="5"></oas-pagination>
  </oas-space>
</DemoBlock>

超过上限时按当前页居中收缩窗口，省略号两端至少留 2 页（首尾页始终可达）；低于最小值 5 回落 5 并在控制台告警。

## 总条数

<DemoBlock title="show-total 显示总条数">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">show-total 显示「共 X 条」</oas-tag>
    <oas-pagination total="150" page-size="10" show-total></oas-pagination>
    <oas-tag type="info">不设置则隐藏</oas-tag>
    <oas-pagination total="150" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## 每页条数切换

<DemoBlock title="page-sizes 每页条数下拉">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-sizes" total="150" page-size="10" current="1" page-sizes='[10,20,50]'></oas-pagination>
    <oas-tag type="primary" id="pagination-sizes-info">每页 10 条，当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

切换每页条数后回到第 1 页并派发 `oas-change`，`detail: { page: 1, pageSize }`。

## 快速跳转

<DemoBlock title="show-jumper 跳至指定页">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-jumper" total="150" page-size="10" current="3" show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-jumper-info">当前第 3 页</oas-tag>
  </oas-space>
</DemoBlock>

输入页码后回车跳转（越界自动夹取到合法范围），派发 `oas-change`，`detail: { page, pageSize }`。

## 组合用法

<DemoBlock title="总数 + 每页条数 + 快速跳转">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-full" total="520" page-size="20" current="1" show-total page-sizes='[10,20,50,100]' show-jumper></oas-pagination>
    <oas-tag type="primary" id="pagination-full-info">每页 20 条，当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

## 翻页事件

<DemoBlock title="oas-change 事件">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-demo" total="85" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-demo-info">当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

## 禁用状态

<DemoBlock title="disabled 全局禁用">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination disabled total="150" page-size="10" current="3" show-total page-sizes='[10,20,50]' show-jumper></oas-pagination>
    <oas-tag type="info">全部分页钮、每页条数下拉与跳转输入框均禁用</oas-tag>
  </oas-space>
</DemoBlock>

## 尺寸

<DemoBlock title="size 五档（xs / sm / md / lg / xl）">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination size="xs" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="sm" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="md" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="lg" total="100" page-size="10"></oas-pagination>
    <oas-pagination size="xl" total="100" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

默认 `md`；非法值回落 `md` 并在控制台告警。

## 极简模式

<DemoBlock title="simple 极简形态">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination simple total="100" page-size="10" current="3"></oas-pagination>
    <oas-tag type="info">simple + show-jumper 叠加</oas-tag>
    <oas-pagination simple total="100" page-size="10" current="3" show-jumper></oas-pagination>
  </oas-space>
</DemoBlock>

极简形态只渲染前后钮与「当前 / 总页数」文本，与页码省略算法互斥（`simple` 优先）。

## 首末页

<DemoBlock title="show-edges 首末页钮">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">首页（« 禁用）</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="1"></oas-pagination>
    <oas-tag type="info">中间页</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="5"></oas-pagination>
    <oas-tag type="info">末页（» 禁用）</oas-tag>
    <oas-pagination show-edges total="100" page-size="10" current="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## 单页隐藏

<DemoBlock title="hide-on-single 单页不渲染">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">总条数 8、每页 10 → 单页，组件不显示</oas-tag>
    <oas-pagination hide-on-single total="8" page-size="10"></oas-pagination>
    <oas-tag type="info">未设置时单页仍显示（按钮禁用）</oas-tag>
    <oas-pagination total="8" page-size="10"></oas-pagination>
  </oas-space>
</DemoBlock>

## 自定义图标

<DemoBlock title="prev-icon / next-icon 插槽">
  <oas-pagination total="100" page-size="10" current="3">
    <span slot="prev-icon" style="font-size: 12px">«</span>
    <span slot="next-icon" style="font-size: 12px">»</span>
  </oas-pagination>
</DemoBlock>

提供 `slot="prev-icon"` / `slot="next-icon"` 内容时替换默认箭头 `‹` / `›`。

## 自定义总数

<DemoBlock title="total 插槽">
  <oas-pagination total="150" page-size="10" show-total>
    <span slot="total">共 <b>150</b> 条数据</span>
  </oas-pagination>
</DemoBlock>

有 `slot="total"` 内容时替换内置「共 N 条」文案；`show-total` 布尔仍兼容（无插槽内容时显示内置文案）。

## 翻页拦截

<DemoBlock title="oas-before-change 拦截">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-before" total="100" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-before-info">当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

`oas-before-change` 在翻页/跳转前派发，`detail: { page }`；宿主 `preventDefault()` 可取消本次变更（本示例拦截跳转到第 4 页）。切换每页条数不拦截。

## 受控模式

<DemoBlock title="受控 current">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-space size="small">
      <oas-button size="small" id="pagination-prev-page">上一页</oas-button>
      <oas-button size="small" id="pagination-next-page">下一页</oas-button>
      <oas-button size="small" id="pagination-reset">回到第 1 页</oas-button>
    </oas-space>
    <oas-pagination id="pagination-controlled" total="200" page-size="10" current="1"></oas-pagination>
    <oas-tag type="primary" id="pagination-controlled-info">当前第 1 页</oas-tag>
  </oas-space>
</DemoBlock>

外部按钮直接设置 `current` 属性驱动视图跳页（越界自动夹取）；组件自身翻页同样派发 `oas-change` 并回写属性。

## 边界场景

<DemoBlock title="单页 / 首尾禁用">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">单页数据（翻页按钮均禁用）</oas-tag>
    <oas-pagination total="8" page-size="10"></oas-pagination>
    <oas-tag type="info">首页（‹ 禁用）</oas-tag>
    <oas-pagination total="50" page-size="10" current="1"></oas-pagination>
    <oas-tag type="info">末页（› 禁用）</oas-tag>
    <oas-pagination total="50" page-size="10" current="5"></oas-pagination>
  </oas-space>
</DemoBlock>

## 链接模式

<DemoBlock title="href-template 渲染为链接">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">href-template="#page={page}"（点击浏览器原生跳转，中键/右键/新标签可用）</oas-tag>
    <oas-pagination id="pagination-link" href-template="#page={page}" total="100" page-size="10" current="3" show-edges></oas-pagination>
    <oas-tag type="primary" id="pagination-link-info">当前第 3 页</oas-tag>
    <oas-tag type="info">target="_blank" 透传（点击新标签打开）</oas-tag>
    <oas-pagination href-template="#page={page}" target="_blank" total="100" page-size="10" current="3"></oas-pagination>
    <oas-tag type="info">disabled 时降级为不可点击的 span</oas-tag>
    <oas-pagination href-template="#page={page}" disabled total="100" page-size="10" current="3"></oas-pagination>
  </oas-space>
</DemoBlock>

设置 `href-template`（含 `{page}` 占位符）后，页码/前后/首末钮渲染为 `<a href>`，`{page}` 替换为目标页码；`target` 属性透传 `<a target>`。禁用时降级为 span（不可点）。点击仍派发 `oas-change`，`oas-before-change` 取消时会同时阻止原生导航。

## 响应式

<DemoBlock title="responsive 窄屏自动切极简">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination responsive total="500" page-size="10" current="25" show-total></oas-pagination>
    <oas-tag type="info">组件宽度 < 640px 时自动按 simple 极简形态渲染（ResizeObserver 监听），恢复宽度后还原；与显式 simple 等效</oas-tag>
  </oas-space>
</DemoBlock>

## 省略号跳页

<DemoBlock title="省略号可点击跳页">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-pagination id="pagination-ellipsis" total="1000" page-size="10" current="5"></oas-pagination>
    <oas-tag type="primary" id="pagination-ellipsis-info">当前第 5 页</oas-tag>
  </oas-space>
</DemoBlock>

省略号渲染为可点击按钮，点击向该侧跳 `siblings + 1` 页（受 `oas-before-change` 拦截与边界夹取约束）；aria-label 走 i18n（向前跳页/向后跳页）。

## 自定义页码内容

<DemoBlock title="page-item 插槽模板">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-tag type="info">插槽内容含 {page} 占位符，组件克隆并按页替换</oas-tag>
    <oas-pagination total="100" page-size="10" current="5">
      <span slot="page-item" hidden>第 <b>{page}</b> 页</span>
    </oas-pagination>
  </oas-space>
</DemoBlock>

宿主放入含 `{page}` 占位符的模板内容，组件对每个页码钮克隆该内容并把 `{page}` 文本替换为实际页码（仅 textContent 替换，防注入）；未提供插槽时显示纯页码数字。prev/next/首尾钮不受影响。

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const bind = (id, render) => {
    const el = document.getElementById(id)
    const info = document.getElementById(`${id}-info`)
    el?.addEventListener('oas-change', (e) => {
      const { page, pageSize } = e.detail
      render(info, page, pageSize)
      info?.setAttribute('type', 'primary')
    })
  }
  bind('pagination-demo', (info, page) => (info.textContent = `当前第 ${page} 页`))
  bind('pagination-sizes', (info, page, pageSize) => (info.textContent = `每页 ${pageSize} 条，当前第 ${page} 页`))
  bind('pagination-jumper', (info, page, pageSize) => (info.textContent = `当前第 ${page} 页`))
  bind('pagination-full', (info, page, pageSize) => (info.textContent = `每页 ${pageSize} 条，当前第 ${page} 页`))
  bind('pagination-ellipsis', (info, page) => (info.textContent = `当前第 ${page} 页`))
  bind('pagination-link', (info, page) => (info.textContent = `当前第 ${page} 页`))

  // 翻页拦截：拦截跳转到第 4 页（preventDefault veto）
  const beforeEl = document.getElementById('pagination-before')
  const beforeInfo = document.getElementById('pagination-before-info')
  const renderPage = (info, page) => (info.textContent = `当前第 ${page} 页`)
  beforeEl?.addEventListener('oas-before-change', (e) => {
    if (e.detail.page === 4) {
      e.preventDefault()
      beforeInfo.textContent = '已拦截跳到第 4 页'
      beforeInfo.setAttribute('type', 'danger')
    }
  })
  beforeEl?.addEventListener('oas-change', (e) => {
    renderPage(beforeInfo, e.detail.page)
    beforeInfo.setAttribute('type', 'primary')
  })

  // 受控模式：外部按钮直接设置 current 属性驱动视图
  const ctrl = document.getElementById('pagination-controlled')
  const ctrlInfo = document.getElementById('pagination-controlled-info')
  const ctrlPageCount = Math.ceil(200 / 10) // total 200 / page-size 10
  const clampPage = (p) => Math.min(Math.max(p, 1), ctrlPageCount)
  const syncCtrlInfo = (page) => {
    ctrlInfo.textContent = `当前第 ${page} 页`
    ctrlInfo.setAttribute('type', 'primary')
  }
  const updatePage = (p) => {
    const next = clampPage(p)
    ctrl?.setAttribute('current', String(next))
    syncCtrlInfo(next)
  }
  document.getElementById('pagination-prev-page')?.addEventListener('click', () => {
    updatePage(Number(ctrl?.getAttribute('current') || 1) - 1)
  })
  document.getElementById('pagination-next-page')?.addEventListener('click', () => {
    updatePage(Number(ctrl?.getAttribute('current') || 1) + 1)
  })
  document.getElementById('pagination-reset')?.addEventListener('click', () => updatePage(1))
  ctrl?.addEventListener('oas-change', (e) => syncCtrlInfo(e.detail.page))
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `current` | 当前页（受控，翻页会更新该属性） | `string` | `1` |
| `disabled` | 全局禁用：分页钮全部禁用并带 aria-disabled，每页条数下拉与跳转输入框禁用 | `boolean` | — |
| `hide-on-single` | 单页（pageCount ≤ 1）时整个组件不渲染 | `boolean` | — |
| `href-template` | 链接模式：设置后页码/前后/首末钮渲染为 `<a href>`（`{page}` 占位符替换为目标页），中键/右键/新标签原生可用；disabled 时降级为不可点击的 span | `string` | — |
| `page-size` | 每页条数 | `string` | `10` |
| `page-sizes` | 每页条数下拉选项（JSON 数组），如 `[10,20,50]`；切换后回到第 1 页 | `string` | — |
| `pager-count` | 页码按钮（不含前后/首末页钮）的最大可见数量，默认 9；超过上限时按当前页居中收缩窗口（省略号两端至少留 2 页，首尾页可达），低于最小值 5 回落 5 并告警 | `string` | `9` |
| `responsive` | 响应式：组件宽度 < 640px 时自动按 simple 极简形态渲染（ResizeObserver 监听容器宽度，恢复后还原）；与显式 `simple` 等效 | `boolean` | — |
| `show-edges` | 显示首/末页双箭头钮（« »），边界处禁用；aria-label 走 i18n | `boolean` | — |
| `show-jumper` | 显示「跳至 __ 页」快速跳转输入框（回车跳转，越界夹取） | `boolean` | — |
| `show-total` | 显示总条数文案「共 X 条」 | `boolean` | — |
| `siblings` | 当前页前后各显示的页码数 | `string` | `1` |
| `simple` | 极简形态：只渲染前后钮与「当前 / 总页数」文本，与页码省略算法互斥（simple 优先）；show-jumper 可叠加 | `boolean` | — |
| `size` | 尺寸档位：xs / sm / md / lg / xl（默认 md）；非法值回落 md 并在控制台告警 | `string` | `md` |
| `target` | 链接模式下透传给 `<a target>`（如 `_blank`）；仅在设置 `href-template` 时生效 | `string` | — |
| `total` | 总条数 | `string` | `0` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-before-change` | 翻页/跳转前派发，可 preventDefault 取消本次变更（切换每页条数不派发）；链接模式下同时阻止原生导航，`detail: { page }` |
| `oas-change` | 翻页 `{ page }`；切换每页条数 `{ page: 1, pageSize }`；快速跳转 `{ page, pageSize }`，`detail: { page } \| { page: 1, pageSize } \| { page, pageSize }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `next-icon` | 下一页按钮图标插槽，有内容时替换默认 › |
| `page-item` | 页码内容自定义插槽：宿主放入含 `{page}` 占位符的模板内容（如 `<span slot="page-item" hidden>第 {page} 页</span>`），组件对每个页码钮克隆该内容并替换占位符（仅 textContent，防注入）；未提供时显示纯页码数字；prev/next/首尾钮不受影响 |
| `prev-icon` | 上一页按钮图标插槽，有内容时替换默认 ‹ |
| `total` | 总条数文案插槽，有内容时替换内置「共 N 条」 |

页码超出范围时自动省略，首尾翻页按钮在边界自动禁用。
