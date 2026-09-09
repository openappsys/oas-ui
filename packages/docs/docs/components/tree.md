# Tree 树

用于展示层级数据，支持展开/收起、选中、级联勾选、点选多选、搜索过滤、懒加载、键盘操作与节点拖拽。

> **⚠️ 破坏性变更（v2.5）：`expanded` / `checked` 由「逗号分隔字符串」改为「JSON 字符串数组」。**
> 旧写法 `expanded="a,b"` / `checked="a-1,b"` 已失效，请迁移为 `expanded='["a","b"]'` / `checked='["a-1","b"]'`。
> 迁移原因：key 本身含逗号时逗号串会解析错误；JSON 数组与 `oas-tree-select` 的 `expanded`/`value` 形态统一。
> 若 key 可能含逗号等特殊字符，旧版数据会丢节点，升级后请按数组形态重建属性。

## 基础用法

<DemoBlock title="层级树">
  <div style="width: 100%">
    <oas-tree data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B","children":[{"key":"b-1","label":"子节点 1"}]},{"key":"c","label":"节点 C"}]'></oas-tree>
  </div>
</DemoBlock>

点击展开按钮显示 / 收起子节点，点击节点文本选中该节点；树支持完整键盘操作（↑/↓ 移动焦点、→ 展开、← 收起、Home/End、Space 勾选、Enter 选中）。

## 受控展开与选中

<DemoBlock title="初始展开与选中">
  <div style="width: 100%">
    <oas-tree expanded='["a"]' selected="a-1" data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
  </div>
</DemoBlock>

`expanded` 为 JSON 字符串数组（如 `'["a","b"]'`），`selected` 为选中节点 key。也可组合 `default-expand-all`（首次全展开，显式 `expanded` 优先）、`auto-expand-parent`（外部注入深层 key 时自动补全祖先）、`expand-trigger="node"`（点击节点即展开/收起）。

## 勾选（级联）

<DemoBlock title="勾选级联（父选全勾、半选回显）">
  <div style="width: 100%">
    <oas-tree id="tree-check" checkable check-strategy="all" expanded='["grp"]' data='[{"key":"grp","label":"研发团队","children":[{"key":"fe","label":"前端组","children":[{"key":"a-1","label":"成员 A"},{"key":"a-2","label":"成员 B"}]},{"key":"be","label":"后端组","children":[{"key":"b-1","label":"成员 C"},{"key":"b-2","label":"成员 D"}]}]},{"key":"ops","label":"运维"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      勾选集合（checked 属性，JSON 数组）：<span id="tree-check-value" style="font-family: ui-monospace, monospace">—</span>
    </p>
  </div>
</DemoBlock>

`checkable` 开启勾选后为**级联模型**（与 `oas-tree-select` 语义一致）：勾选父级自动勾选其全部可勾选子级；某父级的全部子级被勾选后父级自动收敛为勾选；部分子级勾选时父级复选框显示半选（`indeterminate`）。

<DemoBlock title="非级联勾选（check-strictly）与默认展开">
  <div style="width: 100%">
    <oas-tree checkable check-strictly default-expand-all auto-expand-parent data='[{"key":"x","label":"父级 X（勾选不级联）","children":[{"key":"x-1","label":"子级 1"},{"key":"x-2","label":"子级 2"}]},{"key":"y","label":"父级 Y"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <code>check-strictly</code> 关闭级联（勾选父级不影响子级）；<code>default-expand-all</code> 初始全展开；<code>auto-expand-parent</code> 选中时自动展开父级。
    </p>
  </div>
</DemoBlock>

<DemoBlock title="空态（empty 文案与空态插槽）">
  <div style="width: 100%">
    <oas-tree empty="树是空的"></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <code>empty</code> 属性自定义空态文案；也可用 <code>template[slot="empty"]</code> 放富内容。
    </p>
  </div>
</DemoBlock>

- `check-strategy`：`all`（默认，父级+子级全进值）/ `parent`（子级全选时以父级代表，只保留父级）/ `child`（只保留叶子）；
- `check-strictly`：父子解耦，勾选互不级联、无半选；
- 数据字段可加 `disableCheckbox: true` 禁单个节点勾选（级联跳过）；整树禁交互用组件级 `disabled` 属性。

## 点选多选

<DemoBlock title="点选多选（multiple，再点取消）">
  <div style="width: 100%">
    <oas-tree multiple selected='["a-1","c"]' data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"},{"key":"a-2","label":"子节点 2"}]},{"key":"b","label":"节点 B","disabled":true},{"key":"c","label":"节点 C"}]'></oas-tree>
  </div>
</DemoBlock>

设置 `multiple` 后 `selected` 变为 JSON 字符串数组，点击标签在集合中追加 / 移除（再点已选项取消）。勾选（checkable）与点选（multiple/selected）是两套独立模型，可同时启用。

## 展开行为

<DemoBlock title="手风琴（accordion）+ 树线（tree-lines）+ 点击节点展开">
  <div style="width: 100%">
    <oas-tree accordion expand-trigger="node" tree-lines data='[{"key":"g1","label":"分类 1","children":[{"key":"g1-1","label":"条目 1"}]},{"key":"g2","label":"分类 2","children":[{"key":"g2-1","label":"条目 2"}]},{"key":"g3","label":"分类 3","children":[{"key":"g3-1","label":"条目 3"}]}]'></oas-tree>
  </div>
</DemoBlock>

- `accordion`：展开某节点时自动收起同层兄弟（手风琴互斥）；
- `tree-lines`：渲染祖辈缩进引导线（属性名与 `oas-tree-select` 一致）；
- `expand-trigger="node"`：点击节点文本同时展开/收起（缺省 `"toggle"` 只点箭头）；
- `auto-expand-parent`：宿主 `setAttribute('expanded', '["深层key"]')` 时组件自动补全祖先展开。

## 搜索过滤

<DemoBlock title="树内过滤（命中保留祖先与子树 + 可选高亮）">
  <div style="width: 100%">
    <oas-input id="tree-filter-input" placeholder="输入关键词过滤（如：React）" style="width: 100%; margin-bottom: var(--oas-space-2)"></oas-input>
    <oas-tree id="tree-filter" filter-highlight data='[{"key":"fe","label":"前端","children":[{"key":"fe-react","label":"React 团队","children":[{"key":"r1","label":"成员 R"}]},{"key":"fe-vue","label":"Vue 团队"}]},{"key":"be","label":"后端","children":[{"key":"be-node","label":"Node 团队"}]}]'></oas-tree>
  </div>
</DemoBlock>

`filter` 为搜索词（属性驱动，搜索框由宿主自配，示例用 `oas-input` 联动）。命中后保留其全部祖先（路径）与全部后代（命中即含子树），不依赖展开状态；无命中显示空态。`filter-highlight` 开启时默认 label 文本命中片段包 `<mark>` 高亮；也可用属性回调 `filterNode(label, node)` 自定义命中判定（缺省 label 包含关键词，大小写不敏感）。

## 字段映射

<DemoBlock title="字段别名（field-names）">
  <div style="width: 100%">
    <oas-tree field-names='{"key":"id","label":"name","children":"subs","disabled":"off"}' expanded='["dept"]' data='[{"id":"dept","name":"部门","subs":[{"id":"alice","name":"Alice"},{"id":"bob","name":"Bob","off":true}]}]'></oas-tree>
  </div>
</DemoBlock>

宿主数据结构不同时用 `field-names` 映射（JSON 对象，键：`key`/`label`/`children`/`disabled`/`isLeaf`/`loaded`，值对应数据里的字段名），在数据入口归一化一次，与 `oas-tree-select` 共用同一套字段归一。

## 禁用状态

<DemoBlock title="节点禁用（disabled / selectable / disableCheckbox）">
  <div style="width: 100%">
    <oas-tree expanded='["p"]' data='[{"key":"p","label":"权限","children":[{"key":"read","label":"只读","disabled":true},{"key":"write","label":"写权限","disableCheckbox":true},{"key":"no-sel","label":"不可点选","selectable":false}]}]'></oas-tree>
  </div>
</DemoBlock>

- 节点 `disabled: true`：整行不可交互（点选/展开/勾选）；
- 节点 `selectable: false`：点选与键盘选中被排除，勾选与展开不受影响；
- 节点 `disableCheckbox: true`：复选框禁用且不进级联；
- 组件级 `disabled` 属性：整树禁交互（只读展示树）。

## 命令式方法与滚动

<DemoBlock title="全部展开 / 收起 / 定位">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-2); margin-bottom: var(--oas-space-2)">
      <oas-button id="tree-cmd-expand-all" size="small">全部展开</oas-button>
      <oas-button id="tree-cmd-collapse-all" size="small">全部收起</oas-button>
      <oas-button id="tree-cmd-scroll" size="small">滚动到「子节点 58」</oas-button>
    </div>
    <oas-tree id="tree-cmd" height="200" row-height="32" data='[]'></oas-tree>
  </div>
</DemoBlock>

命令式方法（数据仍由宿主受控，方法只换算展开集合 / 滚动位置）：

- `expandAll()` / `collapseAll()`：全部展开 / 全部收起；
- `expand(keys: string[])` / `collapse(keys: string[])`：展开 / 收起指定 key 集合；
- `scrollTo(key, { expand?: boolean })`：滚动定位到节点（默认先展开祖先链；`expand: false` 时不改展开状态）。

## 懒加载

<DemoBlock title="懒加载（展开时异步回填子节点）">
  <div style="width: 100%">
    <oas-tree id="tree-lazy" lazy data='[{"key":"dir-a","label":"目录 A"},{"key":"dir-b","label":"目录 B","isLeaf":true},{"key":"file-1","label":"文件 1","isLeaf":true}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-status">点击「目录 A」前的展开箭头触发加载</span>
    </p>
  </div>
</DemoBlock>

<DemoBlock title="懒加载失败重试（oas-load-error）">
  <div style="width: 100%">
    <oas-tree id="tree-lazy-fail" lazy data='[{"key":"ok","label":"会成功"},{"key":"fail","label":"会失败（点两次看重试）"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-lazy-fail-status">点「会失败」的展开箭头看失败事件与重试</span>
    </p>
  </div>
</DemoBlock>

设置 `lazy` 后，无 `children` 且未标记 `isLeaf` / `loaded` 的节点视为「未加载」：点击展开箭头派发 `oas-load`（`detail: { key }`）并调用 `load` 属性回调，由宿主回填子节点后重设 `data` 属性；加载期间展开箭头位置显示 loading 占位（可 `template[slot="toggle-loading"]` 替换），回填完成后自动展开并收起占位。`load` 回调返回 Promise 且 reject 时：自动清除加载态、回滚展开、派发 `oas-load-error`（`detail: { key, error }`），节点恢复为可再次点击重试。标记 `isLeaf: true` 的节点不显示展开箭头。

## 节点拖拽

<DemoBlock title="可拖拽（拖动换序 / 换父）">
  <div style="width: 100%">
    <oas-tree id="tree-dnd" draggable expanded='["grp-1"]' data='[{"key":"grp-1","label":"分组 1","children":[{"key":"item-1","label":"条目 1"},{"key":"item-2","label":"条目 2"}]},{"key":"grp-2","label":"分组 2","children":[{"key":"item-3","label":"条目 3"}]}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-dnd-status">拖拽节点到目标行上 / 下 / 中部，分别插入其前 / 后 / 子</span>
    </p>
  </div>
</DemoBlock>

设置 `draggable` 后可拖拽节点换序或换父：拖到目标行上半区插入其前（before）、下半区插入其后（after）、中部且目标可展开时移入其下（inner），拖拽过程有插入线与高亮反馈；松手派发 `oas-node-drop`（`detail: { dragKey, dropKey, position }`），由宿主更新数据后重设 `data` 属性。拖到树空白处视为移入根（`dropKey` 为空字符串、`position: 'inner'`）。

落点合法性可用属性回调守卫（拖拽中即拒绝，无插入线反馈）：

```js
tree.allowDrop = ({ dragKey, dropKey, position }) => dropKey !== 'grp-1' // 不允许拖入该节点
tree.allowDrag = (node) => node.key !== 'item-1' // 该节点不可被拖动
```

## 大数据量（虚拟滚动）

<DemoBlock title="万级节点虚拟滚动">
  <div style="width: 100%">
    <oas-tree id="tree-virtual" height="360" row-height="32" expanded='["n0"]'></oas-tree>
  </div>
</DemoBlock>

设置 `height` 开启虚拟化（搭配 `row-height` 定高）：树复用 `oas-virtual-list` 只渲染可见窗口内的节点，展开状态保存在 `expanded` 属性中，滚动与重渲染均不丢失；键盘导航与 `scrollTo()` 会联动滚动窗口。

## 自定义节点渲染

<DemoBlock title="自定义节点（图标 + 富文本）">
  <div style="width: 100%">
    <oas-tree id="tree-custom" expanded='["proj-a"]' data='[{"key":"proj-a","label":"项目 A","children":[{"key":"task-1","label":"任务 1"},{"key":"task-2","label":"任务 2"},{"key":"task-3","label":"任务 3"}]},{"key":"proj-b","label":"项目 B","children":[{"key":"task-4","label":"任务 4"}]},{"key":"notes","label":"笔记"}]'>
      <template slot="toggle">
        <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M6 4 L10 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </template>
      <template slot="node">
        <svg class="node-demo-glyph" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <rect x="3" y="2.5" width="10" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/>
          <path d="M6 7.5 H10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span data-node-label style="min-width: 60px; display: inline-block"></span>
        <span class="node-demo-count" style="font-size: var(--oas-font-size-xs); padding: 0 6px; border-radius: 999px; background: var(--oas-color-bg-hover); color: var(--oas-color-text-primary); display: inline-block; margin-left: var(--oas-space-2)"></span>
      </template>
    </oas-tree>
  </div>
</DemoBlock>

节点内容可用 `template[slot="node"]` 提供静态骨架（`[data-node-label]` 节点自动绑定节点 label），`template[slot="toggle"]` 可替换默认展开箭头；每个节点行渲染后派发 `oas-node-render`（`detail: { node, element }`），宿主可监听改写 `element` 为任意图标 / 富文本。示例中任务数徽标即由该事件写入；键盘与 ARIA（`treeitem` / `aria-expanded` / `aria-level`）在自定义渲染下保持不变。

<style>
  /* demo 节点自定义渲染样式：slot 内容在 light DOM，类名唯一，放文件顶层避免 DemoBlock 模板内 style 被 Vue 忽略 */
  .node-demo-glyph { width: 14px; height: 14px; color: var(--oas-color-primary); margin-right: var(--oas-space-1); vertical-align: -2px; }
  .node-demo-count { margin-left: var(--oas-space-2); font-size: var(--oas-font-size-xs); color: var(--oas-color-text-primary); background: var(--oas-color-bg-hover); border-radius: 999px; padding: 0 6px; }
  .node-demo-glyph + [data-node-label] { font-weight: 500; }
</style>

## 目录模式（文件浏览器）

<DemoBlock title="目录模式（文件浏览器样式）">
  <div style="width: 100%">
    <oas-tree id="tree-dir" directory tree-lines expanded='["src","assets"]' data='[{"key":"src","label":"src","children":[{"key":"components","label":"components","children":[{"key":"button.tsx","label":"button.tsx","isLeaf":true},{"key":"tree.tsx","label":"tree.tsx","isLeaf":true}]},{"key":"index.ts","label":"index.ts","isLeaf":true}]},{"key":"assets","label":"assets","children":[{"key":"logo.svg","label":"logo.svg","isLeaf":true}]},{"key":"package.json","label":"package.json","isLeaf":true},{"key":"README.md","label":"README.md","isLeaf":true}]'></oas-tree>
  </div>
</DemoBlock>

设置 `directory` 后按文件浏览器风格渲染：有 `children`（或懒加载下未加载）的节点显示文件夹图标，`isLeaf` / 无 `children` 的节点显示文件图标；文件夹按展开 / 收起切换图标，层级缩进与 hover 高亮行沿用行样式。可叠加 `tree-lines` 显示祖辈引导线。

## 节点重命名

<DemoBlock title="内联重命名（双击或 F2，Enter 提交 / Esc 取消）">
  <div style="width: 100%">
    <oas-tree id="tree-rename" can-rename data='[{"key":"fe","label":"研发团队","children":[{"key":"a-1","label":"成员 A"},{"key":"a-2","label":"受保护成员","renamable":false}]},{"key":"ops","label":"运维组"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      <span id="tree-rename-status">双击「研发团队」或其子节点 label，或选中后按 F2 重命名</span>
    </p>
  </div>
</DemoBlock>

设置 `can-rename` 开启节点重命名：**双击节点 label**（或选中后按 **F2**）进入内联编辑态；**Enter / 失焦提交**、**Esc 取消**（还原旧值、不派发事件）。编辑态输入框内方向键归输入框，不影响树 roving 键盘导航；节点数据可加 `renamable: false` 细粒度禁止单个节点重命名。

数据由宿主受控：提交时组件**只派发 `oas-node-rename`**（`detail: { key, label, oldLabel }`）不改数据——宿主监听该事件把新 label 写回数据并重设 `data` 属性后，行内才显示新名字；宿主不更新则保持旧值（避免组件单方面改数据导致不同步）。

## 展开/收起过渡动画

<DemoBlock title="展开收起过渡（motion 开关对比）">
  <div style="width: 100%">
    <div style="display: flex; gap: var(--oas-space-2); align-items: center; margin-bottom: var(--oas-space-2)">
      <oas-button id="tree-motion-toggle" size="small">开启动画</oas-button>
      <span id="tree-motion-status" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">动画关闭（点击展开箭头为即时切换）</span>
    </div>
    <oas-tree id="tree-motion" data='[{"key":"g1","label":"分组 1","children":[{"key":"g1-1","label":"条目 1-1","children":[{"key":"g1-1-a","label":"子项 A"},{"key":"g1-1-b","label":"子项 B"}]},{"key":"g1-2","label":"条目 1-2"}]},{"key":"g2","label":"分组 2","children":[{"key":"g2-1","label":"条目 2-1"},{"key":"g2-2","label":"条目 2-2"}]}]'></oas-tree>
  </div>
</DemoBlock>

设置 `motion` 开启展开/收起的**高度过渡动画**（默认关）：展开时新增子行从 0 高平滑生长到自然行高，收起时子行先收缩离场再移除，时长/缓动走 `--oas-transition-*` token。虚拟滚动模式（设置 `height`）下展开入场降级为淡入、收起即时切换——虚拟列表行高定值不适合高度动画，避免错位与性能损耗；动画尊重 `prefers-reduced-motion`（系统减少动效时自动停用）。

## 事件

<DemoBlock title="选中与勾选事件">
  <div style="width: 100%">
    <oas-tree id="tree-event" checkable expanded='["a"]' data='[{"key":"a","label":"节点 A","children":[{"key":"a-1","label":"子节点 1"}]},{"key":"b","label":"节点 B"}]'></oas-tree>
    <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
      选中：<span id="tree-select">—</span> · 勾选：<span id="tree-check">—</span>
    </p>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tree = document.querySelector('#tree-event')
  tree?.addEventListener('oas-select', (e) => {
    document.querySelector('#tree-select').textContent = e.detail.key
  })
  tree?.addEventListener('oas-check', (e) => {
    const span = document.querySelector('#tree-check')
    span.textContent = span.textContent === '—' ? e.detail.key : `${span.textContent}、${e.detail.key}`
  })
  // 懒加载失败重试 demo：fail 节点首次 load 回调 reject → oas-load-error；重试成功
  // （whenDefined 防升级前 expando 遮蔽 load 属性）
  customElements.whenDefined('oas-tree').then(() => {
    const failTree = document.querySelector('#tree-lazy-fail')
    if (!failTree) return
    let retried = false
    failTree.load = ({ key }) => {
      if (key === 'fail' && !retried) {
        retried = true
        return Promise.reject(new Error('网络超时'))
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          const nodes = JSON.parse(failTree.getAttribute('data'))
          for (const n of nodes) {
            if (n.key === key) n.children = [{ key: `${key}-1`, label: `${key} 的子节点`, isLeaf: true }]
          }
          failTree.setAttribute('data', JSON.stringify(nodes))
          document.querySelector('#tree-lazy-fail-status').textContent = `${key} 已加载完成`
          resolve()
        }, 300)
      })
    }
    failTree.addEventListener('oas-load-error', (e) => {
      document.querySelector('#tree-lazy-fail-status').textContent =
        `加载失败：${e.detail.error}（可再次点击重试）`
    })
  })

  // 勾选级联 demo：oas-check 后回读 checked 属性展示集合
  const checkTree = document.querySelector('#tree-check')
  if (checkTree) {
    checkTree.addEventListener('oas-check', () => {
      document.querySelector('#tree-check-value').textContent = checkTree.getAttribute('checked')
    })
  }

  // 大数据量虚拟滚动 demo：5000 根节点，每 100 个带 20 个子节点
  const virtual = document.querySelector('#tree-virtual')
  if (virtual) {
    const nodes = Array.from({ length: 5000 }, (_, i) => ({
      key: `n${i}`,
      label: `节点 ${i}`,
      ...(i % 100 === 0
        ? {
            children: Array.from({ length: 20 }, (_, j) => ({
              key: `n${i}-${j}`,
              label: `子节点 ${i}-${j}`,
            })),
          }
        : {}),
    }))
    virtual.setAttribute('data', JSON.stringify(nodes))
  }

  // 自定义节点 demo：oas-node-render 写入子任务数徽标（element 为节点 label 容器）
  const custom = document.querySelector('#tree-custom')
  if (custom) {
    custom.addEventListener('oas-node-render', (e) => {
      const { node, element } = e.detail
      const badge = element.querySelector('.node-demo-count')
      const count = node.children?.length ?? 0
      if (badge) badge.textContent = count > 0 ? `${count} 项` : ''
    })
    // 监听挂载后强制重刷一次，保证初始渲染即带上徽标（upgrade 可能早于 onMounted）
    custom.setAttribute('data', custom.getAttribute('data'))
  }

  // 懒加载 demo：监听 oas-load，模拟异步回填子节点后重设 data
  const lazy = document.querySelector('#tree-lazy')
  if (lazy) {
    lazy.addEventListener('oas-load', (e) => {
      const { key } = e.detail
      const status = document.querySelector('#tree-lazy-status')
      status.textContent = `正在加载 ${key}…`
      setTimeout(() => {
        const nodes = JSON.parse(lazy.getAttribute('data'))
        const fill = (list) => {
          for (const n of list) {
            if (n.key === key) {
              n.children = [
                { key: `${key}-1`, label: `${key} 的子节点 1`, isLeaf: true },
                { key: `${key}-2`, label: `${key} 的子节点 2`, isLeaf: true },
              ]
              return true
            }
            if (n.children && fill(n.children)) return true
          }
          return false
        }
        fill(nodes)
        lazy.setAttribute('data', JSON.stringify(nodes))
        status.textContent = `${key} 加载完成，已回填 2 个子节点`
      }, 500)
    })
  }

  // 可拖拽 demo：按 oas-node-drop 结果重排数据后重设 data
  const dnd = document.querySelector('#tree-dnd')
  if (dnd) {
    dnd.addEventListener('oas-node-drop', (e) => {
      const { dragKey, dropKey, position } = e.detail
      const nodes = JSON.parse(dnd.getAttribute('data'))
      const locate = (list, key) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i].key === key) return { list, index: i, node: list[i] }
          if (list[i].children) {
            const found = locate(list[i].children, key)
            if (found) return found
          }
        }
        return null
      }
      const drag = locate(nodes, dragKey)
      if (drag) {
        drag.list.splice(drag.index, 1)
        if (dropKey === '' && position === 'inner') {
          nodes.push(drag.node)
        } else {
          const target = locate(nodes, dropKey)
          if (target) {
            if (position === 'inner') {
              target.node.children = target.node.children || []
              target.node.children.push(drag.node)
            } else {
              const idx =
                target.list.indexOf(target.node) + (position === 'after' ? 1 : 0)
              target.list.splice(idx, 0, drag.node)
            }
          }
        }
        dnd.setAttribute('data', JSON.stringify(nodes))
      }
      document.querySelector('#tree-dnd-status').textContent =
        `拖动：${dragKey} → ${dropKey || '根'}（${position}）`
    })
  }

  // 内联重命名 demo：监听 oas-node-rename 更新 data（组件不擅自改数据，宿主回写新 label）
  const renameTree = document.querySelector('#tree-rename')
  if (renameTree) {
    renameTree.addEventListener('oas-node-rename', (e) => {
      const { key, label, oldLabel } = e.detail
      const nodes = JSON.parse(renameTree.getAttribute('data'))
      const walk = (list) => {
        for (const n of list) {
          if (n.key === key) {
            n.label = label
            return true
          }
          if (n.children && walk(n.children)) return true
        }
        return false
      }
      walk(nodes)
      renameTree.setAttribute('data', JSON.stringify(nodes))
      document.querySelector('#tree-rename-status').textContent = `已重命名：${oldLabel} → ${label}`
    })
  }

  // motion 开关 demo：按钮切换 motion 属性对比展开/收起动画
  const motionTree = document.querySelector('#tree-motion')
  document.querySelector('#tree-motion-toggle')?.addEventListener('click', () => {
    const on = !motionTree?.hasAttribute('motion')
    if (on) motionTree?.setAttribute('motion', '')
    else motionTree?.removeAttribute('motion')
    document.querySelector('#tree-motion-status').textContent = on
      ? '动画已开启：展开子行 0 高平滑生长、收起先收缩离场'
      : '动画关闭（点击展开箭头为即时切换）'
  })

  // 树内过滤 demo：搜索框 input 驱动 filter 属性
  const filterInput = document.querySelector('#tree-filter-input')
  const filterTree = document.querySelector('#tree-filter')
  filterInput?.addEventListener('input', (e) => {
    filterTree?.setAttribute('filter', e.target.value)
  })

  // 命令式 demo：500 根节点树 + 按钮驱动 expandAll/collapseAll/scrollTo
  const cmd = document.querySelector('#tree-cmd')
  if (cmd) {
    const group = Array.from({ length: 10 }, (_, g) => ({
      key: `group-${g}`,
      label: `分组 ${g}`,
      children: Array.from({ length: 50 }, (_, i) => ({
        key: `g${g}-n${i}`,
        label: `子节点 ${g * 50 + i}`,
        isLeaf: true,
      })),
    }))
    cmd.setAttribute('data', JSON.stringify(group))
    document.querySelector('#tree-cmd-expand-all')?.addEventListener('click', () => cmd.expandAll())
    document.querySelector('#tree-cmd-collapse-all')?.addEventListener('click', () => cmd.collapseAll())
    document.querySelector('#tree-cmd-scroll')?.addEventListener('click', () => {
      cmd.collapseAll()
      cmd.scrollTo('g1-n8') // 展开祖先链后定位（g1-n8 即「子节点 58」）
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accordion` | 手风琴（同级同时只展开一支） | `boolean` | — |
| `auto-expand-parent` | 勾选子节点时自动展开其父级 | `boolean` | — |
| `can-rename` | 节点重命名总开关：开启后双击节点 label 或按 F2 进入内联编辑，Enter 提交 / Esc 取消 / 失焦提交；提交派发 `oas-node-rename`（节点数据可加 `renamable: false` 细粒度禁单个节点） | `boolean` | — |
| `check-strategy` | 勾选导出策略：`all`（默认）/ `parent` / `child`（checkable 级联时生效） | `string` | `all` |
| `check-strictly` | 勾选父子解联（勾选父级不联动子级） | `boolean` | — |
| `checkable` | 是否显示复选框 | `boolean` | — |
| `checked` | 勾选节点 key 集合（逗号分隔） | `string` | — |
| `data` | 节点数据 `[{ key, label, children?, disabled?, isLeaf?, loaded?, renamable? }]`，JSON 字符串 | `TreeNode[] \| string` | `[]` |
| `default-expand-all` | 默认展开全部节点（expanded 属性缺席时生效） | `boolean` | — |
| `directory` | 目录模式：有 `children`（或懒加载下未加载）的节点显示文件夹图标，`isLeaf` / 无 `children` 的节点显示文件图标，文件夹按展开 / 收起切换图标 | `boolean` | — |
| `disabled` | 整树禁用（点选/勾选/展开/拖拽全停，浏览保留） | `boolean` | — |
| `draggable` | 节点可拖拽换序 / 换父，落点显示插入线 / 高亮，松手派发 `oas-node-drop` | `boolean` | — |
| `empty` | 空态文案（无数据时；无匹配时走 locale 无匹配文案） | `string` | — |
| `expand-trigger` | 节点展开触发：`toggle`（默认，仅箭头）/ `node`（点节点行展开） | `string` | `toggle` |
| `expanded` | 展开节点 key 集合（逗号分隔） | `string` | — |
| `field-names` | 字段别名 JSON（如 `{"label":"name","value":"id","children":"subs"}`；原始数据不拷贝映射，node-render 拿到宿主原对象） | `string` | — |
| `filter` | 树内搜索过滤（输入关键词；配 filter-highlight 高亮与 el.filterNode 自定义） | `string` | — |
| `filter-highlight` | 搜索命中片段高亮（mark 标记） | `boolean` | — |
| `height` | 虚拟滚动视口高度（px）；设置后开启大数据量虚拟化渲染 | `string` | — |
| `lazy` | 懒加载：无 `children` 且未标记 `isLeaf` / `loaded` 的节点，展开时触发加载 | `boolean` | — |
| `load` | 懒加载回调 `(payload: { key }) => void`，与 `oas-load` 事件并存；宿主回填子节点后重设 `data` 属性 | `(payload: { key: string }) => void \| Promise<unknown>` | — |
| `motion` | 展开/收起高度过渡动画（默认关）：非虚拟模式行容器 max-height 过渡展开/收起，虚拟滚动模式入场降级为淡入、收起即时；时长/缓动走 `--oas-transition-*`，`prefers-reduced-motion` 下停用 | `boolean` | — |
| `multiple` | 点选多选（Ctrl/⌘ 点击多选；勾选集 selected 为 JSON 数组） | `boolean` | — |
| `row-height` | 虚拟化时每行固定高度（px） | `string` | `32` |
| `selected` | 选中节点 key | `string` | — |
| `tree-lines` | 树线缩进引导线 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-check` | 勾选变化，`detail: { key, checked }` |
| `oas-load` | 懒加载触发，`detail: { key }`；宿主回填 `children` 后重设 `data` 属性 |
| `oas-load-error` | 懒加载失败时派发，`detail: { key, error }`，`error` 为错误消息字符串（loading 消失可再点重试） |
| `oas-node-drop` | 节点拖放，`detail: { dragKey, dropKey, position }`，`position` 为 `before` / `after` / `inner`；`dropKey` 为空字符串表示移入根 |
| `oas-node-rename` | 内联重命名提交（Enter / 失焦），`detail: { key, label, oldLabel }`；数据由宿主受控——组件不改数据模型，宿主监听后更新 `data` 才生效（不更新则保持旧值；Esc 取消不派发） |
| `oas-node-render` | 每个渲染的节点行派发，`detail: { node, element }`（element 为节点 label 容器，宿主可改写为图标 / 富文本） |
| `oas-select` | 选中节点，`detail: { key, selected }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 自定义空态内容 |
| `template[slot="node"]` | 节点行静态模板，克隆到每个节点 label 容器；`[data-node-label]` 节点自动绑定节点 label |
| `template[slot="toggle"]` | 展开按钮静态模板，克隆到每个可展开节点的展开按钮内（替换默认 › 图标） |
| `template[slot="toggle-loading"]` | 懒加载展开中的指示器（替换 spinner） |

> 节点字段说明：`isLeaf: true` 表示显式叶子（懒加载下不显示展开箭头）；`loaded: true` 表示已加载完成（配合 `children` 使用，避免重复触发加载）；`renamable: false` 表示该节点不可重命名（配合 `can-rename`，缺省可重命名）。
