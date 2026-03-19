'use client'

import { useState } from 'react'
import { Building2, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

// Mensagens amigáveis para erros conhecidos do Pluggy
function getFriendlyError(err) {
  const msg = err?.message || err?.code || String(err)
  if (msg.includes('ITEM_IS_ALREADY_UPDATING'))
    return 'Seu banco já está sincronizando. Aguarde alguns minutos e tente novamente.'
  if (msg.includes('INVALID_CREDENTIALS'))
    return 'Credenciais incorretas. Verifique seu login e senha do banco.'
  if (msg.includes('MFA') || msg.includes('TOKEN_EXPIRED'))
    return 'Código de verificação expirado. Tente novamente.'
  if (msg.includes('ACCOUNT_LOCKED'))
    return 'Conta bloqueada no banco. Desbloqueie pelo app do banco e tente novamente.'
  if (msg.includes('SITE_NOT_AVAILABLE'))
    return 'O banco está temporariamente indisponível. Tente novamente mais tarde.'
  if (msg.includes('400') || msg.includes('token'))
    return 'Erro ao gerar token de conexão. Recarregue a página e tente novamente.'
  return 'Erro ao conectar. Tente novamente.'
}

export default function PluggyConnect({ user, onSuccess }) {
  const [status, setStatus] = useState('idle') // idle | preparing | open | success | error
  const [error, setError] = useState(null)
  const [widgetUnavailable, setWidgetUnavailable] = useState(false)

  async function handleConnect() {
    setStatus('preparing')
    setError(null)

    try {
      // 1. Gera connect token
      const tokenRes = await fetch('/api/pluggy/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao gerar token de conexão')
      }

      const { accessToken } = await tokenRes.json()

      // 2. Importação dinâmica do SDK (vanilla JS, precisa de window/document)
      if (typeof window === 'undefined') {
        setWidgetUnavailable(true)
        setStatus('idle')
        return
      }

      let PluggyConnectClass
      try {
        const mod = await import(/* webpackIgnore: true */ 'pluggy-connect-sdk/dist/main')
        PluggyConnectClass = mod.PluggyConnect || mod.default?.PluggyConnect || mod.default
      } catch (importErr) {
        console.error('Pluggy SDK import error:', importErr)
        setWidgetUnavailable(true)
        setStatus('idle')
        return
      }

      if (!PluggyConnectClass) {
        setWidgetUnavailable(true)
        setStatus('idle')
        return
      }

      // 3. Instancia o widget — callbacks gerenciam o estado
      const pluggyConnect = new PluggyConnectClass({
        connectToken: accessToken,
        onSuccess: async (itemData) => {
          setStatus('success')
          try {
            await fetch('/api/pluggy/items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: itemData.item?.id || itemData.id,
                userId: user,
                connectorName: itemData.item?.connector?.name || itemData.connector?.name || 'Banco',
              }),
            })
            onSuccess && onSuccess(itemData)
          } catch {
            setError('Banco conectado! Mas houve um erro ao salvar. Recarregue a página.')
          }
          setTimeout(() => setStatus('idle'), 3000)
        },
        onError: (err) => {
          setStatus('error')
          setError(getFriendlyError(err))
        },
        onClose: () => {
          // Widget fechado sem conectar
          if (status !== 'success') setStatus('idle')
        },
      })

      // 4. Abre o modal — muda status para "open" depois que o init() resolver
      await pluggyConnect.init()
      setStatus('open')
    } catch (err) {
      setStatus('error')
      setError(getFriendlyError(err))
    }
  }

  if (widgetUnavailable) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-300 text-sm font-medium">Widget de conexão indisponível</p>
            <p className="text-amber-300/70 text-xs mt-1">
              Use a aba <strong>Upload</strong> como alternativa para importar extratos OFX ou CSV.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConnect}
        disabled={status === 'preparing' || status === 'open'}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10
                   text-white text-sm font-medium hover:bg-white/15 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {status === 'preparing' && <Loader2 size={16} className="animate-spin" />}
        {status === 'open'      && <Loader2 size={16} className="animate-spin" />}
        {status === 'success'   && <CheckCircle2 size={16} className="text-green-400" />}
        {status === 'error'     && <RefreshCw size={16} />}
        {(status === 'idle' || status === 'error') && <Building2 size={16} className={status === 'idle' ? '' : 'hidden'} />}

        {status === 'preparing' && 'Preparando widget...'}
        {status === 'open'      && 'Widget aberto — conclua no popup'}
        {status === 'success'   && 'Banco conectado!'}
        {status === 'error'     && 'Tentar novamente'}
        {status === 'idle'      && 'Conectar novo banco'}
      </button>

      <p className="text-white/30 text-xs px-1">Gratuito via Open Finance (Banco Central)</p>

      {/* Erro amigável */}
      {status === 'error' && error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-xs">{error}</p>
        </div>
      )}

      {/* Dica quando widget está aberto */}
      {status === 'open' && (
        <p className="text-white/40 text-xs px-1">
          Complete a conexão na janela do Pluggy que abriu.
        </p>
      )}
    </div>
  )
}
