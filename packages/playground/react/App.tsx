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
          <oas-button type="primary" size="sm">
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
        <h3>消息与确认（命令式 API）</h3>
        <oas-button
          size="sm"
          onClick={() =>
            (window as unknown as { OASMessage: Record<string, unknown> }).OASMessage?.success?.(
              'React 侧成功提示',
            )
          }
        >
          成功消息
        </oas-button>
      </div>

      <div className="demo-block">
        <h3>数据型组件（React 19 property 赋值验证）</h3>
        <oas-select
          placeholder="请选择"
          options='[{"value":"a","label":"选项 A"},{"value":"b","label":"选项 B"}]'
          style={{ width: '220px' }}
        ></oas-select>
        <oas-table
          columns='[{"key":"name","title":"姓名"},{"key":"age","title":"年龄"}]'
          data='[{"name":"张三","age":30},{"name":"李四","age":25}]'
          row-key="name"
        ></oas-table>
        <oas-input prefix="¥" placeholder="金额" style={{ width: '180px' }}></oas-input>
      </div>
    </div>
  )
}
