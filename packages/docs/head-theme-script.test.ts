import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// head guide 的 system 主题首屏引导在四份文档重复出现（中/英 × theming/SSR）。
// 单边改动会让其中一种语言悄悄失去修正（历史缺陷：provider 从 system 切 light/dark 后
// root 滞留旧主题）。此处规范化后比较四份脚本，只允许注释/空白差异（注释按页面语言本地化）。

const DOCS_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'docs')
const FILES = ['guide/theming.md', 'en/guide/theming.md', 'guide/ssr.md', 'en/guide/ssr.md'] as const

/** 取首个裸 `<script>` 块（忽略 `<script src=...>` 外链块） */
function headScript(file: string): string {
  const source = readFileSync(join(DOCS_ROOT, file), 'utf8')
  const match = source.match(/<script>\s*([\s\S]*?)<\/script>/)
  if (!match?.[1]) throw new Error(`${file} 缺少 system 主题 head 引导脚本`)
  return match[1]
}

/** 去掉行注释与空白差异后的代码指纹；保留全部可执行语句 */
function normalize(script: string): string {
  return script
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

describe('system 主题 head 引导（四份文档）', () => {
  const scripts = FILES.map((file) => ({ file, raw: headScript(file), normalized: normalize(headScript(file)) }))

  it('规范化后四份脚本完全一致（注释/空白之外零漂移）', () => {
    const reference = scripts[0]!
    for (const script of scripts.slice(1)) {
      expect(script.normalized, `${script.file} 与 ${reference.file} 的 head 脚本不一致`).toBe(reference.normalized)
    }
  })

  it('四份脚本均可被 JS 解析（防注释/引号手改引入语法错误）', () => {
    for (const script of scripts) {
      expect(() => new Function(script.raw), `${script.file} 脚本语法错误`).not.toThrow()
    }
  })

  it('每份脚本都保留 system 契约与离开 system 的 root 交接', () => {
    for (const script of scripts) {
      expect(script.normalized, `${script.file} key 契约`).toContain("const key = 'oas-app-theme'")
      expect(script.normalized, `${script.file} 只读 provider`).toContain('const matchesProvider')
      expect(script.normalized, `${script.file} 交接后的显式主题仍需跟随`).toContain(
        "record.oldValue === 'system' || handedOver.has(el)",
      )
      expect(script.normalized, `${script.file} 需要 oldValue 才能识别离开 system`).toContain('attributeOldValue: true')
      expect(script.normalized, `${script.file} root 写入前比较现值`).toContain(
        'document.documentElement.dataset.theme !== theme',
      )
      expect(script.normalized, `${script.file} 交接 provider 是 root 唯一权威`).toContain('const handedOverOwner')
      expect(script.normalized, `${script.file} 断开即交还 MQL`).toContain('el.isConnected')
      expect(script.normalized, `${script.file} MQL/storage 不得抢回 root`).toContain(
        'syncRoot(owner ? owner.dataset.theme : theme)',
      )
      expect(script.normalized, `${script.file} 不写 storage`).not.toMatch(/localStorage\.setItem/)
    }
  })
})
