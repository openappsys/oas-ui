import { registerTableCapability } from '../oas-table-capability.js'
import type {
  TableStructuralRenderers,
  TableStructuralBodyRowCtx,
  TableStructuralBodyCellCtx,
  TableStructuralHeaderRowCtx,
  TableStructuralHeaderCellCtx,
} from '../oas-table.js'

/**
 * table 结构级渲染能力（注册型 L3，ESM 子路径 `@oas-ui/ui/data/table/structural-render`）。
 *
 * import 即注册：控制器本体是一个纯委托——每个渲染槽调用时**现读** `host.structuralRenderers`
 * （property 通道），自身不缓存任何钩子引用：
 * - 宿主晚赋值 / 运行时整体替换 hooks → 下一轮渲染立即生效，无闭包过期问题；
 * - 未设 property → 四个方法存在但委托落空，开销一次属性读取 + 可选链。
 *
 * 默认 `data/table` 链不含本能力（注册型 L3 按需 import；全量入口与 CDN data 族包含）。
 * 挂接点（oas-table.ts 四处 structuralCap?. 调用）在能力未注册时恒 null，判空跳过零开销。
 *
 * 形态取舍（同类方案对照，仅记结论）：依赖框架协调器的「组件整体替换」方案不可直译为命令式
 * DOM；headless 表格的「渲染全权归宿主」是趋势方向；「渲染器实例生命周期」是重 DOM 复用时代的
 * 细粒度优化——本库 tr/td 随窗口化重建，养不起也不用养，「默认装配后调用 + 每轮现读」的粗粒度
 * 模型等价覆盖（契约纪律见 oas-table.ts 类型注释）。
 */
interface StructuralRenderHost {
  structuralRenderers: TableStructuralRenderers | null
}

/** 控制器 = host 委托：每槽调用现读 host.structuralRenderers（无闭包缓存，运行时替换即时生效） */
class StructuralRenderController {
  constructor(private readonly host: StructuralRenderHost) {}

  /** 无生命周期需求；占位以满足 ReactiveController 弱类型（全可选接口要求至少一个公共成员） */
  hostConnected(): void {}

  bodyRow(ctx: TableStructuralBodyRowCtx): void {
    this.host.structuralRenderers?.bodyRow?.(ctx)
  }

  bodyCell(ctx: TableStructuralBodyCellCtx): void {
    this.host.structuralRenderers?.bodyCell?.(ctx)
  }

  headerRow(ctx: TableStructuralHeaderRowCtx): void {
    this.host.structuralRenderers?.headerRow?.(ctx)
  }

  headerCell(ctx: TableStructuralHeaderCellCtx): void {
    this.host.structuralRenderers?.headerCell?.(ctx)
  }
}

/** 幂等注册 structural-render 能力（`@oas-ui/ui` 全量入口/CDN data 族含本调用，tree-shaking 不受影响） */
export function registerTableStructuralRenderCapability(): void {
  registerTableCapability('structural-render', (host) => new StructuralRenderController(host as StructuralRenderHost))
}

registerTableStructuralRenderCapability()

export type {
  TableStructuralRenderers,
  TableStructuralBodyRowCtx,
  TableStructuralBodyCellCtx,
  TableStructuralHeaderRowCtx,
  TableStructuralHeaderCellCtx,
}
export type { TableColumn } from '../oas-table.js'
