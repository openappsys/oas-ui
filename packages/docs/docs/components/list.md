# List 列表

用于展示同类信息集合，可承载标题、描述与扩展操作。

## 基础用法

<DemoBlock title="带边框列表">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="需求评审">
        <span slot="description">迭代 v1.0 需求清单</span>
      </oas-list-item>
      <oas-list-item title="开发完成">
        <span slot="description">全部组件单测通过</span>
      </oas-list-item>
      <oas-list-item title="发布上线">
        <span slot="description">文档站已部署</span>
        <oas-tag slot="extra" type="success">已发布</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 无边框

<DemoBlock title="默认分隔线">
  <div style="width: 100%">
    <oas-list>
      <oas-list-item title="说明文档">
        <span slot="description">仅保留条目间分隔线</span>
      </oas-list-item>
      <oas-list-item title="使用手册">
        <span slot="description">不加整体边框</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 尺寸

`size` 提供三档行密度：`sm`（紧凑）/ `md`（默认）/ `lg`（宽松），联动行内边距与标题字号。

<DemoBlock title="尺寸 size">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-4)">
    <oas-list bordered size="sm">
      <oas-list-item title="小尺寸条目"><span slot="description">size="sm"：紧凑列表</span></oas-list-item>
      <oas-list-item title="小尺寸条目"><span slot="description">适合设置项、通知摘要</span></oas-list-item>
    </oas-list>
    <oas-list bordered>
      <oas-list-item title="默认尺寸条目"><span slot="description">size="md"：常规列表</span></oas-list-item>
      <oas-list-item title="默认尺寸条目"><span slot="description">不加 size 即默认</span></oas-list-item>
    </oas-list>
    <oas-list bordered size="lg">
      <oas-list-item title="大尺寸条目"><span slot="description">size="lg"：宽松列表</span></oas-list-item>
      <oas-list-item title="大尺寸条目"><span slot="description">适合图文混排</span></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 内容形态

<DemoBlock title="多种内容形态">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="纯标题条目">
        <oas-tag slot="extra" type="primary">NEW</oas-tag>
      </oas-list-item>
      <oas-list-item title="默认插槽兜底">
        未提供 description 插槽时，内容走默认插槽。
      </oas-list-item>
      <oas-list-item title="待办状态">
        <span slot="description">等待负责人确认</span>
        <oas-tag slot="extra" type="warning">待处理</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## Meta 结构化（头像与描述）

`oas-list-item` 提供 Meta 结构化通道：

- `description` 属性：描述文本快捷通道（与 `slot="description"` 二选一，插槽优先，可放富内容）；
- `avatar` 属性：头像 URL 快捷通道，渲染为首部圆形头像；
- `slot="avatar"`：头像富内容通道（可放 `oas-avatar` 或任意自定义内容），优先于 `avatar` 属性。

<DemoBlock title="头像 + 描述（属性通道）">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="林晓雨" description="产品经理 · 刚刚更新了需求文档" avatar="https://picsum.photos/seed/oas-list-a/96/96">
        <oas-tag slot="extra" type="primary">在线</oas-tag>
      </oas-list-item>
      <oas-list-item title="陈以宁" description="前端工程师 · 评论了你的设计稿" avatar="https://picsum.photos/seed/oas-list-b/96/96">
        <oas-tag slot="extra">30 分钟前</oas-tag>
      </oas-list-item>
      <oas-list-item title="赵启铭" description="测试工程师 · 提交了 3 个缺陷" avatar="https://picsum.photos/seed/oas-list-c/96/96">
        <oas-tag slot="extra" type="warning">待确认</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="头像自定义（slot 通道放 oas-avatar）">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="周可" description="头像插槽可放任意内容（如 oas-avatar）">
        <oas-avatar slot="avatar">周</oas-avatar>
        <oas-tag slot="extra" type="success">已加入</oas-tag>
      </oas-list-item>
      <oas-list-item title="吴双" description="slot 优先于 avatar 属性">
        <oas-avatar slot="avatar">吴</oas-avatar>
        <oas-tag slot="extra">邀请中</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 行交互（clickable / selected）

给 `oas-list-item` 设置 `clickable` 后整行可点：有 hover 反馈、可聚焦（Enter / Space 触发），点击派发 `oas-click` 事件；`selected` 标记选中行高亮（`aria-selected` 同步）。选中态由宿主维护，常用于成员列表、设置项列表。

<DemoBlock title="可点行与选中态">
  <div style="width: 100%">
    <oas-list bordered id="list-select">
      <oas-list-item clickable selected title="通知设置">
        <span slot="description">邮件、站内信、桌面通知</span>
        <oas-switch slot="extra" checked></oas-switch>
      </oas-list-item>
      <oas-list-item clickable title="隐私设置">
        <span slot="description">可见范围、数据授权</span>
        <oas-switch slot="extra"></oas-switch>
      </oas-list-item>
      <oas-list-item clickable title="安全设置">
        <span slot="description">两步验证、登录设备管理</span>
        <oas-switch slot="extra" checked></oas-switch>
      </oas-list-item>
    </oas-list>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      点击行切换选中态（单选示例）；点击右侧开关不影响行选中。
    </p>
  </div>
</DemoBlock>

## 页头与页尾

`slot="header"` / `slot="footer"` 在列表首尾渲染自定义区域，常用于分组标题、统计信息、操作按钮位。

<DemoBlock title="header / footer 插槽">
  <div style="width: 100%">
    <oas-list bordered>
      <div slot="header" style="display: flex; justify-content: space-between; align-items: center;">
        <b>团队成员（3）</b>
        <oas-button size="small" variant="outlined" onclick="message.info('打开邀请面板')">+ 邀请</oas-button>
      </div>
      <oas-list-item title="林晓雨"><span slot="description">产品经理</span></oas-list-item>
      <oas-list-item title="陈以宁"><span slot="description">前端工程师</span></oas-list-item>
      <oas-list-item title="赵启铭"><span slot="description">测试工程师</span></oas-list-item>
      <div slot="footer" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);">
        共 3 名成员 · 每周一同步权限
      </div>
    </oas-list>
  </div>
</DemoBlock>

## 加载与空态

<DemoBlock title="加载态">
  <div style="width: 100%">
    <oas-list loading bordered>
      <oas-list-item title="请求中的条目">
        <span slot="description">加载完成前显示骨架占位</span>
      </oas-list-item>
      <oas-list-item title="请求中的条目">
        <span slot="description">由 loading 属性统一接管占位</span>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<DemoBlock title="空态">
  <div style="width: 100%">
    <oas-list bordered empty></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
     设置 <code>empty</code> 强制空态；列表没有任何 <code>oas-list-item</code> 子项时也会自动显示空态，可通过 <code>empty-text</code> 自定义文案。
  </p>
</DemoBlock>

`slot="empty"` 可以完全替换内置空态（图标 + 文案），对齐数据类组件的空态插槽惯例。

<DemoBlock title="自定义空态插槽">
  <div style="width: 100%">
    <oas-list bordered empty>
      <div slot="empty" style="display: flex; flex-direction: column; align-items: center; gap: var(--oas-space-2); padding: var(--oas-space-2) 0;">
        <oas-icon name="search" style="font-size: 32px; color: var(--oas-color-text-secondary);"></oas-icon>
        <span style="color: var(--oas-color-text-secondary);">没有找到匹配的任务</span>
        <oas-button size="small" variant="outlined" onclick="message.info('打开筛选面板')">调整筛选条件</oas-button>
      </div>
    </oas-list>
  </div>
</DemoBlock>

## 空态文案与分隔线

`empty-text` 自定义空态文案（默认「暂无数据」）。

<DemoBlock title="自定义空态文案">
  <div style="width: 100%">
    <oas-list bordered empty empty-text="暂无匹配任务，请调整筛选条件后重试"></oas-list>
  </div>
</DemoBlock>

`split` 控制条目分隔线：默认（不设置 `bordered`）时自带分隔线；设置 `bordered` 后分隔线关闭，需要时用 `split` 重新开启。

<DemoBlock title="分隔线 split">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="条目一"><span slot="description">bordered 默认不绘制条目分隔线</span></oas-list-item>
      <oas-list-item title="条目二"><span slot="description">仅整体边框</span></oas-list-item>
    </oas-list>
    <oas-list bordered split style="margin-top: var(--oas-space-4)">
      <oas-list-item title="条目一"><span slot="description">bordered + split 追加条目分隔线</span></oas-list-item>
      <oas-list-item title="条目二"><span slot="description">边框与分隔线并存</span></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 斑马纹

`stripe` 为视觉偶数行（第 2、4… 条）铺浅色底，适合审计日志、长表对照阅读。

<DemoBlock title="斑马纹 stripe">
  <div style="width: 100%">
    <oas-list bordered stripe id="list-stripe"></oas-list>
  </div>
</DemoBlock>

## 图文混排

条目默认插槽可放缩略图，配合标题与描述形成富媒体列表。

<DemoBlock title="图文列表（缩略图 + 标题 + 描述）">
  <div style="width: 100%">
    <oas-list bordered>
      <oas-list-item title="产品周报第 12 期" description="本周上线 6 个新组件" avatar="https://picsum.photos/seed/isui-list-1/96/96">
        <oas-tag slot="extra">周报</oas-tag>
      </oas-list-item>
      <oas-list-item title="设计走查记录" description="交互态与暗色主题复核" avatar="https://picsum.photos/seed/isui-list-2/96/96">
        <oas-tag slot="extra">记录</oas-tag>
      </oas-list-item>
      <oas-list-item title="发布 v1.6" description="展示组件全部发布" avatar="https://picsum.photos/seed/isui-list-3/96/96">
        <oas-tag slot="extra" type="success">已发布</oas-tag>
      </oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

## 数据通道（data + 模板双通道）

除声明式 `oas-list-item` 子项外，`oas-list` 支持数据驱动：通过 `data` property（推荐）或 `data` 属性（JSON 字符串）传入数组。**对象行开箱即用**：未提供模板时，`{ title, description, avatar }` 同名字段自动渲染为 Meta 结构（原始值行则直接渲染文本），不会退化成 `"[object Object]"`。渲染自定义有两条通道（与 `oas-tree` 的惯例对齐）：

1. `template[slot="item"]`：每项克隆的静态骨架，配合 `oas-item-render` 事件（`detail` 带 `{ index, item, element }`）按数据绑定；
2. 只监听 `oas-item-render`，不写模板，完全命令式填充每行。

> 监听器请先挂后赋值：`data` 赋值同步触发渲染与 `oas-item-render`，后挂的监听会错过首轮渲染。

有 `data` 走数据通道、无 `data` 回落声明式子项。数据行为 `oas-list-item` 承载（结构、头像、选中、点击与声明式一致），行上有 `data-index` 上下文。

<DemoBlock title="数据通道 + oas-item-render">
  <div style="width: 100%">
    <oas-list bordered id="list-data"></oas-list>
    <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      数据源为 5 条任务记录，点击行有 <code>oas-click</code> 反馈。
    </p>
  </div>
</DemoBlock>

<DemoBlock title="template[slot=&quot;item&quot;] 骨架克隆">
  <div style="width: 100%">
    <oas-list bordered id="list-data-tpl"></oas-list>
  </div>
</DemoBlock>

## 滚动加载（reach-bottom）

`max-height` 把列表体变成滚动容器；滚动至底部（距离阈值由 `bottom-offset` 调整，默认 0）派发 `oas-reach-bottom`，进入触底区只派发一次、滚离后重新武装。配合 `slot="load-more"` 尾区放「加载更多」按钮或加载中占位，拉取与停止逻辑由宿主掌控。

<DemoBlock title="触底加载 + load-more 尾区">
  <div style="width: 100%">
    <oas-list bordered max-height="260" bottom-offset="40" id="list-infinite">
      <div slot="load-more" id="list-infinite-tail" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm);"></div>
    </oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    滚到底自动追加 5 条（模拟异步），加载 3 批后显示「没有更多了」；<code>bottom-offset="40"</code> 距底部 40px 即触发。
  </p>
</DemoBlock>

## 虚拟滚动

`height` 设置视口高度即启用虚拟滚动（内嵌复用 `oas-virtual-list`），`row-height` 指定行高（默认 64，要求数据行定高）。虚拟模式要求走 `data` 通道，海量数据只渲染可视窗口。

<DemoBlock title="万级数据虚拟列表">
  <div style="width: 100%">
    <oas-list bordered height="320" row-height="57" id="list-virtual"></oas-list>
  </div>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    10000 条日志记录，视口内仅渲染窗口项 + 缓冲。
  </p>
</DemoBlock>

## 组合：分页（oas-pagination）

列表不内建分页——数据受控于宿主，分页即「宿主切片 + 更新 data」。配合 `oas-pagination` 一行搞定：

<DemoBlock title="分页组合">
  <div style="width: 100%">
    <oas-list bordered id="list-paged"></oas-list>
    <div style="display: flex; justify-content: flex-end; margin-top: var(--oas-space-3)">
      <oas-pagination id="list-paged-nav" page-size="4" total="14"></oas-pagination>
    </div>
  </div>
</DemoBlock>

## 组合：卡片墙（oas-grid + oas-card）

网格卡片墙由 `oas-grid` + `oas-card` 组合承担（卡片样式本身是内容，列表只负责渲染数据，网格布局归栅格组件）：

<DemoBlock title="卡片墙组合">
  <div style="width: 100%">
    <oas-grid cols="3" gap="12" id="list-card-wall"></oas-grid>
  </div>
</DemoBlock>

## 组合：分组列表

分组标题用 `slot="header"` 分段或多个 `oas-list` 组合（吸顶分组头为记备选能力，需要时在宿主滚动容器内用 `position: sticky` 子块达成）：

<DemoBlock title="分组列表（header 分段）">
  <div style="width: 100%; display: flex; flex-direction: column; gap: var(--oas-space-3)">
    <oas-list bordered>
      <div slot="header"><b>进行中</b></div>
      <oas-list-item title="组件迭代"><span slot="description">list / timeline 重构</span><oas-tag slot="extra" type="primary">进行中</oas-tag></oas-list-item>
      <oas-list-item title="暗色走查"><span slot="description">数据类组件复核</span><oas-tag slot="extra" type="primary">进行中</oas-tag></oas-list-item>
    </oas-list>
    <oas-list bordered>
      <div slot="header"><b>已完成</b></div>
      <oas-list-item title="按钮重构"><span slot="description">variant 语义统一</span><oas-tag slot="extra" type="success">已完成</oas-tag></oas-list-item>
    </oas-list>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // whenDefined 防升级前 expando 遮蔽 setter（数据通道 .data 赋值必须晚于定义）
  customElements.whenDefined('oas-list').then(() => {
  // 行交互：点击切换选中态（单选）
  const selectable = document.querySelector('#list-select')
  if (selectable) {
    selectable.addEventListener('oas-click', (e) => {
      const row = e.target
      if (!row || row.tagName.toLowerCase() !== 'oas-list-item') return
      for (const item of selectable.querySelectorAll('oas-list-item[selected]')) {
        item.removeAttribute('selected')
      }
      row.setAttribute('selected', '')
    })
  }

  // 斑马纹数据
  const stripe = document.querySelector('#list-stripe')
  if (stripe) {
    // 监听器先挂：data 赋值同步触发渲染与 oas-item-render，后挂监听会错过首渲
    stripe.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    stripe.data = Array.from({ length: 6 }, (_, i) => ({
      title: `审计事件 #${1000 + i}`,
      description: `操作人 system · ${['创建', '更新', '删除'][i % 3]}了配置项`,
    }))
  }

  // 数据通道：oas-item-render 命令式绑定
  const dataList = document.querySelector('#list-data')
  if (dataList) {
    dataList.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
      const tag = document.createElement('oas-tag')
      tag.setAttribute('slot', 'extra')
      tag.setAttribute(
        'type',
        item.status === '进行中' ? 'primary' : item.status === '已计划' ? 'success' : 'default',
      )
      tag.textContent = item.status
      element.appendChild(tag)
      element.setAttribute('clickable', '')
    })
    dataList.data = [
      { title: '修复暗色下 tag 对比度', description: '状态色 token 复核', status: '进行中' },
      { title: '补充 timeline 迁移说明', description: 'color → type 破坏性变更', status: '进行中' },
      { title: 'list 虚拟滚动联调', description: '内嵌 oas-virtual-list', status: '待开始' },
      { title: '回归测试补齐', description: 'qa-regression 固化', status: '待开始' },
      { title: '发布 v2.4.0', description: '能力批收尾', status: '已计划' },
    ]
    dataList.addEventListener('oas-click', (e) => {
      if (e.detail && typeof e.detail.index === 'number') {
        message.info(`点击了第 ${e.detail.index + 1} 行：${e.detail.item.title}`)
      }
    })
  }

  // 数据通道：template 骨架克隆 + oas-item-render 数据绑定
  // （whenDefined 防升级前 expando 遮蔽 setter）
  customElements.whenDefined('oas-list').then(() => {
    const tplList = document.querySelector('#list-data-tpl')
    if (tplList) {
      // 模板走 property 通道：md 内联 <template slot="item"> 的子内容在 vitepress dev
      // 模式下会被 Vue 编译管线吃空（生产正常、dev 空白——v2.4.1 cellTemplate 同款坑）
      const tpl = document.createElement('template')
      tpl.setAttribute('slot', 'item')
      tpl.innerHTML = `
        <span slot="title" data-field="title"></span>
        <span slot="description" data-field="description"></span>
        <oas-tag slot="extra" data-field="status"></oas-tag>
      `
      tplList.appendChild(tpl)
      tplList.addEventListener('oas-item-render', (e) => {
        const { item, element } = e.detail
        for (const node of element.querySelectorAll('[data-field]')) {
          const field = node.getAttribute('data-field')
          node.textContent = item[field] ?? ''
          if (node.tagName.toLowerCase() === 'oas-tag' && item.tagType) {
            node.setAttribute('type', item.tagType)
          }
        }
      })
      tplList.data = [
        { title: '林晓雨', description: '更新了三份需求文档', status: '在线', tagType: 'success' },
        { title: '陈以宁', description: '合并了 2 个 PR', status: '忙碌', tagType: 'warning' },
        { title: '赵启铭', description: '提交了测试报告', status: '离线', tagType: 'default' },
      ]
    }
  })

  // 滚动加载：触底追加 + load-more 尾区状态
  const infinite = document.querySelector('#list-infinite')
  if (infinite) {
    const tail = document.querySelector('#list-infinite-tail')
    let batch = 0
    const totalBatches = 3
    infinite.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    const append = (count) => {
      const current = infinite.dataItems
      infinite.data = current.concat(
        Array.from({ length: count }, (_, i) => ({
          title: `日志条目 ${current.length + i + 1}`,
          description: `滚动加载追加 · 第 ${batch} 批`,
        })),
      )
    }
    append(8)
    const setTail = (text) => {
      if (tail) tail.textContent = text
    }
    setTail('向下滚动加载更多')
    infinite.addEventListener('oas-reach-bottom', () => {
      if (batch >= totalBatches) {
        setTail('— 没有更多了 —')
        return
      }
      batch += 1
      setTail('加载中…')
      // 模拟异步拉取
      setTimeout(() => {
        append(5)
        setTail(batch >= totalBatches ? '— 没有更多了 —' : '向下滚动加载更多')
      }, 400)
    })
  }

  // 虚拟滚动：万级日志（模板同样走 property 通道，防 dev 管线吃空）
  const virtual = document.querySelector('#list-virtual')
  if (virtual) {
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'item')
    tpl.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: center; height: 100%; overflow: hidden">
        <strong data-field="title" style="font-size: var(--oas-font-size-md)"></strong>
        <span data-field="description" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis"></span>
      </div>
    `
    virtual.appendChild(tpl)
    virtual.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      for (const node of element.querySelectorAll('[data-field]')) {
        node.textContent = item[node.getAttribute('data-field')] ?? ''
      }
    })
    virtual.data = Array.from({ length: 10000 }, (_, i) => ({
      title: `访问日志 #${i + 1}`,
      description: `GET /api/records/${i + 1} · 200 · ${(Math.random() * 80 + 10).toFixed(0)}ms`,
    }))
  }

  // 分页组合：宿主切片 + 更新 data
  const paged = document.querySelector('#list-paged')
  const pagedNav = document.querySelector('#list-paged-nav')
  if (paged && pagedNav) {
    const all = Array.from({ length: 14 }, (_, i) => ({
      title: `工单 #${202400 + i}`,
      description: `客户 ${['甲', '乙', '丙', '丁'][i % 4]} · ${['咨询', '报障', '建议'][i % 3]}`,
    }))
    const pageSize = 4
    paged.addEventListener('oas-item-render', (e) => {
      const { item, element } = e.detail
      element.setAttribute('title', item.title)
      element.setAttribute('description', item.description)
    })
    const render = (page) => {
      paged.data = all.slice((page - 1) * pageSize, page * pageSize)
    }
    render(1)
    pagedNav.addEventListener('oas-change', (e) => render(e.detail.page ?? e.detail.current ?? 1))
  }

  // 卡片墙：oas-grid + oas-card 组合
  const wall = document.querySelector('#list-card-wall')
  if (wall) {
    const cards = [
      { title: '数据看板', desc: '12 个图表', color: 'var(--oas-color-primary)' },
      { title: '消息中心', desc: '3 条未读', color: 'var(--oas-color-success)' },
      { title: '发布管道', desc: 'v2.4.0 进行中', color: 'var(--oas-color-warning)' },
    ]
    wall.innerHTML = cards
      .map(
        (c) => `
      <oas-card>
        <div slot="cover" style="display: flex; align-items: center; justify-content: center; min-height: 96px; background: ${c.color}; color: var(--oas-color-text-on-primary); font-weight: 600;">${c.title}</div>
        <div style="padding: var(--oas-space-3) var(--oas-space-4);">${c.desc}</div>
      </oas-card>`,
      )
      .join('')
  }
  })
})
</script>

## API

### oas-list

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `bordered` | 是否显示整体边框 | `boolean` | — |
| `bottom-offset` | 触底阈值（px）：距底部剩余距离 ≤ 该值即视为触底，默认 0 | `string` | `0` |
| `data` | 数据通道（JSON 字符串；property `data` / `dataItems` 优先），有 data 走数据通道、无 data 回落声明式子项 | `unknown[]` | — |
| `empty` | 强制空态；无子项时自动空态 | `boolean` | — |
| `empty-text` | 空态文案 | — | — |
| `height` | 虚拟滚动视口高度（px，设置即启用虚拟模式，要求 data 通道） | `string` | `320` |
| `loading` | 加载态，显示骨架占位 | `boolean` | — |
| `max-height` | 列表体最大高度（px 或 CSS 长度），设置后列表体成为滚动容器（配合 oas-reach-bottom 滚动加载） | `string` | — |
| `row-height` | 虚拟滚动行高（px，默认 64，要求数据行定高） | `string` | `64` |
| `size` | 行密度：sm / md（默认）/ lg | `string` | — |
| `split` | 是否显示条目分隔线 | `boolean` | — |
| `stripe` | 斑马纹：视觉偶数行铺浅色底 | `boolean` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 条目点击（数据/虚拟行），detail 带 { index, item } |
| `oas-item-render` | 数据通道每行渲染后派发，detail 带 { index, item, element } |
| `oas-reach-bottom` | 滚动触底（进入触底区派发一次，滚离后重新武装），detail 带 { scrollTop } |

| 名称 | 说明 |
| --- | --- |
| 默认 | 默认（oas-list-item 声明式子项） |
| `empty` | 自定义空态，完全替换内置图标+文案 |
| `footer` | 列表尾区域（统计信息、操作位） |
| `header` | 列表头区域（分组标题、操作位） |
| `load-more` | 列表尾「加载更多」区（按钮/加载中占位） |
| `template[slot="item"]` | 数据通道每项克隆的静态骨架，配合 oas-item-render 绑定数据 |

### oas-list-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `avatar` | 头像 URL 快捷通道（渲染首部圆形头像；slot="avatar" 优先） | `string` | — |
| `clickable` | 整行可点：hover 反馈、可聚焦（Enter/Space 触发）、点击派发 oas-click | — | — |
| `description` | 描述文本快捷通道（slot="description" 优先，可放富内容） | `string` | — |
| `selected` | 选中行高亮（aria-selected 同步），选中态由宿主维护 | — | — |
| `size` | 行密度：sm / md（默认）/ lg（oas-list 下发的 data-size 优先于本属性之外的默认） | — | — |
| `title` | 条目标题（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 行点击，detail 带 { index, item }（数据行由 oas-list 注入上下文） |

| 名称 | 说明 |
| --- | --- |
| `avatar` | 头像富内容（oas-avatar 或任意内容），优先于 avatar 属性 |
| `description` | 描述区（不提供时回退默认插槽） |
| `extra` | 条目右侧扩展区 |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |
