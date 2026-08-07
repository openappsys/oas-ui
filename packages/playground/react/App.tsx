import { useState } from 'react'
import './shared.css'

type Theme = 'light' | 'dark' | 'high-contrast'

export default function App() {
  const [theme, setTheme] = useState<Theme>('light')
  const [form, setForm] = useState({ name: '', email: '' })

  return (
    <div data-theme={theme}>
      <h1>React Playground · 表单页</h1>

      <div className="switch-row">
        <oas-button
          size="sm"
          onClick={() => setTheme('light')}
          type={theme === 'light' ? 'primary' : 'default'}
        >
          Light
        </oas-button>
        <oas-button
          size="sm"
          onClick={() => setTheme('dark')}
          type={theme === 'dark' ? 'primary' : 'default'}
        >
          Dark
        </oas-button>
        <oas-button
          size="sm"
          onClick={() => setTheme('high-contrast')}
          type={theme === 'high-contrast' ? 'primary' : 'default'}
        >
          高对比
        </oas-button>
      </div>

      <div className="demo-block">
        <h3>基础表单（onOasSubmit 桥接）</h3>
        <oas-form
          onOasSubmit={(e: Event) => {
            const d = (e as CustomEvent<Record<string, string>>).detail
            setForm({ name: String(d['name'] ?? ''), email: String(d['email'] ?? '') })
          }}
        >
          <oas-form-item label="姓名" name="name" required>
            <oas-input name="name" placeholder="请输入姓名" required></oas-input>
          </oas-form-item>
          <oas-form-item label="邮箱" name="email" required>
            <oas-input name="email" placeholder="请输入邮箱" required></oas-input>
          </oas-form-item>
          <oas-button type="primary" size="sm">提交</oas-button>
        </oas-form>
        {form.name && <p>已提交：{form.name} / {form.email}</p>}
      </div>

      <div className="demo-block">
        <h3>消息与确认（命令式 API）</h3>
        <oas-button
          size="sm"
          onClick={() => (window as unknown as { OASMessage: Record<string, unknown> }).OASMessage?.success?.('React 侧成功提示')}
        >
          成功消息
        </oas-button>
      </div>
    </div>
  )
}
