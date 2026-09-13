/**
 * @deprecated 已收敛到 `shared/direction`——方向判定是全局基础件而非浮层专属
 * （data/layout/navigation/basic 组件同样消费），本文件仅为 v2.5.2 相对导入
 * 路径的兼容垫片，下个 major 移除。
 */
export { resolveDirection, isRtl } from '../shared/direction.js'
