import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * fixture 用到的自定义元素 JSX 声明（React 19 不内置 `oas-*` 标签）。
 * 这只是类型层声明：运行时属性原样落到 DOM attribute，由组件 upgrade 后读取。
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'oas-config-provider': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        locale?: string
      }
    }
  }
}
