/**
 * app 宿主注册表 —— 命令式 API（message/notification/loadingBar 等）的挂载目标与全局默认配置。
 *
 * - <oas-app> 连接时注册为宿主，断开时注销；注册时同时登记其 `message`/`notification`
 *   属性解析出的全局默认配置（命令式 API 合并：调用参数优先，默认仅补缺省键）
 * - getAppHost() 返回最近（最后注册且仍在文档中）的 app 容器；
 *   无 app 容器时返回 null，命令式 API 回退挂到 document.body（不破坏旧行为）
 * - 就近原则：后注册的 app（嵌套在内层的）优先
 */
export interface AppHostConfig {
  message?: Record<string, unknown> | null
  notification?: Record<string, unknown> | null
}

let appHost: HTMLElement | null = null
let appMessageConfig: Record<string, unknown> | null = null
let appNotificationConfig: Record<string, unknown> | null = null

/** 注册 app 宿主并登记其全局默认配置（连接时 / 配置属性变化时调用，幂等）。
 *  宿主竞争规则：嵌套场景下「就近优先」——内层（更深）app 恒胜出，不受连接顺序影响
 *  （真实浏览器子树插入先外层后内层，但 happy-dom 相反，故按 DOM 包含关系判定）；
 *  互不嵌套的独立 app 保持「后注册优先」的原语义 */
export function registerAppHost(el: HTMLElement, config?: AppHostConfig): void {
  if (appHost && appHost !== el) {
    // 新宿主是当前宿主的祖先（外层）：当前（内层）宿主保持胜出
    if (el.contains(appHost) && !appHost.contains(el)) return
    // 其余情况（新宿主在旧宿主内层 / 互不嵌套）：新宿主接管
  }
  appHost = el
  appMessageConfig = config?.message ?? null
  appNotificationConfig = config?.notification ?? null
}

/** 注销 app 宿主（断开时调用，仅当是最新宿主时才清除） */
export function unregisterAppHost(el: HTMLElement): void {
  if (appHost === el) {
    appHost = null
    appMessageConfig = null
    appNotificationConfig = null
  }
}

/** 当前生效的 app 宿主；无 app 容器或已脱离文档时返回 null */
export function getAppHost(): HTMLElement | null {
  if (appHost && appHost.isConnected) return appHost
  return null
}

/** 最近 app 宿主的 message 全局默认配置（无 app 容器或已脱离文档时返回 null） */
export function getAppMessageConfig(): Record<string, unknown> | null {
  if (appHost && appHost.isConnected) return appMessageConfig
  return null
}

/** 最近 app 宿主的 notification 全局默认配置（无 app 容器或已脱离文档时返回 null） */
export function getAppNotificationConfig(): Record<string, unknown> | null {
  if (appHost && appHost.isConnected) return appNotificationConfig
  return null
}

/** 计算消息栈挂载目标：优先 app 宿主，否则 document.body */
export function resolveMessageHost(): HTMLElement {
  return getAppHost() ?? document.body
}
