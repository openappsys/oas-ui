import { OASElement } from '@oas-ui/core/oas-element'
import { stableHash36 } from '../../shared/stable-id.js'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'
import { safeUrl } from '../../shared/safe-url.js'
import '../price/index.js'
import '../../feedback/bottom-sheet/index.js'

/**
 * oas-sku —— 商品规格选择（commerce 族）。
 *
 * 两种承载形态共用同一份面板（**同一 DOM 节点复用，不复制**）：
 * - `layout="embedded"`（宽屏缺省）：内嵌面板，随页面排版；
 * - `layout="popup"`：面板挂进 `oas-bottom-sheet`，由底部抽屉承载（Esc / 遮罩 / 下滑关闭
 *   走 bottom-sheet 协议：容器只派发 `oas-close`，宿主（本组件）据此收起）。
 * 缺省 `layout` 按视口自动：宽度 ≤480px 用 popup，否则 embedded；显式写死的值不被视口覆盖，
 * 视口越界变化即时重判（无需刷新）。内嵌形态下预置的 `open` 在切到 popup 形态时自动弹开
 * （`open` 只在 popup 形态被承载，形态切换时即生效）。
 *
 * 数据契约：
 * - `specs`：JSON 数组 `[{ key, label?, values: (string | { value, label? })[] }]`
 * - `skus`：JSON 数组 `[{ id?, specs: { [specKey]: optionValue }, price?, stock?, image?, imageAlt? }]`
 * - `value`：JSON 对象 `{ [specKey]: optionValue }`——当前选中组合（受控；用户选择回写）
 * - `quantity`：数量（默认 1；上限 = 匹配 sku 库存）
 *
 * 组合匹配算法：
 * - 全选后按 `skus` 精确定位（组合 → 价格 / 库存 / 图片）
 * - 部分选择时逐项判断「沿该选项是否能走到一个在库组合」（其余已选规格必须吻合）——
 *   走不到的选项置灰并标「缺货」（可选路径提示）
 * - 无 `skus` 数据时不做库存约束（全部可选）；有数据但全无库存时全部置灰
 *
 * 属性（kebab-case）：上列数据属性 + `currency`（默认 CNY）/ `locale` / `precision`（默认 2）/
 * `disabled`（全禁用，兼容 config-provider 注入禁用）/ `layout`（`embedded` | `popup`，缺省按视口自动）/
 * `open`（弹层开合，受控；仅 popup 形态生效）
 *
 * property 通道：`specs` / `skus` / `value` / `quantity` / `open` 同时是读+写访问器
 * （setter 接受数组 / 对象 / 布尔或 JSON 字符串并反射 attribute），供框架把模板静态属性
 * 直接写成 property 时走同一份数据入口。
 *
 * 方法：
 * - `openOverlay()` / `closeOverlay()`：命令式开合弹层（幂等；派发 `oas-open-change`；
 *   非 popup 形态调用只 devWarn 一次，不产生幽灵 open 态）
 *
 * 事件（bubbles + composed）：
 * - `oas-change`：规格或数量变化，detail `{ value, quantity, sku, change: 'spec' | 'quantity' }`
 *   （`sku` 为完整匹配对象或 `null`；程序性写入属性不回派事件）
 * - `oas-open-change`：交互 / 命令式开合弹层，detail `{ open }`（受控属性写入静默不派发）
 * - `oas-close`：**承载件透传事件**——由 `oas-bottom-sheet` 冒泡出的关闭请求（下滑 / 遮罩 / Esc），
 *   detail `{ reason }`；本组件收到后已自行收起，宿主**无需**再处理（监听它只用于观测 / 联动埋点）
 *
 * a11y：每组 `fieldset` + `legend` 组织，选项为原生 radio（方向键/空格原生可用）；
 * 缺货选项 `disabled` 且文本含「缺货」；数量按 spinbutton 语义（number input + 加减按钮，
 * 均带 i18n 名称），价格变化区 `aria-live="polite"`。弹层形态下焦点移入与 Tab 循环由
 * `oas-bottom-sheet` 统一承载（打开即聚焦面板首个可聚焦控件）；关闭时焦点回带打开前
 * 触发器，滑出动画结束后承载件补 `hidden`（抽屉内控件退出 Tab 序与读屏树，不滞留屏外）。
 */

export type SkuLayout = 'embedded' | 'popup'

export interface SkuSpecValue {
  value: string
  label: string
}

export interface SkuSpecGroup {
  key: string
  label: string
  values: SkuSpecValue[]
}

export interface SkuItem {
  id: string
  specs: Record<string, string>
  price: number | null
  stock: number | null
  image: string
  imageAlt: string
}

export interface SkuChangeDetail {
  value: Record<string, string>
  quantity: number
  sku: SkuItem | null
  change: 'spec' | 'quantity'
}

export interface SkuOpenChangeDetail {
  open: boolean
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  box-sizing: border-box;
  padding: var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.panel[hidden] {
  display: none;
}
/*
 * 弹层形态：面板搬到 bottom-sheet 的默认 slot 里，容器（抽屉）负责表面 / 圆角 / 安全区——
 * 面板自身去掉卡片外观，避免「卡片套卡片」的双层描边与双重内边距。
 */
:host([data-layout-popup]) .panel {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}
.media {
  display: none;
}
.media:not([hidden]) {
  display: block;
}
.thumb {
  display: block;
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-disabled);
}
.summary {
  display: flex;
  align-items: baseline;
  gap: var(--oas-space-2);
  min-height: var(--oas-control-height-md, 32px);
}
.soldout {
  font-size: var(--oas-font-size-sm);
  /* 小字文字色走文字安全档 token（实色 danger 在小字浅底不达 4.5:1；族内 ecard / invoice 同口径） */
  color: var(--oas-color-danger-text);
}
.soldout[hidden] {
  display: none;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
}
.group-label {
  padding: 0;
  margin-block-end: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-space-2);
}
.option {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  box-sizing: border-box;
  padding: var(--oas-space-1) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  transition:
    border-color var(--oas-transition-fast) var(--oas-ease-out),
    background var(--oas-transition-fast) var(--oas-ease-out);
}
.option:hover {
  border-color: var(--oas-color-primary);
}
.option:focus-within {
  box-shadow: var(--oas-focus-ring);
}
.option[data-checked='true'] {
  border-color: var(--oas-color-primary);
  background: color-mix(in srgb, var(--oas-color-primary) 10%, transparent);
  color: var(--oas-color-primary-text);
}
.option[data-available='false'] {
  cursor: not-allowed;
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
  border-style: dashed;
}
.option[data-available='false']:hover {
  border-color: var(--oas-color-border);
}
.option-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
.out {
  color: var(--oas-color-text-disabled);
  font-size: var(--oas-font-size-xs);
}
.out[hidden] {
  display: none;
}
.quantity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-3);
}
.quantity-label {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.stepper {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  overflow: hidden;
}
.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--oas-control-height-md, 32px);
  min-height: var(--oas-control-height-md, 32px);
  border: none;
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  line-height: 1;
  cursor: pointer;
}
.step:hover:not(:disabled) {
  background: var(--oas-color-bg-hover);
}
.step:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.step:disabled {
  color: var(--oas-color-text-disabled);
  cursor: not-allowed;
}
.qty-input {
  width: 48px;
  min-height: var(--oas-control-height-md, 32px);
  padding: 0 var(--oas-space-1);
  border: none;
  border-inline: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-family: inherit;
  font-size: var(--oas-font-size-md);
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}
.qty-input:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.qty-input:disabled {
  color: var(--oas-color-text-disabled);
  background: var(--oas-color-bg-disabled);
}
/*
 * 禁用态：逐控件弱化（虚线边 + 弱化底），**不改整块 opacity**——整块降透明度会把
 * 组标签 / 门槛说明等只读文字一并压到不可读（曾实测 0.6 透明 ⇒ #aaaaaf on #fff，对比度破线）。
 * 选中项保留主色实线边，否则禁用后看不出当前选的是哪个组合。
 */
:host([disabled]) .option {
  cursor: not-allowed;
  border-style: dashed;
  border-color: var(--oas-color-border);
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-primary);
}
:host([disabled]) .option:hover {
  border-color: var(--oas-color-border);
}
:host([disabled]) .option[data-checked='true'] {
  border-style: solid;
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-primary);
}

@media (pointer: coarse) {
  .option,
  .step,
  .qty-input {
    min-height: var(--oas-touch-target-min, 44px);
  }
}

@media (forced-colors: active) {
  .option:focus-within,
  .step:focus-visible,
  .qty-input:focus-visible {
    outline: 1px solid CanvasText;
    outline-offset: 1px;
    box-shadow: none;
  }
}
`

const DEFAULTS = { quantity: 1, precision: 2 }

/** 窄视口断点：缺省 layout 在 ≤480px 时自动切换底部弹层形态 */
const NARROW_QUERY = '(max-width: 480px)'
/** 弹层关闭收尾兜底计时：滑出过渡（--oas-transition-base 180ms）+ 余量；transitionend 缺席时兜住 */
const SHEET_HIDE_FALLBACK_MS = 300
const LAYOUT_ONLY_WARN = '[oas-sku] openOverlay() / closeOverlay() 仅在 layout="popup"（或窄屏自动弹层）形态生效'

const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  devWarn(message)
}

/** 规格组归一：仅保留 key 非空、values 合法的组 */
function normalizeGroups(raw: unknown[]): SkuSpecGroup[] {
  const out: SkuSpecGroup[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue
    const group = item as { key?: unknown; label?: unknown; values?: unknown }
    if (typeof group.key !== 'string' || group.key === '' || seen.has(group.key)) continue
    if (!Array.isArray(group.values)) continue
    const values: SkuSpecValue[] = []
    for (const v of group.values) {
      if (typeof v === 'string' && v !== '') values.push({ value: v, label: v })
      else if (v != null && typeof v === 'object') {
        const obj = v as { value?: unknown; label?: unknown }
        if (typeof obj.value === 'string' && obj.value !== '') {
          values.push({
            value: obj.value,
            label: typeof obj.label === 'string' && obj.label !== '' ? obj.label : obj.value,
          })
        }
      }
    }
    if (values.length === 0) continue
    seen.add(group.key)
    out.push({
      key: group.key,
      label: typeof group.label === 'string' && group.label !== '' ? group.label : group.key,
      values,
    })
  }
  return out
}

/** sku 行归一：specs 必须是字符串→字符串对象；price/stock 取有限数 */
function normalizeSkus(raw: unknown[]): SkuItem[] {
  const out: SkuItem[] = []
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue
    const sku = item as {
      id?: unknown
      specs?: unknown
      price?: unknown
      stock?: unknown
      image?: unknown
      imageAlt?: unknown
    }
    if (sku.specs == null || typeof sku.specs !== 'object') continue
    const specs: Record<string, string> = {}
    for (const [key, value] of Object.entries(sku.specs as Record<string, unknown>)) {
      if (typeof value === 'string') specs[key] = value
    }
    const price = Number(sku.price)
    const stock = Number(sku.stock)
    out.push({
      id: typeof sku.id === 'string' && sku.id !== '' ? sku.id : JSON.stringify(specs),
      specs,
      price: Number.isFinite(price) ? price : null,
      stock: Number.isFinite(stock) ? stock : null,
      image: typeof sku.image === 'string' ? sku.image : '',
      imageAlt: typeof sku.imageAlt === 'string' ? sku.imageAlt : '',
    })
  }
  return out
}

export class OASSku extends OASElement {
  static override get observedAttributes(): string[] {
    return ['specs', 'skus', 'value', 'quantity', 'currency', 'locale', 'precision', 'disabled', 'layout', 'open']
  }

  private panelHostEl: HTMLElement | null = null
  private panelEl: HTMLElement | null = null
  private mediaEl: HTMLElement | null = null
  private thumbEl: HTMLImageElement | null = null
  private priceEl: HTMLElement | null = null
  private soldOutEl: HTMLElement | null = null
  private groupsEl: HTMLElement | null = null
  private qtyLabelEl: HTMLElement | null = null
  private qtyInputEl: HTMLInputElement | null = null
  private minusEl: HTMLButtonElement | null = null
  private plusEl: HTMLButtonElement | null = null
  private sheetEl: HTMLElement | null = null
  /** 当前生效形态（每次 update 重判，视口越界即时切换） */
  private layoutValue: SkuLayout = 'embedded'
  /** 视口条件变化监听释放（onCleanup 兜底） */
  private releaseViewportWatch: (() => void) | null = null

  /** 选中组合（单一事实源；value 属性是受控镜像） */
  private selected: Record<string, string> = {}
  /** 已构建结构的指纹（specs + skus + 实例 id）：相同则只同步选中/可用性，不重建（保焦点） */
  private lastStructureKey = ''
  private instanceId = ''
  /** 程序性写入抑制（避免 update 回写属性造成回环） */
  private writingValue = false

  // -------------------------------------------------------------------------
  // property 通道（框架把模板静态属性写成 property 时的数据入口）
  // -------------------------------------------------------------------------

  /** 规格组（读=归一后的数据；写=接受数组或 JSON 字符串，反射 `specs` attribute） */
  get specs(): SkuSpecGroup[] {
    return this.parseSpecs()
  }
  set specs(value: SkuSpecGroup[] | string) {
    this.setAttribute('specs', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** SKU 行（读=归一后的数据；写=接受数组或 JSON 字符串，反射 `skus` attribute） */
  get skus(): SkuItem[] {
    return this.parseSkus()
  }
  set skus(value: SkuItem[] | string) {
    this.setAttribute('skus', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 选中组合（读=归一后的选中项；写=接受对象或 JSON 字符串，反射 `value` attribute） */
  get value(): Record<string, string> {
    return this.parseValue(this.parseSpecs())
  }
  set value(value: Record<string, string> | string) {
    this.setAttribute('value', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 数量（读=属性数值；写=数字或数字字符串，反射 `quantity` attribute） */
  get quantity(): number {
    const raw = Number(this.getAttr('quantity'))
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULTS.quantity
  }
  set quantity(value: number | string) {
    this.setAttribute('quantity', String(value))
  }

  /** @apiProperty 弹层开合（受控：读写即反射 `open` attribute，静默不派发事件；仅 popup 形态生效） */
  get open(): boolean {
    return this.hasAttribute('open')
  }
  set open(value: boolean | string) {
    // presence 语义：静态 `<oas-sku open>` 经框架 property 通道写入的是空串，空串视为打开
    const on = value !== false && value !== 'false' && value != null
    this.toggleAttribute('open', on)
  }

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="panel-host" part="panel-host"><div class="panel">
        <div class="media" part="media" hidden><img class="thumb" part="image" alt=""></div>
        <div class="summary" part="summary" aria-live="polite">
          <oas-price class="price" part="price" hidden></oas-price>
          <span class="soldout" part="sold-out" hidden></span>
        </div>
        <div class="groups" part="groups"></div>
        <div class="quantity" part="quantity">
          <span class="quantity-label" part="quantity-label"></span>
          <div class="stepper">
            <button class="step minus" part="minus" type="button">−</button>
            <input class="qty-input" part="quantity-input" type="number" min="1" step="1" inputmode="numeric">
            <button class="step plus" part="plus" type="button">+</button>
          </div>
        </div>
      </div></div>
      <oas-bottom-sheet part="sheet" hidden></oas-bottom-sheet>
    `
  }

  private bind(): void {
    this.panelHostEl = this.shadow.querySelector<HTMLElement>('[part="panel-host"]')
    this.panelEl = this.shadow.querySelector<HTMLElement>('.panel')
    this.mediaEl = this.shadow.querySelector<HTMLElement>('[part="media"]')
    this.thumbEl = this.shadow.querySelector<HTMLImageElement>('[part="image"]')
    this.priceEl = this.shadow.querySelector<HTMLElement>('oas-price')
    this.soldOutEl = this.shadow.querySelector<HTMLElement>('[part="sold-out"]')
    this.groupsEl = this.shadow.querySelector<HTMLElement>('[part="groups"]')
    this.qtyLabelEl = this.shadow.querySelector<HTMLElement>('[part="quantity-label"]')
    this.qtyInputEl = this.shadow.querySelector<HTMLInputElement>('[part="quantity-input"]')
    this.minusEl = this.shadow.querySelector<HTMLButtonElement>('[part="minus"]')
    this.plusEl = this.shadow.querySelector<HTMLButtonElement>('[part="plus"]')
    // 弹层承载件：只有关闭请求（下滑 / 遮罩 / Esc）走协议，开合由本组件决定
    this.sheetEl = this.shadow.querySelector<HTMLElement>('oas-bottom-sheet')
    this.sheetEl?.addEventListener('oas-close', this.onSheetClose)

    this.groupsEl?.addEventListener('change', this.onSpecChange)
    this.qtyInputEl?.addEventListener('change', this.onQuantityInput)
    this.minusEl?.addEventListener('click', this.onMinus)
    this.plusEl?.addEventListener('click', this.onPlus)

    this.watchViewport()
    this.onCleanup(() => {
      this.releaseViewportWatch?.()
      this.releaseViewportWatch = null
      this.sheetEl?.removeEventListener('oas-close', this.onSheetClose)
      // 待生效的隐藏收尾随断连取消（句柄存在成员里，不按次注册清理回调，避免 cleanupFns 单调增长）
      this.cancelSheetHide()
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override onReconnect(): void {
    this.bind()
  }

  // -------------------------------------------------------------------------
  // 形态（内嵌 / 底部弹层）
  // -------------------------------------------------------------------------

  /** 视口是否窄屏（≤480px）：缺省 layout 据此自动切弹层 */
  private narrowViewport(): boolean {
    if (typeof window === 'undefined') return false
    if (typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia(NARROW_QUERY).matches
      } catch {
        return false
      }
    }
    return typeof window.innerWidth === 'number' && window.innerWidth <= 480
  }

  /**
   * 生效形态：显式 `layout` 优先（embedded / popup），缺省按视口自动；
   * 非法值告警一次回落 embedded（不静默改语义）。
   */
  private resolveLayout(): SkuLayout {
    const raw = this.getAttr('layout').trim()
    if (raw === '') return this.narrowViewport() ? 'popup' : 'embedded'
    if (raw === 'embedded' || raw === 'popup') return raw
    warnOnce(`[oas-sku] 非法 layout "${raw}"，已回落 embedded；合法值：embedded / popup`)
    return 'embedded'
  }

  /** 订阅视口条件变化（越界才触发，非每帧）：窄屏 ↔ 宽屏即时重判形态 */
  private watchViewport(): void {
    if (this.releaseViewportWatch) return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    let mql: MediaQueryList
    try {
      mql = window.matchMedia(NARROW_QUERY)
    } catch {
      return
    }
    const handler = (): void => this.update()
    mql.addEventListener('change', handler)
    this.releaseViewportWatch = () => mql.removeEventListener('change', handler)
  }

  /**
   * 形态同步：同一份面板节点在「内嵌容器」与「bottom-sheet 默认 slot」之间搬移
   * （内容复用不复制——选中态 / 焦点 / 已输入数量都跟着走）。
   *
   * 弹层关闭收尾（a11y）：bottom-sheet 关闭态只有 translateY(100%) 移屏外，自身不带
   * hidden/inert——抽屉里的 radio / 数量 / 按钮仍在 Tab 序与读屏树（Tab 会落进屏外面板）。
   * 因此关闭走两段式：先移除 `open` 让滑出动画照播，过渡收尾（transitionend，只认承载件
   * shadow 内的 transform/opacity）或兜底计时到点后补 `hidden`（display:none → 退出 Tab 序
   * 与读屏树）；从未开过（初始 / 形态切回）直接同帧 hidden，不留可达窗口。打开时先移除
   * hidden 并强制一次样式计算（display:none 元素缺 before-change style，同帧直接挂 `open`
   * 会吞滑入过渡——实测 Chromium 复现），再挂 `open`。快速关→开会取消待生效的隐藏
   * （`sheetHideSeq` 失效旧收尾），滑出中重开从当前位置自然回弹。
   */
  private syncLayout(): void {
    const layout = this.resolveLayout()
    this.layoutValue = layout
    const popup = layout === 'popup'
    this.toggleAttribute('data-layout-popup', popup)

    const panel = this.panelEl
    const sheet = this.sheetEl
    const host = this.panelHostEl
    if (!panel || !sheet || !host) return
    if (popup) {
      if (panel.parentElement !== sheet) sheet.appendChild(panel)
      if (this.hasAttribute('open')) {
        // 打开：取消待生效的隐藏收尾（快速关→开不闪断）。触发器在 sheet 挂 open
        // （内部随即聚焦面板首控件）之前记录。
        this.cancelSheetHide()
        sheet.removeAttribute('hidden')
        if (!sheet.hasAttribute('open')) {
          this.openTriggerEl = this.deepActiveElement()
          // hidden 与 open 同帧切换会吞滑入过渡：display:none 元素缺 before-change
          // style（CSS Transitions 对「此前无样式计算」的元素不建过渡）。先强制一次
          // 样式/布局计算让「收起」态（translateY(100%)）成为过渡起点，再挂 open——
          // 同步完成无竞态；滑出中重开则从当前位置自然回弹。
          sheet.getBoundingClientRect()
          sheet.setAttribute('open', '')
        }
      } else if (sheet.hasAttribute('open')) {
        // 开→关：焦点回带触发器（此刻面板仍可见可聚焦），滑出动画照播，收尾后隐藏
        sheet.removeAttribute('open')
        this.restoreFocusToTrigger()
        this.scheduleSheetHide(sheet)
      } else {
        // 从未开过（初始 / 形态切回）：直接隐藏，不留可达窗口。
        // 收尾窗口内（滑出动画播放中）update() 重入不得同帧 hidden——否则砍断滑出动画；
        // 收尾完成会自行落 hidden（scheduleSheetHide 的 finish）。
        if (this.sheetHideCleanup == null) sheet.setAttribute('hidden', '')
      }
    } else {
      this.cancelSheetHide()
      // 焦点保持：搬移前记录面板内的深活跃元素（含 shadow 路径）。同文档 appendChild
      // 理论上焦点随节点走，但部分环境（happy-dom / 宿主框架重排）会把焦点丢掉——
      // 复活后表现为活跃元素退到 body 或 host。搬移后若活跃元素不再是原焦点，复原到
      // 原控件，避免键盘用户焦点丢失；真实浏览器保焦路径下判定不成立、零副作用。
      const active = this.deepActiveElement()
      const focusedInPanel = active != null && panel.contains(active)
      if (panel.parentElement !== host) host.appendChild(panel)
      // 内嵌形态不留幽灵弹层：收起并隐藏承载件（空 dialog 不进读屏树）
      sheet.removeAttribute('open')
      sheet.setAttribute('hidden', '')
      if (focusedInPanel && active && this.deepActiveElement() !== active) {
        active.focus({ preventScroll: true })
      }
      // open 悬空真值收口：popup 形态下打开的弹层切回 embedded 后承载件已隐藏，
      // `open` 残留会让宿主的滚动锁 / 遮罩态挂空且永不解除（形态切换不经过
      // openOverlay / onSheetClose，没有其它派发点）。同步回写 false 并派发
      // oas-open-change——受控宿主收到事件后按自己的状态清锁，不必再回写 open。
      if (this.hasAttribute('open')) {
        this.removeAttribute('open')
        this.emit('open-change', { open: false } satisfies SkuOpenChangeDetail)
      }
    }
  }

  /** 打开弹层前的触发焦点（关闭时回带，避免焦点滞留屏外抽屉） */
  private openTriggerEl: HTMLElement | null = null
  /** 待生效的隐藏收尾（取消句柄；快速关→开 / 切形态 / 断连时作废） */
  private sheetHideCleanup: (() => void) | null = null
  /** 隐藏收尾代次：重排 / 取消使旧收尾失效（防串扰） */
  private sheetHideSeq = 0

  /**
   * 深层 activeElement（穿透 shadow root）。
   * happy-dom 无焦点节点时读取 shadow.activeElement 可能抛错，防护回落。
   */
  private deepActiveElement(): HTMLElement | null {
    let active: Element | null = typeof document !== 'undefined' ? document.activeElement : null
    try {
      while (active instanceof Element && active.shadowRoot?.activeElement) {
        active = active.shadowRoot.activeElement
      }
    } catch {
      // 环境差异兜底：拿不到深层焦点时以 document.activeElement 为准
    }
    return active instanceof HTMLElement ? active : null
  }

  /** 焦点仍在承载件内时回带打开前触发器（触发器已移出文档则不回带） */
  private restoreFocusToTrigger(): void {
    const trigger = this.openTriggerEl
    this.openTriggerEl = null
    if (!trigger || !trigger.isConnected) return
    const sheet = this.sheetEl
    const active = this.deepActiveElement()
    if (!sheet || !active) return
    const inside = sheet.contains(active) || (sheet.shadowRoot != null && sheet.shadowRoot.contains(active))
    if (inside) trigger.focus({ preventScroll: true })
  }

  /**
   * 弹层隐藏收尾：滑出过渡结束（transitionend，只认承载件 shadow 内的 transform/opacity，
   * 面板内选项 border-color/background 等过渡不误触）或兜底计时二选一；
   * 环境无过渡（transitionend 永不来）时兜底兜住。代次校验使快速关→开时旧收尾失效。
   */
  private scheduleSheetHide(sheet: HTMLElement): void {
    this.cancelSheetHide()
    const seq = ++this.sheetHideSeq
    const finish = (): void => {
      if (seq !== this.sheetHideSeq) return
      this.cancelSheetHide()
      if (!this.hasAttribute('open')) sheet.setAttribute('hidden', '')
    }
    const onEnd = (e: Event): void => {
      if (!(e.target instanceof Element) || sheet.shadowRoot?.contains(e.target) !== true) return
      const prop = (e as TransitionEvent).propertyName
      if (prop !== 'transform' && prop !== 'opacity') return
      finish()
    }
    const timer = setTimeout(finish, SHEET_HIDE_FALLBACK_MS)
    // transition 事件 composed: false（Chromium 实测不冒出 shadow root）——
    // 监听必须挂在承载件自己的 shadowRoot 上才能收到内部 .sheet / .backdrop 的过渡收尾
    const listenTarget: EventTarget = sheet.shadowRoot ?? sheet
    listenTarget.addEventListener('transitionend', onEnd)
    this.sheetHideCleanup = () => {
      clearTimeout(timer)
      listenTarget.removeEventListener('transitionend', onEnd)
      this.sheetHideCleanup = null
      this.sheetHideSeq++ // 使排队中的旧收尾失效
    }
  }

  private cancelSheetHide(): void {
    this.sheetHideCleanup?.()
  }

  /** bottom-sheet 关闭请求（下滑 / 遮罩 / Esc）：按协议由宿主收起并回派 open 变化 */
  private onSheetClose = (): void => {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('open-change', { open: false } satisfies SkuOpenChangeDetail)
  }

  /** 命令式打开弹层（幂等；非 popup 形态只告警一次，不产生幽灵 open 态） */
  openOverlay(): void {
    if (this.resolveLayout() !== 'popup') {
      warnOnce(LAYOUT_ONLY_WARN)
      return
    }
    if (this.hasAttribute('open')) return
    this.setAttribute('open', '')
    this.emit('open-change', { open: true } satisfies SkuOpenChangeDetail)
  }

  /** 命令式关闭弹层（幂等） */
  closeOverlay(): void {
    if (this.resolveLayout() !== 'popup') {
      warnOnce(LAYOUT_ONLY_WARN)
      return
    }
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.emit('open-change', { open: false } satisfies SkuOpenChangeDetail)
  }

  // -------------------------------------------------------------------------
  // 数据解析
  // -------------------------------------------------------------------------

  private parseSpecs(): SkuSpecGroup[] {
    const raw = parseJsonArray<unknown>(this.getAttr('specs'), () =>
      devWarn('[oas-sku] specs 不是合法 JSON 数组，已忽略'),
    )
    return normalizeGroups(raw)
  }

  private parseSkus(): SkuItem[] {
    const raw = parseJsonArray<unknown>(this.getAttr('skus'), () =>
      devWarn('[oas-sku] skus 不是合法 JSON 数组，已忽略'),
    )
    return normalizeSkus(raw)
  }

  /** value 解析：JSON 对象；只保留 specs 中存在的键与值 */
  private parseValue(groups: SkuSpecGroup[]): Record<string, string> {
    const out: Record<string, string> = {}
    const raw = this.getAttr('value').trim()
    if (raw === '') return out
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return out
      for (const group of groups) {
        const candidate = (parsed as Record<string, unknown>)[group.key]
        if (typeof candidate === 'string' && group.values.some((v) => v.value === candidate)) {
          out[group.key] = candidate
        }
      }
    } catch {
      // 非法 JSON：按未选择处理（不告警——受控值可能短暂处于空态）
    }
    return out
  }

  /** 选项可用性：沿该选项能否走到一个「其余已选规格都吻合」的在库组合 */
  private isAvailable(groups: SkuSpecGroup[], skus: SkuItem[], groupKey: string, optionValue: string): boolean {
    if (skus.length === 0) return true
    const inStock = skus.filter((sku) => (sku.stock ?? 0) > 0)
    if (inStock.length === 0) return false
    return inStock.some((sku) => {
      if (sku.specs[groupKey] !== optionValue) return false
      return groups.every((group) => {
        if (group.key === groupKey) return true
        const chosen = this.selected[group.key]
        return !chosen || sku.specs[group.key] === chosen
      })
    })
  }

  /** 精确匹配当前完整组合的 sku（未全选返回 null） */
  private matchedSku(groups: SkuSpecGroup[], skus: SkuItem[]): SkuItem | null {
    if (groups.some((group) => !this.selected[group.key])) return null
    return skus.find((sku) => groups.every((group) => sku.specs[group.key] === this.selected[group.key])) ?? null
  }

  private disabledState(): boolean {
    if (this.hasAttr('disabled')) return true
    return this.injectDisabled()
  }

  /** locale 归一：属性 → 文档 `<html lang>` → `zh-CN`（非法 BCP47 回落默认） */
  private resolveLocale(): string {
    const raw = (this.getAttr('locale') || document.documentElement.lang || '').trim()
    if (raw === '') return 'zh-CN'
    try {
      return new Intl.NumberFormat(raw).resolvedOptions().locale
    } catch {
      return 'zh-CN'
    }
  }

  private resolvePrecision(): number {
    const raw = this.getAttr('precision').trim()
    if (raw === '') return DEFAULTS.precision
    const n = Number(raw)
    return Number.isInteger(n) && n >= 0 && n <= 20 ? n : DEFAULTS.precision
  }

  /** 数量归一 + 按匹配 sku 库存钳制（库存未知/为 0 时不设上限） */
  private resolveQuantity(stock: number | null): number {
    const raw = Number(this.getAttr('quantity'))
    let qty = Number.isFinite(raw) ? Math.floor(raw) : DEFAULTS.quantity
    if (qty < 1) qty = 1
    if (stock !== null && stock > 0 && qty > stock) qty = stock
    if (stock !== null && stock <= 0) qty = 1
    return qty
  }

  // -------------------------------------------------------------------------
  // 交互
  // -------------------------------------------------------------------------

  private onSpecChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | null
    if (!input || input.type !== 'radio') return
    const key = input.getAttribute('data-group')
    if (!key) return
    this.selected[key] = input.value
    this.commit('spec')
  }

  private onQuantityInput = (): void => {
    this.applyQuantity(Number(this.qtyInputEl?.value))
  }

  private onMinus = (): void => {
    const groups = this.parseSpecs()
    const sku = this.matchedSku(groups, this.parseSkus())
    const current = this.resolveQuantity(sku?.stock ?? null)
    if (current <= 1) return
    this.applyQuantity(current - 1)
  }

  private onPlus = (): void => {
    const groups = this.parseSpecs()
    const sku = this.matchedSku(groups, this.parseSkus())
    const current = this.resolveQuantity(sku?.stock ?? null)
    const stock = sku?.stock ?? null
    if (stock !== null && stock > 0 && current >= stock) return
    this.applyQuantity(current + 1)
  }

  /** 数量提交：钳制到 [1, 库存] → 回写属性 → 同步 DOM → 派发事件 */
  private applyQuantity(raw: number): void {
    const groups = this.parseSpecs()
    const skus = this.parseSkus()
    const sku = this.matchedSku(groups, skus)
    let qty = Number.isFinite(raw) ? Math.floor(raw) : DEFAULTS.quantity
    if (qty < 1) qty = 1
    if (sku?.stock != null && sku.stock > 0 && qty > sku.stock) qty = sku.stock
    if (sku?.stock != null && sku.stock <= 0) qty = 1
    this.setQuantity(qty)
    this.update()
    this.emit('change', {
      value: { ...this.selected },
      quantity: qty,
      sku,
      change: 'quantity',
    } satisfies SkuChangeDetail)
  }

  /** 回写属性（抑制 update 中的重复解析）并派发事件 */
  private commit(change: 'spec' | 'quantity'): void {
    const groups = this.parseSpecs()
    const skus = this.parseSkus()
    const sku = this.matchedSku(groups, skus)
    const quantity = this.resolveQuantity(sku?.stock ?? null)
    this.writingValue = true
    this.setAttribute('value', JSON.stringify(this.selected))
    this.setAttribute('quantity', String(quantity))
    this.writingValue = false
    this.update()
    this.emit('change', {
      value: { ...this.selected },
      quantity,
      sku,
      change,
    } satisfies SkuChangeDetail)
  }

  private setQuantity(qty: number): void {
    this.writingValue = true
    this.setAttribute('quantity', String(qty))
    this.writingValue = false
  }

  // -------------------------------------------------------------------------
  // 渲染
  // -------------------------------------------------------------------------

  private buildGroups(groups: SkuSpecGroup[], skus: SkuItem[]): void {
    if (!this.groupsEl) return
    this.instanceId = `oas-sku-${stableHash36(this.getAttr('specs') + '\u0000' + this.getAttr('skus'))}`
    const nodes: HTMLElement[] = []
    for (const group of groups) {
      const fieldset = document.createElement('fieldset')
      fieldset.className = 'group'
      fieldset.setAttribute('part', 'group')
      fieldset.setAttribute('data-group', group.key)
      const legend = document.createElement('legend')
      legend.className = 'group-label'
      legend.setAttribute('part', 'group-label')
      legend.textContent = group.label
      const options = document.createElement('div')
      options.className = 'options'
      options.setAttribute('part', 'options')
      for (const option of group.values) {
        options.appendChild(this.buildOption(groups, group, option, skus))
      }
      fieldset.append(legend, options)
      nodes.push(fieldset)
    }
    this.groupsEl.replaceChildren(...nodes)
  }

  private buildOption(groups: SkuSpecGroup[], group: SkuSpecGroup, option: SkuSpecValue, skus: SkuItem[]): HTMLElement {
    const available = this.isAvailable(groups, skus, group.key, option.value)
    const label = document.createElement('label')
    label.className = 'option'
    label.setAttribute('part', 'option')
    label.setAttribute('data-group', group.key)
    label.setAttribute('data-value', option.value)
    label.setAttribute('data-available', String(available))
    const checked = this.selected[group.key] === option.value
    label.setAttribute('data-checked', String(checked))

    const input = document.createElement('input')
    input.type = 'radio'
    input.className = 'option-input'
    input.name = `${this.instanceId}-${group.key}`
    input.value = option.value
    input.setAttribute('data-group', group.key)
    input.checked = checked
    input.disabled = this.disabledState() || !available

    const text = document.createElement('span')
    text.className = 'option-text'
    text.setAttribute('part', 'option-text')
    text.textContent = option.label

    const out = document.createElement('span')
    out.className = 'out'
    out.setAttribute('part', 'option-sold-out')
    out.textContent = available ? '' : this.t('sku.soldOut')
    out.hidden = available

    label.append(input, text, out)
    return label
  }

  /**
   * 结构未变时的轻量同步：选中态 / 可用性 / 缺货标记 / disabled。
   *
   * 规格值来自宿主数据，可能含引号（如 `6"`）或其它 CSS 选择器元字符——因此**不用**
   * 拼接 `querySelector` 选择器（曾抛 DOMException 打崩组件），改为遍历已建子节点按
   * `dataset` 比对：既无注入面，也不依赖 CSS.escape 的可选性。
   */
  private syncGroups(groups: SkuSpecGroup[], skus: SkuItem[]): void {
    if (!this.groupsEl) return
    const disabled = this.disabledState()
    const fieldsets = [...this.groupsEl.querySelectorAll<HTMLElement>('fieldset[data-group]')]
    for (const group of groups) {
      const fieldset = fieldsets.find((node) => node.getAttribute('data-group') === group.key)
      if (!fieldset) continue
      const labels = [...fieldset.querySelectorAll<HTMLElement>('label[part="option"]')]
      for (const option of group.values) {
        const label = labels.find((node) => node.getAttribute('data-value') === option.value)
        if (!label) continue
        const available = this.isAvailable(groups, skus, group.key, option.value)
        const checked = this.selected[group.key] === option.value
        label.setAttribute('data-available', String(available))
        label.setAttribute('data-checked', String(checked))
        const input = label.querySelector<HTMLInputElement>('input')
        if (input) {
          input.checked = checked
          input.disabled = disabled || !available
        }
        const out = label.querySelector<HTMLElement>('[part="option-sold-out"]')
        if (out) {
          out.hidden = available
          out.textContent = available ? '' : this.t('sku.soldOut')
        }
      }
    }
  }

  private syncSummary(groups: SkuSpecGroup[], skus: SkuItem[], locale: string, precision: number): SkuItem | null {
    const matched = this.matchedSku(groups, skus)
    const currency = this.getAttr('currency', 'CNY').trim().toUpperCase() || 'CNY'
    if (this.priceEl) {
      const show = matched !== null && matched.price !== null
      this.priceEl.hidden = !show
      if (show) {
        this.priceEl.setAttribute('value', String(matched.price))
        this.priceEl.setAttribute('currency', currency)
        this.priceEl.setAttribute('locale', locale)
        this.priceEl.setAttribute('precision', String(precision))
      }
    }
    if (this.soldOutEl) {
      const soldOut = matched !== null && (matched.stock ?? 0) <= 0
      this.soldOutEl.hidden = !soldOut
      this.soldOutEl.textContent = this.t('sku.soldOut')
    }
    if (this.mediaEl && this.thumbEl) {
      const url = matched?.image ? safeUrl(matched.image) : ''
      this.mediaEl.hidden = url === ''
      if (url !== '') {
        this.thumbEl.setAttribute('src', url)
        this.thumbEl.setAttribute('alt', matched?.imageAlt ?? '')
      } else {
        this.thumbEl.removeAttribute('src')
        this.thumbEl.setAttribute('alt', '')
      }
    }
    return matched
  }

  private syncQuantity(matched: SkuItem | null): void {
    const disabled = this.disabledState()
    const soldOut = matched !== null && (matched.stock ?? 0) <= 0
    const quantity = this.resolveQuantity(matched?.stock ?? null)
    if (this.qtyInputEl) {
      this.qtyInputEl.value = String(quantity)
      this.qtyInputEl.disabled = disabled || soldOut
      if (matched?.stock != null && matched.stock > 0) this.qtyInputEl.setAttribute('max', String(matched.stock))
      else this.qtyInputEl.removeAttribute('max')
      this.qtyInputEl.setAttribute('aria-labelledby', this.qtyLabelEl?.id ?? '')
    }
    if (this.minusEl) this.minusEl.disabled = disabled || soldOut || quantity <= 1
    if (this.plusEl) {
      const atMax = matched?.stock != null && matched.stock > 0 && quantity >= matched.stock
      this.plusEl.disabled = disabled || soldOut || atMax
    }
  }

  protected override update(): void {
    const groups = this.parseSpecs()
    const skus = this.parseSkus()
    this.syncLayout()
    if (this.qtyLabelEl) {
      this.qtyLabelEl.textContent = this.t('sku.quantityLabel')
      if (!this.qtyLabelEl.id)
        this.qtyLabelEl.id = `oas-sku-qty-${stableHash36(this.getAttr('specs') + this.getAttr('skus'))}`
    }
    if (this.minusEl) this.minusEl.setAttribute('aria-label', this.t('sku.decrease'))
    if (this.plusEl) this.plusEl.setAttribute('aria-label', this.t('sku.increase'))

    // 无规格：不渲染面板（part 一并移除，宿主为空骨架）
    if (groups.length === 0) {
      this.panelEl?.removeAttribute('part')
      this.panelEl?.setAttribute('hidden', '')
      return
    }
    this.panelEl?.setAttribute('part', 'panel')
    this.panelEl?.removeAttribute('hidden')

    // 选中组合：程序性写入时以属性为真源；交互提交后 selected 已是真源（属性同值）
    if (!this.writingValue) this.selected = this.parseValue(groups)

    const structureKey = `${this.getAttr('specs')}\u0000${this.getAttr('skus')}`
    if (structureKey !== this.lastStructureKey) {
      this.lastStructureKey = structureKey
      this.buildGroups(groups, skus)
    } else {
      this.syncGroups(groups, skus)
    }

    const locale = this.resolveLocale()
    const precision = this.resolvePrecision()
    const matched = this.syncSummary(groups, skus, locale, precision)
    this.syncQuantity(matched)
  }
}
