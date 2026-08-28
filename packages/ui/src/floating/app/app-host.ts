/**
 * app 宿主注册表 —— 命令式 API（message/notification/loadingBar 等）的挂载目标与全局默认配置。
 *
 * - <oas-app> 连接时注册入栈，断开时出栈；注册时同时登记其 `message`/`notification`
 *   属性解析出的全局默认配置（命令式 API 合并：调用参数优先，默认仅补缺省键）
 * - 当前宿主解析：仍在文档中的宿主里「嵌套最深优先」（内层 app 恒胜出，不受连接
 *   顺序影响）；互不嵌套的并列宿主「后注册优先」
 * - 栈式管理：内层宿主移除后外层仍在的宿主自动接管（单槽位时代回退 document.body
 *   的缺陷已修）；全部移除后回退 document.body（不破坏旧行为）
 */
export interface AppHostConfig {
  message?: Record<string, unknown> | null
  notification?: Record<string, unknown> | null
}

interface HostEntry {
  el: HTMLElement
  message: Record<string, unknown> | null
  notification: Record<string, unknown> | null
}

let hosts: HostEntry[] = []

/** 注册 app 宿主并入栈（连接时调用）/ 更新其全局默认配置（配置属性变化时调用，幂等） */
export function registerAppHost(el: HTMLElement, config?: AppHostConfig): void {
  const existing = hosts.find((h) => h.el === el)
  if (existing) {
    existing.message = config?.message ?? null
    existing.notification = config?.notification ?? null
    return
  }
  hosts.push({
    el,
    message: config?.message ?? null,
    notification: config?.notification ?? null,
  })
}

/** 注销 app 宿主（断开时调用，出栈；外层仍在的宿主自动接管） */
export function unregisterAppHost(el: HTMLElement): void {
  hosts = hosts.filter((h) => h.el !== el)
}

/** 当前生效宿主：仍在文档中的宿主里嵌套最深优先，互不嵌套后注册优先 */
function current(): HostEntry | null {
  const connected = hosts.filter((h) => h.el.isConnected)
  const innermost = connected.filter(
    (h) => !connected.some((o) => o !== h && h.el.contains(o.el)),
  )
  return innermost[innermost.length - 1] ?? null
}

/** 当前生效的 app 宿主；无 app 容器或已全部脱离文档时返回 null */
export function getAppHost(): HTMLElement | null {
  return current()?.el ?? null
}

/** 最近 app 宿主的 message 全局默认配置（无 app 容器或已全部脱离文档时返回 null） */
export function getAppMessageConfig(): Record<string, unknown> | null {
  return current()?.message ?? null
}

/** 最近 app 宿主的 notification 全局默认配置（无 app 容器或已全部脱离文档时返回 null） */
export function getAppNotificationConfig(): Record<string, unknown> | null {
  return current()?.notification ?? null
}

/** 计算消息栈挂载目标：优先 app 宿主，否则 document.body */
export function resolveMessageHost(): HTMLElement {
  return getAppHost() ?? document.body
}
