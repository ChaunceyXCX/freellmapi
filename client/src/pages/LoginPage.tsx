import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'

interface LoginPageProps {
  onLoginSuccess: (token: string) => void
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<{ success: boolean; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (data.success && data.token) {
        localStorage.setItem('freellmapi_admin_token', data.token)
        onLoginSuccess(data.token)
      } else {
        setError(t('login.failed'))
      }
    } catch (err: any) {
      setError(err.message || t('login.incorrect'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col space-y-1.5 text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="inline-block size-3 rounded-full bg-foreground" />
            <span className="font-bold tracking-tight text-xl">FreeLLMAPI</span>
          </div>
          <h2 className="text-lg font-semibold leading-none tracking-tight">{t('login.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('login.desc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('login.username')}</Label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-md">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !username || !password}>
            {loading ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
