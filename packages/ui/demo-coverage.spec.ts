import { test, expect, type Page } from '@playwright/test'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface ManifestEntry {
  tag: string
  demo: string | null
  imperative: boolean
  attrs: string[]
  events: string[]
}

declare global {
  interface Window {
    __fired: Set<string>
  }
}

// 能力清单：从我们自己的组件源码现算（自包含，不依赖外部生成物，可提交进 CI）
const SRC = join(process.cwd(), 'packages', 'ui', 'src')
const DOCS_DIR = join(process.cwd(), 'packages', 'docs', 'docs', 'components')
const TAG_OVERRIDE: Record<string, string> = { contextmenu: 'oas-context-menu' }
const DEMO_OVERRIDE: Record<string, string> = {
  contextmenu: 'context-menu',
  'avatar-group': 'avatar',
  compact: 'space',
}
// 同一目录多组件：dir -> 额外组件名（如 space 目录内的 oas-compact，demo 页共用 space.md）
const DIR_EXTRA: Record<string, string[]> = { space: ['compact'] }
// CSS-only 属性（只被 :host([x]) 规则消费、不经 getAttr/hasAttr，正则扫描不到）显式登记补覆盖
const SUPPLEMENT_ATTRS: Record<string, string[]> = { compact: ['block'] }
const IMPERATIVE = new Set([
  'message',
  'notification',
  'toast',
  'snackbar',
  'confirm',
  'loading-bar',
])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.ts$/.test(e.name) && !/\.(test|spec)\.ts$/.test(e.name)) out.push(p)
  }
  return out
}

function extractCaps(files: string[]): { attrs: string[]; events: string[] } {
  const body = files.map((f) => readFileSync(f, 'utf8')).join('\n')
  const attrs = new Set<string>()
  for (const a of body.matchAll(/(?:getAttr|hasAttr|getBool|getNum)\(\s*['"`]([a-z0-9-]+)['"`]/g))
    attrs.add(a[1]!)
  const events = new Set<string>()
  for (const a of body.matchAll(/emit\(\s*['"`]([a-z-]+)['"`]/g)) events.add('oas-' + a[1]!)
  return { attrs: [...attrs].sort(), events: [...events].sort() }
}

function walkTs(dir: string): string[] {
  return walk(dir).filter((f) => /\.ts$/.test(f) && !/\.(test|spec)\.ts$/.test(f))
}

function buildManifest(): Record<string, ManifestEntry> {
  const idx = readFileSync(join(SRC, 'index.ts'), 'utf8')
  const manifest: Record<string, ManifestEntry> = {}
  for (const line of idx.split('\n')) {
    const m = line.match(/^import '\.\/(.+)\/index\.js'/)
    if (!m) continue
    const d = m[1]!
    const abs = join(SRC, d)
    if (!existsSync(abs)) continue
    const name = d.split('/').pop()!
    const demoName = DEMO_OVERRIDE[name] || name
    manifest[name] = {
      tag: TAG_OVERRIDE[name] || `oas-${name}`,
      demo: existsSync(join(DOCS_DIR, `${demoName}.md`)) ? demoName : null,
      imperative: IMPERATIVE.has(name),
      ...extractCaps(walkTs(abs)),
    }
    // 同目录额外组件（oas-compact 等）：能力按各自类文件提取，demo 页与主组件一致
    for (const extra of DIR_EXTRA[name] ?? []) {
      const tag = TAG_OVERRIDE[extra] || `oas-${extra}`
      const extraDemo = DEMO_OVERRIDE[extra] || demoName
      const caps = extractCaps([join(abs, `oas-${extra}.ts`)])
      caps.attrs.push(...(SUPPLEMENT_ATTRS[extra] ?? []))
      manifest[extra] = {
        tag,
        demo: existsSync(join(DOCS_DIR, `${extraDemo}.md`)) ? extraDemo : null,
        imperative: IMPERATIVE.has(extra),
        ...caps,
      }
    }
  }
  return manifest
}

const manifest = buildManifest()

// 文件内 test 并行：playwright 同文件 test 默认串行共享 1 个 worker（本文件 ~320 test 曾独占 worker 跑 10min+）。
// mode: 'parallel' 让各组件 test 分发到多个 worker；每个 test 独立 page 且无共享状态，隔离安全。
test.describe.configure({ mode: 'parallel' })

// 需特殊触发、通用探针难以触达的事件：定时器/滚动/步骤流/填满
const EXEMPT_EVENTS = new Set(['oas-finish', 'oas-scroll', 'oas-step', 'oas-complete'])

// manifest 的 tag 与真实注册 tag 不一致的组件（demo 页用真实 tag 渲染）
const WAIT_TAGS: Record<string, string[]> = {
  typography: ['oas-text', 'oas-title', 'oas-paragraph'],
}
// demo 页元素由交互动态创建（无静态元素可等），跳过 tag 等待
const SKIP_WAIT = new Set(['backdrop'])

const INTERACTIONS: Array<[string, string]> = [
  ['oas-button button', 'click'],
  ['oas-switch button', 'click'],
  ['oas-checkbox input', 'click'],
  ['oas-radio input', 'click'],
  ['oas-rate button', 'click'],
  ['oas-tabs [role="tab"]', 'click'],
  ['oas-segmented button', 'click'],
  ['oas-toggle-button button', 'click'],
  ['oas-collapse summary', 'click'],
  ['oas-collapse-item button', 'click'],
  ['oas-tag [part="close"]', 'click'],
  ['oas-input input', 'fill:x'],
  ['oas-textarea textarea', 'fill:x'],
  ['oas-input-number input', 'fill:5'],
  ['oas-pin-input input', 'fill:1'],
  ['oas-editable button', 'click'],
  ['oas-slider input', 'click'],
  ['oas-calendar td', 'click'],
  ['oas-table th', 'click'],
  ['oas-table tbody tr', 'click'],
  ['oas-table input[type="checkbox"]', 'click'],
  ['oas-select', 'click'],
  ['oas-dropdown', 'click'],
  ['oas-popconfirm button', 'click'],
  ['oas-modal button', 'click'],
  ['oas-drawer button', 'click'],
  ['oas-breadcrumb a', 'click'],
  ['oas-pagination button', 'click'],
  ['oas-back-top', 'click'],
  ['oas-float-button button', 'click'],
  ['oas-speed-dial button', 'click'],
  ['oas-tree [role="treeitem"]', 'click'],
  ['oas-menu [role="menuitem"]', 'click'],
  ['oas-color-picker', 'click'],
  ['oas-command input', 'fill:x'],
]

// ===== 组件级探针步骤（key = manifest 组件名）=====
// 动作约定：
//   click         真实点击第一个匹配（不可见时回落 DOM click，浮层/隐藏态 handler 仍会执行）
//   click:n<idx>  点击第 idx 个匹配
//   domclick      直接 el.click()（绕过 mouseenter 副作用 / <a href> 跳转）
//   rightclick    右键（contextmenu）
//   fill:<v>      填充第一个匹配
//   fillall:<v>   填充所有匹配（如 pin-input 逐格）
//   press:<Key>   键盘按键
//   open          给所有匹配元素设置 open 属性（受控组件的打开入口）
//   grant         授予 clipboard-write 权限（复制成功路径）
//   file          对第一个匹配 setInputFiles（隐藏 file input）
//   drag          拖拽分隔条（真实指针手势）
//   dragto        HTML5 拖放：源 = 第 1 个匹配，目标 = 第 2 个匹配（Playwright dragTo 触发真实 dragstart/drop）
//   wait:<ms>     等待
//   waitfor       sel 字段为 JS 条件表达式，等页面求值为真（demo 异步注入 onMounted 等）
//   file:svg      设置 SVG 图片文件（走 accept 过滤但可用于触达 max 超限/预览）
const COMPONENT_STEPS: Record<string, Array<[string, string, string?]>> = {
  carousel: [['oas-carousel [part="arrow-next"]', 'click', '点下一张箭头 → oas-change']],
  tag: [
    ['oas-tag[clickable]:not([disabled]) [part="tag"]', 'click', '点整签派发 oas-click'],
    ['oas-tag[checkable]:not([disabled]) [part="tag"]', 'click', '点可选中签切换 → oas-change'],
    [
      'oas-tag-group:not([disabled]) oas-tag[checkable]:not([disabled]) [part="tag"]',
      'click',
      '点组内可选中签 → 组 oas-change',
    ],
  ],
  link: [['oas-link:not([disabled]) a', 'click']],
  typography: [
    ['oas-text[copyable] [part="copy"]', 'click', '无剪贴板权限 → oas-copy-error'],
    ['clipboard', 'grant'],
    ['oas-text[copyable] [part="copy"]', 'click', '授权后 → oas-copy'],
  ],
  input: [
    ['oas-input[clearable] [part="clear"]', 'click', 'demo 带 value，清除钮可见 → oas-clear'],
  ],
  select: [
    ['oas-select[clearable] [part="clear"]', 'click', '有选中值时清空钮可见 → oas-clear'],
    [
      'oas-select[remote] [part="trigger"]',
      'click',
      '展开远程下拉（搜索框常驻仅受 searchable 控制）',
    ],
    [
      'oas-select[remote] [part="search-input"]',
      'fill:x',
      'remote 模式输入 → oas-input（过滤交给宿主）',
    ],
  ],
  combobox: [
    ['oas-combobox[clearable] [part="clear"]', 'click', 'demo 带 value，清空钮可见 → oas-clear'],
    ['oas-combobox input', 'fill:苹', '输入过滤词 → oas-input（首实例匹配「苹果」保证有选项）'],
    ['oas-combobox [role="option"]', 'click', '选中 → oas-change'],
  ],
  rate: [
    ['oas-rate:not([disabled]) [part="star"]', 'click'],
    [
      'oas-rate:not([disabled]) [part="star"]',
      'click:n1',
      '点不同星兜底（防 allow-clear 恰好清空）',
    ],
  ],
  'auto-complete': [
    ['oas-auto-complete:not([disabled]) input', 'fill:苹', '匹配「苹果」保证有选项'],
    ['oas-auto-complete [role="option"]', 'click', '选中 → oas-change'],
  ],
  cascader: [
    ['oas-cascader:not([disabled]) [part="trigger"]', 'click', '展开面板'],
    ['oas-cascader [role="option"]', 'click', '点父级下钻'],
    ['oas-cascader [role="option"]', 'click:n1', '点第二层面板叶子 → oas-change'],
  ],
  'tree-select': [
    ['oas-tree-select:not([disabled]) [part="trigger"]', 'click', '展开下拉'],
    ['oas-tree-select [role="treeitem"]', 'click', '点根节点提交 → oas-change'],
    ['#ts-virtual [part="trigger"]', 'click', '展开万级虚拟下拉（窗口化渲染）'],
    ['#ts-virtual [role="treeitem"]', 'click:n1', '虚拟行勾选 → oas-change'],
  ],
  mentions: [
    ['oas-mentions:not([disabled]) [part="textarea"]', 'fill:@', '触发 @ 建议面板'],
    ['oas-mentions [role="option"]', 'click', '选中 → oas-select + oas-change'],
  ],
  form: [['oas-form[rules] oas-button button', 'click', '必填为空提交 → oas-validate-fail']],
  'date-picker': [
    ['oas-date-picker:not([disabled]) [part="trigger"]', 'click', '展开日历面板'],
    ['oas-date-picker [part="grid"] .day', 'click', '选日 → oas-change'],
  ],
  'time-picker': [
    ['oas-time-picker:not([disabled]) [part="trigger"]', 'click', '展开时间列'],
    [
      'oas-time-picker [role="option"]',
      'click:n1',
      '点第 2 个时值（首个即当前选中值，点它不会产生 diff）',
    ],
    ['keyboard', 'press:Enter', '面板聚焦时 Enter → confirm → oas-change'],
  ],
  upload: [
    ['oas-upload .file-input', 'file', '首个实例加文件 → oas-change'],
    ['oas-upload[auto-upload] .file-input', 'file', '自动上传实例 → oas-upload'],
    ['wait:700', 'wait', '等模拟上传进度事件'],
    ['oas-upload [part="item"] .remove', 'click', '删文件 → oas-remove'],
    [
      'document.getElementById("upload-full")?.files?.length >= 3',
      'waitfor',
      '等 upload-full 预置 3 张（onMounted 异步注入）',
    ],
    ['#upload-full [part="item"] .thumb', 'click', '点缩略图 → oas-preview'],
    ['#upload-full .file-input', 'file:svg', '第 4 张 SVG → 超 max=3 → oas-exceed'],
  ],
  'toggle-group': [['oas-toggle-group [part="item"]', 'click:n1', '点非默认选中项 → oas-change']],
  'pin-input': [['oas-pin-input [part="cell"]', 'fillall:1', '填满全部格 → oas-change']],
  'dynamic-tags': [
    ['oas-dynamic-tags:not([disabled]) [part="input"]', 'fill:tag-x'],
    ['oas-dynamic-tags [part="input"]', 'press:Enter', '回车新增 → oas-add + oas-change'],
    ['oas-dynamic-tags [part="tag-remove"]', 'click', '删标签 → oas-remove'],
  ],
  editable: [
    ['oas-editable:not([disabled]) [part="display"]', 'click', '进入编辑'],
    ['oas-editable [part="field"]', 'fill:new-val'],
    ['oas-editable [part="ok"]', 'click', '提交 → oas-change'],
    ['oas-editable:not([disabled]) [part="display"]', 'click', '再次进入编辑'],
    ['oas-editable [part="cancel"]', 'click', '取消 → oas-cancel'],
  ],
  snackbar: [
    ['oas-snackbar', 'open', '静态实例置 open → oas-open'],
    ['wait:300', 'wait'],
    [
      'oas-snackbar[action-text] [part="action"]',
      'domclick',
      'DOM click：真实点击会被同位置堆叠的 tmp 实例拦走',
    ],
    [
      'oas-button:has-text("连发四条") button',
      'click',
      '连发 4 条 → 堆叠溢出 → 最老实例同步 oas-close（比等 4s 定时器稳定）',
    ],
  ],
  backdrop: [
    [
      'typeof window.openBackdrop === "function"',
      'waitfor',
      '等 demo onMounted 注入 openBackdrop（SKIP_WAIT 跳过 tag 等待，并行负载下注入可能较慢）',
    ],
    [
      'oas-button:has-text("打开遮罩") button',
      'domclick',
      'DOM click 打开遮罩：真实点击会被 sticky 导航栏/探针滚动后遮挡',
    ],
    ['oas-backdrop [part="mask"]', 'click', '点遮罩 → oas-click'],
  ],
  slider: [
    [
      'oas-slider input[type="range"]:not([hidden]):not([disabled])',
      'click:n1',
      '点第 2 个可见滑块（demo2 value=30，点击中心 50% → oas-input + oas-change；通用探针点的 demo1 值恰在中心不产生变化）',
    ],
  ],
  modal: [
    [
      'oas-button:has-text("打开对话框") button',
      'domclick',
      'DOM click 重开基础对话框：真实点击会被 sticky 导航栏/浮层拦截（force 点不滚动到安全区）',
    ],
    ['oas-modal[visible] [part="ok"]', 'click', '点确定 → oas-ok'],
  ],
  message: [
    [
      'oas-message [part="close"]',
      'click',
      '点消息右上角关闭 ×（通用探针已点按钮创建消息）→ oas-close',
    ],
  ],
  popconfirm: [
    ['oas-popconfirm', 'click', '点触发器打开气泡'],
    ['oas-popconfirm [part="ok"]', 'click', '确认 → oas-ok'],
    ['oas-popconfirm', 'click', '再次打开'],
    ['oas-popconfirm [part="cancel"]', 'click', '取消 → oas-cancel'],
  ],
  alert: [['oas-alert[closeable] [part="close"]', 'click', '点关闭钮 → oas-close']],
  dropdown: [
    ['oas-dropdown', 'click', '（通用探针可能已翻转开合，这里再确认展开）'],
    ['oas-dropdown [role="menuitemradio"]', 'click', '选菜单项 → oas-select'],
    ['oas-dropdown[split]', 'click', '点拆分主按钮 → oas-action'],
    ['oas-dropdown[split] [part="split-arrow"]', 'click', '点箭头 → 展开拆分菜单'],
    ['oas-dropdown[split] [role="menuitemradio"]', 'click', '选拆分菜单项 → oas-select'],
  ],
  contextmenu: [
    ['oas-context-menu', 'rightclick', '右键打开菜单'],
    ['oas-context-menu [role="menuitemradio"]', 'click', '点菜单项 → oas-select'],
  ],
  command: [
    ['oas-command', 'open', '受控 open 打开面板'],
    ['oas-command [part="option"]', 'click', '选命令 → oas-select'],
  ],
  menubar: [
    [
      'oas-menubar [part="top-item"]',
      'domclick',
      'DOM click 避开 mouseenter 展开与 click 收起的抵消',
    ],
    ['oas-menubar [part="item"]', 'click', '点子菜单项 → oas-select'],
  ],
  'navigation-menu': [
    ['oas-navigation-menu [part="top-item"]', 'domclick'],
    ['oas-navigation-menu [part="item"]', 'domclick', 'li DOM click 避免 <a href> 跳转'],
  ],
  'speed-dial': [
    ['oas-speed-dial:not([disabled]) [part="fab"]', 'click', '展开 → oas-open'],
    ['oas-speed-dial [part="actions"] button', 'click', '点动作 → oas-select'],
  ],
  'theme-editor': [
    ['oas-theme-editor input[type="number"]', 'fill:13', '改数字 token → oas-change'],
  ],
  anchor: [['oas-anchor [part="link"]', 'click', '点锚点 → oas-change（组件已 preventDefault）']],
  'bottom-navigation': [
    ['oas-bottom-navigation [part="tab"]', 'click:n1', '点非激活 tab → oas-change'],
  ],
  sidebar: [['oas-sidebar [part="toggle"]', 'click', '折叠开关 → oas-collapse']],
  image: [['oas-image[preview] [part="wrapper"]', 'click', '点图 → oas-preview']],
  code: [
    ['oas-code [part="copy"]', 'click', '无剪贴板权限 → oas-copy-error'],
    ['clipboard', 'grant'],
    ['oas-code [part="copy"]', 'click', '授权后 → oas-copy'],
  ],
  collapse: [['oas-collapse-item [part="head"]', 'click', '点头部切换 → oas-change']],
  steps: [['oas-steps[clickable] [part="item"]', 'click', '点步骤项（整项可点）→ oas-change']],
  tabs: [
    [
      'oas-tabs[closable] .tab-close',
      'domclick',
      'DOM click 关闭 ×：真实点击触发 demo 弹 message 后，vitepress 搜索浮层会间歇性打开，backdrop 拦截后续 force-click',
    ],
    [
      'oas-tabs[addable] [part="add-button"]',
      'domclick',
      'DOM click + 按钮：+ 在视口外远处，搜索浮层 backdrop 可能拦截真实点击 → oas-add',
    ],
    ['#tabs-before [role="tab"][data-value="b"]', 'domclick', '点击触发 oas-before-change（+ oas-change）'],
    ['#tabs-sortable', 'wait:300', '等 sortable demo 升级渲染'],
    ['#tabs-sortable [role="tab"][data-value]', 'dragmock', '拖拽第 1 个标签到第 2 个 → oas-reorder'],
    ['#tabs-rename [role="tab"][data-value="a"]', 'dblclick', '双击 editable 标签进入重命名输入态'],
    ['#tabs-rename', 'wait:200', '等重命名输入框渲染'],
    ['#tabs-rename', 'renamecommit:重命名X', '输入框赋值 + Enter 确认 → oas-rename'],
  ],
  tree: [
    ['oas-tree[checkable] input[type="checkbox"]', 'click', '勾选 → oas-check'],
    ['oas-tree[lazy] [part="toggle"]', 'click', '展开未加载节点（dir-a）→ oas-load'],
    ['oas-tree[draggable] [part="row"]', 'dragto', '拖第 1 行到第 2 行 → oas-node-drop'],
  ],
  table: [
    ['oas-table .expand-toggle-cell .toggle', 'click', '点行尾展开钮 → oas-expand'],
    ['oas-table .action-btn', 'click', '操作列点编辑 → 进入编辑'],
    ['oas-table input.cell-editor', 'fill:演示', '填充单元格 → 待提交'],
    ['oas-table .action-btn.save', 'click', '点保存 → oas-edit'],
    ['oas-table .action-btn', 'click', '再次进入编辑'],
    ['oas-table input.cell-editor', 'fill:回退', '修改值'],
    ['oas-table .action-btn.danger', 'click', '点取消 → oas-edit-cancel'],
  ],
  'page-header': [
    [
      'oas-page-header[back] [part="back"]',
      'domclick',
      '返回钮 → oas-back（真实点击会被下方元素拦截）',
    ],
  ],
  splitter: [['oas-splitter [part="splitter"]', 'drag', '拖拽分隔条 → oas-resize']],
  tour: [['oas-tour [part="skip"]', 'click', '跳过 → oas-cancel（通用探针已点开始引导）']],
}

/** 真实点击，失败回落 DOM click（隐藏/浮层关闭态下 handler 仍会执行） */
async function clickNth(page: Page, sel: string, nth: number): Promise<boolean> {
  const el = page.locator(sel).nth(nth)
  if (!(await el.count())) return false
  try {
    await el.click({ timeout: 400, force: true })
    return true
  } catch {
    try {
      await el.evaluate((e) => (e as HTMLElement).click())
      return true
    } catch {
      return false
    }
  }
}

async function runSteps(page: Page, steps: Array<[string, string, string?]>): Promise<void> {
  for (const [sel, act] of steps) {
    try {
      if (act === 'click') {
        await clickNth(page, sel, 0)
      } else if (act.startsWith('click:n')) {
        await clickNth(page, sel, Number(act.slice(7)))
      } else if (act === 'domclick') {
        const el = page.locator(sel).first()
        if (await el.count()) await el.evaluate((e) => (e as HTMLElement).click())
      } else if (act.startsWith('fill:')) {
        const el = page.locator(sel).first()
        if (await el.count()) await el.fill(act.slice(5), { timeout: 400 })
      } else if (act.startsWith('fillall:')) {
        const v = act.slice(8)
        const els = page.locator(sel)
        for (let i = 0; i < Math.min(await els.count(), 20); i++) {
          try {
            await els.nth(i).fill(v, { timeout: 300 })
          } catch {}
        }
      } else if (act.startsWith('press:')) {
        await page.keyboard.press(act.slice(6))
      } else if (act === 'rightclick') {
        const el = page.locator(sel).first()
        if (await el.count()) await el.click({ button: 'right', timeout: 400, force: true })
      } else if (act === 'open') {
        await page.locator(sel).evaluateAll((els) => els.forEach((e) => e.setAttribute('open', '')))
      } else if (act === 'grant') {
        await page.context().grantPermissions(['clipboard-write'])
      } else if (act === 'file') {
        const el = page.locator(sel).first()
        if (await el.count()) {
          await el.setInputFiles(
            { name: 'demo.txt', mimeType: 'text/plain', buffer: Buffer.from('oas-ui demo file') },
            { timeout: 400 },
          )
        }
      } else if (act.startsWith('file:')) {
        const payload =
          act.slice(5) === 'svg'
            ? {
                name: 'photo.svg',
                mimeType: 'image/svg+xml',
                buffer: Buffer.from(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" rx="4" fill="#0b6cff"/></svg>',
                ),
              }
            : {
                name: 'demo.txt',
                mimeType: 'text/plain',
                buffer: Buffer.from('oas-ui demo file'),
              }
        const el = page.locator(sel).first()
        if (await el.count()) {
          await el.setInputFiles(payload, { timeout: 400 })
        }
      } else if (act === 'waitfor') {
        // sel 字段承载 JS 条件表达式（页面上下文求值）；8s 超时静默跳过
        try {
          await page.waitForFunction(sel, undefined, { timeout: 8000 })
        } catch {}
      } else if (act === 'drag') {
        const el = page.locator(sel).first()
        if (await el.count()) {
          const box = (await el.boundingBox())!
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.mouse.down()
          await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 6 })
          await page.mouse.up()
        }
      } else if (act === 'dragto') {
        // HTML5 拖放：Playwright dragTo 走真实指针 + CDP drag 事件（dragstart/dragover/drop 都会触发）
        const els = page.locator(sel)
        if ((await els.count()) >= 2) {
          await els.nth(0).dragTo(els.nth(1), { timeout: 400, force: true })
        }
      } else if (act === 'dblclick') {
        // 双击（DOM dispatchEvent，规避真实双击的浮层 backdrop 拦截）
        const el = page.locator(sel).first()
        if (await el.count())
          await el.evaluate((e) =>
            (e as HTMLElement).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
          )
      } else if (act === 'dragmock') {
        // HTML5 DnD 模拟（dragstart/dragover/drop 序列，mock dataTransfer）：真实 dragTo 在
        // 部分环境（button draggable / CI 高负载）drop 不命中，用 DOM 事件序列确定性触发
        const els = page.locator(sel)
        if ((await els.count()) >= 2) {
          await els.nth(0).evaluate((src) => {
            const dt = new DataTransfer()
            src.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
          })
          await els.nth(1).evaluate((tgt) => {
            const dt = new DataTransfer()
            tgt.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer: dt }))
            tgt.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: dt }))
          })
        }
      } else if (act.startsWith('wait:')) {
        await page.waitForTimeout(Number(act.slice(5)))
      } else if (act.startsWith('renamecommit:')) {
        // tabs editable 重命名确认：dblclick 后输入框可能尚未就绪/焦点丢失，用 DOM 确定性提交
        // ——找输入框赋值 + dispatch Enter（fill/press 分步在 CI 高负载下时序不稳）
        const newLabel = act.slice(13)
        const host = page.locator(sel).first()
        if (await host.count()) {
          await host.evaluate((el, label) => {
            const root = (el as HTMLElement).shadowRoot
            const input = root?.querySelector('.tab-rename-input') as HTMLInputElement | null
            if (input) {
              input.value = label
              input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
            }
          }, newLabel)
        }
      }
    } catch {
      // 探针步骤失败不致命：其余步骤继续，事件覆盖以最终 __fired 为准
    }
    await page.waitForTimeout(60)
  }
}

async function probe(page: Page, name: string) {
  for (const [sel, act] of INTERACTIONS) {
    const els = page.locator(sel)
    const n = Math.min(await els.count(), 2)
    for (let i = 0; i < n; i++) {
      try {
        if (act === 'click') await els.nth(i).click({ timeout: 300, force: true })
        else await els.nth(i).fill(act.slice(5), { timeout: 300 })
      } catch {}
    }
  }
  // 浮层选项：打开后点第一个选项
  for (const opt of ['[role="option"]', '[role="menuitem"]', 'oas-menu-item', '[data-value]']) {
    try {
      const o = page.locator(opt).first()
      if (await o.count()) await o.click({ timeout: 300, force: true })
    } catch {}
  }
  // 多步交互补刀：数字加减 / 评分选星 / 日历选日 / 确认 / 编辑提交
  const EXTRA: Array<[string, string]> = [
    ['oas-input-number button', 'click'],
    ['oas-calendar [role="gridcell"]', 'click'],
    ['oas-popconfirm [part="ok"]', 'click'],
    ['oas-editable input', 'fill:x'],
  ]
  for (const [sel, act] of EXTRA) {
    const els = page.locator(sel)
    const n = Math.min(await els.count(), 2)
    for (let i = 0; i < n; i++) {
      try {
        if (act === 'click') await els.nth(i).click({ timeout: 300, force: true })
        else await els.nth(i).fill(act.slice(5), { timeout: 300 })
      } catch {}
    }
  }
  // 组件级探针步骤（读 shadow 真实结构）
  await runSteps(page, COMPONENT_STEPS[name] ?? [])
  try {
    await page.keyboard.press('Enter')
  } catch {}
  try {
    await page.mouse.wheel(0, 500)
  } catch {}
}

// 判定某属性是否在 demo 中呈现：读 .md 源文件的 demo 区域（模板含子元素标签 attr、布尔 attr + script setup 的 setAttribute/受控驱动），排除 API 文档表
function attrDemoedInMd(mdDemoRegion: string, attr: string): boolean {
  const esc = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pats = [
    new RegExp(`\\s${esc}=["'\`]`), // attr="..."（含子元素标签）
    new RegExp(`[\\s>]${esc}(?=[\\s>\`])`), // 布尔 attr（空格/>/反引号 结尾）
    new RegExp(`(?:set|remove|toggle|has)Attribute\\(\\s*['"\`]${esc}['"\`]`), // setAttribute/removeAttribute/toggleAttribute/hasAttribute
  ]
  return pats.some((p) => p.test(mdDemoRegion))
}

for (const [name, m] of Object.entries(manifest)) {
  if (!m.demo) continue

  test.describe(`${name}`, () => {
    test('静态属性全部演示', async () => {
      if (m.imperative) {
        test.skip(true, '命令式组件，静态属性自动核对不适用')
        return
      }
      // 读 demo 源文件（模板 + script setup 全在里面，比渲染后 HTML 更全：受控 setAttribute 也能抓到）
      const md = readFileSync(
        join(process.cwd(), 'packages', 'docs', 'docs', 'components', `${m.demo}.md`),
        'utf8',
      )
      const demoRegion = md.split(/^##\s*API/m)[0] ?? md
      const missing = m.attrs.filter((a) => !attrDemoedInMd(demoRegion, a))
      expect(missing, `未演示属性: ${missing.join(', ')}`).toEqual([])
    })

    test('事件全部触发（通用探针）', async ({ page }) => {
      if (m.events.length === 0) {
        test.skip(true, '无事件')
      }
      await page.addInitScript(() => {
        window.__fired = new Set()
        const orig = EventTarget.prototype.dispatchEvent
        EventTarget.prototype.dispatchEvent = function (ev) {
          if (ev && ev.type && ev.type.startsWith('oas-')) window.__fired.add(ev.type)
          return orig.call(this, ev)
        }
      })
      await page.goto(`/components/${m.demo}.html`, { waitUntil: 'load' })
      // 等组件 upgrade（shadowRoot 出现）再 probe——并行高负载下 attached 立即满足但 upgrade 排队，
      // 探针太早会全部扑空（「已触发: 无」）；backdrop 由交互创建，跳过。
      // 2 核 CI runner 上 6 workers 并发加载时 upgrade 排队可达数秒，超时放宽到 10s
      if (!SKIP_WAIT.has(name)) {
        const tags = WAIT_TAGS[name] ?? [m.tag]
        for (const t of tags) {
          try {
            await page.waitForFunction(
              (sel) => {
                const el = document.querySelector(sel)
                return el instanceof HTMLElement && el.shadowRoot != null
              },
              t,
              { timeout: 10_000 },
            )
            break
          } catch {}
        }
      }
      await probe(page, name)
      await page.waitForTimeout(200)
      let fired = await page.evaluate(() => [...window.__fired])
      let notFired = m.events.filter((e) => !fired.includes(e) && !EXEMPT_EVENTS.has(e))
      // 事件未全触发：大概率是组件 upgrade 晚于首次 probe（CI 慢机）。重试 probe——
      // __fired 是 Set 单调累积，重复交互只会补充事件类型，不会误判；重试间隔给 upgrade 喘息
      for (let attempt = 0; attempt < 2 && notFired.length > 0; attempt++) {
        await page.waitForTimeout(1000)
        await probe(page, name)
        await page.waitForTimeout(200)
        fired = await page.evaluate(() => [...window.__fired])
        notFired = m.events.filter((e) => !fired.includes(e) && !EXEMPT_EVENTS.has(e))
      }
      expect(
        notFired,
        `未触发事件: ${notFired.join(', ')}（已触发: ${fired.join(', ') || '无'}）`,
      ).toEqual([])
    })
  })
}
