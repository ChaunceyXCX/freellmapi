import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import KeysPage from '@/pages/KeysPage'
import PlaygroundPage from '@/pages/PlaygroundPage'
import FallbackPage from '@/pages/FallbackPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LoginPage from '@/pages/LoginPage'
import { apiFetch } from '@/lib/api'

const queryClient = new QueryClient()

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm px-1 py-4 transition-colors ${
          isActive
            ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
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
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
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
    <div className="flex items-center gap-2">
      <span className="inline-block size-2 rounded-full bg-foreground" />
      <span className="font-semibold tracking-tight text-sm">FreeLLMAPI</span>
    </div>
  )
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

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
        <p className="text-sm text-muted-foreground animate-pulse">Checking session…</p>
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-6 h-12 flex items-center">
            <Brand />
            <div className="ml-auto flex items-center gap-2">
              <DarkModeToggle />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-6 flex items-center">
          <Brand />
          <nav className="flex items-center gap-6 ml-10">
            <NavItem to="/playground">Playground</NavItem>
            <NavItem to="/keys">Keys</NavItem>
            <NavItem to="/fallback">Fallback</NavItem>
            <NavItem to="/analytics">Analytics</NavItem>
          </nav>
          <div className="ml-auto py-2 flex items-center gap-3">
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
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
