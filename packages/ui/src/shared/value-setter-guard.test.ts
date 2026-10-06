import { describe, it, expect, afterEach } from 'vitest'
import '../form/auto-complete/index.js'
import '../form/cascader/index.js'
import '../form/checkbox/index.js'
import '../form/combobox/index.js'
import '../form/date-picker/index.js'
import '../form/dynamic-input/index.js'
import '../form/dynamic-tags/index.js'
import '../form/editable/index.js'
import '../form/input/index.js'
import '../form/input-number/index.js'
import '../form/mentions/index.js'
import '../form/picker/index.js'
import '../form/pin-input/index.js'
import '../form/radio/index.js'
import '../form/rate/index.js'
import '../form/segmented/index.js'
import '../form/select/index.js'
import '../form/slider/index.js'
import '../form/swatch/index.js'
import '../form/switch/index.js'
import '../form/textarea/index.js'
import '../form/time-picker/index.js'
import '../form/toggle-button/index.js'
import '../form/transfer/index.js'
import '../form/tree-select/index.js'
import '../form/upload/index.js'

/**
 * value setter 未连接守卫普查（React 19 属性先写时序）。
 *
 * React 19 宿主会在元素已升级、未连接（render() 未跑）时设置 property。
 * setter 若直调 update()，渲染路径读未渲染内部件会抛 TypeError 中断宿主整树
 * （oas-color-picker 实抓：syncControls 的 .r/.g/.b 非空断言）。
 * 正确语义：属性写入保留、update() 走 hasRendered 守卫（与基类
 * attributeChangedCallback 的 !hasRendered 早退同语义），首渲染自然读新值。
 *
 * 本套件对每个带 value setter 的组件实证：未连接 set value 不抛错、
 * 连接后正常渲染——既是普查也是回归锁（新增 value setter 组件照此入列）。
 * 「属性已写 + 首渲染读新值」由 oas-color-picker 专门用例与基类机制覆盖
 * （各组件空值/JSON 值的写回口径不同，不在此断言）。
 */

/** [tag, 探针值]：探针值取各组件语义合法值（守卫契约只管渲染时序，不管值归一化语义——
 *  各组件对空值/JSON 值的写回口径不同，由各自组件测试覆盖） */
const CASES: Array<[string, unknown]> = [
  ['oas-auto-complete', 'x'],
  ['oas-cascader', []],
  ['oas-checkbox', 'on'],
  ['oas-checkbox-group', '[]'],
  ['oas-combobox', 'x'],
  ['oas-date-picker', '2026-01-01'],
  ['oas-dynamic-input', '[]'],
  ['oas-dynamic-tags', '[]'],
  ['oas-editable', 'x'],
  ['oas-input', 'x'],
  ['oas-input-number', '1'],
  ['oas-mentions', 'x'],
  ['oas-picker', '[]'],
  ['oas-pin-input', '1'],
  ['oas-radio', 'on'],
  ['oas-rate', '3'],
  ['oas-segmented', 'a'],
  ['oas-select', ''],
  ['oas-slider', '50'],
  ['oas-swatch', '#ff0000'],
  ['oas-swatch-group', '#ff0000'],
  ['oas-switch', 'on'],
  ['oas-textarea', 'x'],
  ['oas-time-picker', '08:00'],
  ['oas-toggle-button', 'a'],
  ['oas-toggle-group', 'a'],
  ['oas-transfer', '[]'],
  ['oas-tree-select', ''],
  ['oas-upload', '[]'],
]

describe('value setter 未连接守卫（React 19 属性先写时序）', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  for (const [tag, probe] of CASES) {
    it(`${tag}：未连接 set value 不抛错，连接后正常渲染`, () => {
      const el = document.createElement(tag) as HTMLElement & { value: unknown }
      expect(() => {
        el.value = probe
      }, `${tag} 未连接 set value 抛错——setter 需 hasRendered 守卫`).not.toThrow()
      expect(() => {
        document.body.appendChild(el)
      }, `${tag} 连接后渲染抛错`).not.toThrow()
      el.remove()
    })
  }
})
