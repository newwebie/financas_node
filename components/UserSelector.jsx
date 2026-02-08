'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function UserSelector({ onSelect }) {
  const [perfis, setPerfis] = useState({ Susanna: null, Pietrah: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPerfis()
  }, [])

  async function loadPerfis() {
    try {
      const [cfgSu, cfgPi] = await Promise.all([
        fetch('/api/config?user=Susanna').then(r => r.json()),
        fetch('/api/config?user=Pietrah').then(r => r.json()),
      ])

      const perfilSu = cfgSu.find(c => c.tipo === 'perfil' && c.user === 'Susanna')
      const perfilPi = cfgPi.find(c => c.tipo === 'perfil' && c.user === 'Pietrah')

      setPerfis({
        Susanna: perfilSu ? { tipo: perfilSu.perfil_tipo, valor: perfilSu.perfil_valor } : { tipo: 'emoji', valor: '⚡' },
        Pietrah: perfilPi ? { tipo: perfilPi.perfil_tipo, valor: perfilPi.perfil_valor } : { tipo: 'foto', valor: '/avatars/pietrah.png' },
      })
    } catch (error) {
      console.error('Erro ao carregar perfis:', error)
      // Usar padrões em caso de erro
      setPerfis({
        Susanna: { tipo: 'emoji', valor: '⚡' },
        Pietrah: { tipo: 'foto', valor: '/avatars/pietrah.png' },
      })
    } finally {
      setLoading(false)
    }
  }

  function renderAvatar(user, perfil) {
    if (perfil.tipo === 'emoji') {
      return (
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg
                        ${user === 'Susanna'
                          ? 'bg-gradient-to-br from-su-400 to-su-600 shadow-su-500/20'
                          : 'bg-gradient-to-br from-pi-400 to-pi-600 shadow-pi-500/20'}`}>
          <span className="text-xl">{perfil.valor}</span>
        </div>
      )
    }
    return (
      <div className={`w-12 h-12 rounded-2xl overflow-hidden shadow-lg ring-2
                      ${user === 'Susanna' ? 'shadow-su-500/20 ring-su-400/30' : 'shadow-pi-500/20 ring-pi-400/30'}`}>
        <Image
          src={perfil.valor}
          alt={user}
          width={48}
          height={48}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-900 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-900 flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Orbes de luz ambiente */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-su-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-pi-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="text-center mb-16 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-base-700/60 border border-white/10
                        flex items-center justify-center backdrop-blur-sm">
          <span className="text-4xl">💰</span>
        </div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Finanças</h1>
        <p className="text-white/40 text-sm mt-2 font-light">Quem está usando?</p>
      </div>

      {/* Botões */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => onSelect('Susanna')}
          className="group relative w-full py-5 px-6 rounded-3xl transition-all duration-300
                     bg-base-700/40 border border-su-400/20 hover:border-su-400/50
                     active:scale-[0.98]"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-su-400/10 to-su-600/10
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-4">
            {renderAvatar('Susanna', perfis.Susanna)}
            <div className="text-left">
              <p className="text-white font-semibold text-lg">Susanna</p>
              <p className="text-su-300/60 text-xs">Acessar minhas finanças</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('Pietrah')}
          className="group relative w-full py-5 px-6 rounded-3xl transition-all duration-300
                     bg-base-700/40 border border-pi-400/20 hover:border-pi-400/50
                     active:scale-[0.98]"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-pi-400/10 to-pi-600/10
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-4">
            {renderAvatar('Pietrah', perfis.Pietrah)}
            <div className="text-left">
              <p className="text-white font-semibold text-lg">Pietrah</p>
              <p className="text-pi-300/60 text-xs">Acessar minhas finanças</p>
            </div>
          </div>
        </button>
      </div>

      <p className="absolute bottom-8 text-white/15 text-xs">Finanças Compartilhadas</p>
    </div>
  )
}
