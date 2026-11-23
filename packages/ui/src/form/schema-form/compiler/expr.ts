/**
 * 编译器内部转发入口：实现居公开子路径 `../expr/index.js`（schema-form 组件与宿主共用同一份实现）。
 * 变量名/类型经此转发，避免编译层各处改 import 路径。
 */
export * from '../expr/index.js'
