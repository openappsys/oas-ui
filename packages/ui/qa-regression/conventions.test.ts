// 约定守卫（防复发）：测试与脚本里禁止硬编码绝对路径——不可跨操作系统。
// 教训：qa-regression 9 处调试截图曾写死某台机器 C 盘 Temp 目录下的 png 路径，
// 该目录本机恰好存在故本地侥幸通过，Linux/macOS CI 必 ENOENT 挂。
// 正路：相对路径、`import.meta.dirname`、`os.tmpdir()`、playwright 的 `test.info().outputPath()`。
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..', '..', '..')
const SELF = __filename

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

// 只认「引号/反引号引导的绝对路径」，避免 https:// 与 data:image/ 之类误伤
const PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /['"`][A-Za-z]:[\\/]/, why: 'Windows 盘符绝对路径' },
  { re: /['"`]\/Users\/[A-Za-z]/, why: 'macOS 用户目录绝对路径' },
  { re: /['"`]\/home\/[a-z]/, why: 'Linux 用户目录绝对路径' },
]

describe('约定守卫：测试/脚本禁硬编码绝对路径（跨 OS）', () => {
  it('packages 下 spec/test 与 scripts 无硬编码绝对路径', () => {
    const files = [
      ...walk(join(ROOT, 'packages')).filter((f) => /\.(spec|test)\.ts$/.test(f)),
      ...walk(join(ROOT, 'scripts')).filter((f) => /\.m?js$/.test(f)),
    ].filter((f) => f !== SELF)
    const bad: string[] = []
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const p of PATTERNS) {
            if (p.re.test(line)) bad.push(`${f.replace(ROOT + '/', '')}:${i + 1}（${p.why}）`)
          }
        })
    }
    expect(bad, '禁止硬编码绝对路径：用相对路径 / import.meta.dirname / os.tmpdir()').toEqual([])
  })
})

// ---------- RTL 约定守卫：物理方向 CSS 白名单化 ----------
// 全库组件 CSS 应写逻辑属性（padding-inline-start 等，自动跟随书写方向）或 data-rtl 镜像。
// 物理方向属性仅允许「方向即语义」的既定场景（白名单如下）；白名单外新增一律红灯。
// 已知合法场景：
// 1. 浮层箭头/图形绘制——placement 基向 border 画气泡尖角、旋转菱形、steps 箭头连接符
//    （组件消费 shared/direction，JS 按 RTL 选物理侧，placement 枚举本身是物理 API）
// 2. 物理命名 API——table 固定列 fixed-left/right、td.align-*、form-item label-align（有 data-rtl 钉回）
// 3. 内容 LTR 锁定——代码块 / color-picker hex 色值（direction:ltr + text-align:left + isolate）
// 4. 成对对称物理属性（视觉不随方向变化）
const RTL_ALLOW: Array<{ file: RegExp; line: RegExp; why: string }> = [
  {
    file: /feedback[\\/](popover|popconfirm)/,
    line: /^border-(left|right): 1px solid var\(--pop-border\);$/,
    why: 'placement 基向箭头',
  },
  {
    file: /feedback[\\/](popover|tooltip|hover-card)/,
    line: /^border-(left|right): 1px solid var\(--oas-color-border\);$/,
    why: 'placement 基向箭头描边',
  },
  {
    file: /feedback[\\/](popover|tooltip|hover-card)/,
    line: /^border-(top|bottom)-(left|right)-radius: (0|var\(--oas-radius-md\));$/,
    why: 'placement 基向圆角',
  },
  {
    file: /feedback[\\/]snackbar/,
    line: /^border-bottom-(left|right)-radius: var\(--oas-radius-md\);$/,
    why: '成对对称圆角',
  },
  {
    file: /navigation[\\/]tabs/,
    line: /^border-(left|right): (1px solid var\(--oas-color-border\)|none);$/,
    why: 'placement 变体（标签栏停靠侧）',
  },
  { file: /navigation[\\/]tabs/, line: /^margin-(left|right): 0;$/, why: 'placement 变体' },
  { file: /navigation[\\/]tabs/, line: /^padding-(left|right): var\(--oas-space-4\);$/, why: 'placement 变体' },
  {
    file: /navigation[\\/]menubar/,
    line: /^border-(left|right): 1px solid var\(--oas-color-border\);$/,
    why: '旋转箭头菱形绘制',
  },
  { file: /navigation[\\/]menubar/, line: /^margin-left: -5px;$/, why: '箭头绘制对位' },
  {
    file: /navigation[\\/]navigation-menu/,
    line: /^border-(left|right): (1px solid var\(--oas-color-border\)|none);$/,
    why: '面板箭头绘制',
  },
  { file: /navigation[\\/]steps/, line: /^border-(left|right): .+$/, why: 'arrow 形态连接符绘制' },
  {
    file: /navigation[\\/]dropdown/,
    line: /^border-(left|right): 1px solid var\(--oas-color-border\);$/,
    why: 'placement 基向气泡描边',
  },
  {
    file: /data[\\/]table/,
    line: /^border-right: (1px solid var\(--oas-color-border\)|none);$/,
    why: '固定列 fixed-left/right 物理 API',
  },
  { file: /data[\\/]table/, line: /^td\.align-right \{ text-align: right; \}$/, why: 'align 显式对齐 API' },
  { file: /form[\\/]form-item/, line: /^text-align: right;$/, why: 'label-align 物理 API（data-rtl 钉回）' },
  { file: /form[\\/]color-picker/, line: /^text-align: left;$/, why: 'hex 色值内容 LTR 锁定' },
]

describe('RTL 约定守卫（物理方向 CSS 白名单化）', () => {
  it('packages/ui 源码无白名单外的物理方向 CSS（新代码走逻辑属性或 data-rtl 镜像）', () => {
    const files = walk(join(ROOT, 'packages', 'ui', 'src')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    const PATS: Array<[RegExp, string]> = [
      [/\b(padding|margin)-(left|right)\s*:/, '物理 padding/margin'],
      [/\bborder-(left|right)\s*:/, '物理 border'],
      [/text-align:\s*(left|right)\b/, '物理 text-align'],
      [/border-(top|bottom)-(left|right)-radius\s*:/, '物理圆角'],
    ]
    const bad: string[] = []
    for (const f of files) {
      const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/')
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const trimmed = line.trim()
          for (const [re, label] of PATS) {
            if (!re.test(trimmed)) continue
            const ok = RTL_ALLOW.some((a) => a.file.test(rel) && a.line.test(trimmed))
            if (!ok) bad.push(`${rel}:${i + 1}（${label}）${trimmed.slice(0, 90)}`)
          }
        })
    }
    expect(
      bad,
      '物理方向 CSS 需改逻辑属性（padding-inline-start / text-align: start 等）或 data-rtl 镜像；如属「方向即语义」场景，请补入 RTL_ALLOW 白名单并注明理由',
    ).toEqual([])
  })
})
