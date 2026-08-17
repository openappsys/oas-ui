import { useEffect, useRef, useState } from 'react'
import { message } from '@oas-ui/ui'
import './shared.css'

type Theme = 'light' | 'dark' | 'high-contrast'

/**
 * React 19 对 custom element 的 on* prop 不会自动绑定 kebab 事件（实测结论）：
 * 例如 onOasSubmit 会被 addEventListener('OasSubmit')（仅去 on 前缀、保留驼峰，事件名大小写敏感），
 * 而组件派发的是 oas-submit，监听不到。因此 kebab 事件名必须 ref + useEffect 手动 addEventListener。
 */
export default function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const [form, setForm] = useState({ name: '', email: '' })
  const [sortInfo, setSortInfo] = useState('')
  const formRef = useRef<HTMLElement | null>(null)
  const tableRef = useRef<HTMLElement | null>(null)

  // 主题挂 html（documentElement）：token 的 [data-theme] 变量定义在 html 上，
  // body 背景与全部组件一起跟随；挂根 div 会导致页面底色不跟随（普通行透明底透出白页，dark 下文字不可见）
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // oas-form 派发 oas-submit（detail.values），React 19 不自动绑定 → 手动监听
  useEffect(() => {
    const el = formRef.current
    if (!el) return
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ values: Record<string, string> }>).detail
      setForm({ name: d.values['name'] ?? '', email: d.values['email'] ?? '' })
    }
    el.addEventListener('oas-submit', handler)
    return () => el.removeEventListener('oas-submit', handler)
  }, [])

  // oas-table 派发 oas-sort-change（detail: { key, order }），同样手动监听
  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; order: string }>).detail
      setSortInfo(`key=${d.key} order=${d.order || '无'}`)
    }
    el.addEventListener('oas-sort-change', handler)
    return () => el.removeEventListener('oas-sort-change', handler)
  }, [])

  // oas-button 在 oas-form 的 shadow DOM 外，点击不触发跨 shadow 的原生 submit 语义；
  // 显式调 oas-form 内部 form 的 requestSubmit()（与文档站 demo 同一接法）
  const submitForm = () => {
    formRef.current?.shadowRoot?.querySelector('form')?.requestSubmit()
  }

  return (
    <div>
      <h1>React Playground</h1>

      <div className="demo-block">
        <h3>主题切换</h3>
        <div className="switch-row">
          <oas-button
            size="small"
            onClick={() => setTheme('light')}
            type={theme === 'light' ? 'primary' : 'default'}
          >
            Light
          </oas-button>
          <oas-button
            size="small"
            onClick={() => setTheme('dark')}
            type={theme === 'dark' ? 'primary' : 'default'}
          >
            Dark
          </oas-button>
          <oas-button
            size="small"
            onClick={() => setTheme('high-contrast')}
            type={theme === 'high-contrast' ? 'primary' : 'default'}
          >
            高对比
          </oas-button>
        </div>
      </div>

      <div className="demo-block">
        <h3>表单（oas-submit 桥接）</h3>
        <oas-form ref={formRef}>
          <oas-form-item label="姓名" name="name" required>
            <oas-input name="name" placeholder="请输入姓名" required></oas-input>
          </oas-form-item>
          <oas-form-item label="邮箱" name="email" required>
            <oas-input name="email" placeholder="请输入邮箱" required></oas-input>
          </oas-form-item>
          <oas-button type="primary" size="small" onClick={submitForm}>
            提交
          </oas-button>
        </oas-form>
        {form.name && (
          <p>
            已提交：{form.name} / {form.email}
          </p>
        )}
      </div>

      <div className="demo-block">
        <h3>表格（attribute 通道 + sort-change 桥接）</h3>
        <oas-table
          ref={tableRef}
          columns='[{"key":"name","title":"姓名","sortable":true},{"key":"age","title":"年龄","sortable":true},{"key":"city","title":"城市"}]'
          data='[{"name":"张三","age":30,"city":"北京"},{"name":"李四","age":25,"city":"上海"},{"name":"王五","age":35,"city":"深圳"}]'
          row-key="name"
        ></oas-table>
        {sortInfo && <p>排序：{sortInfo}</p>}
      </div>

      <div className="demo-block">
        <h3>消息（命令式 API）</h3>
        <oas-button size="small" onClick={() => message.success('React 侧成功提示')}>
          成功消息
        </oas-button>
      </div>

      <div className="demo-block">
        <h3>React 19 属性传递通道</h3>
        <oas-select
          placeholder="请选择"
          options='[{"value":"a","label":"选项 A"},{"value":"b","label":"选项 B"}]'
          style={{ width: '220px' }}
        ></oas-select>
        <oas-input prefix="¥" placeholder="金额" style={{ width: '180px' }}></oas-input>
      </div>
    </div>
  )
}
