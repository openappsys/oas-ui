/**
 * app 宿主注册表 —— 命令式 API（message/notification/loadingBar 等）的挂载目标。
 *
 * - <oas-app> 连接时注册为宿主，断开时注销
 * - getAppHost() 返回最近（最后注册且仍在文档中）的 app 容器；
 *   无 app 容器时返回 null，命令式 API 回退挂到 document.body（不破坏旧行为）
 * - 就近原则：后注册的 app（嵌套在内层的）优先
 */
let appHost: HTMLElement | null = null

/** 注册 app 宿主（连接时调用） */
export function registerAppHost(el: HTMLElement): void {
  appHost = el
}

/** 注销 app 宿主（断开时调用，仅当是最新宿主时才清除） */
export function unregisterAppHost(el: HTMLElement): void {
  if (appHost === el) appHost = null
}

/** 当前生效的 app 宿主；无 app 容器或已脱离文档时返回 null */
export function getAppHost(): HTMLElement | null {
  if (appHost && appHost.isConnected) return appHost
  return null
}

/** 计算消息栈挂载目标：优先 app 宿主，否则 document.body */
export function resolveMessageHost(): HTMLElement {
  return getAppHost() ?? document.body
}
