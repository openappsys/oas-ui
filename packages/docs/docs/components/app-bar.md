# AppBar 应用栏

页面 / 工具区顶部的应用栏布局条（`role="banner"`）：leading 区（汉堡钮 / 自定义内容）+ 标题 + 操作区 + 末端区 + overflow 收纳 + 滚动折叠 + 扩展区第二行。

## 基础用法

`heading` 属性设置标题文案，`slot="actions"` 放操作按钮（`oas-button` 等），标题区为 `flex: 1` 支柱把操作区推到远端。

<DemoBlock title="标题 + 操作区">
  <oas-app-bar heading="项目工作台">
    <oas-button size="small" slot="actions">导入</oas-button>
    <oas-button size="small" type="primary" slot="actions">新建项目</oas-button>
  </oas-app-bar>
</DemoBlock>

## 汉堡钮（menu-button）

`menu-button` 布尔属性显示 leading 汉堡钮，点击派发 `oas-menu-toggle`（宿主自行开合侧边抽屉）；抽屉开合后回写 `menu-open` 布尔属性，汉堡钮的 `aria-expanded` 随之同步；`menu-controls` 指向宿主抽屉元素的 id（`aria-controls`）。

<DemoBlock title="汉堡钮 + 菜单开合状态">
  <oas-app-bar id="ab-menu" heading="控制台" menu-button menu-controls="side-drawer"></oas-app-bar>
  <p id="ab-menu-out" style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点左侧汉堡钮，观察 aria-expanded 与事件反馈。</p>
  <!-- aria-controls 引用目标占位：真实场景指向宿主的侧抽屉元素 id -->
  <div id="side-drawer" hidden></div>
</DemoBlock>

## 富标题 / leading / trailing 插槽

`slot="title"` 富标题（有内容时覆盖 `heading` 属性文本）；`slot="leading"` 在汉堡钮之后放自定义 leading 内容；`slot="trailing"` 在最末端放头像等（不参与 overflow 收纳）。

<DemoBlock title="插槽组合">
  <oas-app-bar heading="占位标题">
    <oas-avatar slot="leading">O</oas-avatar>
    <span slot="title" style="display: inline-flex; align-items: center; gap: var(--oas-space-2)">
      发布中心 <oas-tag color="blue">Beta</oas-tag>
    </span>
    <oas-button size="small" round icon="gear" aria-label="设置" slot="trailing"></oas-button>
  </oas-app-bar>
</DemoBlock>

## overflow 溢出收纳

`slot="actions"` 超出栏宽时，超宽操作项自动收进「···」弹层（ResizeObserver 驱动，窗口缩放实时重算）；弹层内镜像项点击回派到原按钮。按钮的 `aria-label` 优先作为镜像项标签。

<DemoBlock title="窄容器溢出收纳（缩放窗口观察重算）">
  <div style="max-width: 360px">
    <oas-app-bar id="ab-overflow" heading="报表">
      <oas-button size="small" slot="actions" onclick="message.info('刷新成功')">刷新</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已导出 CSV')">导出 CSV</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已导出 Excel')">导出 Excel</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已分享')">分享</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已归档')">归档</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已打印')">打印</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('已设置')">设置</oas-button>
    </oas-app-bar>
  </div>
</DemoBlock>

## 定位形态（position）

`position` 控制定位形态：`static`（默认，随文档流）/ `absolute` / `fixed`（视口顶部，偏移走 `--oas-app-bar-top` 变量开口）/ `floating`（圆角悬浮 + 投影 + 四边留边）。演示页为避免遮挡内容用内联样式保持静态，实际场景直接用对应形态。

<DemoBlock title="四种形态（演示均保持 static 定位）">
  <oas-app-bar heading="static 默认"></oas-app-bar>
  <oas-app-bar heading="absolute" position="absolute" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="fixed" position="fixed" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="floating 悬浮胶囊" position="floating" style="position: static; margin-block-start: var(--oas-space-3)"></oas-app-bar>
</DemoBlock>

## 投影（elevated / 滚动后投影）

`elevated` 布尔属性常显投影；未设置时内容滚动后（scrollY &gt; 0）栏底自动出现投影，回到顶部移除。投影粗细走 `--oas-app-bar-shadow` 变量开口。

<DemoBlock title="elevated 常显投影（右例滚动后自动投影）">
  <oas-app-bar heading="elevated 常显" elevated style="margin-block-end: var(--oas-space-3)"></oas-app-bar>
  <oas-app-bar heading="滚动后投影"></oas-app-bar>
</DemoBlock>

## 滚动折叠（hide-on-scroll）

`hide-on-scroll` 布尔属性（悬浮形态 `fixed` / `absolute` / `floating` 下生效）：页面向下滚动时应用栏 `translateY` 滑出视口、向上滚动滑回；滚动差 &gt;4px 才判方向。隐藏是**纯视觉收起**（不加 `aria-hidden`），滚回即恢复。

<DemoBlock title="fixed + hide-on-scroll（固定在导航栏下方，滚动本页试试）">
  <div style="height: 420px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-tertiary); font-size: var(--oas-font-size-sm)">长页滚动占位（向下滚动收起、向上滚动恢复）</div>
  <oas-app-bar id="ab-hide" heading="滚动折叠演示" position="fixed" hide-on-scroll style="--oas-app-bar-top: 64px">
    <oas-button size="small" type="primary" slot="actions" onclick="message.info('fixed 栏内按钮可点')">操作</oas-button>
  </oas-app-bar>
</DemoBlock>

## 扩展区（extended）

`slot="extended"` 渲染第二行（大标题 / 搜索框等）；`extended-collapse-on-scroll` 布尔属性启用后，滚动超过 8px 自动收起扩展区只留主行，回到阈值下展开（grid 行高过渡，`prefers-reduced-motion` 下停用）。

<DemoBlock title="extended 大标题 + 滚动收起">
  <oas-app-bar id="ab-extended" heading="数据分析" extended-collapse-on-scroll>
    <div slot="extended" style="padding: 0 var(--oas-space-4) var(--oas-space-3); font-size: var(--oas-font-size-xl); font-weight: 700">数据分析</div>
  </oas-app-bar>
  <p style="margin: var(--oas-space-2) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">滚动本页：扩展区收起只留主行；回到顶部重新展开。</p>
</DemoBlock>

## RTL

容器 `dir="rtl"` 下组件自动镜像：`data-rtl` 钩子 + 全逻辑属性布局（`inset-inline` / `padding-inline`），「···」弹层对齐 actions 远端。

<DemoBlock title="RTL 镜像">
  <div dir="rtl" style="max-width: 420px">
    <oas-app-bar heading="لوحة التحكم" menu-button>
      <oas-button size="small" slot="actions" onclick="message.info('تحديث')">تحديث</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('تصدير')">تصدير</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('مشاركة')">مشاركة</oas-button>
      <oas-button size="small" slot="actions" onclick="message.info('طباعة')">طباعة</oas-button>
    </oas-app-bar>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const menu = document.getElementById('ab-menu')
  const out = document.getElementById('ab-menu-out')
  menu?.addEventListener('oas-menu-toggle', () => {
    const open = menu.hasAttribute('menu-open')
    if (open) menu.removeAttribute('menu-open')
    else menu.setAttribute('menu-open', '')
    out.textContent = `oas-menu-toggle 已派发，menu-open=${menu.hasAttribute('menu-open')}，aria-expanded=${menu.shadowRoot?.querySelector('[part="menu-button"]')?.getAttribute('aria-expanded')}`
  })
})
</script>
