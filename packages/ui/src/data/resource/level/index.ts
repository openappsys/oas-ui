/**
 * levelResources 算法核公开子路径（薄转发入口；实现居 src/shared/resource-level.ts）。
 *
 * helper 型 L3（kind 同 resourceLoad）：实现本体与组件链共用（oas-resource.ts 静态消费
 * shared 实现，实现随组件链进 L1/data 族包）；入口路径自身无属性触发面，不进 L1/族包
 * （perf 路径标记 /data/resource/level/ 只匹配本入口，不匹配 src/shared/ 实现——两层口径
 * 互不干扰，见 scripts/perf/lib/l3-registry.mjs）。helper-only 消费者按需引入本入口，
 * 绕开组件本体链（抽核前须经组件模块单文件 16.25 KB gz；抽核后独立瘦链 ~13.2 KB）。
 */
export { levelResources } from '../../../shared/resource-level.js'
export type { LevelResourcesMode, LevelResourcesOptions } from '../../../shared/resource-level.js'
export type { ResourceItem, ResourceScale, ResourceTask } from '../model.js'
