// DSD 页面（Nitro 原样 HTML）的客户端注册入口：唯一注册方式 = 官方全量入口副作用导入。
//
// 顺序：先挂载声明式 shadow root（DSD polyfill 副作用导入），再注册 en / ar 语言包，
// 最后加载 @oas-ui/ui —— 组件 upgrade 时按就近 <oas-config-provider locale> 取翻译器；
// 语言包缺席会回落全局 zh-CN，把服务端渲染好的 en/ar 文案在水合后改成中文。
//
// polyfill 必须排在 @oas-ui/ui 之前：ESM 按 import 顺序求值，polyfill 求值即扫描并挂载
// 文档内 template[shadowrootmode]；晚于组件注册的话组件会先按 CSR 建 shadow，快照模板沦为惰性残留。
// 原生支持解析期 DSD 的引擎上 polyfill 是零命中 no-op（探测 + 查询一次）。
import '@oas-ui/ssr/polyfill'
import { registerLocale } from '@oas-ui/i18n'
import ar from '@oas-ui/i18n/ar'
import en from '@oas-ui/i18n/en'

registerLocale(en)
registerLocale(ar)

void (async () => {
  await import('@oas-ui/ui')
  // e2e 判定「客户端注册已完成」的显式信号（注册在同一模块求值内同步完成）
  ;(window as unknown as { __oasClientReady?: boolean }).__oasClientReady = true
})()
