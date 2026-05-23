import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import type { ApiKey, Platform } from '../../../shared/types'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'google', label: 'Google AI Studio' },
  { value: 'groq', label: 'Groq' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'sambanova', label: 'SambaNova' },
  { value: 'nvidia', label: 'NVIDIA NIM' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'github', label: 'GitHub Models' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'cloudflare', label: 'Cloudflare Workers AI' },
  { value: 'zhipu', label: 'Zhipu AI (Z.ai)' },
  { value: 'ollama', label: 'Ollama Cloud' },
  { value: 'kilo', label: 'Kilo Gateway (anon ok)' },
  { value: 'pollinations', label: 'Pollinations (anon ok)' },
  { value: 'llm7', label: 'LLM7 (anon ok)' },
]

const statusDot: Record<string, string> = {
  healthy: 'bg-emerald-500',
  rate_limited: 'bg-amber-500',
  invalid: 'bg-rose-500',
  error: 'bg-rose-500',
  unknown: 'bg-muted-foreground/40',
}

const statusBadge: Record<string, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  rate_limited: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  invalid: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  error: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  unknown: 'bg-muted text-muted-foreground border-border',
}

interface HealthPlatform {
  platform: string
  totalKeys: number
  healthyKeys: number
  rateLimitedKeys: number
  invalidKeys: number
  errorKeys: number
  unknownKeys: number
}

interface HealthData {
  platforms: HealthPlatform[]
  keys: { id: number; platform: string; status: string; lastCheckedAt: string | null }[]
}

function UnifiedKeySection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data } = useQuery<{ apiKey: string }>({
    queryKey: ['unified-key'],
    queryFn: () => apiFetch('/api/settings/api-key'),
  })

  const regenerate = useMutation({
    mutationFn: () => apiFetch('/api/settings/api-key/regenerate', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unified-key'] }),
  })

  const apiKey = data?.apiKey ?? ''
  const masked = apiKey ? apiKey.slice(0, 13) + '•'.repeat(32) : '…'
  const baseUrl = import.meta.env.DEV
    ? `http://${window.location.hostname}:${__SERVER_PORT__}/v1`
    : `${window.location.origin}/v1`

  function copy() {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-sm font-medium">{t('keys.unifiedKeyTitle')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('keys.unifiedKeyDesc')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => regenerate.mutate()}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? t('keys.checking') : t('keys.regenerate')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-xs bg-muted px-3 py-2 rounded-md select-all truncate tabular-nums">
          {showKey ? apiKey : masked}
        </code>
        <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
          {showKey ? t('keys.hide') : t('keys.show')}
        </Button>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? t('common.copied') : t('common.copy')}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">{t('keys.baseUrl')}</span>
        <code className="font-mono">{baseUrl}</code>
        <span className="text-muted-foreground">{t('keys.endpoint')}</span>
        <code className="font-mono">/v1/chat/completions</code>
      </div>
    </section>
  )
}

function GistSyncSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [token, setToken] = useState(() => localStorage.getItem('freellmapi_gist_token') || '')
  const [gistId, setGistId] = useState(() => localStorage.getItem('freellmapi_gist_id') || '')
  const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' })
  const [loading, setLoading] = useState<'backup' | 'restore' | null>(null)

  useEffect(() => {
    localStorage.setItem('freellmapi_gist_token', token)
  }, [token])

  useEffect(() => {
    localStorage.setItem('freellmapi_gist_id', gistId)
  }, [gistId])

  const handleSync = async (action: 'backup' | 'restore') => {
    if (!token.trim()) {
      setStatus({ type: 'error', message: t('gist.tokenRequired', 'GitHub Personal Access Token (PAT) is required.') })
      return
    }
    if (action === 'restore' && !gistId.trim()) {
      setStatus({ type: 'error', message: t('gist.idRequired', 'Gist ID is required to restore keys.') })
      return
    }

    setStatus({ type: '', message: '' })
    setLoading(action)

    try {
      const res: any = await apiFetch('/api/settings/gist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubToken: token.trim(),
          gistId: gistId.trim() || undefined,
          action,
        }),
      })

      if (action === 'backup') {
        setGistId(res.gistId)
        setStatus({
          type: 'success',
          message: t('gist.backupSuccess', {
            defaultValue: 'Successfully backed up keys to Gist! ID: {{id}}',
            id: res.gistId,
          }),
        })
      } else {
        queryClient.invalidateQueries({ queryKey: ['keys'] })
        queryClient.invalidateQueries({ queryKey: ['health'] })
        queryClient.invalidateQueries({ queryKey: ['fallback'] })
        setStatus({
          type: 'success',
          message: t('gist.restoreSuccess', {
            defaultValue: 'Successfully restored {{count}} keys from Gist!',
            count: res.restoredCount,
          }),
        })
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message || 'Sync failed.' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-sm font-medium mb-1">{t('gist.syncTitle', 'GitHub Gist Sync')}</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {t('gist.syncDesc', 'Sync your provider keys with a private GitHub Gist for cross-device backup and restore.')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t('gist.patLabel', 'GitHub PAT (with "gist" scope)')}</Label>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t('gist.idLabel', 'Gist ID (creates new if empty on backup)')}</Label>
          <Input
            type="text"
            value={gistId}
            onChange={(e) => setGistId(e.target.value)}
            placeholder="Gist ID"
            className="w-full text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 h-9"
          />
        </div>
      </div>

      {status.message && (
        <div className={`mt-3 p-2.5 rounded text-xs border ${
          status.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/15 text-rose-800 dark:text-rose-400 border-rose-500/20'
        }`}>
          {status.message}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => handleSync('backup')}
          disabled={loading !== null}
          size="sm"
          className="h-9 px-4 text-xs font-medium"
        >
          {loading === 'backup' ? t('gist.backingUp', 'Backing up...') : t('gist.backupBtn', 'Backup to Gist')}
        </Button>
        <Button
          onClick={() => handleSync('restore')}
          disabled={loading !== null}
          variant="outline"
          size="sm"
          className="h-9 px-4 text-xs font-medium"
        >
          {loading === 'restore' ? t('gist.restoring', 'Restoring...') : t('gist.restoreBtn', 'Restore from Gist')}
        </Button>
      </div>
    </section>
  )
}

export default function KeysPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [platform, setPlatform] = useState<Platform | ''>('')
  const [apiKey, setApiKey] = useState('')
  const [accountId, setAccountId] = useState('')
  const [label, setLabel] = useState('')

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['keys'],
    queryFn: () => apiFetch('/api/keys'),
  })

  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: () => apiFetch('/api/health'),
    refetchInterval: 30000,
  })

  const addKey = useMutation({
    mutationFn: (body: { platform: string; key: string; label?: string }) =>
      apiFetch('/api/keys', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
      setPlatform('')
      setApiKey('')
      setAccountId('')
      setLabel('')
    },
  })

  const deleteKey = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  const checkAll = useMutation({
    mutationFn: () => apiFetch('/api/health/check-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['keys'] })
    },
  })

  const checkKey = useMutation({
    mutationFn: (keyId: number) => apiFetch(`/api/health/check/${keyId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['keys'] })
    },
  })

  const needsAccountId = platform === 'cloudflare'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!platform || !apiKey) return
    if (needsAccountId && !accountId) return
    const key = needsAccountId ? `${accountId}:${apiKey}` : apiKey
    addKey.mutate({ platform, key, label: label || undefined })
  }

  const healthKeyMap = new Map<number, { status: string; lastCheckedAt: string | null }>()
  for (const k of healthData?.keys ?? []) healthKeyMap.set(k.id, k)

  const grouped = PLATFORMS.map(p => ({
    ...p,
    keys: keys.filter(k => k.platform === p.value),
  })).filter(p => p.keys.length > 0)

  const statusLabelKey: Record<string, string> = {
    healthy: 'keys.healthy',
    rate_limited: 'keys.rateLimited',
    invalid: 'keys.invalid',
    error: 'keys.error',
    unknown: 'keys.unchecked',
  }

  return (
    <div>
      <PageHeader
        title={t('keys.title')}
        description={t('keys.desc')}
        actions={
          keys.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => checkAll.mutate()} disabled={checkAll.isPending}>
              {checkAll.isPending ? t('keys.checking') : t('keys.checkAll')}
            </Button>
          )
        }
      />

      <div className="space-y-8">
        <UnifiedKeySection />
        <GistSyncSection />

        <section>
          <h2 className="text-sm font-medium mb-3">{t('keys.addKeyTitle')}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-lg border p-4 bg-card">
            <div className="space-y-1.5 w-full sm:w-[220px]">
              <Label className="text-xs">{t('keys.platform')}</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('keys.selectProvider')} />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {needsAccountId && (
              <div className="space-y-1.5 w-full sm:w-[200px]">
                <Label className="text-xs">{t('keys.accountId')}</Label>
                <Input
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  placeholder="e.g. 1a2b3c4d5e"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5 flex-1 w-full">
              <Label className="text-xs">{t('keys.apiKey')}</Label>
              <Input
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={t('keys.pasteKeyPlaceholder')}
                required
              />
            </div>
            <div className="space-y-1.5 w-full sm:w-[180px]">
              <Label className="text-xs">{t('keys.label')}</Label>
              <Input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={t('common.optional')}
              />
            </div>
            <Button type="submit" disabled={addKey.isPending || !platform || !apiKey} className="w-full sm:w-auto">
              {addKey.isPending ? t('keys.addingKeyBtn') : t('keys.addKeyBtn')}
            </Button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-3">{t('keys.configuredTitle')}</h2>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">{t('common.loading')}</div>
          ) : keys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg bg-card border-dashed">
              {t('keys.noKeys')}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {grouped.map(group => (
                <div key={group.value} className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <h3 className="text-sm font-medium">{group.label}</h3>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {group.keys.length} {t('keys.keyUnit')}
                    </span>
                  </div>
                  <div className="rounded-lg border divide-y bg-card overflow-hidden">
                    {group.keys.map(k => {
                      const h = healthKeyMap.get(k.id)
                      const status = h?.status ?? k.status
                      const lastChecked = h?.lastCheckedAt
                      return (
                        <div key={k.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3.5 sm:py-3 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`size-1.5 rounded-full flex-shrink-0 ${statusDot[status] ?? statusDot.unknown}`} />
                            <code className="text-xs font-mono">{k.maskedKey}</code>
                            {k.label && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{k.label}</span>}
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge[status] ?? statusBadge.unknown}`}>
                              {t(statusLabelKey[status] || status)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-2 flex-1 w-full sm:w-auto">
                            {lastChecked && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {new Date(lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="xs" onClick={() => checkKey.mutate(k.id)} disabled={checkKey.isPending}>
                                {t('keys.checkBtn')}
                              </Button>
                              <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive" onClick={() => deleteKey.mutate(k.id)} disabled={deleteKey.isPending}>
                                {t('keys.removeBtn')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
