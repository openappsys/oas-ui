import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@oas-ui/theme'
import '@oas-ui/ui'
import App from './App'
import './shared.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
