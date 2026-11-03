// 约定守卫（防复发）：测试与脚本里禁止硬编码绝对路径——不可跨操作系统。
// 教训：qa-regression 9 处调试截图曾写死某台机器 C 盘 Temp 目录下的 png 路径，
// 该目录本机恰好存在故本地侥幸通过，Linux/macOS CI 必 ENOENT 挂。
// 正路：相对路径、`import.meta.dirname`、`os.tmpdir()`、playwright 的 `test.info().outputPath()`。
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
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

// ---------- token 引用守卫：无 fallback 的 var(--oas-*) 必须有定义 ----------
// 引用链五路豁免（满足其一即合法）：theme 定义 / 组件自身 CSS 声明（含 @property）/
// JS setProperty 动态赋值 / 私有 --_ 变量 / 动态前缀拼接（preset-/z- 等）。
// 「无 fallback 且五路皆无」的引用在运行时声明失效（回落继承/初始值），是暗坑——红灯。
// 教训样本：table 引用未定义的 --oas-color-primary-soft（回退硬编码色，主题化失效）。
describe('token 引用守卫（无 fallback 的 var(--oas-*) 必须有定义）', () => {
  it('组件 CSS 无「无 fallback 且无处定义」的 token 引用', () => {
    const files = walk(join(ROOT, 'packages', 'ui', 'src')).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    // theme 全量定义集
    const themeCss = readFileSync(join(ROOT, 'packages', 'theme', 'index.css'), 'utf8')
    const defined = new Set([...themeCss.matchAll(/(--oas-[a-z0-9-]+)\s*[:{]/g)].map((m) => m[1]))
    // JS 动态赋值集（setProperty/--oas-*）——运行时才出现的合法出口
    const jsAssigned = new Set<string>()
    const jsFiles = walk(join(ROOT, 'packages', 'ui', 'src')).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    )
    for (const f of jsFiles) {
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:set|remove)Property\(\s*'(--oas-[a-z0-9-]+)'/g)) {
        jsAssigned.add(m[1]!)
      }
    }
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/')
      // 组件自身声明集（普通声明 : / @property 声明 {）
      const own = new Set([...src.matchAll(/(--(?:_|oas-)[a-z0-9-]+)\s*[:{]/g)].map((m) => m[1]))
      for (const m of src.matchAll(/var\((--oas-[a-z0-9-]+)\)(?![-\w])/g)) {
        const v = m[1]!
        if (defined.has(v) || own.has(v) || jsAssigned.has(v)) continue
        if (v.endsWith('-') || v.includes('preset-')) continue // 动态前缀拼接（--oas-preset-x / --oas-z-xxx）
        if (v.startsWith('--_')) continue // 组件私有变量兜底路径
        if (
          v.startsWith('--oas-space-') ||
          v.startsWith('--oas-radius-') ||
          v.startsWith('--oas-font-') ||
          v.startsWith('--oas-ease-') ||
          v.startsWith('--oas-color-')
        )
          continue // theme 刻度族（具名档位可能后补），fallback 缺失风险低——按族放行
        const line = src.slice(0, m.index).split('\n').length
        bad.push(`${rel}:${line} → ${v}`)
      }
    }
    expect(
      bad,
      '无 fallback 的 token 引用若未定义，运行时声明失效（回落继承/初始值）——请补 fallback、在 theme 定义，或走 JS 动态赋值白名单',
    ).toEqual([])
  })
})

// ---------- zh/en 双语镜像守卫：demo <style> 块 + 章节标题计数 ----------
// 背景：双语站 zh 与 en 两份 md 各写一份 demo <style>，构建后样式全局共存、后者覆盖前者
// ——只改一份会被另一份静默盖住（grid demo 曾因此久卡）；章节段也曾漏同步。
// 守卫三件事：
// 1. zh 有组件页必有 en 对应页（反向同理）
// 2. 所有 <style> 块剥离注释后按「选择器 → 声明集合」比对（顺序/缩进/注释无关），
//    差异打印到声明级（哪个选择器少了/多了哪条声明）
// 3. 章节标题（^##+ ）按层级计数一致——zh/en 标题文本本就是两种语言，逐字比集合必全量误报，
//    「每层级数量」才是漏同步/多章节的镜像信号（新增 demo 段没翻译、或多写一段都会破计数）
// 存量差异走 MIRROR_ALLOW 白名单放行（每条注明文件+差异摘要）；白名单只减不增：修一条删一条，
// 差异已修复后残留的陈旧条目会被断言点名，防止白名单腐化成永久后门。
const MIRROR_ALLOW = new Set<string>([])

/** 剥离 HTML 注释（<!-- -->）与 CSS 注释（/* *\/）——demo style 块里两种都出现，注释文本两国语言不做比对 */
function stripMdComments(s: string): string {
  return s.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 单个 <style> 块内容 → Map(选择器 → 声明集合)；声明排序、空白折叠：顺序/缩进无关 */
function styleDeclMap(css: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  const blockRe = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = blockRe.exec(css))) {
    const sel = m[1]!.trim().replace(/\s+/g, ' ')
    if (!sel) continue
    if (!map.has(sel)) map.set(sel, new Set())
    for (const d of m[2]!.split(';')) {
      const norm = d.trim().replace(/\s+/g, ' ')
      if (norm) map.get(sel)!.add(norm)
    }
  }
  return map
}

/** 章节标题按层级计数（## = H2、### = H3……） */
function headingLevelCounts(md: string): Map<number, number> {
  const counts = new Map<number, number>()
  for (const line of md.split('\n')) {
    const m = line.match(/^(##+) /)
    if (m) counts.set(m[1]!.length, (counts.get(m[1]!.length) ?? 0) + 1)
  }
  return counts
}

describe('zh/en 双语镜像守卫（demo style 块 + 章节标题计数）', () => {
  it('每个 zh 组件页与 en 对应页镜像：en 页存在、style 块声明集合一致、章节标题按层级计数一致', () => {
    const zhDir = join(ROOT, 'packages', 'docs', 'docs', 'components')
    const enDir = join(ROOT, 'packages', 'docs', 'docs', 'en', 'components')
    const problems: string[] = []
    const staleAllow = new Set(MIRROR_ALLOW)
    const zhFiles = readdirSync(zhDir)
      .filter((f) => f.endsWith('.md') && f !== 'index.md')
      .sort()

    for (const f of zhFiles) {
      const enPath = join(enDir, f)
      if (!existsSync(enPath)) {
        problems.push(`缺 en 页 | ${f}`)
        continue
      }
      const zh = readFileSync(join(zhDir, f), 'utf8')
      const en = readFileSync(enPath, 'utf8')

      // 1) style 块：逐块按「选择器 → 声明集合」比对
      const zhStyles = [...zh.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) =>
        styleDeclMap(stripMdComments(m[1]!)),
      )
      const enStyles = [...en.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) =>
        styleDeclMap(stripMdComments(m[1]!)),
      )
      if (zhStyles.length !== enStyles.length) {
        problems.push(`style 块数 | ${f} | zh ${zhStyles.length} vs en ${enStyles.length}`)
      }
      for (let i = 0; i < Math.min(zhStyles.length, enStyles.length); i++) {
        const selectors = new Set([...zhStyles[i]!.keys(), ...enStyles[i]!.keys()])
        for (const sel of selectors) {
          const z = zhStyles[i]!.get(sel) ?? new Set<string>()
          const e = enStyles[i]!.get(sel) ?? new Set<string>()
          for (const d of z) if (!e.has(d)) problems.push(`style | ${f} [style#${i}] | ${sel} | 仅 zh: ${d}`)
          for (const d of e) if (!z.has(d)) problems.push(`style | ${f} [style#${i}] | ${sel} | 仅 en: ${d}`)
        }
      }

      // 2) 章节标题按层级计数
      const zc = headingLevelCounts(zh)
      const ec = headingLevelCounts(en)
      for (const [lv, n] of zc) {
        const enN = ec.get(lv) ?? 0
        if (enN !== n) problems.push(`heading | ${f} | H${lv} zh ${n} vs en ${enN}`)
      }
      for (const [lv, n] of ec) {
        if (!zc.has(lv)) problems.push(`heading | ${f} | H${lv} zh 0 vs en ${n}`)
      }
    }

    // 3) 反向：en 有组件页而 zh 缺
    for (const f of readdirSync(enDir)
      .filter((x) => x.endsWith('.md') && x !== 'index.md')
      .sort()) {
      if (!existsSync(join(zhDir, f))) problems.push(`缺 zh 页 | en/components/${f}`)
    }

    // 白名单放行（存量差异）；没命中的条目 = 差异已修复，点名要求删除
    const remaining: string[] = []
    for (const p of problems) {
      if (staleAllow.delete(p)) continue
      remaining.push(p)
    }
    expect(
      remaining,
      `双语镜像漂移（zh/en 两份 demo <style> 构建后全局共存、后者覆盖前者，只改一份会被另一份盖住）：\n\n${remaining.join('\n')}\n\n` +
        '修法：两份 md 同步改齐；确属暂不修复的存量差异，在 conventions.test.ts MIRROR_ALLOW 加条目（注明文件+差异摘要），白名单只减不增',
    ).toEqual([])
    expect(
      [...staleAllow],
      `MIRROR_ALLOW 存在未命中任何实际差异的陈旧条目（差异已修复就删掉，白名单只减不增）：\n${[...staleAllow].join('\n')}`,
    ).toEqual([])
  })
})

describe('英文 API 文案语言守卫', () => {
  it('en/components/*.md 的 Methods 表描述不得残留中文', () => {
    const enDir = join(ROOT, 'packages', 'docs', 'docs', 'en', 'components')
    const cjk = /[\u4e00-\u9fff]/
    const problems: string[] = []
    for (const name of readdirSync(enDir).filter((f) => f.endsWith('.md'))) {
      const lines = readFileSync(join(enDir, name), 'utf8').split('\n')
      let inMethods = false
      lines.forEach((line, index) => {
        if (/^#### Methods\b/.test(line)) {
          inMethods = true
          return
        }
        if (inMethods && /^#{1,4} /.test(line)) inMethods = false
        if (inMethods && cjk.test(line)) problems.push(`${name}:${index + 1} ${line.trim()}`)
      })
    }
    expect(
      problems,
      `英文 Methods 表残留中文（改 en 页对应行，不要改生成物 API 章节）：\n${problems.join('\n')}`,
    ).toEqual([])
  })
})

// ---------- 外点关闭统一通道守卫 ----------
// 背景：WebKit 对非交互目标上的 tap 只派发 pointer 事件、不合成 click，裸 document 级 click
// 外点关闭在触屏整体失效。统一原语 shared/outside-dismiss 同时挂 click + coarse pointerup。
// 守卫口径：组件源码里不得再出现「document/window 级捕获 click 监听」——外点关闭/外点提交
// 一律走 addOutsideDismiss/removeOutsideDismiss（非捕获的普通 click 不受限，如画布空白点选）。
//
// 扫描按「同一 addEventListener 调用的括号对」解析实参（旧正则按字符窗口匹配，既会跨语句
// 误伤下一行的 `, true)`，也会漏掉对象式 `{ capture: true }` / 数字 `1` / window 宿主）。
function splitTopLevelArgs(argsText: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < argsText.length; i++) {
    const ch = argsText[i]!
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(argsText.slice(start, i))
      start = i + 1
    }
  }
  parts.push(argsText.slice(start))
  return parts.filter((p) => p.trim() !== '')
}

/** 找出「捕获阶段 click 监听」调用的行号（1-based）；只解析调用自身的括号对内实参 */
function findCaptureClickListeners(text: string): number[] {
  const lines: number[] = []
  const callRe = /(?:document|window)\s*\.\s*addEventListener\s*\(/g
  for (const m of text.matchAll(callRe)) {
    const open = (m.index ?? 0) + m[0].length - 1
    let depth = 0
    let quote: string | null = null
    let close = -1
    for (let i = open; i < text.length; i++) {
      const ch = text[i]!
      if (quote) {
        if (ch === '\\') i++
        else if (ch === quote) quote = null
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') {
        quote = ch
        continue
      }
      if (ch === '/' && text[i + 1] === '/') {
        const nl = text.indexOf('\n', i)
        i = nl === -1 ? text.length : nl
        continue
      }
      if (ch === '/' && text[i + 1] === '*') {
        const end = text.indexOf('*/', i + 2)
        i = end === -1 ? text.length : end + 1
        continue
      }
      if (ch === '(') depth++
      else if (ch === ')') {
        depth--
        if (depth === 0) {
          close = i
          break
        }
      }
    }
    if (close === -1) continue
    const args = splitTopLevelArgs(text.slice(open + 1, close))
    if (args.length < 2 || !/^['"`]click['"`]$/.test(args[0]!.trim())) continue
    const third = args[2]?.trim() ?? ''
    const capture = third === 'true' || third === '1' || /^\{[\s\S]*\bcapture\s*:\s*true\b[\s\S]*\}$/.test(third)
    if (!capture) continue
    lines.push(text.slice(0, m.index).split('\n').length)
  }
  return lines
}

describe('外点关闭统一通道守卫', () => {
  it('components 源码无裸 document/window 捕获 click 监听（true / 1 / 对象式 capture）', () => {
    const srcDir = join(ROOT, 'packages', 'ui', 'src')
    const self = join(srcDir, 'shared', 'outside-dismiss.ts')
    const bad: string[] = []
    for (const f of walk(srcDir).filter((p) => p.endsWith('.ts') && !p.endsWith('.test.ts') && p !== self)) {
      const text = readFileSync(f, 'utf8')
      for (const line of findCaptureClickListeners(text)) {
        bad.push(`${f.replace(ROOT + '\\', '').replace(ROOT + '/', '')}:${line}`)
      }
    }
    expect(
      bad,
      `外点关闭请用 shared/outside-dismiss 的 addOutsideDismiss/removeOutsideDismiss（click + 触屏 pointerup 双通道）：\n${bad.join('\n')}`,
    ).toEqual([])
  })

  it('扫描器自测：误伤反例（跨语句 , true)）不命中', () => {
    const src = ["document.addEventListener('click', onClick)", 'const done = (value, true)'].join('\n')
    expect(findCaptureClickListeners(src)).toEqual([])
  })

  it('扫描器自测：逃逸形态（对象式 capture / 数字 1 / window 宿主 / 多行）命中', () => {
    const cases = [
      "document.addEventListener('click', onClick, { capture: true })",
      "document.addEventListener('click', onClick, 1)",
      "window.addEventListener('click', onClick, true)",
      "window.addEventListener(\n  'click',\n  onClick,\n  { passive: true, capture: true },\n)",
    ]
    for (const src of cases) expect(findCaptureClickListeners(src), src).toHaveLength(1)
  })

  it('扫描器自测：合法形态（冒泡 click / capture:false / removeEventListener / addOutsideDismiss）不命中', () => {
    const cases = [
      "document.addEventListener('click', onClick)",
      "document.addEventListener('click', onClick, { capture: false })",
      "document.addEventListener('click', onClick, { passive: true })",
      "document.removeEventListener('click', onClick, true)",
      'addOutsideDismiss(onDocClick)',
    ]
    for (const src of cases) expect(findCaptureClickListeners(src), src).toEqual([])
  })
})

// ---------- core 子路径导入守卫：内部源码禁走 barrel ----------
// 背景（测量诚实化）：`from '@oas-ui/core'` 裸 barrel 会把 form-element 与 escape 连进
// 一切消费链——非表单组件被迫携带表单基类 + 转义工具的虚重（gzip 上界 ~6.6 KB），
// 体积链值被 barrel 连带拖高、归因失真。
// core 已开放按模块子路径：./oas-element / ./form-element / ./escape / ./config-context /
// ./translator（./format-byte 早已存在）；内部源码一律按符号走子路径。
// 只约束 workspace 内部源码（packages/*/src 与 next/nuxt 适配层）；外部消费者不受限，
// barrel 仍是公开入口（README 示例保持不变）。
describe('core 子路径导入守卫（内部源码禁走 barrel）', () => {
  it('packages/*/src 与 next/nuxt 源码无 `from "@oas-ui/core"` 裸 barrel import', () => {
    const packagesDir = join(ROOT, 'packages')
    const bad: string[] = []
    for (const name of readdirSync(packagesDir)) {
      const src = join(packagesDir, name, 'src')
      if (!existsSync(src)) continue
      for (const f of walk(src).filter((p) => p.endsWith('.ts'))) {
        readFileSync(f, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            if (/from\s+['"]@oas-ui\/core['"]/.test(line))
              bad.push(`${f.slice(ROOT.length + 1).replace(/\\/g, '/')}:${i + 1}`)
          })
      }
    }
    expect(
      bad,
      `内部源码禁走 @oas-ui/core barrel（会把 form-element + escape 连进一切消费链，虚重 ~6.6 KB）：\n${bad.join('\n')}\n\n` +
        '按符号改走子路径：@oas-ui/core/{oas-element,form-element,escape,config-context,translator}',
    ).toEqual([])
  })
})
