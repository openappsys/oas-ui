# 导航形态组合

本页是「跨组件导航形态组合」的配方集：**组件库不提供双轨侧栏这类单件组件**——双轨是 `oas-sidebar` 等既有件的组合形态，尺度、分区与联动都由宿主拼装。本页收录 6 条形态，每条都是可交互的 live demo。

## 双轨分裂侧栏 {#shape-dual}

**场景**：后台产品的「工作区 + 导航」双层结构——最左侧是窄图标轨（放工作区身份），紧邻一列是当前工作区的导航面板（分组菜单 + 页脚账户/容量）。左轨切换工作区时，右侧面板的标题、默认页与画布标题同步切换。全部用两个 `oas-sidebar` 拼装，不新增组件。

<DemoBlock title="双轨分裂侧栏（左图标轨切换工作区，右面板同步标题与高亮）">
  <div class="np-shell">
    <oas-sidebar
      id="np-rail"
      class="np-rail"
      collapsed
      hide-toggle
      mobile-breakpoint="1"
      active="am"
      items='[{"label":"OAS 工作室","value":"am","avatarText":"工"},{"label":"OAS 团队","value":"eu","avatarText":"团"},{"label":"新建工作区","value":"add","icon":"plus"}]'
    >
      <div slot="footer" class="np-rail__foot">
        <oas-avatar size="32">林晚</oas-avatar>
      </div>
    </oas-sidebar>
    <oas-sidebar
      id="np-workspace-panel"
      class="np-panel"
      hide-toggle
      mobile-breakpoint="1"
      active="live"
      items='[{"label":"今日看板","value":"live","group":"核心看板"},{"label":"增长雷达","value":"pulse","group":"核心看板"},{"label":"销售概况","value":"teams","group":"核心看板","badge":5},{"label":"商品目录","value":"catalog","group":"数据资产"},{"label":"生产批次","value":"batches","group":"数据资产"},{"label":"开票台账","value":"ledger","group":"数据资产"}]'
    >
      <oas-dropdown
        slot="header"
        id="np-workspace-switch"
        placement="bottom-start"
        items='[{"label":"重命名工作区","value":"rename"},{"label":"成员管理","value":"members"}]'
        style="display: block; width: 100%"
      >
        <button type="button" class="np-workspace">
          <span class="np-workspace__text">
            <span class="np-workspace__name" id="np-ws-name">OAS 控制台</span>
            <span class="np-workspace__tier" id="np-ws-tier">企业版</span>
          </span>
          <oas-icon name="chevron-down" size="16" class="np-workspace__chevron"></oas-icon>
        </button>
      </oas-dropdown>
      <div slot="footer" class="np-panel__foot">
        <div class="np-storage">
          <div class="np-storage__row">
            <span class="np-storage__title">存储空间</span>
            <oas-link href="#" class="np-storage__manage">管理</oas-link>
          </div>
          <oas-progress value="21" no-text label="4.2 GB of 20 GB"></oas-progress>
          <span class="np-storage__meta">4.2 GB / 20 GB</span>
        </div>
        <div class="np-panel__account">
          <button type="button" class="np-bell" id="np-bell" aria-label="通知">
            <oas-badge dot id="np-bell-badge">
              <oas-icon size="20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
                  <path d="M10 18a2 2 0 0 0 4 0" />
                </svg>
              </oas-icon>
            </oas-badge>
          </button>
          <oas-avatar size="28">林晚</oas-avatar>
        </div>
      </div>
    </oas-sidebar>
    <div class="np-main">
      <p class="np-main__eyebrow">Current view</p>
      <h4 class="np-main__title" id="np-main-title">今日看板</h4>
      <p class="np-main__desc">双轨只负责导航：画布内容仍由宿主页面自己决定。</p>
      <div class="np-main__cards">
        <div class="np-main__card">
          <span class="np-main__label">本月收入</span>
          <strong>¥286,400</strong>
        </div>
        <div class="np-main__card">
          <span class="np-main__label">活跃成员</span>
          <strong>46</strong>
        </div>
        <div class="np-main__card">
          <span class="np-main__label">待办事项</span>
          <strong>9</strong>
        </div>
      </div>
    </div>
  </div>
  <p id="np-status" role="status" class="np-status">当前工作区：OAS 工作室 → OAS 控制台（企业版）</p>
</DemoBlock>

**模式要点**：

1. **左轨 = `collapsed` 图标条**：`collapsed` 下组件只保留行首头像/图标项，无图标的项自动隐藏；轨道宽度走 `--oas-sidebar-collapsed-width`（本配方 68px，组件默认 64px，多出的 4px 给轨道里的头像留呼吸空间）。折叠态里组件默认隐藏 head / body / foot 三块，轨道页脚要显式透出（本页样式里的 `#np-rail::part(foot)` 覆写），否则底部头像不会出现。`hide-toggle` 关掉底部折叠按钮——双轨里的轨道宽度是布局决定，不由读者临时改
2. **右面板 = 第二个 `oas-sidebar`**：`group` 声明分区标题（组首项前渲染、折叠态自动隐藏），`header` / `footer` 具名插槽分别放工作区切换与账户区；宽度走 `--oas-sidebar-width`（272px）。页脚账号头像用 `oas-avatar` 的文字通道（组件契约是**只渲染首字符**，`LW` 显示为 `L`；要完整缩写请给 `src` 图片）
3. **两轨都是受控高亮**：`active` 只是受控属性，点击项只派发 `oas-select`（detail 形状 `{ value, label, group? }`，见侧栏组件页），宿主必须自己写回 `active`——左轨写左轨、右面板写右面板，两份状态各自独立
4. **工作区映射在宿主侧**：左轨选中值 → 右面板标题文案 + 默认页 value 是一张普通映射表；组件不感知「工作区」概念，这正是组合形态该待的地方
5. **容器负责尺度**：外层 flex 行 + 定高（本配方 520px）+ 圆角边框 + `overflow: hidden`，两列侧栏自动填满、页脚 sticky 钉底；导航之外的主内容区由宿主自行渲染

> 双轨只在桌面成立：配方用 `mobile-breakpoint="1"` 固定桌面形态（窄屏下双轨应退回单轨 + 抽屉，见侧栏组件页的移动端抽屉）。

**本页形态导航**：[双轨分裂侧栏](#shape-dual) · [浮岛顶栏](#shape-floating) · [经典浅色顶栏](#shape-classic) · [展开侧栏 272px](#shape-expanded) · [slim 图标轨 68px](#shape-rail) · [暗色企业版 272px](#shape-dark)

## 浮岛顶栏（horizontal-floating） {#shape-floating}

**场景**：SaaS 产品的悬浮导航条——圆角浮岛浮于页面之上，logo + 菜单 + 搜索 + 通知 + 账户全部收纳在一根栏内；菜单切换与通知已读都有即时可见反馈。组件只有一根 `oas-app-bar`（`position="floating"` + `elevated`），布局归宿主。

<DemoBlock title="浮岛顶栏（floating 圆角悬浮 + 受控菜单 + 通知已读 + 账户菜单）">
  <div class="npf-shell">
    <oas-app-bar id="npf-bar" position="floating" elevated>
      <div slot="leading" class="npf-brand">
        <span class="np-logo-mark np-logo-mark--bar" aria-hidden="true"><oas-icon name="star-filled" size="13"></oas-icon></span>
        <span class="npf-brand__name">OAS</span>
      </div>
      <nav slot="title" class="np-menu" id="npf-menu" aria-label="主导航">
        <button type="button" class="np-menu__item active" data-value="dashboard" aria-current="page">首页</button>
        <button type="button" class="np-menu__item" data-value="analytics">分析</button>
        <button type="button" class="np-menu__item" data-value="orders">订单</button>
        <button type="button" class="np-menu__item" data-value="invoices">发票</button>
      </nav>
      <!-- 搜索框与铃铛是两个独立 slotted 子元素：溢出收纳按元素粒度计算，
           真超宽时只收尾部元素而不是整组，铃铛交互尽量保住直接可见可点。
           窄容器下浮岛不保 ⌘K（inset 留边 + 账户区占宽，实测 574px 内容列里
           4 菜单 + 搜索 + kbd 放不下，订单/发票会被搜索框压到）——完整 ⌘K 组合
           见「展开侧栏」形态，那里宽度充裕 -->
      <div class="npf-search" slot="actions">
        <oas-input id="npf-search" placeholder="搜索" suffix-icon="search" clearable></oas-input>
      </div>
      <button type="button" class="np-bell" slot="actions" id="npf-bell" aria-label="通知">
        <oas-badge dot id="npf-bell-badge">
          <oas-icon size="20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
          </oas-icon>
        </oas-badge>
      </button>
      <div slot="trailing" class="npf-user">
        <oas-dropdown
          id="npf-user-menu"
          placement="bottom-end"
          items='[{"label":"个人设置","value":"profile"},{"label":"退出登录","value":"signout"}]'
        >
          <button type="button" class="npf-user__btn">
            <oas-avatar size="24">林晚</oas-avatar>
            <span class="npf-user__meta">
              <span class="npf-user__name">林晚</span>
              <span class="npf-user__tier">试用版</span>
            </span>
            <oas-icon name="chevron-down" size="12" class="npf-user__chevron"></oas-icon>
          </button>
        </oas-dropdown>
      </div>
    </oas-app-bar>
    <div class="npf-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npf-canvas-title">首页</h4>
      <p class="np-canvas__desc">浮岛只负责导航：页面内容由宿主渲染，浮在画布之上。</p>
      <div class="np-canvas__cards">
        <div class="np-canvas__card"><span>月度收入</span><strong>¥86,240</strong></div>
        <div class="np-canvas__card"><span>试用注册</span><strong>312</strong></div>
        <div class="np-canvas__card"><span>流失率</span><strong>1.8%</strong></div>
      </div>
    </div>
  </div>
  <p id="npf-status" role="status" class="np-status">当前页面：首页</p>
</DemoBlock>

**模式要点**：

1. **`position="floating"` 是组件形态**：圆角 + 边框 + 常显投影（`elevated`）+ 四边留边（`--oas-app-bar-inset`，本配方放宽到 16px）全部来自组件本身；宿主只提供一个浅色页面底（画布），让浮岛阴影有落点
2. **浮岛舞台用 `absolute` 复位定位**：组件 floating 是 `position: fixed`（相对视口）；demo 舞台容器声明 `position: relative` 并在宿主侧覆写 `#npf-bar { position: absolute }`（document 规则优先于 shadow 内 `:host` 规则），浮岛改为相对舞台悬浮——圆角/投影/留边不受影响，且**不会**像 `transform: translateZ(0)` 包含块方案那样把账户下拉浮层（shadow 内 `position: fixed`、按视口坐标计算）拖进容器坐标系造成错位
3. **菜单是受控高亮**：菜单项是宿主自绘按钮（放 `slot="title"`，flex:1 支柱），点击后宿主自己写回 `active` class 与 `aria-current`——组件不感知「页面」概念
4. **actions 区 = 溢出收纳容器**：搜索框（`oas-input` + `oas-kbd` ⌘K）与铃铛放 `slot="actions"`；宽度不足时组件自动把超出项收进「···」弹层（本配方容器够宽不触发，真实产品窄窗口时生效）。铃铛未读圆点走 `oas-badge` 的 `dot` 通道，点击切换已读
5. **账户菜单 = `oas-dropdown`**：触发按钮（头像 + 名字 + 套餐）放 `slot="trailing"`；`oas-select` 只上报选择值，打开什么由宿主决定

## 经典浅色顶栏（horizontal-classic） {#shape-classic}

**场景**：工具型产品的默认顶栏——全宽贴边、底部一条分隔线、无圆角无投影；中间放主导航，右侧搜索 + 通知 + 账户。与浮岛版同构，只换 `position`：**形态差异全部由组件属性表达，宿主布局代码零改动**。

<DemoBlock title="经典浅色顶栏（static 全宽贴边 + 底部分隔线 + 受控菜单）">
  <div class="npc-shell">
    <oas-app-bar id="npc-bar">
      <div slot="leading" class="npf-brand">
        <span class="np-logo-mark np-logo-mark--bar" aria-hidden="true"><oas-icon name="star-filled" size="13"></oas-icon></span>
        <span class="npf-brand__name">OAS</span>
      </div>
      <nav slot="title" class="np-menu" id="npc-menu" aria-label="主导航">
        <button type="button" class="np-menu__item active" data-value="dashboard" aria-current="page">首页</button>
        <button type="button" class="np-menu__item" data-value="analytics">分析</button>
        <button type="button" class="np-menu__item" data-value="orders">订单</button>
        <button type="button" class="np-menu__item" data-value="invoices">发票</button>
      </nav>
      <div class="npf-search" slot="actions">
        <oas-input placeholder="搜索" suffix-icon="search" clearable></oas-input>
        <oas-kbd keys="cmd k" size="small"></oas-kbd>
      </div>
      <button type="button" class="np-bell" slot="actions" aria-label="通知">
        <oas-badge dot>
          <oas-icon size="20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
          </oas-icon>
        </oas-badge>
      </button>
      <div slot="trailing" class="npc-user">
        <oas-avatar size="24">林晚</oas-avatar>
      </div>
    </oas-app-bar>
    <div class="npc-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npc-canvas-title">首页</h4>
      <p class="np-canvas__desc">static 形态：全宽贴边、随文档流，底部分隔线由宿主补一条边框。</p>
    </div>
  </div>
  <p id="npc-status" role="status" class="np-status">当前页面：首页</p>
</DemoBlock>

**模式要点**：

1. **经典版就是默认形态**：不写 `position`（static）即全宽贴边、无圆角无投影；底部分隔线组件未内置（经典设计语言两派都有），宿主补 `border-bottom` 即可
2. **与浮岛版逐项对照**：同一份 leading / title / actions / trailing 结构，`position="floating" elevated` ↔ 默认 static——换形态只动属性，这是「形态归组件、布局归宿主」的直接收益
3. **受控高亮与浮岛版同规则**：点击菜单项 → 宿主写回 active class + `aria-current` + 画布标题，`role="status"` 行同步播报

## 展开侧栏 272px（sidebar-expanded） {#shape-expanded}

**场景**：后台产品的工作台侧栏——logo + 全局搜索 + 分组菜单（收件箱带徽标）+ 页脚试用升级卡与偏好区；折叠按钮把整栏收成图标轨，可再展开；Dark mode 开关切 demo 舞台的主题作用域。一根 `oas-sidebar` + header/footer 插槽承载全部内容。

<DemoBlock title="展开侧栏（272px + 搜索 + 徽标菜单 + 试用卡 + Dark mode 开关 + 折叠/展开）">
  <div class="npe-shell" id="npe-shell">
    <oas-sidebar
      id="npe-sidebar"
      class="npe-sidebar"
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"消息","value":"inbox","icon":"mail","badge":7},{"label":"提醒","value":"notifications","icon":"alert-circle","badge":"3+"},{"label":"工作台","value":"dashboard","icon":"tree","group":"导航"},{"label":"数据分析","value":"analytics","icon":"sort","group":"导航"},{"label":"报表中心","value":"reporting","icon":"calendar","group":"导航"},{"label":"订单视图","value":"orders","icon":"copy","group":"导航"},{"label":"发票管理","value":"invoices","icon":"form","group":"导航"},{"label":"团队空间","value":"manufactures","icon":"organization","group":"导航"},{"label":"废纸篓","value":"trash","icon":"trash","group":"导航"}]'
    >
      <div slot="header" class="npe-head">
        <div class="npe-head__brand">
          <span class="np-logo-mark" aria-hidden="true"><oas-icon name="star-filled" size="15"></oas-icon></span>
          <span class="npe-head__name">OAS 控制台</span>
          <button type="button" class="np-icon-btn" id="npe-collapse-btn" aria-label="折叠侧栏" aria-expanded="true">
            <oas-icon name="chevron-left" size="16"></oas-icon>
          </button>
        </div>
        <div class="npe-search">
          <oas-input placeholder="搜索" suffix-icon="search" clearable></oas-input>
          <oas-kbd keys="cmd k"></oas-kbd>
        </div>
      </div>
      <div slot="footer" class="npe-foot">
        <div class="npe-pro">
          <div class="npe-pro__row">
            <span class="npe-pro__title">专业版试用</span>
            <span class="npe-pro__meta">剩余 6 天</span>
          </div>
          <oas-button id="npe-upgrade" size="small" type="primary">升级</oas-button>
        </div>
        <div class="npe-foot__links">
          <button type="button" class="np-foot-row" data-value="preferences">
            <oas-icon name="gear" size="16"></oas-icon><span>偏好设置</span>
          </button>
          <div class="np-foot-row np-foot-row--switch">
            <oas-switch id="npe-dark-switch" size="small" label="深色模式" label-position="start"></oas-switch>
          </div>
          <button type="button" class="np-foot-row" data-value="themes">
            <oas-icon name="eye" size="16"></oas-icon><span>主题外观</span>
          </button>
          <button type="button" class="np-foot-row" data-value="help">
            <oas-icon name="info" size="16"></oas-icon><span>帮助中心</span>
          </button>
        </div>
        <!-- 展开按钮放 footer 槽（空间位置贴在受控的图标轨自己身上，不漂进画布）；
             显隐纯 CSS 驱动：展开态整钮隐藏，折叠态经 ::part(foot) 透出且只露这一钮 -->
        <button type="button" class="np-icon-btn npe-expand" id="npe-expand-btn" aria-label="展开侧栏" aria-expanded="false">
          <oas-icon name="chevron-right" size="16"></oas-icon>
        </button>
      </div>
    </oas-sidebar>
    <div class="npe-canvas">
      <div class="npe-canvas__toolbar">
        <div>
          <p class="np-canvas__eyebrow">Workspace</p>
          <h4 class="np-canvas__title" id="npe-canvas-title">工作台</h4>
        </div>
      </div>
      <p class="np-canvas__desc">折叠把整栏收成 64px 图标轨（head/footer 内容随折叠隐藏），展开按钮收在图标轨底部——空间位置贴在受控对象自己身上。</p>
    </div>
  </div>
  <p id="npe-status" role="status" class="np-status">当前页面：工作台</p>
</DemoBlock>

**模式要点**：

1. **宽度走变量**：`--oas-sidebar-width: 272px` 覆盖组件默认 220px；`group` 声明 MENU 分区标题，`badge` 通道支持数字（Inbox 12）与字符串（Notifications「15+」）
2. **Preferences / Dark mode / Themes / Help 放 footer 插槽**而非 items：它们是「偏好区」不是页面导航，不该参与 `active` 选中语义；`oas-switch` 的 `label` 属性自带可见标签（label-position=start 标签在左），Dark mode 开关直接切 demo 舞台的 `data-theme` 作用域——容器级 token 切换让整块 demo 在明暗间完整换装，也是「任意容器可设 `data-theme`」的最小实证
3. **折叠/展开是受控属性**：header 的折叠按钮写 `collapsed` 属性；折叠态组件隐藏 head/body/foot（窄轨放不下这些内容），「展开」按钮由宿主补在 **footer 槽**——显隐纯 CSS 驱动（`[collapsed]` 属性选择器 + `::part(foot)` 透出，只露这一个钮），空间位置贴在受控的图标轨自己身上，不漂进画布内容区；真实产品里这个按钮也常在顶栏汉堡位，本质同样是宿主写回 `collapsed`
4. **试用卡是 footer 自由内容**：`oas-button`（size=small、type=primary）+ 文案，组件只保证页脚钉底（sticky），卡内布局归宿主
5. **内容超一屏时 sidebar 按 panel 滚动**：footer sticky 钉底、菜单从 footer 下方穿过（组件既定语义）——本配方内容刻意塞满以演示完整分区，滚动即可查看全部菜单项

## slim 图标轨 68px（sidebar-rail） {#shape-rail}

**场景**：空间紧凑的工具产品导航——一条 68px 图标轨贴边常驻，悬停临时展开出标签（不打断布局），底部账户头像钉底。`collapsed` + `expand-on-hover` 两个组件属性的组合形态。

<DemoBlock title="slim 图标轨（collapsed 68px + expand-on-hover 悬停展开 + 受控 active）">
  <div class="npr-shell">
    <oas-sidebar
      id="npr-rail"
      class="npr-rail"
      collapsed
      expand-on-hover
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"工作台","value":"dashboard","icon":"tree"},{"label":"数据分析","value":"analytics","icon":"sort"},{"label":"报表中心","value":"reporting","icon":"calendar"},{"label":"订单视图","value":"orders","icon":"copy"},{"label":"发票管理","value":"invoices","icon":"form"},{"label":"设置","value":"settings","icon":"gear"}]'
    >
      <div slot="footer" class="npr-foot">
        <oas-avatar size="32">林晚</oas-avatar>
      </div>
    </oas-sidebar>
    <div class="npr-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npr-canvas-title">工作台</h4>
      <p class="np-canvas__desc">悬停图标轨可临时展开标签；键盘 focus 时以内建 tooltip 提示（组件内建，非本配方实现）。</p>
    </div>
  </div>
  <p id="npr-status" role="status" class="np-status">当前页面：工作台</p>
</DemoBlock>

**模式要点**：

1. **68px = `--oas-sidebar-collapsed-width`**：组件默认 64px，多出的 4px 给图标呼吸；`collapsed` 是受控属性，无 icon 的项折叠态自动隐藏
2. **`expand-on-hover` 是纯视觉态**：悬停临时展开到 `--oas-sidebar-width`（240px）露出标签并投影，不改写 `collapsed` 受控值——移开即回轨。展开宽度想比默认 220px 窄一点，把该变量一起调小即可
3. **折叠页脚透出沿用首版方案**：折叠态组件隐藏 foot，`::part(foot)` 宿主级覆写把头像显式放回轨道底部——这是「组件默认收起、配方按需透出」的既定组合手法
4. **tooltip 是组件内建**：折叠态 icon 项自带 tooltip（键盘 focus 时以 `trigger="focus"` 提示），配方不需要自己造浮层

## 暗色企业版 272px（sidebar-dark） {#shape-dark}

**场景**：暗色主题下的企业工作台侧栏——暗底 + 主色徽标 + 主色选中态 + 试用升级卡与账户行。机制与站点其它 demo 容器一致：**容器上设 `data-theme="dark"` 切换 token 作用域**（皮肤画廊同款），组件全部跟随，demo 内零硬编码色值。

<DemoBlock title="暗色企业版侧栏（data-theme=dark 作用域 + 主色徽标 + 账户行）">
  <div class="npd-shell" data-theme="dark">
    <oas-sidebar
      id="npd-sidebar"
      class="npd-sidebar"
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"消息","value":"inbox","icon":"mail","badge":7},{"label":"提醒","value":"notifications","icon":"alert-circle","badge":"2"},{"label":"工作台","value":"dashboard","icon":"tree","group":"导航"},{"label":"数据分析","value":"analytics","icon":"sort","group":"导航"},{"label":"报表中心","value":"reporting","icon":"calendar","group":"导航"},{"label":"订单视图","value":"orders","icon":"copy","group":"导航"},{"label":"发票管理","value":"invoices","icon":"form","group":"导航"},{"label":"主题外观","value":"themes","icon":"eye","group":"导航"}]'
    >
      <div slot="header" class="npd-head">
        <div class="npe-head__brand">
          <span class="np-logo-mark" aria-hidden="true"><oas-icon name="star-filled" size="15"></oas-icon></span>
          <span class="npe-head__name">OAS 控制台</span>
        </div>
        <div class="npe-search">
          <oas-input placeholder="搜索" suffix-icon="search" clearable></oas-input>
          <oas-kbd keys="cmd k"></oas-kbd>
        </div>
      </div>
      <div slot="footer" class="npd-foot">
        <div class="npd-pro">
          <div class="npe-pro__row">
            <span class="npe-pro__title">专业版试用</span>
            <span class="npe-pro__meta">剩余 6 天</span>
          </div>
          <oas-button size="small" type="primary">升级</oas-button>
        </div>
        <div class="npd-account">
          <oas-avatar size="30">林晚</oas-avatar>
          <span class="npd-account__meta">
            <span class="npd-account__name">林晚</span>
            <span class="npd-account__mail">linwan@oas.dev</span>
          </span>
        </div>
      </div>
    </oas-sidebar>
    <div class="npd-canvas">
      <p class="np-canvas__eyebrow">Workspace</p>
      <h4 class="np-canvas__title" id="npd-canvas-title">工作台</h4>
      <p class="np-canvas__desc">容器 data-theme=dark：组件与自绘内容的全部颜色都来自暗色 token，明暗两端无一处硬编码。</p>
    </div>
  </div>
  <p id="npd-status" role="status" class="np-status">当前页面：工作台</p>
</DemoBlock>

**模式要点**：

1. **暗色机制 = 容器 `data-theme="dark"`**：皮肤画廊（skins）预览容器同款——token 变量在该容器作用域整体换值，`oas-sidebar` / `oas-input` / `oas-button` / `oas-avatar` 与自绘文字全部自动跟随，不需要逐个组件调暗
2. **徽标与选中态默认就是主色**：sidebar 徽标底色走 `--oas-sidebar-badge-bg`（缺省 `--oas-color-primary`）、active 项是主色浅底 + 主色文字——暗色下这套对比由主题 token 保证。「左侧强调条」属于组件内私有结构（`::part` 无法按 active 状态过滤），组合层不做 shadow 穿透 hack；需要强调条形态应在组件层提需求
3. **暗色卡与账户行**：footer 试用卡用 `--oas-color-bg-elevated`（暗色下比暗底亮一档）+ 边框分层；账户行 `oas-avatar` 文字通道（首字符）+ 邮箱副文本，全部 token 色
4. **对比度门禁**：暗色 demo 与明色 demo 同过 axe 与感知对比度基线——暗底上的次要文字用 `--oas-color-text-secondary`，主题已保证两档可读

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const rail = document.getElementById('np-rail')
  const panel = document.getElementById('np-workspace-panel')
  const wsName = document.getElementById('np-ws-name')
  const wsTier = document.getElementById('np-ws-tier')
  const mainTitle = document.getElementById('np-main-title')
  const status = document.getElementById('np-status')
  const switcher = document.getElementById('np-workspace-switch')
  if (!rail || !panel || !wsName || !wsTier) return

  // 宿主侧的工作区映射：左轨选中值 → 右面板标题 + 默认页（组件不感知工作区概念）
  const WORKSPACES = {
    am: { label: 'OAS 工作室', name: 'OAS 控制台', tier: '企业版', page: 'live', pageLabel: '今日看板' },
    eu: { label: 'OAS 团队', name: 'OAS 控制台 Lite', tier: '团队版', page: 'pulse', pageLabel: '增长雷达' },
  }
  const say = (text) => {
    if (status) status.textContent = text
  }
  const applyWorkspace = (value) => {
    const ws = WORKSPACES[value]
    if (!ws) return
    rail.setAttribute('active', value) // 左轨高亮受控：宿主写回
    wsName.textContent = ws.name
    wsTier.textContent = ws.tier
    panel.setAttribute('active', ws.page) // 右面板默认页受控
    if (mainTitle) mainTitle.textContent = ws.pageLabel
    say(`当前工作区：${ws.label} → ${ws.name}（${ws.tier}）`)
  }

  // 左轨：oas-select → 切换右面板（『Add workspace』是入口占位，交给宿主开流程）
  rail.addEventListener('oas-select', (e) => {
    const value = e.detail.value
    if (value === 'add') {
      say('「新建工作区」只是入口占位：宿主在这里打开创建工作区的流程')
      return
    }
    applyWorkspace(value)
  })

  // 右面板：菜单项同样只派发 oas-select，active 必须由宿主写回
  panel.addEventListener('oas-select', (e) => {
    panel.setAttribute('active', e.detail.value)
    if (mainTitle) mainTitle.textContent = e.detail.label
    say(`当前页面：${e.detail.label}`)
  })

  // header 的工作区下拉：选中项只做反馈演示，真实产品在这里打开重命名 / 成员管理
  switcher?.addEventListener('oas-select', (e) => {
    say(`工作区操作：${e.detail.value === 'rename' ? '重命名工作区' : '成员管理'}`)
  })

  // 铃铛：点一下把未读圆点标记为已读（oas-badge 的 dot 属性通道），给读者可见反馈
  const bell = document.getElementById('np-bell')
  const bellBadge = document.getElementById('np-bell-badge')
  bell?.addEventListener('click', () => {
    const unread = bellBadge?.hasAttribute('dot') ?? false
    bellBadge?.toggleAttribute('dot', !unread)
    say(unread ? '通知：已全部标记为已读' : '通知：有 1 条未读')
  })

  applyWorkspace('am')
})

// ===== 二批：浮岛顶栏 / 经典顶栏 / 展开侧栏 / 图标轨 / 暗色企业版 =====
// 机制与首版一致：onMounted + 组件事件（oas-select / oas-change 等），active/状态由宿主写回。
onMounted(() => {
  const say = (el, text) => {
    if (el) el.textContent = text
  }

  // —— 浮岛顶栏：菜单受控高亮 + 通知已读 + 账户菜单 + 搜索回车 ——
  const npfMenu = document.getElementById('npf-menu')
  const npfCanvasTitle = document.getElementById('npf-canvas-title')
  const npfStatus = document.getElementById('npf-status')
  const npfBar = document.getElementById('npf-bar')
  if (npfMenu && npfBar) {
    const items = [...npfMenu.querySelectorAll('.np-menu__item')]
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        items.forEach((b) => {
          b.classList.toggle('active', b === btn)
          if (b === btn) b.setAttribute('aria-current', 'page')
          else b.removeAttribute('aria-current')
        })
        const label = btn.textContent ?? ''
        if (npfCanvasTitle) npfCanvasTitle.textContent = label
        say(npfStatus, `当前页面：${label}`)
      })
    })
    // 铃铛已读切换（oas-badge 的 dot 通道）
    const bell = document.getElementById('npf-bell')
    const bellBadge = document.getElementById('npf-bell-badge')
    bell?.addEventListener('click', () => {
      const unread = bellBadge?.hasAttribute('dot') ?? false
      bellBadge?.toggleAttribute('dot', !unread)
      say(npfStatus, unread ? '通知：已全部标记为已读' : '通知：有 1 条未读')
    })
    // 账户下拉：选择值只做反馈演示
    document.getElementById('npf-user-menu')?.addEventListener('oas-select', (e) => {
      say(npfStatus, `账户操作：${e.detail.value === 'profile' ? '个人设置' : '退出登录'}`)
    })
    // 搜索回车（oas-input 的 oas-enter）
    document.getElementById('npf-search')?.addEventListener('oas-enter', (e) => {
      say(npfStatus, `搜索：${e.detail.value || '（空）'}`)
    })
  }

  // —— 经典顶栏：同款受控菜单（static 全宽）——
  const npcMenu = document.getElementById('npc-menu')
  const npcCanvasTitle = document.getElementById('npc-canvas-title')
  const npcStatus = document.getElementById('npc-status')
  if (npcMenu) {
    const items = [...npcMenu.querySelectorAll('.np-menu__item')]
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        items.forEach((b) => {
          b.classList.toggle('active', b === btn)
          if (b === btn) b.setAttribute('aria-current', 'page')
          else b.removeAttribute('aria-current')
        })
        const label = btn.textContent ?? ''
        if (npcCanvasTitle) npcCanvasTitle.textContent = label
        say(npcStatus, `当前页面：${label}`)
      })
    })
  }

  // —— 展开侧栏：菜单受控 + 折叠/展开 + Dark mode 作用域 + 偏好行 ——
  const npeSidebar = document.getElementById('npe-sidebar')
  const npeCanvasTitle = document.getElementById('npe-canvas-title')
  const npeStatus = document.getElementById('npe-status')
  const npeShell = document.getElementById('npe-shell')
  const npeCollapseBtn = document.getElementById('npe-collapse-btn')
  const npeExpandBtn = document.getElementById('npe-expand-btn')
  if (npeSidebar && npeShell) {
    npeSidebar.addEventListener('oas-select', (e) => {
      npeSidebar.setAttribute('active', e.detail.value) // 受控：宿主写回
      if (npeCanvasTitle) npeCanvasTitle.textContent = e.detail.label
      say(npeStatus, `当前页面：${e.detail.label}`)
    })
    // 折叠：head/footer 随折叠隐藏（窄轨放不下）；展开按钮在 footer 槽里、
    // 显隐纯 CSS 驱动（宿主 [collapsed] 属性选择器），脚本只读写 collapsed 受控值
    npeCollapseBtn?.addEventListener('click', () => {
      npeSidebar.setAttribute('collapsed', '')
      npeCollapseBtn.setAttribute('aria-expanded', 'false')
      say(npeStatus, '侧栏已折叠为图标轨（展开按钮收在轨底部）')
    })
    npeExpandBtn?.addEventListener('click', () => {
      npeSidebar.removeAttribute('collapsed')
      npeCollapseBtn?.setAttribute('aria-expanded', 'true')
      say(npeStatus, '侧栏已展开回 272px')
    })
    // Dark mode 开关：切 demo 舞台的 data-theme 作用域（容器级 token 换值）
    document.getElementById('npe-dark-switch')?.addEventListener('oas-change', (e) => {
      const dark = !!e.detail.checked
      npeShell.setAttribute('data-theme', dark ? 'dark' : 'light')
      say(npeStatus, dark ? 'Dark mode：本 demo 容器切到暗色 token 作用域' : 'Dark mode：本 demo 容器切回浅色')
    })
    // 偏好行 / 升级按钮：入口占位（真实产品在此打开对应面板）
    document.getElementById('npe-upgrade')?.addEventListener('oas-click', () => {
      say(npeStatus, 'Upgrade：宿主在这里打开升级流程')
    })
    npeShell.querySelectorAll('.np-foot-row[data-value]').forEach((row) => {
      row.addEventListener('click', () => {
        say(npeStatus, `偏好区：${row.dataset.value}`)
      })
    })
  }

  // —— 图标轨：受控 active + 画布标题同步 ——
  const nprRail = document.getElementById('npr-rail')
  const nprCanvasTitle = document.getElementById('npr-canvas-title')
  const nprStatus = document.getElementById('npr-status')
  if (nprRail) {
    nprRail.addEventListener('oas-select', (e) => {
      nprRail.setAttribute('active', e.detail.value) // 受控：宿主写回
      if (nprCanvasTitle) nprCanvasTitle.textContent = e.detail.label
      say(nprStatus, `当前页面：${e.detail.label}`)
    })
  }

  // —— 暗色企业版：受控 active + 状态行 ——
  const npdSidebar = document.getElementById('npd-sidebar')
  const npdCanvasTitle = document.getElementById('npd-canvas-title')
  const npdStatus = document.getElementById('npd-status')
  if (npdSidebar) {
    npdSidebar.addEventListener('oas-select', (e) => {
      npdSidebar.setAttribute('active', e.detail.value) // 受控：宿主写回
      if (npdCanvasTitle) npdCanvasTitle.textContent = e.detail.label
      say(npdStatus, `当前页面：${e.detail.label}`)
    })
  }
})
</script>

<style>
/* —— 双轨外壳：行容器 + 定高 + 圆角边框（尺度归容器，两列侧栏自己填满） —— */
.np-shell {
  display: flex;
  gap: 0;
  width: 100%;
  height: 520px;
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* 左轨：折叠图标条宽度 68px */
.np-rail {
  flex: 0 0 auto;
  --oas-sidebar-collapsed-width: 68px;
}
/* 折叠态组件默认隐藏 head / body / foot；配方把 footer 显式透出，
   让账户头像常驻轨道底部（::part 引用容器级覆写，作用范围仅此页） */
#np-rail::part(foot) {
  display: flex;
  justify-content: center;
}
.np-rail__foot {
  display: flex;
  justify-content: center;
  line-height: 0;
}
/* 右面板：展开宽度 272px，与左轨之间一条分隔线 */
.np-panel {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* 徽标对比修复：同 .npe-sidebar（组件缺省主色底白字在 4.5 边缘，加深主色保达标） */
  --oas-sidebar-badge-bg: color-mix(in srgb, var(--oas-color-primary) 75%, black);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
/* header 工作区切换：名称 + 副标题 + 下拉箭头 */
.np-workspace {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: inherit;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.np-workspace:hover {
  background: color-mix(in srgb, var(--oas-color-text-primary) 6%, transparent);
}
.np-workspace:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 铃铛：图标 + 未读圆点，点击把 dot 标记为已读（键盘可达） */
.np-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  cursor: pointer;
  line-height: 0;
}
.np-bell:hover {
  background: var(--oas-color-bg-hover);
}
.np-bell:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-workspace__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}
.np-workspace__name {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-workspace__tier {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-workspace__chevron {
  flex-shrink: 0;
  color: var(--oas-color-text-secondary);
}
/* 页脚：容量卡 + 账户行 */
.np-panel__foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.np-storage {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  /* 卡片用 elevated 面：12px 次要文字放在 bg-hover 上实测比值 4.39 < 4.5（浅色档） */
  background: var(--oas-color-bg-elevated);
}
.np-storage__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.np-storage__title {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
}
.np-storage__meta {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-panel__account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
/* 主内容区（画布）：只是让双轨落在真实语境里，不是本配方的主角 */
.np-main {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
  overflow: hidden;
  background: var(--oas-color-bg);
}
.np-main__eyebrow {
  margin: 0;
  font-size: var(--oas-font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.np-main__title {
  margin: 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-main__desc {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.np-main__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--oas-space-3);
}
.np-main__card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.np-main__label {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-main__card strong {
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-status {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
@media (max-width: 720px) {
  /* 窄屏优先保住双轨本身（配方演示对象是双轨，不是响应式降级） */
  .np-shell {
    height: 460px;
  }
  .np-main {
    display: none;
  }
}

/* ===== 二批：浮岛顶栏 / 经典顶栏 / 展开侧栏 / 图标轨 / 暗色企业版 ===== */

/* —— 通用小件（多形态共用）—— */
/* 品牌 logo 方块：primary 底 + on-primary 图标色 */
.np-logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  flex-shrink: 0;
}
/* 顶栏菜单（slot="title"）：受控 active + aria-current 由宿主写回。
   文档站内容区只有 ~574px 宽，顶栏全要素（品牌+4 菜单+搜索+kbd+铃铛+用户区）
   必须整体紧凑化：actions 区（flex-shrink 0）挤压标题菜单时，菜单会溢出
   title-wrap 与搜索框重叠绘制（收纳「···」之外的第二种窄容器失真） */
.np-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.np-menu__item {
  appearance: none;
  border: none;
  padding: 2px 8px;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.np-menu__item:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.np-menu__item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-menu__item.active {
  color: var(--oas-color-primary-text);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  font-weight: 500;
}
/* 行距不再手写覆盖：demo 之前的 8px/24px/32px padding-inline 三轮拧旋钮证明
   「伪造间距」没有依据——参考图的奢侈留白是 ~1100px 宽栏的产物，574px 内容列
   里组件默认比例（space-4 行内距）即最协调解。顶栏内部间距归组件默认值，
   demo 只保留配方级决策：浮岛 inset 页边距 + 经典顶栏底部分隔线。 */
.np-logo-mark--bar {
  width: 22px;
  height: 22px;
}
/* 顶栏铃铛（浮岛/经典共用）：图标 + 未读圆点 */
.np-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  cursor: pointer;
  line-height: 0;
}
.np-bell:hover {
  background: var(--oas-color-bg-hover);
}
.np-bell:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 搜索框 + kbd 组（input 132px：88px 时后缀图标会压住「搜索」占位文本——
   实测 2 字占位 + suffix-icon + clearable 需要 ≥128px 才不遮挡） */
.npf-search {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
}
.npf-search oas-input {
  width: 116px;
}
/* 展开按钮（footer 槽内）：展开态隐藏；折叠态经 ::part(foot) 透出整个页脚，
   再用宿主属性选择器收起其它页脚内容（试用卡/偏好区），只露这一个居中按钮。
   选择器带双类压过后面定义的 .np-icon-btn display（同级类选择器源码序在后会反超） */
.npe-expand.np-icon-btn {
  display: none;
}
#npe-sidebar[collapsed]::part(foot) {
  display: flex;
  justify-content: center;
}
#npe-sidebar[collapsed] .npe-foot > :not(.npe-expand) {
  display: none;
}
#npe-sidebar[collapsed] .npe-expand {
  display: inline-flex;
}
/* 图标小方钮（折叠/展开按钮） */
.np-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
}
.np-icon-btn:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.np-icon-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* 页脚偏好行（展开侧栏 footer）：文字用 primary——sidebar 底色上 secondary 实测 4.39 < 4.5 */
.np-foot-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.np-foot-row:hover {
  background: var(--oas-color-bg-hover);
}
.np-foot-row:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-foot-row--switch {
  cursor: default;
}
.np-foot-row--switch:hover {
  background: none;
}
/* 画布（浮岛/经典/展开/图标轨共用排版） */
.np-canvas__eyebrow {
  margin: 0;
  font-size: var(--oas-font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.np-canvas__title {
  margin: var(--oas-space-1) 0 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-canvas__desc {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.np-canvas__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--oas-space-3);
  margin-top: var(--oas-space-4);
}
.np-canvas__card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.np-canvas__card span {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-canvas__card strong {
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}

/* —— 浮岛顶栏 —— */
/* 舞台：relative 是浮岛 absolute 的包含块；浅色页面底让浮岛阴影有落点。
   不用 transform 做 fixed 包含块——那会把 dropdown 浮层（shadow 内 fixed、
   视口坐标）拖进容器坐标系造成错位，absolute 复位只换定位不改视觉形态。 */
.npf-shell {
  position: relative;
  overflow: hidden;
  /* DemoBlock body 是 flex-wrap 容器：shell 作为 flex item 是 fit-content 宽，
     必须显式铺满，否则被内容压窄、顶栏触发溢出收纳 */
  width: 100%;
  height: 440px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* document 规则优先于 shadow 内 :host 规则：只换 position，
   floating 的圆角/边框/投影/留边（同一条规则里的其余声明）全部保留。
   留边 16px（组件默认 12px）——浮岛视觉边距 = inset + 行内 8px ≈ 24px，
   与经典顶栏的行内 32px 在各自容器里观感平衡（参考图比例） */
#npf-bar {
  position: absolute;
  --oas-app-bar-inset: 16px;
}
/* 浮岛下方画布留出浮岛高度（56px 主行 + 12px 顶部留边） */
.npf-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  padding: 92px var(--oas-space-5) var(--oas-space-5);
}
.npf-brand {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npf-brand__name {
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
}
.npf-user__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}
.npf-user__btn:hover {
  background: var(--oas-color-bg-hover);
}
.npf-user__btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.npf-user__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: start;
  min-width: 0;
}
.npf-user__name {
  font-size: var(--oas-font-size-xs);
  font-weight: 500;
  color: var(--oas-color-text-primary);
  line-height: 1.2;
}
.npf-user__tier {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.2;
}
.npf-user__chevron {
  color: var(--oas-color-text-secondary);
}

/* —— 经典浅色顶栏 —— */
.npc-shell {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 400px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* 经典形态的分隔线组件未内置（两派设计语言都有），宿主补一条底边 */
#npc-bar {
  border-bottom: 1px solid var(--oas-color-border);
}
.npc-user {
  display: flex;
  align-items: center;
}
.npc-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  padding: var(--oas-space-5);
}

/* —— 展开侧栏 272px —— */
.npe-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 520px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npe-sidebar {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  /* 底色走 bg（与画布同色 + 分隔线，首版 np-panel 同款）：组件缺省 bg-hover 底上
     secondary 文字（组标题/页脚行）实测 4.39 < 4.5，bg 底达标 */
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* 徽标对比修复：组件缺省 badge-color 锁死 #fff，主色底白字在 light 主题 ~4.4x、
     dark 主题 primary 变亮色后更低，axe color-contrast 判违规。按主题覆写——
     light 用加深主色 + 白字，dark 用亮主色 + 深字（主色系徽标视觉不变，对比由主题对保证） */
  --oas-sidebar-badge-bg: color-mix(in srgb, var(--oas-color-primary) 75%, black);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
/* 站点暗色主题：primary 变亮色，混黑后中灰蓝配深字对比不足（~3.0）——
   改用原亮 primary 底 + on-primary 深字（dark 主题对，对比 ~10） */
.dark .np-panel,
.dark .npe-sidebar {
  --oas-sidebar-badge-bg: var(--oas-color-primary);
}
.npe-head {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npe-head__brand {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npe-head__name {
  flex: 1 1 auto;
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.npe-search {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npe-search oas-input {
  flex: 1 1 auto;
  min-width: 0;
}
/* kbd 防挤压：搜索行空间不足时键帽会被压成竖排，锁死不收缩 */
.npe-search oas-kbd {
  flex-shrink: 0;
}
.npe-foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npe-pro {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1_5);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  /* elevated 面：12px 次要文字在 bg-hover 上浅色档实测 4.39 < 4.5（同首版容量卡取面） */
  background: var(--oas-color-bg-elevated);
}
.npe-pro__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.npe-pro__title {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
}
.npe-pro__meta {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.npe-foot__links {
  display: flex;
  flex-direction: column;
}
.npe-canvas {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-4) var(--oas-space-5);
}
.npe-canvas__toolbar {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-3);
}

/* —— slim 图标轨 68px —— */
.npr-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 480px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npr-rail {
  flex: 0 0 auto;
  --oas-sidebar-collapsed-width: 68px;
  /* expand-on-hover 悬停临时展开的目标宽度（顺带比默认 220px 收一点） */
  --oas-sidebar-width: 240px;
}
/* 折叠态组件默认隐藏 head/body/foot；配方显式透出页脚头像（首版同款手法） */
#npr-rail::part(foot) {
  display: flex;
  justify-content: center;
}
.npr-foot {
  display: flex;
  justify-content: center;
  line-height: 0;
}
.npr-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
}

/* —— 暗色企业版 272px —— */
/* 暗色机制：容器 data-theme="dark" 切 token 作用域（皮肤画廊预览容器同款），
   组件与自绘内容全部自动跟随，此处零硬编码色值 */
.npd-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 520px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npd-sidebar {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  /* 底色走 bg（dark 下即暗底，与画布同色 + 分隔线）：同 .npe-sidebar 的对比修复 */
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* 徽标对比修复（dark 作用域）：亮主色底 + 深字（on-primary 在 dark 是深色），
     保持主色徽标视觉且对比达标；light 下 badge 覆写见 .npe-sidebar 注释 */
  --oas-sidebar-badge-bg: var(--oas-color-primary);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
.npd-head {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npd-foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npd-pro {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1_5);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.npd-account {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-2);
}
.npd-account__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.npd-account__name {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
  line-height: 1.2;
}
.npd-account__mail {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.npd-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
}
</style>
