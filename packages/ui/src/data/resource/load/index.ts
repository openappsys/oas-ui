/**
 * gantt 资源负荷 helper（Pro 子路径入口）：资源负荷桶统计纯函数，零运行时依赖。
 * 按需引入：`import { computeResourceLoad } from '@oas-ui/ui/data/resource/load'`；
 * 实现本体居 `src/shared/resource-load.ts`（oas-gantt 的 `show-resource-load` 属性静态消费
 * 同一份实现，随组件链进 L1/族包；本入口路径保持 helper 语义，不进 L1/族包），
 * 运行闭包不含组件本体 / core / i18n（类型仅 `import type`，构建期擦除）。
 */
export { computeResourceLoad } from '../../../shared/resource-load.js'
export type {
  ResourceLoadOptions,
  ResourceLoadResult,
  ResourceLoadRow,
  ResourceLoadUnit,
} from '../../../shared/resource-load.js'
export type { GanttTask } from '../../gantt/oas-gantt.js'
