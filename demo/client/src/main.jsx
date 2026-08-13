import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { I18nProvider } from './i18n/index.jsx'
import App from './App.jsx'
import './index.css'

// DEMO 版：不註冊 service worker（無後端、無離線需求）。

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <ErrorBoundary>
        <HashRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </HashRouter>
      </ErrorBoundary>
    </I18nProvider>
  </StrictMode>,
)
