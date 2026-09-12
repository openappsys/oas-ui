// 约定守卫（防复发）：测试与脚本里禁止硬编码绝对路径——不可跨操作系统。
// 教训：qa-regression 9 处调试截图写死了某台机器 C 盘 Temp 目录下的 png 路径，
// 该目录本机恰好存在故本地侥幸通过，Linux/macOS CI 必 ENOENT 挂；且属无人消费的调试残留。
// 正路：相对路径、`import.meta.dirname`、`os.tmpdir()`、`test.info().outputPath()`。
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
