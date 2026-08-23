# Command 命令面板

命令面板（⌘K 唤起，快捷键可配置）——搜索过滤、匹配打分排序、键盘选择、Enter 执行、嵌套子页导航、最近使用、多选批量执行。`open` 受控：可由外部设置，也可用全局快捷键或 Esc 关闭（打开/关闭各派发一次 `oas-open-change`）。

## 基础用法

<DemoBlock title="基础用法（⌘J / Ctrl+J 打开）">
  <oas-command id="command-basic" hotkey="mod+j" onoas-select="commandLog(event)" items='[{"label":"新建文件","value":"new-file","keywords":["create","file"],"group":"文件"},{"label":"打开文件","value":"open-file","group":"文件"},{"label":"保存文件","value":"save","group":"文件"},{"label":"撤销","value":"undo","keywords":["ctrl z"],"group":"编辑"},{"label":"重做","value":"redo","keywords":["ctrl y"],"group":"编辑"},{"label":"全选","value":"select-all","keywords":["select"],"group":"编辑"}]'></oas-command>
  <oas-tag id="command-result" type="info">按 ⌘J / Ctrl+J 打开命令面板，或外部控制 open（文档站搜索占用 Ctrl+K，演示改用 Ctrl+J）</oas-tag>
</DemoBlock>

## 受控打开

`open` 属性由外部控制：外部按钮设置 `open` 打开面板；关闭由 Esc / 点击遮罩 / 选择命令触发（组件移除 `open`，受控关闭由宿主监听 `oas-open-change` 同步状态）。

> 打开时遮罩铺满全屏，因此「关闭」不提供外部按钮，用 Esc / 点击遮罩 / 选择命令关闭。

<DemoBlock title="外部控制 open（oas-open-change 同步）">
  <oas-space size="small">
    <oas-button type="primary" onclick="cmdOpen()">打开命令面板</oas-button>
    <oas-tag id="command-ctrl-status" type="info">open: false</oas-tag>
    <oas-tag id="command-ctrl-selected" type="success">尚未选择</oas-tag>
  </oas-space>
  <oas-command id="command-controlled" hotkey="false" onoas-select="commandCtrlSelect(event)" items='[{"label":"设置主题","value":"theme","group":"外观"},{"label":"切换暗色模式","value":"dark","group":"外观"},{"label":"查看快捷键","value":"shortcuts","group":"帮助"}]'></oas-command>
</DemoBlock>

## 分组与空态

分组标题按 `group` 字段渲染；无匹配时显示空态（空查询显示「无匹配命令」，有搜索词时显示「未找到与「词」匹配的命令」）。

<DemoBlock title="分组与空态">
  <oas-command id="command-empty" hotkey="false" items='[{"label":"部署","value":"deploy","group":"操作"},{"label":"回滚","value":"rollback","group":"操作"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-btn" type="primary">打开（试试搜「部署」和「xyz」）</oas-button>
    <oas-tag id="command-empty-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 图标 · 副标题 · 快捷键标注

项级字段 `icon`（SVG path d 或完整 `<svg>` 标记）、`description`（副标题）、`shortcut`（右对齐 kbd，支持 `meta`/`ctrl`/`shift`/`alt` 符号映射）。

<DemoBlock title="图标 + 副标题 + 快捷键">
  <oas-command id="command-icons" hotkey="false" items='[{"label":"新建文件","value":"new-file","icon":"M4 4h16v16H4z","shortcut":"meta+n","description":"创建空白文档","group":"文件"},{"label":"打开文件","value":"open-file","icon":"M4 4h16v16H4z","shortcut":"ctrl+o","description":"打开最近文档","group":"文件"},{"label":"保存文件","value":"save","icon":"M4 4h16v16H4z","shortcut":"ctrl+s","description":"保存当前文档","group":"文件"},{"label":"撤销","value":"undo","shortcut":"ctrl+z","group":"编辑"},{"label":"设置","value":"settings","icon":"M4 4h16v16H4z","description":"打开偏好设置","group":"系统"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-icons-btn" type="primary">打开</oas-button>
    <oas-tag id="command-icons-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 唤起快捷键配置

`hotkey` 属性可配置组合键（`mod`/`meta`/`ctrl`/`alt`/`shift`，逗号分隔多组）；`false` 关闭内置监听。默认 `mod+k`（⌘K / Ctrl+K）。

<DemoBlock title="自定义快捷键（ctrl+shift+p）与禁用">
  <oas-space size="small">
    <oas-tag id="command-hotkey-status" type="info">closed（按 ctrl+shift+p 打开）</oas-tag>
    <oas-button id="command-hotkey-btn" type="primary">外部打开</oas-button>
  </oas-space>
  <oas-command id="command-hotkey" hotkey="ctrl+shift+p" items='[{"label":"打开终端","value":"terminal","shortcut":"ctrl+shift+`"},{"label":"打开任务管理器","value":"tasks"},{"label":"重启应用","value":"restart"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-no-hotkey-btn" type="default">下面的实例已 hotkey="false"（⌘K 不会打开它）</oas-button>
  </oas-space>
  <oas-command id="command-no-hotkey" hotkey="false" items='[{"label":"禁用快捷键实例","value":"disabled-hotkey"}]'></oas-command>
</DemoBlock>

## 匹配高亮

搜索时 label 中命中搜索词的字符以 `<mark>` 高亮，输入即反馈。

<DemoBlock title="搜索高亮">
  <oas-command id="command-highlight" hotkey="false" items='[{"label":"文件管理","value":"files","group":"工具"},{"label":"打开文件","value":"open-file","group":"工具"},{"label":"最近文件","value":"recent-files","group":"工具"},{"label":"文件对比","value":"diff","group":"工具"},{"label":"终端","value":"terminal","group":"系统"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-highlight-btn" type="primary">打开（输入「文件」看高亮）</oas-button>
    <oas-tag id="command-highlight-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 外部过滤（should-filter=false）

`should-filter="false"` 关闭内置过滤与打分，过滤完全交给宿主：输入时组件派发 `oas-input`，宿主请求异步数据源后回写 `items`。本 demo 模拟 600ms 服务端搜索；无结果时返回一条 `forceMount` 的「创建」入口（忽略过滤强制显示）。

<DemoBlock title="should-filter=false + 异步数据源">
  <oas-command id="command-filter" should-filter="false" hotkey="false" items='[{"label":"打开文件","value":"open-file","group":"文件"},{"label":"打开设置","value":"open-settings","group":"系统"},{"label":"新建文档","value":"new-doc","group":"文件"},{"label":"打开命令面板","value":"open-palette","group":"系统"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-filter-btn" type="primary">打开（输入「打开」）</oas-button>
    <oas-tag id="command-filter-output" type="info">全部命令</oas-tag>
  </oas-space>
</DemoBlock>

## 空态插槽

`slot="empty"` 自定义空结果渲染（替代默认「未找到…」文案）；宿主用 `el.query` 读当前搜索词。示例：无结果时展示「创建 xxx」按钮。

<DemoBlock title="空结果插槽">
  <oas-command id="command-empty-slot" hotkey="false" items='[{"label":"部署","value":"deploy"},{"label":"回滚","value":"rollback"}]'>
    <div slot="empty" style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <span>没有匹配的命令</span>
      <oas-button type="primary" size="small" onclick="commandEmptySlotCreate()">创建「<span id="command-empty-slot-q">…</span>」</oas-button>
    </div>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-empty-slot-btn" type="primary">打开（搜「xyz」看空态插槽）</oas-button>
    <oas-tag id="command-empty-slot-result" type="info">尚未创建</oas-tag>
  </oas-space>
</DemoBlock>

## 嵌套页面 / 面包屑回退

项级字段 `page`（命令数组）定义子页：选中进入子页（顶部出现面包屑 + 返回按钮），`Esc` 或空搜索词 `Backspace` 回退，根层 `Esc` 才关闭面板。进出子页各派发一次 `oas-page-change`。

<DemoBlock title="嵌套页面">
  <oas-command id="command-pages" hotkey="false" items='[{"label":"更改主题","value":"theme","page":[{"label":"浅色","value":"light"},{"label":"深色","value":"dark"},{"label":"跟随系统","value":"system"}]},{"label":"更改语言","value":"lang","page":[{"label":"简体中文","value":"zh"},{"label":"English","value":"en"}]},{"label":"打开设置","value":"settings"},{"label":"关于本应用","value":"about"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-pages-btn" type="primary">打开（选「更改主题」进子页）</oas-button>
    <oas-tag id="command-pages-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 最近使用

`recent` 开启最近使用：选中项按最近优先置顶（去重，上限 10 条）；`recent-storage-key` 启用 localStorage 持久化（跨实例恢复）。本 demo 选中后模拟「命令集变化」切换 items，重开可见「最近使用」组。

<DemoBlock title="最近使用（localStorage 持久化）">
  <oas-command id="command-recent" recent recent-storage-key="command-demo" hotkey="false" items='[{"label":"部署上线","value":"deploy","group":"操作"},{"label":"回滚版本","value":"rollback","group":"操作"},{"label":"查看日志","value":"logs","group":"操作"},{"label":"清空缓存","value":"clear-cache","group":"运维"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-recent-btn" type="primary">打开（选几项后再开，看最近使用置顶）</oas-button>
    <oas-tag id="command-recent-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## loading 与 limit

`loading` 显示异步加载占位（列表含 spinner + `aria-busy`）；`limit` 限制渲染条数（默认 50）。

<DemoBlock title="loading 与 limit">
  <oas-command id="command-loading" hotkey="false" items='[{"label":"任务 A","value":"a"},{"label":"任务 B","value":"b"}]'></oas-command>
  <oas-command id="command-limit" hotkey="false" limit="3" items='[{"label":"命令 0","value":"c0"},{"label":"命令 1","value":"c1"},{"label":"命令 2","value":"c2"},{"label":"命令 3","value":"c3"},{"label":"命令 4","value":"c4"},{"label":"命令 5","value":"c5"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-loading-btn" type="primary">第一个打开并切换 loading</oas-button>
    <oas-button id="command-limit-btn" type="default">第二个打开（limit=3）</oas-button>
    <oas-tag id="command-limit-result" type="info">limit 只渲染前 3 条</oas-tag>
  </oas-space>
</DemoBlock>

## 多选命令

`multiple` 多选模式：Enter/点击切换勾选（派发 `oas-change { values }`），footer 出现「执行 n 项」确认按钮批量执行（派发 `oas-select { values }`）。

<DemoBlock title="多选批量执行">
  <oas-command id="command-multi" multiple hotkey="false" items='[{"label":"删除未使用变量","value":"unused","group":"清理"},{"label":"格式化代码","value":"format","group":"清理"},{"label":"压缩资源","value":"minify","group":"清理"},{"label":"生成类型定义","value":"dts","group":"构建"},{"label":"运行测试","value":"test","group":"构建"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-multi-btn" type="primary">打开（勾选多项后点 footer「执行 n 项」）</oas-button>
    <oas-tag id="command-multi-result" type="info">尚未执行</oas-tag>
  </oas-space>
</DemoBlock>

## 面板内嵌视图（Raycast 风格）

项级字段 `view` 定义视图：选中进入 `<slot name="view-{view}">` 承载的表单/面板（如部署参数、快速操作），`Esc`/面包屑回退。进出各派发一次 `oas-view-change`。

<DemoBlock title="视图插槽（部署表单）">
  <oas-command id="command-views" hotkey="false" items='[{"label":"部署应用","value":"deploy","view":"deploy"},{"label":"通知成员","value":"notify","view":"notify"},{"label":"打开设置","value":"settings"}]'>
    <div slot="view-deploy" style="display:flex;flex-direction:column;gap:12px;padding:8px 4px">
      <oas-input placeholder="环境（prod / staging）"></oas-input>
      <oas-space size="small">
        <oas-button type="primary" size="small" onclick="commandViewDeploy()">执行部署</oas-button>
        <oas-tag type="info">Esc 返回命令列表</oas-tag>
      </oas-space>
    </div>
    <div slot="view-notify" style="display:flex;flex-direction:column;gap:12px;padding:8px 4px">
      <oas-input placeholder="成员邮箱，逗号分隔"></oas-input>
      <oas-button type="primary" size="small" onclick="commandViewNotify()">发送通知</oas-button>
    </div>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-views-btn" type="primary">打开（选「部署应用」进表单）</oas-button>
    <oas-tag id="command-views-result" type="info">尚未操作</oas-tag>
  </oas-space>
</DemoBlock>

## 受控搜索词与选中项

`value` 受控搜索词（宿主监听 `oas-input` 回写实现双向）；`selected` 受控当前项（宿主监听 `oas-active` 回写）。`close-on-select="false"` 选中后不关闭，可连续执行。

<DemoBlock title="受控 value / selected">
  <oas-command id="command-controlled-state" value="文件" selected="open-file" close-on-select="false" hotkey="false" items='[{"label":"新建文件","value":"new-file","group":"文件"},{"label":"打开文件","value":"open-file","group":"文件"},{"label":"保存文件","value":"save","group":"文件"},{"label":"撤销","value":"undo","group":"编辑"}]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-controlled-state-btn" type="primary">打开（value/selected 双向受控）</oas-button>
    <oas-tag id="command-controlled-value" type="info">value: 文件</oas-tag>
    <oas-tag id="command-controlled-active" type="success">高亮: open-file</oas-tag>
    <oas-tag id="command-controlled-exec" type="warning">尚未执行</oas-tag>
  </oas-space>
</DemoBlock>

## 底部自定义

`slot="footer"` 替换默认快捷键提示条（`↑↓ 选择 / ↵ 执行 / esc 关闭`）。

<DemoBlock title="footer 插槽">
  <oas-command id="command-footer" hotkey="false" items='[{"label":"打开文件","value":"open-file"},{"label":"保存文件","value":"save"}]'>
    <span slot="footer">↑↓ 选择 · ↵ 执行 · esc 关闭</span>
  </oas-command>
  <oas-space size="small">
    <oas-button id="command-footer-btn" type="primary">打开（看自定义底部提示条）</oas-button>
    <oas-tag id="command-footer-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

## 挂载容器

`append-to`：整个面板（遮罩 + 面板）移入指定容器的 portal host（独立 shadow + 样式注入 + 插槽桥接，`empty`/`footer`/`view-*` 插槽内容随面板迁移），适合嵌套 transform / stacking context 场景。

<DemoBlock title="append-to 挂载容器">
  <oas-space size="small">
    <oas-button id="command-append-btn" type="primary">打开（面板挂载到下方容器）</oas-button>
    <oas-tag id="command-append-result" type="info">尚未选择</oas-tag>
  </oas-space>
  <oas-command id="command-append" append-to="#command-append-panel" hotkey="false" items='[{"label":"打开文件","value":"open-file"},{"label":"保存文件","value":"save"}]'>
    <span slot="footer">↑↓ 选择 · ↵ 执行 · esc 关闭（随面板迁移）</span>
  </oas-command>
  <div id="command-append-panel" style="position: relative; width: 100%; height: 240px; margin-top: 16px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
</DemoBlock>

## 虚拟滚动

`virtual` 开启虚拟滚动（大数据量窗口渲染，复用 oas-virtual-list；有分组/最近项时自动回退全量渲染）。本 demo 预置 20000 条命令，只渲染可见窗口。

<DemoBlock title="虚拟滚动（2 万项）">
  <oas-command id="command-virtual" virtual item-height="36" hotkey="false" items='[]'></oas-command>
  <oas-space size="small">
    <oas-button id="command-virtual-btn" type="primary">打开（2 万项，方向键滚动）</oas-button>
    <oas-tag id="command-virtual-result" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.commandLog = (e) => {
    const tag = document.getElementById('command-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  // 受控打开：用 oas-open-change 同步状态（替代 MutationObserver）
  const ctrl = document.getElementById('command-controlled')
  const ctrlStatus = document.getElementById('command-ctrl-status')
  const ctrlSelected = document.getElementById('command-ctrl-selected')
  if (ctrl && ctrlStatus) {
    const sync = () => {
      ctrlStatus.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.cmdOpen = () => ctrl.setAttribute('open', '')
    window.commandCtrlSelect = (e) => {
      if (ctrlSelected) ctrlSelected.textContent = `已选择：${e.detail.value}`
    }
    sync()
    ctrl.addEventListener('oas-open-change', sync)
  }

  // 分组与空态
  document.getElementById('command-empty-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty')?.setAttribute('open', '')
  })
  document.getElementById('command-empty')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-empty-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // 图标/副标题/快捷键
  document.getElementById('command-icons-btn')?.addEventListener('click', () => {
    document.getElementById('command-icons')?.setAttribute('open', '')
  })
  document.getElementById('command-icons')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-icons-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // 自定义快捷键
  const hotkeyEl = document.getElementById('command-hotkey')
  const hotkeyStatus = document.getElementById('command-hotkey-status')
  if (hotkeyEl && hotkeyStatus) {
    hotkeyEl.addEventListener('oas-open-change', (e) => {
      hotkeyStatus.textContent = e.detail.open ? 'open（按 ctrl+shift+p 或 Esc 关闭）' : 'closed（按 ctrl+shift+p 打开）'
    })
  }
  document.getElementById('command-hotkey-btn')?.addEventListener('click', () => {
    document.getElementById('command-hotkey')?.setAttribute('open', '')
  })
  document.getElementById('command-no-hotkey-btn')?.addEventListener('click', () => {
    const el = document.getElementById('command-no-hotkey')
    el?.toggleAttribute('open')
  })

  // 匹配高亮
  document.getElementById('command-highlight-btn')?.addEventListener('click', () => {
    document.getElementById('command-highlight')?.setAttribute('open', '')
  })
  document.getElementById('command-highlight')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-highlight-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // should-filter=false 外部过滤（模拟异步数据源 600ms）
  const filterEl = document.getElementById('command-filter')
  const filterOut = document.getElementById('command-filter-output')
  const FILTER_ALL = [
    { label: '打开文件', value: 'open-file', group: '文件' },
    { label: '打开设置', value: 'open-settings', group: '系统' },
    { label: '新建文档', value: 'new-doc', group: '文件' },
    { label: '打开命令面板', value: 'open-palette', group: '系统' },
  ]
  let filterTimer = 0
  if (filterEl && filterOut) {
    filterEl.addEventListener('oas-input', (e) => {
      const q = e.detail.value
      window.clearTimeout(filterTimer)
      filterEl.setAttribute('loading', '')
      filterOut.textContent = `请求中…（"${q}"）`
      filterTimer = window.setTimeout(() => {
        if (!filterEl.isConnected) return
        filterEl.removeAttribute('loading')
        const matched = FILTER_ALL.filter((i) => i.label.includes(q))
        const list = q
          ? matched.length > 0
            ? matched
            : [{ label: `创建「${q}」`, value: `create:${q}`, forceMount: true }]
          : FILTER_ALL
        filterEl.setAttribute('items', JSON.stringify(list))
        filterOut.textContent = q ? `服务端返回 ${matched.length} 条` : '全部命令'
      }, 600)
    })
  }
  document.getElementById('command-filter-btn')?.addEventListener('click', () => {
    document.getElementById('command-filter')?.setAttribute('open', '')
  })

  // 空态插槽
  const emptySlot = document.getElementById('command-empty-slot')
  if (emptySlot) {
    window.commandEmptySlotCreate = () => {
      const q = emptySlot.query
      const tag = document.getElementById('command-empty-slot-result')
      if (tag) tag.textContent = `已创建：${q || '…'}`
    }
    emptySlot.addEventListener('oas-input', () => {
      const qEl = document.getElementById('command-empty-slot-q')
      if (qEl) qEl.textContent = emptySlot.query || '…'
    })
  }
  document.getElementById('command-empty-slot-btn')?.addEventListener('click', () => {
    document.getElementById('command-empty-slot')?.setAttribute('open', '')
  })

  // 嵌套页面
  document.getElementById('command-pages-btn')?.addEventListener('click', () => {
    document.getElementById('command-pages')?.setAttribute('open', '')
  })
  document.getElementById('command-pages')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-pages-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // 最近使用：选中后模拟命令集变化，重开可见「最近使用」组
  const recentEl = document.getElementById('command-recent')
  const RECENT_NEXT = [
    { label: '查看系统状态', value: 'sysinfo', group: '运维' },
    { label: '网络诊断', value: 'netdiag', group: '运维' },
    { label: '磁盘清理', value: 'diskclean', group: '运维' },
  ]
  if (recentEl) {
    recentEl.addEventListener('oas-select', (e) => {
      const tag = document.getElementById('command-recent-result')
      if (tag) tag.textContent = `已选择：${e.detail.value}`
      // 模拟命令集变化：下次打开时这些命令已不在列表，最近使用组会展示历史项
      recentEl.setAttribute('items', JSON.stringify(RECENT_NEXT))
    })
  }
  document.getElementById('command-recent-btn')?.addEventListener('click', () => {
    document.getElementById('command-recent')?.setAttribute('open', '')
  })

  // loading / limit
  const loadingEl = document.getElementById('command-loading')
  document.getElementById('command-loading-btn')?.addEventListener('click', () => {
    if (!loadingEl) return
    if (loadingEl.hasAttribute('open')) {
      loadingEl.toggleAttribute('loading')
    } else {
      loadingEl.setAttribute('open', '')
    }
  })
  document.getElementById('command-limit-btn')?.addEventListener('click', () => {
    document.getElementById('command-limit')?.setAttribute('open', '')
  })

  // 多选
  const multiEl = document.getElementById('command-multi')
  const multiOut = document.getElementById('command-multi-result')
  if (multiEl && multiOut) {
    multiEl.addEventListener('oas-select', (e) => {
      multiOut.textContent = `已执行：${e.detail.values.join('、')}`
    })
  }
  document.getElementById('command-multi-btn')?.addEventListener('click', () => {
    document.getElementById('command-multi')?.setAttribute('open', '')
  })

  // 视图插槽
  const viewsEl = document.getElementById('command-views')
  if (viewsEl) {
    window.commandViewDeploy = () => {
      const tag = document.getElementById('command-views-result')
      if (tag) tag.textContent = '部署已触发（表单在视图插槽内）'
    }
    window.commandViewNotify = () => {
      const tag = document.getElementById('command-views-result')
      if (tag) tag.textContent = '通知已发送'
    }
  }
  document.getElementById('command-views-btn')?.addEventListener('click', () => {
    document.getElementById('command-views')?.setAttribute('open', '')
  })

  // 受控 value / selected
  const csEl = document.getElementById('command-controlled-state')
  const csValue = document.getElementById('command-controlled-value')
  const csActive = document.getElementById('command-controlled-active')
  const csExec = document.getElementById('command-controlled-exec')
  if (csEl && csValue) {
    csEl.addEventListener('oas-input', (e) => {
      csEl.setAttribute('value', e.detail.value)
      csValue.textContent = `value: ${e.detail.value}`
    })
    csEl.addEventListener('oas-active', (e) => {
      csEl.setAttribute('selected', e.detail.value)
      if (csActive) csActive.textContent = `高亮: ${e.detail.value}`
    })
    csEl.addEventListener('oas-select', (e) => {
      if (csExec) csExec.textContent = `已执行：${e.detail.value}`
    })
  }
  document.getElementById('command-controlled-state-btn')?.addEventListener('click', () => {
    document.getElementById('command-controlled-state')?.setAttribute('open', '')
  })

  // footer 插槽
  document.getElementById('command-footer-btn')?.addEventListener('click', () => {
    document.getElementById('command-footer')?.setAttribute('open', '')
  })
  document.getElementById('command-footer')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-footer-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // append-to 挂载容器
  document.getElementById('command-append-btn')?.addEventListener('click', () => {
    document.getElementById('command-append')?.setAttribute('open', '')
  })
  document.getElementById('command-append')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-append-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })

  // 虚拟滚动：预置 20000 条
  const virtualEl = document.getElementById('command-virtual')
  if (virtualEl) {
    const rows = Array.from({ length: 20000 }, (_, i) => ({
      label: `命令 ${i}`,
      value: `cmd-${i}`,
      keywords: [`v${i}`],
    }))
    virtualEl.setAttribute('items', JSON.stringify(rows))
  }
  document.getElementById('command-virtual-btn')?.addEventListener('click', () => {
    document.getElementById('command-virtual')?.setAttribute('open', '')
  })
  document.getElementById('command-virtual')?.addEventListener('oas-select', (e) => {
    const tag = document.getElementById('command-virtual-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  })
})
</script>
## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `append-to` | 挂载容器选择器（如 `#panel`）：整个面板（遮罩 + 面板）移入目标容器的 portal host（独立 shadow + 样式注入 + 插槽桥接，empty/footer/view-* 插槽随面板迁移），适合嵌套 transform/stacking context 场景；未设置时面板在组件自身 shadow 内 fixed 定位 | `string` | — |
| `close-on-select` | 选中后是否关闭面板（默认 true；`false` 支持连续执行） | `string` | — |
| `hotkey` | 唤起快捷键组合，如 `ctrl+k` / `meta+shift+p`（逗号分隔多组，支持 mod/meta/ctrl/alt/shift）；`false` 关闭内置监听（默认 `mod+k`） | `string` | `mod+k` |
| `item-height` | 虚拟滚动行高（默认 `36`） | `string` | `36` |
| `items` | 命令项 JSON（根页；子页由 item.page 提供，含 icon / shortcut / description / page / view / forceMount / separator 字段） | `CommandItem[] \| string` | `[]` |
| `limit` | 渲染条数上限（默认 `50`；虚拟滚动不受限） | `string` | `50` |
| `loading` | 异步加载占位态（列表显示加载行 + `aria-busy`） | `boolean` | — |
| `multiple` | 多选命令模式（勾选切换 + footer 批量执行） | `boolean` | — |
| `open` | 是否打开（受控；选择 / Esc 后自动移除，打开/关闭各派发一次 `oas-open-change`） | `boolean` | — |
| `recent` | 记录最近使用（选中项按最近优先置顶，去重，上限 10 条） | `boolean` | — |
| `recent-storage-key` | 最近使用 localStorage 持久化键（需配合 `recent`；跨实例恢复） | `string` | — |
| `selected` | 当前高亮项 value（受控；方向键/悬停派发 `oas-active`，宿主回写生效） | `string` | — |
| `should-filter` | `false` 关闭内置过滤与打分排序（过滤交给宿主，接异步/服务端数据源） | `string` | `true` |
| `value` | 搜索词（受控；宿主监听 `oas-input` 回写实现双向） | `string` | — |
| `virtual` | 虚拟滚动（大数据量窗口渲染，复用 oas-virtual-list） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-active` | 高亮项变化，`detail: { value }`（受控 selected 的回写依据） |
| `oas-change` | 多选勾选变化，`detail: { values }` |
| `oas-input` | 搜索词输入，`detail: { value }`（`should-filter=false` 外部过滤的请求通道） |
| `oas-open-change` | 面板打开/关闭，`detail: { open }` |
| `oas-page-change` | 子页推入/回退，`detail: { title, depth, direction }`（`direction: push\|pop`） |
| `oas-select` | 执行某项，`detail: { value }`；多选确认 `detail: { values }` |
| `oas-view-change` | 视图进出，`detail: { view, title }`（退出时 `view: ''`） |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `empty` | 空结果自定义渲染（组件内用 `el.query` 读当前搜索词，如「创建 xyz」入口） |
| `footer` | 底部自定义条（默认显示 `↑↓ 选择 / ↵ 执行 / esc 关闭` 提示） |

`CommandItem` 字段：

| 字段       | 说明                                        | 类型       |
| ---------- | ------------------------------------------- | ---------- |
| `label`    | 显示文案                                    | `string`   |
| `value`    | 选中值（`oas-select` detail.value）         | `string`   |
| `keywords` | 搜索关键词（可选），参与 label 之外的匹配   | `string[]` |
| `group`    | 分组名（可选），同组项渲染分组标题          | `string`   |
| `disabled` | 禁用该项（Enter/点击不可选，方向键跳过）    | `boolean`  |

键盘：`↑`/`↓` 移动高亮（跳过 disabled），`Enter` 执行并关闭（多选模式切换勾选），`Esc` 关闭（有子页时先回退子页），空搜索词 `Backspace` 回退子页，`Tab` 在搜索框与选项间循环（焦点陷阱）；打开时自动聚焦搜索框，关闭后焦点归还来源元素。全局快捷键默认 `⌘K` / `Ctrl+K`（`hotkey` 可配置或关闭）。
