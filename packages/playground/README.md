# @oas-ui/playground

框架宿主验证场（private，不发布 npm）。

## 用途

验证 Web Components 在 **React 19** / **Vue 3** 真实宿主里的三类机制：

- **事件桥接**：`oas-submit`、`oas-sort-change` 等自定义事件在两种框架里的监听方式与差异
- **属性通道**：attribute（声明式字符串）vs property（宿主赋值）两条路径，含 Vue 的 `:prefix.attr` 强制 attribute 等坑
- **主题联动**：宿主写根节点 `data-theme`，`oas-*` 组件随 token 变色（dark / high-contrast）

## 跑法

```bash
pnpm dev:react   # http://localhost:5180
pnpm dev:vue     # http://localhost:5181
```

> Windows 下如用 `.ps1` 包装脚本异常，可直接 `pnpm.cmd dev:react`。

## 两端功能对齐原则

React / Vue 各维护一份页面，**结构完全一致**（同一份清单，demo 块标题一致）：

1. 主题切换
2. 表单（oas-submit 桥接）
3. 表格（attribute 通道 + sort-change 桥接）
4. 消息（命令式 API）
5. 框架特有块（React：属性传递通道；Vue：`:prefix.attr` 强制 attribute）

某一端异常时对照另一端即可定位是「框架桥接问题」还是「组件自身问题」。

## 已知的框架差异（实测结论）

- **React 19 不会把 `onOasSubmit` 自动绑定到 kebab 事件 `oas-submit`**：React 19 对 custom element 的 `on*` prop 仅去掉 `on` 前缀、保留驼峰（`OasSubmit`）作为事件名，事件名大小写敏感，而组件派发的是 `oas-submit`，监听不到。React 端必须 `ref + useEffect addEventListener('oas-submit', ...)` 手动绑定。
- **Vue 3 原生支持**：`@oas-submit`、`@oas-sort-change` 直接可用。
- **跨 shadow 无 submit 语义**：oas-form 内部 `<form>` 靠 submit 事件触发，shadow DOM 外的 oas-button 点击不会自动提交，需显式 `shadowRoot.querySelector('form').requestSubmit()`。
- **消息 API**：`window.OASMessage` 不存在，必须 `import { message } from '@oas-ui/ui'` 后调用 `message.success(...)`。

## 缓存说明

- 两个 vite config 已配 `optimizeDeps.exclude: ['@oas-ui/ui', '@oas-ui/theme']`（linked 包走 dist ESM 直服），ui dist 重建后 dev 立即生效，无需清缓存。
- React / Vue 两个 dev server 共用 `node_modules/.vite` 会互相失效对方的预构建缓存（React 缓存 react.js、Vue 缓存 vue.js），因此各自独立 `cacheDir`（`.vite-react` / `.vite-vue`）根治。
- 兜底：若 dev 页面仍异常（新属性不生效、504 白屏），删除对应 `node_modules/.vite-*` 缓存目录并重启 dev server。
