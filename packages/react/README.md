# @oas-ui/react

## <a id="zh"></a> 中文 | [English](#en)

OAS-UI 的 React 桥接包 —— 把 `oas-*` 自定义事件（CustomEvent）桥接为 React hooks。

### 为什么要这个包？

React 19 对自定义元素事件只桥接「`on` + 全小写字面量」写法（`onoas-submit` 能收到 `oas-submit`），而符合 React 惯例的 camelCase 写法 `<oas-button onOasSubmit={...}>` 静默失效——`onOasSubmit` 不会映射为 `oas-submit` 监听，组件派发的事件永远收不到。Vue 的 `@oas-click` 语法没问题，React 侧需要手动 `addEventListener`——本包的两个 hook 封装了这一过程（handler 最新化 + 卸载自动解绑）。

### 安装

```bash
pnpm add @oas-ui/react @oas-ui/ui @oas-ui/theme
```

`@oas-ui/ui` / `@oas-ui/theme` 负责组件注册与主题变量，`@oas-ui/react` 只提供事件桥接 hooks。

### 用法

#### 单事件：`useOasEvent`

```tsx
import { useRef } from 'react'
import { useOasEvent } from '@oas-ui/react'

interface SubmitDetail {
  value: Record<string, unknown>
}

function LoginForm() {
  const formRef = useRef<HTMLElement | null>(null)

  useOasEvent<SubmitDetail>(formRef, 'oas-submit', (detail, ev) => {
    // detail = CustomEvent.detail；ev 为原始事件（可读 type / composedPath 等）
    console.log('表单校验通过', detail.value)
  })

  return <oas-form ref={formRef}>...</oas-form>
}
```

#### 多事件：`useOasEvents`

```tsx
import { useRef } from 'react'
import { useOasEvents } from '@oas-ui/react'

function Dialog() {
  const modalRef = useRef<HTMLElement | null>(null)

  useOasEvents(modalRef, {
    'oas-ok': () => console.log('确认'),
    'oas-cancel': () => console.log('取消'),
    'oas-close': (detail: { source: 'mask' | 'esc' | 'close-btn' }) => {
      console.log('关闭来源', detail.source)
    },
  })

  return <oas-modal ref={modalRef} visible>...</oas-modal>
}
```

> 每个处理函数可自行标注 detail 参数类型（组件 API 表的「事件」小节给出 detail 结构），
> 标注后函数体内即有类型提示。
>
> TypeScript 使用 `oas-*` 标签前，通常需先声明对应的 `JSX.IntrinsicElements` 全局类型
> （与引入组件的方式无关；可放在任意全局 `.d.ts`）：

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'oas-button': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      'oas-form': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      // ... 按需补充用到的 oas-* 标签
    }
  }
}
```

### Hooks API

| Hook | 签名 | 说明 |
| --- | --- | --- |
| `useOasEvent` | `(ref: RefObject<HTMLElement \| null>, type: string, handler: (detail: T, ev: Event) => void) => void` | 绑定单个 `oas-*` 事件。handler 每次渲染刷新到 ref（重渲染后事件走最新闭包）；绑定 effect 只依赖 `[ref, type]`，换 handler 不重复解绑/重绑；卸载自动清理 |
| `useOasEvents` | `(ref: RefObject<HTMLElement \| null>, handlers: Record<string, (detail, ev: Event) => void>) => void` | 批量绑定多个事件。单个 useEffect 统一绑定/解绑；handlers 引用变化（每渲染新字面量）不重绑，靠 ref 最新化；事件名集合变化（增删 key）才重绑 |

### 导出类型

| 类型 | 定义 | 说明 |
| --- | --- | --- |
| `OasEventHandler<T>` | `(detail: T, ev: Event) => void` | 单事件处理函数；`T` 为事件 detail 类型，默认 `unknown` |
| `OasEventHandlers` | `Record<string, OasEventHandler>` | 多事件映射：事件名（带 `oas-` 前缀）→ 处理函数 |

### 注意

- **事件名必须带 `oas-` 前缀**：组件派发的是 `oas-submit` / `oas-change` / `oas-close`，写 `submit` 收不到。
- **React 19 有原生替代写法**：`<oas-form onoas-submit={...}>`（`on` + 全小写字面量）可直接监听 kebab 事件——但不符合 React 惯例（camelCase 的 `onOasSubmit` 静默失效）、对 TS/JSX 类型不友好、且不兼容 React 17/18，故仍推荐本包。
- **绑定时机**：hook 在挂载 effect 中读取 `ref.current` 绑定监听——目标元素需与 hook 同一提交周期内挂载。若元素是条件渲染（晚于首帧出现），应把 hook 调用放到该元素确认挂载后的组件分支里。
- **卸载自动解绑**：组件卸载即移除监听，无泄漏。
- **属性与插槽不受影响**：组件属性、布尔属性、插槽内容在 React 下照常工作，只有事件监听需要本包。

### 相关包

| 包 | 作用 |
| --- | --- |
| `@oas-ui/ui` | 组件库主包（注册 `oas-*` 元素） |
| `@oas-ui/theme` | 主题 token（light/dark/high-contrast） |

## <a id="en"></a> [中文](#zh) | English

`@oas-ui/react` — the React bridge for OAS-UI. Bridges `oas-*` custom events (CustomEvent) into React hooks.

### Why this package?

React 19 bridges custom-element events only for the "on + lowercase literal" spelling (`onoas-submit` receives `oas-submit`), while the idiomatic camelCase form `<oas-button onOasSubmit={...}>` silently fails — `onOasSubmit` is never mapped to an `oas-submit` listener, so the event dispatched by the component is never received. Vue's `@oas-click` syntax works fine, but on the React side you must call `addEventListener` manually — these two hooks wrap that process (latest-handler ref + automatic unbinding on unmount).

### Install

```bash
pnpm add @oas-ui/react @oas-ui/ui @oas-ui/theme
```

`@oas-ui/ui` / `@oas-ui/theme` register the components and provide theme tokens; `@oas-ui/react` only provides the event-bridging hooks.

### Usage

#### Single event: `useOasEvent`

```tsx
import { useRef } from 'react'
import { useOasEvent } from '@oas-ui/react'

interface SubmitDetail {
  value: Record<string, unknown>
}

function LoginForm() {
  const formRef = useRef<HTMLElement | null>(null)

  useOasEvent<SubmitDetail>(formRef, 'oas-submit', (detail, ev) => {
    // detail = CustomEvent.detail; ev is the original event
    console.log('form submitted', detail.value)
  })

  return <oas-form ref={formRef}>...</oas-form>
}
```

#### Multiple events: `useOasEvents`

```tsx
import { useRef } from 'react'
import { useOasEvents } from '@oas-ui/react'

function Dialog() {
  const modalRef = useRef<HTMLElement | null>(null)

  useOasEvents(modalRef, {
    'oas-ok': () => console.log('confirmed'),
    'oas-cancel': () => console.log('cancelled'),
    'oas-close': (detail: { source: 'mask' | 'esc' | 'close-btn' }) => {
      console.log('close source', detail.source)
    },
  })

  return <oas-modal ref={modalRef} visible>...</oas-modal>
}
```

> Each handler may annotate its own `detail` parameter type (the detail shape is given in each component's Events table) for in-body type hints.
>
> In TypeScript, before using `oas-*` tags you usually declare the matching `JSX.IntrinsicElements` global types (place it in any global `.d.ts`):

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'oas-button': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      'oas-form': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>
      // ... add the oas-* tags you use
    }
  }
}
```

### Hooks API

| Hook | Signature | Description |
| --- | --- | --- |
| `useOasEvent` | `(ref: RefObject<HTMLElement \| null>, type: string, handler: (detail: T, ev: Event) => void) => void` | Bind a single `oas-*` event. The handler is refreshed into a ref every render (events always hit the latest closure); the binding effect only depends on `[ref, type]`, so changing the handler never rebinds; automatically unbound on unmount |
| `useOasEvents` | `(ref: RefObject<HTMLElement \| null>, handlers: Record<string, (detail, ev: Event) => void>) => void` | Bind many events at once. One `useEffect` binds/unbinds them all; changing the `handlers` reference (e.g. a fresh literal each render) does not rebind thanks to a latest-handlers ref; only a change in the set of event types (added/removed keys) rebinds |

### Exported types

| Type | Definition | Description |
| --- | --- | --- |
| `OasEventHandler<T>` | `(detail: T, ev: Event) => void` | Single-event handler; `T` is the detail type (defaults to `unknown`) |
| `OasEventHandlers` | `Record<string, OasEventHandler>` | Event map: event name (with the `oas-` prefix) → handler |

### Notes

- **Event names must keep the `oas-` prefix**: components dispatch `oas-submit` / `oas-change` / `oas-close`; `submit` will never be received.
- **React 19 has a native alternative**: `<oas-form onoas-submit={...}>` ("on" + lowercase literal event name) does listen to kebab events — but it breaks React conventions (the camelCase `onOasSubmit` silently fails), is hostile to TS/JSX typing, and doesn't work on React 17/18, so this package remains the recommended path.
- **Binding timing**: the hook reads `ref.current` in its mount effect — the target element must be mounted in the same commit as the hook. For conditionally rendered elements (mounted after the first frame), call the hook in the branch where the element is known to be mounted.
- **Auto cleanup on unmount**: listeners are removed when the component unmounts — no leaks.
- **Attributes & slots are unaffected**: attributes, boolean props and slotted content work as usual in React; only event listening needs this package.

### Related packages

| Package | Purpose |
| --- | --- |
| `@oas-ui/ui` | Main UI library (registers the `oas-*` elements) |
| `@oas-ui/theme` | Theme tokens (light/dark/high-contrast) |
