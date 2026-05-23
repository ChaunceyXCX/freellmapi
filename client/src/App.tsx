import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import KeysPage from '@/pages/KeysPage'
import PlaygroundPage from '@/pages/PlaygroundPage'
import FallbackPage from '@/pages/FallbackPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LoginPage from '@/pages/LoginPage'
import { apiFetch } from '@/lib/api'

const queryClient = new QueryClient()

function NavItem({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm px-1 py-4 transition-colors whitespace-nowrap ${
          isActive
            ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground'
            : 'text-muted-foreground hover:text-foreground'
        } ${className || ''}`
      }
    >
      {children}
    </NavLink>
  )
}

function MobileNavItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block text-sm py-2.5 px-3 rounded-md transition-colors ${
          isActive
            ? 'bg-muted text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value)
    localStorage.setItem('freellmapi_language', value)
  }

  return (
    <select
      value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="text-xs bg-background border rounded-md px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground hover:text-foreground border-input transition-colors font-medium"
    >
      <option value="zh">中文</option>
      <option value="en">English</option>
    </select>
  )
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme" className="size-8 p-0">
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </Button>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="inline-block size-2 rounded-full bg-foreground" />
      <span className="font-semibold tracking-tight text-sm">FreeLLMAPI</span>
    </div>
  )
}

function AppContent() {
  const { t } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('freellmapi_admin_token')
    if (!token) {
      setIsAuthenticated(false)
      return
    }

    apiFetch<{ valid: boolean }>('/api/auth/session')
      .then((res) => {
        setIsAuthenticated(res.valid)
        if (!res.valid) {
          localStorage.removeItem('freellmapi_admin_token')
        }
      })
      .catch(() => {
        setIsAuthenticated(false)
        localStorage.removeItem('freellmapi_admin_token')
      })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('freellmapi_admin_token')
    setIsAuthenticated(false)
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">{t('nav.checkingSession')}</p>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Brand />
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <DarkModeToggle />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="hidden md:flex items-center gap-6">
              <NavItem to="/playground">{t('nav.playground')}</NavItem>
              <NavItem to="/keys">{t('nav.keys')}</NavItem>
              <NavItem to="/fallback">{t('nav.fallback')}</NavItem>
              <NavItem to="/analytics">{t('nav.analytics')}</NavItem>
            </nav>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              {t('nav.logout')}
            </Button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="size-8 p-0"
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-b bg-background px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col gap-1">
              <MobileNavItem to="/playground" onClick={() => setMobileMenuOpen(false)}>{t('nav.playground')}</MobileNavItem>
              <MobileNavItem to="/keys" onClick={() => setMobileMenuOpen(false)}>{t('nav.keys')}</MobileNavItem>
              <MobileNavItem to="/fallback" onClick={() => setMobileMenuOpen(false)}>{t('nav.fallback')}</MobileNavItem>
              <MobileNavItem to="/analytics" onClick={() => setMobileMenuOpen(false)}>{t('nav.analytics')}</MobileNavItem>
            </nav>
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="text-muted-foreground hover:text-foreground w-full justify-start h-9 px-3"
              >
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/playground" replace />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/keys" element={<KeysPage />} />
          <Route path="/fallback" element={<FallbackPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/playground" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
