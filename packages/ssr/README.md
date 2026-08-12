# @oas-ui/ssr

OAS-UI 服务端渲染（SSR）渲染器 —— 在 Node 环境把组件渲染为 Declarative Shadow DOM（DSD）静态快照，浏览器无需 JS 即可呈现结构与样式，upgrade 后由组件接管交互。

```ts
import { renderToString } from '@oas-ui/ssr'

const html = await renderToString('oas-button', { type: 'primary' }, '提交', { locale: 'zh-CN' })
// <oas-button type="primary"><template shadowrootmode="open">…</template>提交</oas-button>
```

支持白名单组件（纯展示 + 数据组件 + 测量组件试点）输出完整快照；非白名单调用抛错。注意事项见文档站 SSR 指南。
