# 快速开始

## 三行引入（CDN）

```html
<link rel="stylesheet" href="https://unpkg.com/@oas-ui/theme@1/index.css" />
<script src="https://unpkg.com/@oas-ui/ui@1/dist/cdn.js"></script>
<oas-button type="primary">Hello OAS-UI</oas-button>
```

## 安装（npm / pnpm / yarn）

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

## 引入

全量引入（自动注册全部组件）：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui'
```

按需引入单个组件：

```ts
import '@oas-ui/theme'
import '@oas-ui/ui/basic/button'
```

React / Vue 中直接使用：

```tsx
// React
<oas-button type="primary" onOasClick={() => console.log('clicked')}>
  按钮
</oas-button>
```

```vue
<!-- Vue -->
<oas-button type="primary" @oas-click="onClick">按钮</oas-button>
```

原生三端（React/Vue/原生）均无需封装即可使用，事件通过 `oas-*` CustomEvent 桥接。

## 浏览器基线

现代浏览器 evergreen 版本：Chrome / Edge / Firefox / Safari 最新两个大版本。其中：

- **Chrome / Edge（Chromium）**：全量 e2e 覆盖
- **Firefox**：实测覆盖（slider 轨道等 Firefox 专有伪元素已适配）
- **Safari ≥ 16.4**：WebKit 引擎实测；Declarative Shadow DOM 需 16.4+，实心态用色（`color-mix`）需 16.2+

## 主题切换

```html
<html data-theme="dark">
  <!-- 切换为暗色主题 -->
</html>
```

三套内置主题：`light` / `dark` / `high-contrast`，自定义见[主题指南](./theming)。

## SSR

服务端渲染环境请参考 [SSR 边界策略](./ssr)：组件库副作用导入只应在客户端执行。
