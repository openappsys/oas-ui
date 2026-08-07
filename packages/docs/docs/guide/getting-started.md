# 快速开始

## 安装

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
<oas-button type="primary" onOasClick={() => console.log('clicked')}>按钮</oas-button>
```

```vue
<!-- Vue -->
<oas-button type="primary" @oas-click="onClick">按钮</oas-button>
```

## 主题切换

```html
<html data-theme="dark">
  <!-- 切换为暗色主题 -->
</html>
```
